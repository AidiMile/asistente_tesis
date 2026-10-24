from rest_framework import serializers
from .models import Evaluacion

class EvaluacionDetalleSerializer(serializers.ModelSerializer):
    consulta_texto = serializers.ReadOnlyField(source='respuesta.consulta.texto_consulta')
    respuesta_texto = serializers.ReadOnlyField(source='respuesta.texto_generado')
    tiempo_respuesta = serializers.ReadOnlyField(source='respuesta.tiempo_respuesta')

    class Meta:
        model = Evaluacion
        fields = [
            'id_evaluacion',
            'consulta_texto',
            'respuesta_texto',
            'tiempo_respuesta',
            'bleu',
            'rouge',
            'bertscore',
            'adecuacion_dialectal',
            'observaciones',
            'fecha_evaluacion'
        ]
