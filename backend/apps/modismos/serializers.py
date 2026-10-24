from rest_framework import serializers
from .models import Modismo, Significado, EjemploUso

class SignificadoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Significado
        fields = ['id_significado', 'significado']


class EjemploUsoSerializer(serializers.ModelSerializer):
    class Meta:
        model = EjemploUso
        fields = ['id_ejemplo', 'ejemplo', 'contexto']


class ModismoSerializer(serializers.ModelSerializer):
    significados = SignificadoSerializer(many=True, read_only=True)
    ejemplos = EjemploUsoSerializer(many=True, read_only=True)

    class Meta:
        model = Modismo
        fields = [
            'id_modismo',
            'nombre_modismo',
            'descripcion',
            'region',
            'estado',
            'fecha_creacion',
            'significados',
            'ejemplos',
        ]
