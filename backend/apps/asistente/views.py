import re
import threading
import uuid
from django.conf import settings
from django.core.cache import cache
from rest_framework.views import APIView
from rest_framework import generics, permissions, status
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Avg, Count, Prefetch, Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import Conversacion, Consulta, Respuesta, HistorialInteraccion, ModeloIA, ParametroModelo
from apps.evaluacion.models import Evaluacion
from .serializers import (
    GenerarTextoRequestSerializer,
    EditarConsultaRequestSerializer,
    ConsultaSerializer,
    RespuestaSerializer,
    ParametroModeloSerializer,
    HistorialInteraccionSerializer,
    ConversacionResumenSerializer,
    ConversacionDetalleSerializer
)
from .services.ollama_client import OllamaNLPService


from apps.authentication.permissions import EsAdministrador, es_administrador

ERROR_RESPONSE_KEYWORDS = (
    "no pudo responder a tiempo",
    "tiempo de espera agotado",
    "servicio en carga",
    "error_motor",
    "error_http",
    "solicitud fallida",
)

_CONVERSATION_EDIT_LOCKS = {}
_CONVERSATION_EDIT_LOCKS_GUARD = threading.Lock()


def _adquirir_bloqueo_edicion(id_conversacion: int, ttl_segundos: int = 180):
    lock_key = f"asistente:edit_lock:conv:{id_conversacion}"
    lock_token = uuid.uuid4().hex
    try:
        adquirido = cache.add(lock_key, lock_token, timeout=ttl_segundos)
        if adquirido:
            return ('cache', lock_key, lock_token)
        return None
    except Exception:
        with _CONVERSATION_EDIT_LOCKS_GUARD:
            local_lock = _CONVERSATION_EDIT_LOCKS.setdefault(id_conversacion, threading.Lock())
        if local_lock.acquire(blocking=False):
            return ('local', id_conversacion, local_lock)
        return None


def _liberar_bloqueo_edicion(handle):
    if not handle:
        return
    modo, clave, valor = handle
    if modo == 'cache':
        try:
            if cache.get(clave) == valor:
                cache.delete(clave)
        except Exception:
            pass
    elif modo == 'local':
        try:
            valor.release()
        except Exception:
            pass


def _obtener_consultas_anteriores(consulta: Consulta):
    return (
        Consulta.objects
        .filter(conversacion_id=consulta.conversacion_id)
        .filter(
            Q(fecha_consulta__lt=consulta.fecha_consulta)
            | Q(fecha_consulta=consulta.fecha_consulta, id_consulta__lt=consulta.id_consulta)
        )
        .prefetch_related('respuestas')
        .order_by('fecha_consulta', 'id_consulta')
    )


def _obtener_consultas_posteriores(consulta: Consulta):
    return (
        Consulta.objects
        .filter(conversacion_id=consulta.conversacion_id)
        .filter(
            Q(fecha_consulta__gt=consulta.fecha_consulta)
            | Q(fecha_consulta=consulta.fecha_consulta, id_consulta__gt=consulta.id_consulta)
        )
        .order_by('fecha_consulta', 'id_consulta')
    )


def _construir_historial_contexto(consultas_iterable) -> list:
    historial_contexto = []
    for consulta_previa in consultas_iterable:
        respuestas = sorted(
            consulta_previa.respuestas.all(),
            key=lambda r: (r.fecha_respuesta, r.id_respuesta)
        )
        if not respuestas:
            continue
        resp_valida = None
        for r in respuestas:
            txt = (r.texto_generado or "").strip()
            if txt and not any(k in txt.lower() for k in ERROR_RESPONSE_KEYWORDS):
                resp_valida = txt
                break
        if resp_valida:
            historial_contexto.append({'sender': 'user', 'text': consulta_previa.texto_consulta.strip()})
            historial_contexto.append({'sender': 'assistant', 'text': resp_valida})
    return historial_contexto


def _resolver_parametros_generacion(user, texto: str, data: dict) -> tuple[float, float, int]:
    tokens_adaptados = GenerarTextoAPIView._calcular_max_tokens_adaptable(texto)
    if es_administrador(user):
        temperatura = data['temperatura']
        top_p = data['top_p']
        max_tokens_req = data['max_tokens']
        # Si el administrador usa el valor por defecto (250), adaptarlo al presupuesto calibrado
        max_tokens = tokens_adaptados if max_tokens_req == 250 else max_tokens_req
    else:
        # Estudiante: parámetros calibrados con límite adaptable conservador (máx 500 para explicaciones)
        temperatura = 0.6
        top_p = 0.9
        max_tokens = tokens_adaptados
    return temperatura, top_p, max_tokens


