from rest_framework import serializers
from .models import Conversacion, Consulta, Respuesta, HistorialInteraccion, ParametroModelo, ModeloIA
from apps.evaluacion.models import Evaluacion

class EvaluacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Evaluacion
        fields = ['id_evaluacion', 'bleu', 'rouge', 'bertscore', 'adecuacion_dialectal', 'fecha_evaluacion']


class RespuestaSerializer(serializers.ModelSerializer):
    evaluacion = EvaluacionSerializer(read_only=True)

    class Meta:
        model = Respuesta
        fields = [
            'id_respuesta',
            'texto_generado',
            'tiempo_respuesta',
            'modismos_detectados',
            'fecha_respuesta',
            'evaluacion'
        ]


class ConsultaSerializer(serializers.ModelSerializer):
    respuestas = RespuestaSerializer(many=True, read_only=True)
    usuario_nombre = serializers.ReadOnlyField(source='usuario.nombre')

    class Meta:
        model = Consulta
        fields = [
            'id_consulta',
            'id_usuario',
            'usuario_nombre',
            'texto_consulta',
            'tipo_entrada',
            'fecha_consulta',
            'respuestas'
        ]


class GenerarTextoRequestSerializer(serializers.Serializer):
    texto = serializers.CharField(max_length=1000)
    id_conversacion = serializers.IntegerField(required=False, allow_null=True)
    tipo_entrada = serializers.ChoiceField(choices=['Texto', 'Audio', 'Dictado por voz'], default='Texto')
    temperatura = serializers.FloatField(required=False, default=0.7, min_value=0.0, max_value=1.5)
    top_p = serializers.FloatField(required=False, default=0.9, min_value=0.0, max_value=1.0)
    max_tokens = serializers.IntegerField(required=False, default=200, min_value=20, max_value=800)


class ParametroModeloSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParametroModelo
        fields = ['id_parametro', 'temperatura', 'top_p', 'max_tokens']


class HistorialInteraccionSerializer(serializers.ModelSerializer):
    consulta_texto = serializers.ReadOnlyField(source='consulta.texto_consulta')
    respuesta_texto = serializers.ReadOnlyField(source='respuesta.texto_generado')
    tiempo_respuesta = serializers.ReadOnlyField(source='respuesta.tiempo_respuesta')
    modismos = serializers.ReadOnlyField(source='respuesta.modismos_detectados')
    usuario_nombre = serializers.ReadOnlyField(source='usuario.nombre')
    usuario_correo = serializers.ReadOnlyField(source='usuario.correo')

    class Meta:
        model = HistorialInteraccion
        fields = [
            'id_historial',
            'usuario_nombre',
            'usuario_correo',
            'consulta_texto',
            'respuesta_texto',
            'tiempo_respuesta',
            'modismos',
            'fecha'
        ]


class ConversacionResumenSerializer(serializers.ModelSerializer):
    total_mensajes = serializers.IntegerField(read_only=True)

    class Meta:
        model = Conversacion
        fields = ['id_conversacion', 'titulo', 'fecha_creacion', 'fecha_actualizacion', 'total_mensajes']


class ConversacionDetalleSerializer(serializers.ModelSerializer):
    mensajes = serializers.SerializerMethodField()

    class Meta:
        model = Conversacion
        fields = ['id_conversacion', 'titulo', 'fecha_creacion', 'fecha_actualizacion', 'mensajes']

    def get_mensajes(self, obj):
        mensajes = []
        for consulta in obj.consultas.all():
            mensajes.append({
                'id': consulta.id_consulta,
                'sender': 'user',
                'text': consulta.texto_consulta,
                'timestamp': consulta.fecha_consulta,
            })
            for respuesta in consulta.respuestas.all():
                evaluacion = getattr(respuesta, 'evaluacion', None)
                mensajes.append({
                    'id': respuesta.id_respuesta,
                    'sender': 'assistant',
                    'text': respuesta.texto_generado,
                    'timestamp': respuesta.fecha_respuesta,
                    'modismos': respuesta.modismos_detectados,
                    'metricas': {
                        'bleu': float(evaluacion.bleu),
                        'rouge': float(evaluacion.rouge),
                        'bertscore': float(evaluacion.bertscore),
                        'tiempo_respuesta': float(respuesta.tiempo_respuesta),
                    } if evaluacion else None,
                })
        return mensajes
