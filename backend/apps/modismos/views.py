from rest_framework import generics, permissions, filters
from django.db.models import Q
from .models import Modismo
from .serializers import ModismoSerializer
from apps.authentication.permissions import EsAdministradorOEsLectura

class ModismoListCreateView(generics.ListCreateAPIView):
    queryset = Modismo.objects.prefetch_related('significados', 'ejemplos').all()
    serializer_class = ModismoSerializer
    permission_classes = [EsAdministradorOEsLectura]
    filter_backends = [filters.SearchFilter]
    search_fields = ['nombre_modismo', 'descripcion', 'region', 'significados__significado']

    def get_queryset(self):
        qs = super().get_queryset()
        query = self.request.query_params.get('q', None)
        region = self.request.query_params.get('region', None)
        if query:
            qs = qs.filter(
                Q(nombre_modismo__icontains=query) |
                Q(descripcion__icontains=query) |
                Q(significados__significado__icontains=query)
            ).distinct()
        if region:
            qs = qs.filter(region__icontains=region)
        return qs


class ModismoDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Modismo.objects.prefetch_related('significados', 'ejemplos').all()
    serializer_class = ModismoSerializer
    permission_classes = [EsAdministradorOEsLectura]
