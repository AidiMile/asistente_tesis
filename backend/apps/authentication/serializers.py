from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth.tokens import default_token_generator
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from .models import Usuario, Perfil

class PerfilSerializer(serializers.ModelSerializer):
    class Meta:
        model = Perfil
        fields = ['id_perfil', 'rol', 'foto', 'institucion', 'ultima_conexion']


class UsuarioSerializer(serializers.ModelSerializer):
    perfil = PerfilSerializer(read_only=True)

    class Meta:
        model = Usuario
        fields = ['id_usuario', 'nombre', 'correo', 'estado', 'fecha_registro', 'perfil']


class RegistroSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    rol = serializers.CharField(write_only=True, required=False, default='Estudiante')

    class Meta:
        model = Usuario
        fields = ['id_usuario', 'nombre', 'correo', 'password', 'rol']

    def create(self, validated_data):
        validated_data.pop('rol', None)
        user = Usuario.objects.create_user(
            correo=validated_data['correo'],
            nombre=validated_data['nombre'],
            password=validated_data['password']
        )
        # El registro público nunca puede otorgar privilegios administrativos.
        Perfil.objects.create(usuario=user, rol='Estudiante')
        return user


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        # Normalización defensiva de correo para evitar rechazos por mayúsculas o espacios accidentales
        username_field = self.username_field
        if username_field in attrs and isinstance(attrs[username_field], str):
            attrs[username_field] = attrs[username_field].strip().lower()
        if 'correo' in attrs and isinstance(attrs['correo'], str):
            attrs['correo'] = attrs['correo'].strip().lower()

        data = super().validate(attrs)
        data['user'] = {
            'id': self.user.id_usuario,
            'nombre': self.user.nombre,
            'correo': self.user.correo,
            'rol': getattr(getattr(self.user, 'perfil', None), 'rol', 'Estudiante'),
        }
        return data


class PasswordResetRequestSerializer(serializers.Serializer):
    correo = serializers.EmailField(required=True)


class PasswordResetTokenValidateSerializer(serializers.Serializer):
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)

    def validate(self, attrs):
        try:
            user_id = force_str(urlsafe_base64_decode(attrs['uid']))
            user = Usuario.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, Usuario.DoesNotExist):
            raise serializers.ValidationError({"detail": "El enlace de recuperación es inválido o ha expirado."})

        # Seguridad estricta: verificar que la cuenta esté activa y habilitada sin mutar estados
        if not (user.is_active and user.estado == 'Activo'):
            raise serializers.ValidationError({"detail": "La cuenta de usuario se encuentra deshabilitada o inactiva."})

        if not default_token_generator.check_token(user, attrs['token']):
            raise serializers.ValidationError({"detail": "El enlace de recuperación es inválido o ha expirado."})

        attrs['user'] = user
        return attrs


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField(required=True)
    token = serializers.CharField(required=True)
    new_password = serializers.CharField(write_only=True, required=True, min_length=6)
    new_password_confirm = serializers.CharField(write_only=True, required=True, min_length=6)

    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError({"new_password_confirm": "Las contraseñas no coinciden."})

        try:
            user_id = force_str(urlsafe_base64_decode(attrs['uid']))
            user = Usuario.objects.get(pk=user_id)
        except (TypeError, ValueError, OverflowError, Usuario.DoesNotExist):
            raise serializers.ValidationError({"detail": "El enlace de recuperación es inválido o ha expirado."})

        # Seguridad estricta: verificar que la cuenta esté activa y habilitada sin mutar estados
        if not (user.is_active and user.estado == 'Activo'):
            raise serializers.ValidationError({"detail": "La cuenta de usuario se encuentra deshabilitada o inactiva."})

        if not default_token_generator.check_token(user, attrs['token']):
            raise serializers.ValidationError({"detail": "El enlace de recuperación es inválido o ha expirado."})

        try:
            validate_password(attrs['new_password'], user=user)
        except DjangoValidationError as e:
            raise serializers.ValidationError({"new_password": list(e.messages)})

        attrs['user'] = user
        return attrs

    def save(self):
        user = self.validated_data['user']
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user
