from django.db import models
from django.contrib.auth.models import AbstractBaseUser, PermissionsMixin, BaseUserManager

class UsuarioManager(BaseUserManager):
    def create_user(self, correo, nombre, password=None, **extra_fields):
        if not correo:
            raise ValueError('El correo electrónico es obligatorio')
        correo = self.normalize_email(correo)
        user = self.model(correo=correo, nombre=nombre, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, correo, nombre, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('estado', 'Activo')
        return self.create_user(correo, nombre, password, **extra_fields)


class Usuario(AbstractBaseUser, PermissionsMixin):
    id_usuario = models.AutoField(primary_key=True)
    nombre = models.CharField(max_length=120)
    correo = models.EmailField(unique=True, max_length=150)
    estado = models.CharField(max_length=20, default='Activo')
    fecha_registro = models.DateTimeField(auto_now_add=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)

    objects = UsuarioManager()

    USERNAME_FIELD = 'correo'
    REQUIRED_FIELDS = ['nombre']

    class Meta:
        db_table = 'usuarios'
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'

    def __str__(self):
        return f"{self.nombre} ({self.correo})"


class Perfil(models.Model):
    ROLES = (
        ('Estudiante', 'Estudiante'),
        ('Docente', 'Docente'),
        ('Investigador', 'Investigador'),
        ('Administrador', 'Administrador'),
    )

    id_perfil = models.AutoField(primary_key=True)
    usuario = models.OneToOneField(Usuario, on_delete=models.CASCADE, related_name='perfil', db_column='id_usuario')
    rol = models.CharField(max_length=50, choices=ROLES, default='Estudiante')
    foto = models.TextField(blank=True, null=True)
    institucion = models.CharField(max_length=150, default='Universidad Politécnica Estatal del Carchi (UPEC)')
    ultima_conexion = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'perfiles'
        verbose_name = 'Perfil'
        verbose_name_plural = 'Perfiles'

    def __str__(self):
        return f"Perfil de {self.usuario.nombre} - {self.rol}"
