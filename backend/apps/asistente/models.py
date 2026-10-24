from django.db import models
from django.conf import settings

class Intencion(models.Model):
    id_intencion = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'intenciones'
        verbose_name = 'Intención'
        verbose_name_plural = 'Intenciones'

    def __str__(self):
        return self.nombre


class ModeloIA(models.Model):
    id_modelo = models.AutoField(primary_key=True)
    nombre_modelo = models.CharField(max_length=100, default='llama3')
    version = models.CharField(max_length=20, default='8b-instruct')
    proveedor = models.CharField(max_length=50, default='Ollama')
    fecha_entrenamiento = models.DateField(auto_now_add=True)

    class Meta:
        db_table = 'modelos_ia'
        verbose_name = 'Modelo de IA'
        verbose_name_plural = 'Modelos de IA'

    def __str__(self):
        return f"{self.nombre_modelo} ({self.version})"


class ParametroModelo(models.Model):
    id_parametro = models.AutoField(primary_key=True)
    modelo = models.OneToOneField(ModeloIA, on_delete=models.CASCADE, related_name='parametros', db_column='id_modelo')
    temperatura = models.DecimalField(max_digits=4, decimal_places=2, default=0.70)
    top_p = models.DecimalField(max_digits=4, decimal_places=2, default=0.90)
    max_tokens = models.IntegerField(default=150)

    class Meta:
        db_table = 'parametros_modelo'
        verbose_name = 'Parámetro de Modelo'
        verbose_name_plural = 'Parámetros de Modelos'

    def __str__(self):
        return f"Params {self.modelo.nombre_modelo}: temp={self.temperatura}, top_p={self.top_p}"


class Conversacion(models.Model):
    id_conversacion = models.AutoField(primary_key=True)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='conversaciones', db_column='id_usuario'
    )
    titulo = models.CharField(max_length=120, default='Nueva conversación')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'conversaciones'
        ordering = ['-fecha_actualizacion']

    def __str__(self):
        return f"{self.titulo} ({self.usuario.nombre})"


class Consulta(models.Model):
    TIPOS_ENTRADA = (
        ('Texto', 'Texto'),
        ('Audio', 'Audio'),
        ('Dictado por voz', 'Dictado por voz'),
    )

    id_consulta = models.AutoField(primary_key=True)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='consultas', db_column='id_usuario')
    conversacion = models.ForeignKey(Conversacion, on_delete=models.CASCADE, related_name='consultas', db_column='id_conversacion')
    intencion = models.ForeignKey(Intencion, on_delete=models.SET_NULL, null=True, blank=True, related_name='consultas', db_column='id_intencion')
    texto_consulta = models.TextField()
    tipo_entrada = models.CharField(max_length=20, choices=TIPOS_ENTRADA, default='Texto')
    fecha_consulta = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'consultas'
        verbose_name = 'Consulta'
        verbose_name_plural = 'Consultas'
        ordering = ['-fecha_consulta']

    def __str__(self):
        return f"Consulta {self.id_consulta} ({self.usuario.nombre}): {self.texto_consulta[:40]}..."


class Respuesta(models.Model):
    id_respuesta = models.AutoField(primary_key=True)
    consulta = models.ForeignKey(Consulta, on_delete=models.CASCADE, related_name='respuestas', db_column='id_consulta')
    modelo = models.ForeignKey(ModeloIA, on_delete=models.SET_NULL, null=True, blank=True, related_name='respuestas', db_column='id_modelo')
    texto_generado = models.TextField()
    tiempo_respuesta = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    modismos_detectados = models.JSONField(default=list, blank=True)
    fecha_respuesta = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'respuestas'
        verbose_name = 'Respuesta Generada'
        verbose_name_plural = 'Respuestas Generadas'

    def __str__(self):
        return f"Respuesta {self.id_respuesta} -> {self.texto_generado[:40]}..."


class HistorialInteraccion(models.Model):
    id_historial = models.AutoField(primary_key=True)
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='historial', db_column='id_usuario')
    consulta = models.ForeignKey(Consulta, on_delete=models.CASCADE, related_name='historial', db_column='id_consulta')
    respuesta = models.ForeignKey(Respuesta, on_delete=models.CASCADE, related_name='historial', db_column='id_respuesta')
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'historial_interacciones'
        verbose_name = 'Historial de Interacción'
        verbose_name_plural = 'Historial de Interacciones'
        ordering = ['-fecha']
