from django.urls import path
from .views import (
    ResumenMetricasAPIView,
    MetricasSummaryAPIView,
    StatsConsultasAPIView,
    EvaluacionesListAPIView,
    EvaluarRespuestaAPIView,
)

urlpatterns = [
    # Endpoint existente oficial para Angular
    path('resumen/', ResumenMetricasAPIView.as_view(), name='resumen_metricas'),

    # Endpoints directos bajo /api/evaluacion/
    path('summary/', MetricasSummaryAPIView.as_view(), name='metricas_summary'),
    path('stats/', StatsConsultasAPIView.as_view(), name='stats_consultas'),
    path('evaluations/', EvaluacionesListAPIView.as_view(), name='evaluaciones_list'),
    path('evaluate/', EvaluarRespuestaAPIView.as_view(), name='evaluar_respuesta'),

    # Alias bajo /api/evaluacion/metrics/
    path('metrics/summary/', MetricasSummaryAPIView.as_view(), name='metrics_summary_alias'),
    path('metrics/evaluations/', EvaluacionesListAPIView.as_view(), name='evaluaciones_alias'),
    path('metrics/evaluate/', EvaluarRespuestaAPIView.as_view(), name='evaluar_alias'),
]
