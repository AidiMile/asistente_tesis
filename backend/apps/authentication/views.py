import logging
import re
from django.conf import settings
from django.core.mail import send_mail
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from rest_framework import generics, permissions, status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.views import TokenObtainPairView
from .models import Usuario, Perfil
from .serializers import (
    UsuarioSerializer,
    RegistroSerializer,
    CustomTokenObtainPairSerializer,
    PasswordResetRequestSerializer,
    PasswordResetTokenValidateSerializer,
    PasswordResetConfirmSerializer,
)

logger = logging.getLogger(__name__)


def build_password_reset_email_html(nombre: str, reset_url: str, timeout_hours: int = 1) -> str:
    return f"""<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Restablecer contraseña - PLN-EC</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px 12px; }}
    .container {{ max-width: 560px; margin: 0 auto; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }}
    .header {{ background-color: #032d2a; padding: 32px 24px; text-align: center; color: #ffffff; }}
    .logo-badge {{ display: inline-block; background-color: rgba(255,255,255,0.15); border: 1px solid rgba(250,204,21,0.4); color: #fde047; font-size: 10px; font-weight: 800; padding: 3px 8px; border-radius: 6px; margin-left: 6px; letter-spacing: 0.5px; vertical-align: middle; }}
    .header-title {{ font-size: 24px; font-weight: 800; letter-spacing: -0.5px; margin: 0; }}
    .header-sub {{ font-size: 13px; color: #a7f3d0; margin-top: 6px; font-weight: 500; }}
    .content {{ padding: 36px 30px; color: #1e293b; line-height: 1.65; font-size: 15px; }}
    .greeting {{ font-size: 18px; font-weight: 700; color: #043f39; margin-bottom: 16px; }}
    .btn-wrap {{ text-align: center; margin: 32px 0; }}
    .btn {{ display: inline-block; background-color: #fcd34d; color: #022c22; font-weight: 800; font-size: 15px; text-decoration: none; padding: 14px 34px; border-radius: 14px; box-shadow: 0 4px 14px rgba(252,211,77,0.35); }}
    .security-box {{ background-color: #f8fafc; border-left: 4px solid #0d9488; padding: 16px 18px; border-radius: 8px; font-size: 13px; color: #475569; margin: 26px 0; }}
    .security-box ul {{ margin: 8px 0 0 0; padding-left: 18px; }}
    .security-box li {{ margin-bottom: 4px; }}
    .url-box {{ word-break: break-all; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; font-size: 12px; color: #0d9488; background: #f1f5f9; padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0; margin-top: 8px; }}
    .footer {{ background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 22px 24px; text-align: center; font-size: 12px; color: #64748b; line-height: 1.5; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="header-title">PLN-EC <span class="logo-badge">UPEC</span></h1>
      <div class="header-sub">Asistente Virtual con Identidad Ecuatoriana</div>
    </div>
    <div class="content">
      <p class="greeting">¡Hola, {nombre}!</p>
      <p>Has recibido este mensaje porque se solicitó restablecer la contraseña de acceso a tu cuenta en el <strong>Asistente Virtual PLN-EC</strong>.</p>
      <div class="btn-wrap">
        <a href="{reset_url}" target="_blank" class="btn">Restablecer mi contraseña</a>
      </div>
      <div class="security-box">
        <strong>Información importante de seguridad:</strong>
        <ul>
          <li>Este enlace es de <strong>un solo uso</strong> y caduca en <strong>{timeout_hours} hora(s)</strong>.</li>
          <li>Una vez utilizada la recuperación, este enlace dejará de ser válido de forma permanente.</li>
          <li>Si no solicitaste este cambio, puedes ignorar este correo con total tranquilidad; tu cuenta permanece protegida.</li>
        </ul>
      </div>
      <p style="font-size: 12px; color: #64748b; margin-top: 22px;">
        Si tienes inconvenientes con el botón anterior, copia y pega el siguiente enlace seguro en tu navegador:
      </p>
      <div class="url-box">{reset_url}</div>
    </div>
    <div class="footer">
      Universidad Politécnica Estatal del Carchi (UPEC)<br>
      Carrera de Computación · Tulcán, Ecuador · 2026
    </div>
  </div>
</body>
</html>"""


def build_password_reset_email_plain(nombre: str, reset_url: str, timeout_hours: int = 1) -> str:
    return (
        f"Hola, {nombre}:\n\n"
        f"Se solicitó el restablecimiento de tu contraseña para la plataforma Asistente Virtual PLN-EC (UPEC).\n\n"
        f"Para definir tu nueva contraseña, ingresa al siguiente enlace seguro:\n"
        f"{reset_url}\n\n"
        f"Seguridad:\n"
        f"- Este enlace es de un solo uso y caduca en {timeout_hours} hora(s).\n"
        f"- Si no solicitaste este cambio, puedes ignorar este mensaje; tu cuenta sigue protegida.\n\n"
        f"Universidad Politécnica Estatal del Carchi (UPEC) · Carrera de Computación · 2026"
    )


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'login'


