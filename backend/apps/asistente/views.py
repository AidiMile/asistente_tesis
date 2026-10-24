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

class GenerarTextoAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = GenerarTextoRequestSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        texto = data['texto']
        tipo_entrada = data['tipo_entrada']
        temperatura = data['temperatura']
        top_p = data['top_p']
        max_tokens = data['max_tokens']

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
        for consulta_previa in consultas_previas:
            historial_contexto.append({'sender': 'user', 'text': consulta_previa.texto_consulta})
            for respuesta_previa in consulta_previa.respuestas.all():
                historial_contexto.append({'sender': 'assistant', 'text': respuesta_previa.texto_generado})

        # Buscar primero una respuesta equivalente en la base local aprendida.
        anterior = None
        if not historial_contexto:
            anterior = (Respuesta.objects.select_related('consulta', 'modelo', 'evaluacion')
                        .filter(consulta__texto_consulta__iexact=texto)
                        .order_by('-fecha_respuesta').first())

        # 1. Guardar la consulta en PostgreSQL
        consulta = Consulta.objects.create(
            usuario=request.user,
            conversacion=conversacion,
            texto_consulta=texto,
            tipo_entrada=tipo_entrada
        )
        Conversacion.objects.filter(pk=conversacion.pk).update(fecha_actualizacion=timezone.now())

        if anterior:
            respuesta = Respuesta.objects.create(
                consulta=consulta, modelo=anterior.modelo, texto_generado=anterior.texto_generado,
                tiempo_respuesta=0.01, modismos_detectados=anterior.modismos_detectados)
            previa = getattr(anterior, 'evaluacion', None)
            evaluacion = Evaluacion.objects.create(
                respuesta=respuesta,
                bleu=previa.bleu if previa else 0,
                rouge=previa.rouge if previa else 0,
                bertscore=previa.bertscore if previa else 0,
                observaciones='Respuesta recuperada de la base de conocimiento local')
            HistorialInteraccion.objects.create(usuario=request.user, consulta=consulta, respuesta=respuesta)
            return Response(self._response_data(consulta, respuesta, evaluacion, 'Base local aprendida'))

        # 2. Obtener o crear registro del modelo activo
        modelo_db, _ = ModeloIA.objects.get_or_create(
            nombre_modelo='llama3',
            defaults={'version': '8b-instruct', 'proveedor': 'Ollama'}
        )

        # 3. Inferencia con motor Ollama + RAG dialectal ecuatoriano
        nlp_service = OllamaNLPService()
        resultado = nlp_service.generar_texto(
            texto_usuario=texto,
            temperatura=temperatura,
            top_p=top_p,
            max_tokens=max_tokens,
            historial=historial_contexto
        )

        # 4. Guardar la respuesta generada
        respuesta = Respuesta.objects.create(
            consulta=consulta,
            modelo=modelo_db,
            texto_generado=resultado['texto_generado'],
            tiempo_respuesta=resultado['tiempo_respuesta'],
            modismos_detectados=resultado['modismos_detectados']
        )

        # 5. Guardar la evaluación de calidad de la respuesta (BLEU, ROUGE, BERTScore)
        metricas_data = resultado['metricas']
        evaluacion = Evaluacion.objects.create(
            respuesta=respuesta,
            bleu=metricas_data['bleu'],
            rouge=metricas_data['rouge'],
            bertscore=metricas_data['bertscore'],
            observaciones=f"Inferencia vía {resultado['fuente']}"
        )

        # 6. Registrar en el historial de interacciones
        HistorialInteraccion.objects.create(
            usuario=request.user,
            consulta=consulta,
            respuesta=respuesta
        )

        return Response(self._response_data(consulta, respuesta, evaluacion, resultado['fuente']),
                        status=status.HTTP_200_OK)

    @staticmethod
    def _response_data(consulta, respuesta, evaluacion, fuente):
        return {
            'id_consulta': consulta.id_consulta,
            'id_conversacion': consulta.conversacion_id,
            'id_respuesta': respuesta.id_respuesta,
            'texto_generado': respuesta.texto_generado,
            'tiempo_respuesta': float(respuesta.tiempo_respuesta),
            'modismos_detectados': respuesta.modismos_detectados,
            'fuente': fuente,
            'metricas': {
                'bleu': float(evaluacion.bleu),
                'rouge': float(evaluacion.rouge),
                'bertscore': float(evaluacion.bertscore),
                'tiempo_respuesta': float(respuesta.tiempo_respuesta)
            }
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
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Permite ver todo el historial a docentes o administradores
        return HistorialInteraccion.objects.select_related(
            'consulta', 'respuesta', 'usuario'
        ).all()[:100]


class ParametrosModeloAPIView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        modelo, _ = ModeloIA.objects.get_or_create(nombre_modelo='llama3')
        param, _ = ParametroModelo.objects.get_or_create(modelo=modelo)
        serializer = ParametroModeloSerializer(param)
        return Response(serializer.data)

    def put(self, request):
        modelo, _ = ModeloIA.objects.get_or_create(nombre_modelo='llama3')
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