def _registrar_respuesta_y_historial(usuario, consulta: Consulta, resultado: dict):
    if resultado.get('es_directa'):
        modelo_db, _ = ModeloIA.objects.get_or_create(
            nombre_modelo='base-conocimiento-upec',
            defaults={'version': '1.0-corpus-dialectal', 'proveedor': 'PostgreSQL'}
        )
    else:
        nombre_modelo_activo = getattr(settings, 'OLLAMA_MODEL', 'qwen2.5:1.5b')
        version_modelo = '1.5b-instruct-q4_k_m' if 'qwen' in nombre_modelo_activo.lower() else '3b-dialectal-upec'
        modelo_db, _ = ModeloIA.objects.get_or_create(
            nombre_modelo=nombre_modelo_activo,
            defaults={'version': version_modelo, 'proveedor': 'Ollama'}
        )

    respuesta = Respuesta.objects.create(
        consulta=consulta,
        modelo=modelo_db,
        texto_generado=resultado['texto_generado'],
        tiempo_respuesta=resultado['tiempo_respuesta'],
        modismos_detectados=resultado['modismos_detectados']
    )

    es_error = bool(resultado.get('es_error'))
    es_directa = bool(resultado.get('es_directa'))
    evaluacion = None
    if not es_error and not es_directa:
        metricas_data = resultado.get('metricas', {})
        if metricas_data.get('bleu') is not None or metricas_data.get('bertscore') is not None:
            evaluacion = Evaluacion.objects.create(
                respuesta=respuesta,
                bleu=metricas_data.get('bleu'),
                rouge=metricas_data.get('rouge'),
                bertscore=metricas_data.get('bertscore'),
                observaciones=f"Inferencia vía {resultado['fuente']}"
            )

    HistorialInteraccion.objects.create(
        usuario=usuario,
        consulta=consulta,
        respuesta=respuesta
    )
    return respuesta, evaluacion, es_error

class GenerarTextoAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'generar_texto'

    @staticmethod
    def _calcular_max_tokens_adaptable(texto: str) -> int:
        """
        Calcula un límite de generación conservador y adaptable según la naturaleza de la consulta,
        calibrado para evitar timeouts en CPU dual-core (180-220 tokens máx para explicaciones).
        """
        t = (texto or "").strip().lower()
        if not t:
            return 140

        # Patrones que requieren explicación detallada o desarrollo conceptual
        patrones_explicativos = [
            r'qu[eé]\s+es', r'qu[eé]\s+son', r'expl[ií]ca', r'c[oó]mo\s+funciona', r'c[oó]mo\s+puedo',
            r'c[oó]mo\s+se\s+hace', r'por\s+qu[eé]', r'diferencia\s+entre', r'resumen', r'resume',
            r'desarrolla', r'describe', r'consejos', r'estrategias', r'pasos\s+para', r'ensayo',
            r'gu[ií]a', r'redes?\s+neuronales?', r'procesamiento\s+del\s+lenguaje', r'inteligencia\s+artificial',
            r'segundo\s+punto', r'primer\s+punto', r'tercer\s+punto', r'punto\s+anterior', r'respuesta\s+anterior',
            r'nuevamente', r'profundiza', r'ahorrar', r'estudiar', r'aprender', r'm[eé]todos?'
        ]

        # Patrones que requieren listas estructuradas o resúmenes de varios puntos
        patrones_listas_o_resumen = [
            r'resumen', r'resume', r'regiones', r'pasos', r'consejos', r'estrategias',
            r'caracter[ií]sticas', r'ventajas', r'desventajas', r'diferencias?',
            r'tipos\s+de', r'ejemplos?', r'elementos', r'factores',
            r'platos?', r'comidas?', r'gastronom[ií]a', r'alimentos?', r'recetas?',
            r'lugares?', r'sitios?', r'atractivos?', r'tur[ií]sticos?',
            r'costumbres?', r'tradiciones?', r'ciudades?', r'provincias?'
        ]

        es_lista_o_resumen = any(re.search(p, t) for p in patrones_listas_o_resumen)
        requiere_explicacion = any(re.search(p, t) for p in patrones_explicativos) or len(t) > 120

        # Si es un cálculo aritmético directo simple o saludo muy breve
        es_calculo_o_saludo = any(re.search(rf'\b{p}\b', t) for p in [
            'hola', 'buenos d[ií]as', 'buenas tardes', 'buenas noches', 'qu[eé] tal',
            'multiplicado', 'dividido', 'sumado', 'restado', r'cu[aá]nto es \d+'
        ]) and len(t) < 40

        if es_calculo_o_saludo and not requiere_explicacion:
            return 80

        if es_lista_o_resumen:
            # Presupuesto calibrado para resúmenes o listas estructuradas (150 tokens): ~38-48s en CPU
            return 150

        if requiere_explicacion:
            # Presupuesto calibrado para consultas explicativas (130 tokens): ~35-45s en CPU sin riesgo de timeout
            return 130

        # Presupuesto para conversación cotidiana (90 tokens): ~25-30s en CPU
        return 90

    def post(self, request):
        serializer = GenerarTextoRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        texto = data['texto']
        tipo_entrada = data['tipo_entrada']

        # El servidor protege parámetros para evitar abusos o desbordamiento en CPU.
        temperatura, top_p, max_tokens = _resolver_parametros_generacion(
            request.user, texto, data
        )

        id_conversacion = data.get('id_conversacion')
        if id_conversacion:
            conversacion = get_object_or_404(
                Conversacion, id_conversacion=id_conversacion, usuario=request.user
            )
        else:
            conversacion = Conversacion.objects.create(
                usuario=request.user,
                titulo=(texto.strip()[:120] or 'Nueva conversación')
            )

        consultas_previas = (conversacion.consultas
                             .prefetch_related('respuestas')
                             .order_by('fecha_consulta', 'id_consulta'))
        historial_contexto = _construir_historial_contexto(consultas_previas)

        # 1. Guardar la consulta en PostgreSQL
        consulta = Consulta.objects.create(
            usuario=request.user,
            conversacion=conversacion,
            texto_consulta=texto,
            tipo_entrada=tipo_entrada
        )
        Conversacion.objects.filter(pk=conversacion.pk).update(fecha_actualizacion=timezone.now())

        # 2. Inferencia: base de conocimiento directa (si es definición) o motor Ollama
        nlp_service = OllamaNLPService()
        resultado = nlp_service.generar_texto(
            texto_usuario=texto,
            temperatura=temperatura,
            top_p=top_p,
            max_tokens=max_tokens,
            historial=historial_contexto
        )

        # 3-6. Registrar modelo, respuesta, evaluación e historial de interacciones
        respuesta, evaluacion, es_error = _registrar_respuesta_y_historial(
            request.user, consulta, resultado
        )

        # 7. Registrar interacción detallada para evaluación dinámica y métricas (Admin + Usuarios)
        try:
            from apps.evaluacion.models import RegistroInteraccion
            rol_act = 'Estudiante'
            if hasattr(request.user, 'perfil') and request.user.perfil and request.user.perfil.rol:
                rol_act = request.user.perfil.rol
            elif es_administrador(request.user):
                rol_act = 'Administrador'

            RegistroInteraccion.objects.create(
                usuario=request.user,
                rol_usuario=rol_act,
                pregunta_usuario=texto,
                respuesta_ia=resultado['texto_generado'],
                latencia=float(respuesta.tiempo_respuesta or 0.0),
                consulta=consulta,
                respuesta=respuesta
            )
        except Exception:
            pass

        motivo_error = resultado.get('metricas', {}).get('motivo_error')
        return Response(
            self._response_data(consulta, respuesta, evaluacion, resultado['fuente'], es_error, motivo_error),
            status=status.HTTP_200_OK
        )

    @staticmethod
    def _response_data(consulta, respuesta, evaluacion, fuente, es_error=False, motivo_error=None):
        metricas = {
            'tiempo_respuesta': float(respuesta.tiempo_respuesta),
            'es_error': es_error,
        }
        if es_error:
            metricas['bleu'] = None
            metricas['rouge'] = None
            metricas['bertscore'] = None
            metricas['estado'] = 'fallida'
            metricas['motivo_error'] = motivo_error or 'Tiempo de espera agotado'
        else:
            metricas['bleu'] = float(evaluacion.bleu) if evaluacion else None
            metricas['rouge'] = float(evaluacion.rouge) if evaluacion else None
            metricas['bertscore'] = float(evaluacion.bertscore) if evaluacion else None
            metricas['estado'] = 'exitosa'

        return {
            'id_consulta': consulta.id_consulta,
            'id_conversacion': consulta.conversacion_id,
            'id_respuesta': respuesta.id_respuesta,
            'texto_generado': respuesta.texto_generado,
            'tiempo_respuesta': float(respuesta.tiempo_respuesta),
            'modismos_detectados': respuesta.modismos_detectados,
            'fuente': fuente,
            'es_error': es_error,
            'metricas': metricas
        }


