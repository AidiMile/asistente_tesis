import os

from django.core.management.base import BaseCommand
from apps.authentication.models import Perfil, Usuario


class Command(BaseCommand):
    help = 'Garantiza una única cuenta administradora configurada por entorno.'

    def handle(self, *args, **options):
        correo = os.getenv('ADMIN_EMAIL', 'admin@plnec.ec').strip().lower()
        password = os.environ['ADMIN_PASSWORD']
        nombre = os.getenv('ADMIN_NAME', 'Administradoras PLN-EC')

        admin, created = Usuario.objects.get_or_create(
            correo=correo,
            defaults={'nombre': nombre, 'estado': 'Activo', 'is_active': True,
                      'is_staff': True, 'is_superuser': True},
        )
        admin.nombre = nombre
        admin.estado = 'Activo'
        admin.is_active = admin.is_staff = admin.is_superuser = True
        if created or not admin.has_usable_password():
            admin.set_password(password)
        admin.save()
        Perfil.objects.update_or_create(usuario=admin, defaults={'rol': 'Administrador'})

        Perfil.objects.filter(rol='Administrador').exclude(usuario=admin).update(rol='Estudiante')
        Usuario.objects.exclude(pk=admin.pk).update(is_staff=False, is_superuser=False)
        self.stdout.write(self.style.SUCCESS(f'Administrador único listo: {correo}'))
