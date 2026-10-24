from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
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
        data = super().validate(attrs)
        data['user'] = {
            'id': self.user.id_usuario,
            'nombre': self.user.nombre,
            'correo': self.user.correo,
            'rol': getattr(getattr(self.user, 'perfil', None), 'rol', 'Estudiante'),
        }
        return data
