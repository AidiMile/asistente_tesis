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

    # Campos de entrada opcionales para creación simplificada
    significado = serializers.CharField(write_only=True, required=False, allow_blank=True)
    ejemplo = serializers.CharField(write_only=True, required=False, allow_blank=True)

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
            'significado',
            'ejemplo',
        ]

    def create(self, validated_data):
        sig_texto = validated_data.pop('significado', None)
        eje_texto = validated_data.pop('ejemplo', None)

        if not validated_data.get('descripcion') and sig_texto:
            validated_data['descripcion'] = sig_texto

        modismo = super().create(validated_data)

        if sig_texto:
            Significado.objects.create(modismo=modismo, significado=sig_texto.strip())
        if eje_texto:
            EjemploUso.objects.create(modismo=modismo, ejemplo=eje_texto.strip(), contexto='General / Dialectal')

        return modismo
