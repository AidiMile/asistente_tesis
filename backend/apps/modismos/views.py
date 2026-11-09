import csv
import io
from rest_framework import generics, permissions, filters, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.throttling import ScopedRateThrottle
from django.db.models import Q
from .models import Modismo, Significado, EjemploUso
from .serializers import ModismoSerializer
from apps.authentication.permissions import EsAdministradorOEsLectura, EsAdministrador

class ModismoListCreateView(generics.ListCreateAPIView):
    queryset = Modismo.objects.prefetch_related('significados', 'ejemplos').all().order_by('-id_modismo')
    serializer_class = ModismoSerializer
    permission_classes = [EsAdministradorOEsLectura]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'modismos'
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


class CargaMasivaModismosView(APIView):
    """
    Endpoint exclusivo para Administradores para carga masiva de modismos vía CSV o Excel (.xlsx).
    """
    permission_classes = [permissions.IsAuthenticated, EsAdministrador]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        archivo = request.FILES.get('archivo')
        if not archivo:
            return Response(
                {'detail': 'Debe adjuntar un archivo .csv o .xlsx en el campo archivo.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        nombre_archivo = archivo.name.lower()
        filas = []

        if nombre_archivo.endswith('.csv'):
            try:
                contenido = archivo.read().decode('utf-8-sig')
            except UnicodeDecodeError:
                archivo.seek(0)
                contenido = archivo.read().decode('latin-1')

            # Detectar delimitador (coma o punto y coma)
            primera_linea = contenido.splitlines()[0] if contenido.splitlines() else ''
            delimiter = ';' if ';' in primera_linea else ','
            lector = csv.DictReader(io.StringIO(contenido), delimiter=delimiter)
            for r in lector:
                filas.append(r)

        elif nombre_archivo.endswith('.xlsx'):
            try:
                import openpyxl
                wb = openpyxl.load_workbook(archivo, data_only=True)
                hoja = wb.active
                iter_filas = hoja.iter_rows(values_only=True)
                encabezados = next(iter_filas, None)
                if encabezados:
                    keys = [str(k).strip() if k is not None else f'col_{i}' for i, k in enumerate(encabezados)]
                    for row in iter_filas:
                        if any(cell is not None for cell in row):
                            fila_dict = {keys[i]: (str(cell).strip() if cell is not None else '') for i, cell in enumerate(row) if i < len(keys)}
                            filas.append(fila_dict)
            except Exception as e:
                return Response({'detail': f'Error al procesar archivo Excel: {str(e)}'}, status=status.HTTP_400_BAD_REQUEST)
        else:
            return Response({'detail': 'Formato no compatible. Suba un archivo .csv o .xlsx.'}, status=status.HTTP_400_BAD_REQUEST)

        if not filas:
            return Response({'detail': 'El archivo no contiene filas de datos.'}, status=status.HTTP_400_BAD_REQUEST)

        creados = 0
        duplicados = 0
        errores = []

        def _buscar_valor(row_dict, alias_list):
            for k, v in row_dict.items():
                k_clean = str(k).strip().lower()
                for a in alias_list:
                    if a in k_clean:
                        return str(v).strip() if v else ''
            return ''

        for idx, row in enumerate(filas, start=2):
            termino = _buscar_valor(row, ['termino', 'palabra', 'modismo', 'nombre', 'expresion'])
            region = _buscar_valor(row, ['region', 'provincia', 'zona', 'ubicacion']) or 'Nacional'
            significado = _buscar_valor(row, ['significado', 'definicion', 'concepto', 'descripcion'])
            ejemplo = _buscar_valor(row, ['ejemplo', 'uso', 'contexto'])

            if not termino:
                continue

            mod_existente = Modismo.objects.filter(nombre_modismo__iexact=termino).first()
            if mod_existente:
                duplicados += 1
                if significado and not mod_existente.significados.exists():
                    Significado.objects.create(modismo=mod_existente, significado=significado)
                if ejemplo and not mod_existente.ejemplos.exists():
                    EjemploUso.objects.create(modismo=mod_existente, ejemplo=ejemplo, contexto='General')
            else:
                try:
                    nuevo_mod = Modismo.objects.create(
                        nombre_modismo=termino,
                        region=region,
                        descripcion=significado or 'Sin descripción disponible',
                        estado='Activo'
                    )
                    if significado:
                        Significado.objects.create(modismo=nuevo_mod, significado=significado)
                    if ejemplo:
                        EjemploUso.objects.create(modismo=nuevo_mod, ejemplo=ejemplo, contexto='General')
                    creados += 1
                except Exception as err:
                    errores.append(f"Fila {idx} ({termino}): {str(err)}")

        total_procesados = creados + duplicados
        return Response({
            'total_procesados': total_procesados,
            'creados': creados,
            'duplicados': duplicados,
            'errores': errores,
            'mensaje': f"Carga masiva completada: {creados} modismos creados exitosamente, {duplicados} ya registrados previamente."
        }, status=status.HTTP_200_OK)
