from django.db import models
from django.conf import settings
from apps.asistente.models import Respuesta

class Evaluacion(models.Model):
    id_evaluacion = models.AutoField(primary_key=True)
    respuesta = models.OneToOneField(Respuesta, on_delete=models.CASCADE, related_name='evaluacion', db_column='id_respuesta')
    bleu = models.DecimalField(max_digits=5, decimal_places=4, default=0.0)
    rouge = models.DecimalField(max_digits=5, decimal_places=4, default=0.0)
    bertscore = models.DecimalField(max_digits=5, decimal_places=4, default=0.0)
    adecuacion_dialectal = models.DecimalField(max_digits=5, decimal_places=2, default=100.0)
    observaciones = models.TextField(blank=True, null=True)
    fecha_evaluacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'evaluaciones'
        verbose_name = 'Evaluación de Calidad'
        verbose_name_plural = 'Evaluaciones de Calidad'

    def __str__(self):
        return f"Evaluación Resp #{self.respuesta.id_respuesta} (BLEU: {self.bleu}, ROUGE: {self.rouge})"


class RegistroInteraccion(models.Model):
    id_interaccion = models.AutoField(primary_key=True)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registros_interacciones',
        db_column='id_usuario'
    )
    rol_usuario = models.CharField(max_length=50, default='Estudiante')
    pregunta_usuario = models.TextField()
    respuesta_ia = models.TextField()
    fecha_hora = models.DateTimeField(auto_now_add=True)
    latencia = models.FloatField(default=0.0)
    consulta = models.ForeignKey(
        'asistente.Consulta',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registros_interaccion',
        db_column='id_consulta'
    )
    respuesta = models.ForeignKey(
        'asistente.Respuesta',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='registros_interaccion',
        db_column='id_respuesta'
    )

    class Meta:
        db_table = 'registro_interacciones'
        verbose_name = 'Registro de Interacción'
        verbose_name_plural = 'Registros de Interacciones'
        ordering = ['-fecha_hora']

    def __str__(self):
        return f"Interacción #{self.id_interaccion} [{self.rol_usuario}] - {self.pregunta_usuario[:30]}"