class RegistroView(generics.CreateAPIView):
    queryset = Usuario.objects.all()
    serializer_class = RegistroSerializer
    permission_classes = [permissions.AllowAny]


class PerfilUsuarioView(generics.RetrieveUpdateAPIView):
    serializer_class = UsuarioSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self):
        return self.request.user


class PasswordResetRequestView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset'

    def post(self, request, *args, **kwargs):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        correo = serializer.validated_data['correo'].strip().lower()

        # Buscar usuario sin revelar externamente si existe o no
        user = Usuario.objects.filter(correo__iexact=correo).first()
        if user:
            rol = getattr(getattr(user, 'perfil', None), 'rol', 'Estudiante')

            # Seguridad estricta: solo se permite la recuperación si la cuenta está completamente activa y habilitada
            # Jamás se reactivan cuentas deshabilitadas ni se modifican sus estados durante la recuperación
            if user.is_active and user.estado == 'Activo':
                token = default_token_generator.make_token(user)
                uid = urlsafe_base64_encode(force_bytes(user.pk))
                frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:8080').rstrip('/')
                # Enlace compatible con HashLocationStrategy de Angular (/#/reset-password)
                reset_url = f"{frontend_url}/#/reset-password?uid={uid}&token={token}"

                timeout_hours = getattr(settings, 'PASSWORD_RESET_TIMEOUT', 3600) // 3600 or 1
                html_content = build_password_reset_email_html(user.nombre, reset_url, timeout_hours)
                plain_content = build_password_reset_email_plain(user.nombre, reset_url, timeout_hours)

                from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', None) or 'Asistente Virtual PLN-EC <soporte@upec.edu.ec>'

                try:
                    res = send_mail(
                        subject='Restablecimiento de contraseña - Asistente Virtual PLN-EC',
                        message=plain_content,
                        from_email=from_email,
                        recipient_list=[user.correo],
                        html_message=html_content,
                        fail_silently=False,
                    )
                    if res > 0:
                        logger.info(
                            "[AUTH-RESET] Correo de restablecimiento aceptado por servidor SMTP para usuario id=%s (rol=%s)",
                            user.id_usuario, rol
                        )
                    else:
                        logger.error(
                            "[AUTH-RESET] Servidor SMTP no aceptó el mensaje para usuario id=%s (rol=%s, res=%s)",
                            user.id_usuario, rol, res
                        )
                except Exception as e:
                    # Se registra de forma segura el error sanitizado sin exponer credenciales ni tokens
                    msg_sanitizado = re.sub(r'(?:password|token|key|secret)[=:\s]\s*\S+', '***', str(e), flags=re.IGNORECASE)
                    logger.error(
                        "[AUTH-RESET] Fallo en envío SMTP para usuario id=%s (rol=%s): %s - %s",
                        user.id_usuario, rol, type(e).__name__, msg_sanitizado
                    )
            else:
                logger.warning(
                    "[AUTH-RESET] Solicitud rechazada: cuenta de usuario id=%s (rol=%s, is_active=%s, estado=%s) deshabilitada/inactiva. No se reactiva.",
                    user.id_usuario, rol, user.is_active, user.estado
                )
        else:
            logger.info("[AUTH-RESET] Solicitud procesada para correo no registrado en la base de datos.")

        # Respuesta genérica para evitar enumeración de usuarios
        return Response({
            "detail": "Si el correo electrónico está registrado en el sistema, recibirás un enlace de recuperación en los próximos minutos."
        }, status=status.HTTP_200_OK)


class PasswordResetValidateTokenView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset'

    def post(self, request, *args, **kwargs):
        serializer = PasswordResetTokenValidateSerializer(data=request.data)
        if not serializer.is_valid():
            logger.warning("[AUTH-RESET] Intento de validación con token inválido o expirado.")
            return Response(
                {"valid": False, "detail": "El enlace de recuperación es inválido o ha expirado."},
                status=status.HTTP_400_BAD_REQUEST
            )
        user = serializer.validated_data.get('user')
        user_id = user.id_usuario if user else 'desconocido'
        logger.info("[AUTH-RESET] Token de recuperación validado exitosamente para usuario id=%s.", user_id)
        return Response({"valid": True, "detail": "El enlace de recuperación es válido."}, status=status.HTTP_200_OK)


class PasswordResetConfirmView(APIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = 'password_reset'

    def post(self, request, *args, **kwargs):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        rol = getattr(getattr(user, 'perfil', None), 'rol', 'Estudiante')
        logger.info(
            "[AUTH-RESET] Contraseña restablecida exitosamente para usuario id=%s (rol=%s). Token consumido.",
            user.id_usuario, rol
        )
        return Response({
            "detail": "Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión con tu nueva contraseña."
        }, status=status.HTTP_200_OK)
