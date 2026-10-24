from django.db import models

class Modismo(models.Model):
    id_modismo = models.AutoField(primary_key=True)
    nombre_modismo = models.CharField(max_length=100, unique=True)
    descripcion = models.TextField(blank=True, null=True)
    region = models.CharField(max_length=80, default='Sierra / General')
    estado = models.CharField(max_length=20, default='Activo')
    fecha_creacion = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'modismos'
        verbose_name = 'Modismo Ecuatoriano'
        verbose_name_plural = 'Modismos Ecuatorianos'
        ordering = ['nombre_modismo']

    def __str__(self):
        return self.nombre_modismo


class Significado(models.Model):
    id_significado = models.AutoField(primary_key=True)
    modismo = models.ForeignKey(Modismo, on_delete=models.CASCADE, related_name='significados', db_column='id_modismo')
    significado = models.TextField()

    class Meta:
        db_table = 'significados'
        verbose_name = 'Significado'
        verbose_name_plural = 'Significados'

    def __str__(self):
        return f"{self.modismo.nombre_modismo}: {self.significado[:40]}..."


class EjemploUso(models.Model):
    id_ejemplo = models.AutoField(primary_key=True)
    modismo = models.ForeignKey(Modismo, on_delete=models.CASCADE, related_name='ejemplos', db_column='id_modismo')
    ejemplo = models.TextField()
    contexto = models.CharField(max_length=100, default='Conversación informal')

    class Meta:
        db_table = 'ejemplos_uso'
        verbose_name = 'Ejemplo de Uso'
        verbose_name_plural = 'Ejemplos de Uso'

    def __str__(self):
        return f"{self.modismo.nombre_modismo} -> {self.ejemplo[:40]}..."
