from django.urls import path
from .views import (
    MetricasSummaryAPIView,
    StatsConsultasAPIView,
    EvaluacionesListAPIView,
    EvaluarRespuestaAPIView,
    InteraccionesRecientesAPIView,
)

urlpatterns = [
    path('stats/', StatsConsultasAPIView.as_view(), name='admin_stats'),
    path('metrics/summary/', MetricasSummaryAPIView.as_view(), name='admin_metrics_summary'),
    path('metrics/evaluations/', EvaluacionesListAPIView.as_view(), name='admin_metrics_evaluations'),
    path('metrics/evaluate/', EvaluarRespuestaAPIView.as_view(), name='admin_metrics_evaluate'),
    path('metrics/interacciones/', InteraccionesRecientesAPIView.as_view(), name='admin_interacciones_recientes'),
]

