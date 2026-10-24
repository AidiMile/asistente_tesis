from django.urls import path
from .views import ResumenMetricasAPIView

urlpatterns = [
    path('resumen/', ResumenMetricasAPIView.as_view(), name='resumen_metricas'),
]
