from django.db import models
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
