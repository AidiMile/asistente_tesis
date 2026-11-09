from django.urls import path
from .views import (
    GenerarTextoAPIView,
    EditarConsultaAPIView,
    HistorialUsuarioAPIView,
    HistorialGlobalAPIView,
    ParametrosModeloAPIView,
    TranscribirAudioAPIView,
    ConversacionListCreateAPIView,
    ConversacionDetalleAPIView,
    ConversacionFijarAPIView
)

urlpatterns = [
    path('generar/', GenerarTextoAPIView.as_view(), name='generar_texto'),
    path('consultas/<int:id_consulta>/editar/', EditarConsultaAPIView.as_view(), name='editar_consulta'),
    path('conversaciones/', ConversacionListCreateAPIView.as_view(), name='conversaciones'),
    path('conversaciones/<int:id_conversacion>/', ConversacionDetalleAPIView.as_view(), name='conversacion_detalle'),
    path('conversaciones/<int:id_conversacion>/fijar/', ConversacionFijarAPIView.as_view(), name='conversacion_fijar'),
    path('historial/', HistorialUsuarioAPIView.as_view(), name='historial_usuario'),
    path('historial-global/', HistorialGlobalAPIView.as_view(), name='historial_global'),
    path('parametros/', ParametrosModeloAPIView.as_view(), name='parametros_modelo'),
    path('transcribir-audio/', TranscribirAudioAPIView.as_view(), name='transcribir_audio'),
]
