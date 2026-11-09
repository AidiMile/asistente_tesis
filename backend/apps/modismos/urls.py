from django.urls import path  # type: ignore  # pyrefly: ignore
from .views import ModismoListCreateView, ModismoDetailView, CargaMasivaModismosView

urlpatterns = [
    path('', ModismoListCreateView.as_view(), name='modismos_list_create'),
    path('carga-masiva/', CargaMasivaModismosView.as_view(), name='modismos_carga_masiva'),
    path('<int:pk>/', ModismoDetailView.as_view(), name='modismo_detail'),
]