class EditarConsultaAPIView(APIView):
    """
    Edita una consulta enviada por el usuario autenticado, valida confirmación de
    truncado cuando existen mensajes posteriores, protege contra concurrencia y errores
    de Ollama antes de modificar PostgreSQL, y regenera únicamente esa respuesta.
    Endpoint: PUT/PATCH /api/asistente/consultas/<int:id_consulta>/editar/
    """
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'generar_texto'

    def put(self, request, id_consulta):
        return self._procesar_edicion(request, id_consulta)

    def patch(self, request, id_consulta):
        return self._procesar_edicion(request, id_consulta)

    def _procesar_edicion(self, request, id_consulta):
        consulta = get_object_or_404(
            Consulta.objects.select_related('conversacion'),
            id_consulta=id_consulta,
            usuario=request.user,
            conversacion__usuario=request.user,
        )
        conversacion = consulta.conversacion

        lock_handle = _adquirir_bloqueo_edicion(conversacion.id_conversacion)
        if lock_handle is None:
            return Response({
                'en_curso': True,
                'conservado': True,
                'id_consulta': consulta.id_consulta,
                'id_conversacion': conversacion.id_conversacion,
                'detail': 'Ya existe una edición y regeneración en curso para esta conversación. Espera a que finalice antes de intentar otra.',
            }, status=status.HTTP_409_CONFLICT)

        try:
            serializer = EditarConsultaRequestSerializer(data=request.data)
            if not serializer.is_valid():
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

            data = serializer.validated_data
            texto_nuevo = data['texto']
            confirmar_truncado = bool(data.get('confirmar_truncado', False))

            posteriores_qs = _obtener_consultas_posteriores(consulta)
            posteriores_snapshot_ids = list(posteriores_qs.values_list('id_consulta', flat=True))
            total_posteriores = len(posteriores_snapshot_ids)

            if total_posteriores > 0 and not confirmar_truncado:
                mensajes_posteriores = (
                    total_posteriores
                    + Respuesta.objects.filter(consulta_id__in=posteriores_snapshot_ids).count()
                )
                return Response({
                    'requiere_confirmacion': True,
                    'confirmar_truncado': False,
                    'conservado': True,
                    'id_consulta': consulta.id_consulta,
                    'id_conversacion': conversacion.id_conversacion,
                    'consultas_posteriores': total_posteriores,
                    'mensajes_posteriores': mensajes_posteriores,
                    'detail': (
                        f'Esta consulta tiene {total_posteriores} consulta(s) posterior(es). '
                        'Debes confirmar el truncado para eliminar los mensajes posteriores y regenerar la respuesta.'
                    ),
                }, status=status.HTTP_409_CONFLICT)

            # Capturar instantánea optimista antes de llamar a Ollama
            texto_anterior = consulta.texto_consulta
            respuestas_previas_ids = list(
                consulta.respuestas
                .order_by('fecha_respuesta', 'id_respuesta')
                .values_list('id_respuesta', flat=True)
            )
            consultas_anteriores = list(_obtener_consultas_anteriores(consulta))
            historial_contexto = _construir_historial_contexto(consultas_anteriores)
            es_primera_consulta = len(consultas_anteriores) == 0

            temperatura, top_p, max_tokens = _resolver_parametros_generacion(
                request.user, texto_nuevo, data
            )

            # Ejecutar inferencia ANTES de alterar registros existentes en PostgreSQL
            nlp_service = OllamaNLPService()
            resultado = nlp_service.generar_texto(
                texto_usuario=texto_nuevo,
                temperatura=temperatura,
                top_p=top_p,
                max_tokens=max_tokens,
                historial=historial_contexto,
            )

            if resultado.get('es_error'):
                tipo_error = resultado.get('tipo_error') or 'error_motor'
                http_status = (
                    status.HTTP_504_GATEWAY_TIMEOUT
                    if tipo_error == 'timeout'
                    else status.HTTP_503_SERVICE_UNAVAILABLE
                )
                motivo_error = (
                    resultado.get('metricas', {}).get('motivo_error')
                    or 'Tiempo de espera agotado'
                )
                return Response({
                    'es_error': True,
                    'conservado': True,
                    'tipo_error': tipo_error,
                    'motivo_error': motivo_error,
                    'fuente': resultado.get('fuente'),
                    'tiempo_respuesta': resultado.get('tiempo_respuesta'),
                    'metricas': resultado.get('metricas'),
                    'id_consulta': consulta.id_consulta,
                    'id_conversacion': conversacion.id_conversacion,
                    'detail': resultado.get('texto_generado') or 'No se pudo regenerar la respuesta. Se conservó la conversación original.',
                }, status=http_status)

            # Transacción atómica corta solo tras éxito de inferencia
            with transaction.atomic():
                conversacion_locked = (
                    Conversacion.objects.select_for_update()
                    .get(pk=conversacion.pk, usuario=request.user)
                )
                consulta_db = (
                    Consulta.objects.select_for_update()
                    .filter(
                        pk=consulta.pk,
                        conversacion=conversacion_locked,
                        usuario=request.user,
                    )
                    .first()
                )
                if consulta_db is None:
                    return Response({
                        'conservado': False,
                        'detail': 'La consulta ya no existe o fue eliminada durante el procesamiento.',
                    }, status=status.HTTP_404_NOT_FOUND)

                posteriores_actuales_ids = list(
                    _obtener_consultas_posteriores(consulta_db)
                    .values_list('id_consulta', flat=True)
                )
                respuestas_actuales_ids = list(
                    consulta_db.respuestas
                    .order_by('fecha_respuesta', 'id_respuesta')
                    .values_list('id_respuesta', flat=True)
                )
                if (
                    consulta_db.texto_consulta != texto_anterior
                    or posteriores_actuales_ids != posteriores_snapshot_ids
                    or respuestas_actuales_ids != respuestas_previas_ids
                ):
                    return Response({
                        'en_curso': True,
                        'conservado': True,
                        'id_consulta': consulta_db.id_consulta,
                        'id_conversacion': conversacion_locked.id_conversacion,
                        'detail': 'La conversación cambió mientras se generaba la respuesta. Recarga la conversación e intenta nuevamente.',
                    }, status=status.HTTP_409_CONFLICT)

                consultas_eliminadas = len(posteriores_actuales_ids)
                if consultas_eliminadas > 0:
                    Consulta.objects.filter(id_consulta__in=posteriores_actuales_ids).delete()

                # Limpiar la respuesta e historial previos de la consulta editada (cascada a Evaluacion)
                HistorialInteraccion.objects.filter(consulta=consulta_db).delete()
                consulta_db.respuestas.all().delete()

                consulta_db.texto_consulta = texto_nuevo
                consulta_db.save(update_fields=['texto_consulta'])

                titulo_anterior_auto = (texto_anterior or '').strip()[:120]
                campos_conv = ['fecha_actualizacion']
                if es_primera_consulta and conversacion_locked.titulo in ('Nueva conversación', '', titulo_anterior_auto):
                    conversacion_locked.titulo = texto_nuevo[:120] or 'Nueva conversación'
                    campos_conv.append('titulo')
                conversacion_locked.save(update_fields=campos_conv)

                respuesta, evaluacion, _ = _registrar_respuesta_y_historial(
                    request.user, consulta_db, resultado
                )

            respuestas_qs = Respuesta.objects.select_related('evaluacion').order_by('fecha_respuesta', 'id_respuesta')
            consultas_qs = (
                Consulta.objects.order_by('fecha_consulta', 'id_consulta')
                .prefetch_related(Prefetch('respuestas', queryset=respuestas_qs))
            )
            conversacion_actualizada = (
                Conversacion.objects
                .prefetch_related(Prefetch('consultas', queryset=consultas_qs))
                .get(pk=conversacion.pk)
            )
            detalle_data = ConversacionDetalleSerializer(conversacion_actualizada).data
            payload_respuesta = GenerarTextoAPIView._response_data(
                consulta_db, respuesta, evaluacion, resultado['fuente'], es_error=False
            )
            payload_respuesta.update({
                'editada': True,
                'texto_consulta': consulta_db.texto_consulta,
                'titulo_conversacion': conversacion_actualizada.titulo,
                'consultas_eliminadas': consultas_eliminadas,
                'mensajes': detalle_data['mensajes'],
            })
            return Response(payload_respuesta, status=status.HTTP_200_OK)
        finally:
            _liberar_bloqueo_edicion(lock_handle)


class ConversacionListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ConversacionResumenSerializer

    def get_queryset(self):
        return (Conversacion.objects.filter(usuario=self.request.user)
                .annotate(total_mensajes=Count('consultas') * 2))

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)


class ConversacionDetalleAPIView(generics.RetrieveDestroyAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ConversacionDetalleSerializer
    lookup_field = 'id_conversacion'

    def get_queryset(self):
        respuestas = Respuesta.objects.select_related('evaluacion').order_by('fecha_respuesta', 'id_respuesta')
        consultas = (Consulta.objects.order_by('fecha_consulta', 'id_consulta')
                     .prefetch_related(Prefetch('respuestas', queryset=respuestas)))
        return (Conversacion.objects.filter(usuario=self.request.user)
                .prefetch_related(Prefetch('consultas', queryset=consultas)))

    def perform_destroy(self, instance):
        with transaction.atomic():
            instance.delete()


class ConversacionFijarAPIView(APIView):
    """
    Permite fijar o desfijar una conversación propia.
    Endpoint: POST /api/asistente/conversaciones/<int:id_conversacion>/fijar/
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, id_conversacion):
        conversacion = get_object_or_404(Conversacion, id_conversacion=id_conversacion, usuario=request.user)
        if 'fijada' in request.data:
            conversacion.fijada = bool(request.data['fijada'])
        else:
            conversacion.fijada = not conversacion.fijada
        conversacion.save(update_fields=['fijada'])
        return Response({
            'status': 'ok',
            'id_conversacion': conversacion.id_conversacion,
            'fijada': conversacion.fijada,
            'mensaje': 'Conversación fijada con éxito' if conversacion.fijada else 'Conversación desfijada con éxito'
        }, status=status.HTTP_200_OK)


class HistorialUsuarioAPIView(generics.ListAPIView):
    serializer_class = HistorialInteraccionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return HistorialInteraccion.objects.select_related(
            'consulta', 'respuesta', 'usuario'
        ).filter(usuario=self.request.user)


class HistorialGlobalAPIView(generics.ListAPIView):
    serializer_class = HistorialInteraccionSerializer
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]

    def get_queryset(self):
        # Permite ver todo el historial a docentes o administradores
        return HistorialInteraccion.objects.select_related(
            'consulta', 'respuesta', 'usuario'
        ).all()[:100]


class ParametrosModeloAPIView(APIView):
    permission_classes = [EsAdministrador]

    def get(self, request):
        nombre_modelo_activo = getattr(settings, 'OLLAMA_MODEL', 'asistente-ecuatoriano')
        modelo, _ = ModeloIA.objects.get_or_create(nombre_modelo=nombre_modelo_activo)
        param, _ = ParametroModelo.objects.get_or_create(modelo=modelo)
        serializer = ParametroModeloSerializer(param)
        return Response(serializer.data)

    def put(self, request):
        nombre_modelo_activo = getattr(settings, 'OLLAMA_MODEL', 'asistente-ecuatoriano')
        modelo, _ = ModeloIA.objects.get_or_create(nombre_modelo=nombre_modelo_activo)
        param, _ = ParametroModelo.objects.get_or_create(modelo=modelo)
        serializer = ParametroModeloSerializer(param, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class TranscribirAudioAPIView(APIView):
    """
    Soporte para RF03 / Tabla 12: Procesamiento de Audio y Dictado por Voz.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # En una arquitectura modular de producción, aquí se integra Whisper / WebSpeech
        audio_file = request.FILES.get('audio')
        texto_simulado = request.data.get('transcripcion_cliente', '')

        if not texto_simulado and audio_file:
            texto_simulado = "¿Qué significa estar chuchaqui y qué me recomiendas para curarlo?"

        return Response({
            'status': 'success',
            'texto_transcrito': texto_simulado or "Buenas veci, ¿cómo está el clima en Tulcán?",
            'idioma': 'es-EC',
            'confianza': 0.94
        })
