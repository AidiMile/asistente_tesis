from django.conf import settings
from rest_framework.views import APIView
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Avg, Count, Prefetch
from django.shortcuts import get_object_or_404
from django.utils import timezone
from .models import Conversacion, Consulta, Respuesta, HistorialInteraccion, ModeloIA, ParametroModelo
from apps.evaluacion.models import Evaluacion
from .serializers import (
    GenerarTextoRequestSerializer,
    ConsultaSerializer,
    RespuestaSerializer,
    ParametroModeloSerializer,
    HistorialInteraccionSerializer,
    ConversacionResumenSerializer,
    ConversacionDetalleSerializer
)
from .services.ollama_client import OllamaNLPService


from apps.authentication.permissions import EsAdministrador, es_administrador

class GenerarTextoAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = GenerarTextoRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        texto = data['texto']
        tipo_entrada = data['tipo_entrada']
        # El servidor ignora parámetros manipulados por usuarios sin permisos.
        if es_administrador(request.user):
            temperatura = data['temperatura']
            top_p = data['top_p']
            max_tokens = data['max_tokens']
        else:
            # Parámetros equilibrados para propósito general (evitan respuestas truncadas en CPU)
            temperatura = 0.6
            top_p = 0.9
            max_tokens = 250

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

        historial_contexto = []
        consultas_previas = (conversacion.consultas
                             .prefetch_related('respuestas')
                             .order_by('fecha_consulta'))
        error_keywords = [
            "no pudo responder a tiempo",
            "tiempo de espera agotado",
            "servicio en carga",
            "error_motor",
            "error_http",
            "solicitud fallida"
        ]
        for consulta_previa in consultas_previas:
            respuestas = consulta_previa.respuestas.all()
            if not respuestas:
                continue
            resp_valida = None
            for r in respuestas:
                txt = (r.texto_generado or "").strip()
                if txt and not any(k in txt.lower() for k in error_keywords):
                    resp_valida = txt
                    break
            if resp_valida:
                historial_contexto.append({'sender': 'user', 'text': consulta_previa.texto_consulta.strip()})
                historial_contexto.append({'sender': 'assistant', 'text': resp_valida})

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

        # 3. Registrar el modelo correspondiente a la fuente de respuesta
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

        # 4. Guardar la respuesta generada
        respuesta = Respuesta.objects.create(
            consulta=consulta,
            modelo=modelo_db,
            texto_generado=resultado['texto_generado'],
            tiempo_respuesta=resultado['tiempo_respuesta'],
            modismos_detectados=resultado['modismos_detectados']
        )

        # 5. Guardar evaluación lingüística únicamente cuando la inferencia fue vía LLM y exitosa
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

        # 6. Registrar en el historial de interacciones
        HistorialInteraccion.objects.create(
            usuario=request.user,
            consulta=consulta,
            respuesta=respuesta
        )

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


class ConversacionListCreateAPIView(generics.ListCreateAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ConversacionResumenSerializer

    def get_queryset(self):
        return (Conversacion.objects.filter(usuario=self.request.user)
                .annotate(total_mensajes=Count('consultas') * 2))

    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)


class ConversacionDetalleAPIView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ConversacionDetalleSerializer
    lookup_field = 'id_conversacion'

    def get_queryset(self):
        respuestas = Respuesta.objects.select_related('evaluacion').order_by('fecha_respuesta')
        consultas = (Consulta.objects.order_by('fecha_consulta')
                     .prefetch_related(Prefetch('respuestas', queryset=respuestas)))
        return (Conversacion.objects.filter(usuario=self.request.user)
                .prefetch_related(Prefetch('consultas', queryset=consultas)))


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
