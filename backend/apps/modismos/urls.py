from django.urls import path
from .views import ModismoListCreateView, ModismoDetailView

urlpatterns = [
    path('', ModismoListCreateView.as_view(), name='modismos_list_create'),
    path('<int:pk>/', ModismoDetailView.as_view(), name='modismo_detail'),
]
