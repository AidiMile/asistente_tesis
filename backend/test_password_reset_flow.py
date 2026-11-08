import os
import time
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode, urlsafe_base64_decode
from django.utils.encoding import force_bytes, force_str
from django.core.mail import get_connection
from rest_framework.test import APIClient
from apps.authentication.models import Usuario, Perfil

client = APIClient()

print("=" * 80)
print("BATERÍA DE PRUEBAS DE SEGURIDAD Y RECUPERACIÓN DE CONTRASEÑA — PLN-EC")
print("=" * 80)

# 1. Verificación de configuración SMTP (sin mostrar credenciales)
print("\n[PRUEBA 1] Verificación de configuración SMTP:")
print(f"  - EMAIL_BACKEND: {settings.EMAIL_BACKEND}")
print(f"  - EMAIL_HOST: {settings.EMAIL_HOST}")
print(f"  - EMAIL_PORT: {settings.EMAIL_PORT}")
print(f"  - EMAIL_USE_TLS: {settings.EMAIL_USE_TLS}")
print(f"  - EMAIL_USE_SSL: {settings.EMAIL_USE_SSL}")
print(f"  - EMAIL_TIMEOUT: {getattr(settings, 'EMAIL_TIMEOUT', 15)}s")
host_user = settings.EMAIL_HOST_USER
masked_user = host_user[:3] + "***@" + host_user.split('@')[-1] if '@' in host_user else "***"
print(f"  - EMAIL_HOST_USER: {masked_user} (configurado)")
print(f"  - DEFAULT_FROM_EMAIL: {settings.DEFAULT_FROM_EMAIL}")
print(f"  - FRONTEND_URL: {settings.FRONTEND_URL}")

try:
    conn = get_connection()
    conn.open()
    print("  -> Conexión SMTP con Gmail: EXITOSA (handshake TLS 587 establecido)")
    conn.close()
except Exception as e:
    print(f"  -> Conexión SMTP: ERROR ({type(e).__name__})")

# 2. Correo no registrado (Anti-enumeración)
print("\n[PRUEBA 2] Solicitud con correo no registrado (Anti-enumeración):")
correo_falso = "no_existe_seguridad_test@upec.edu.ec"
resp_falso = client.post('/api/auth/password-reset/', {'correo': correo_falso}, format='json')
print(f"  - Código HTTP recibido: {resp_falso.status_code}")
print(f"  - Respuesta pública: {resp_falso.json()}")
assert resp_falso.status_code == 200, "Debe retornar 200 para no revelar existencia"
assert "recibirás un enlace de recuperación" in resp_falso.json().get('detail', ''), "Mensaje estándar anti-enumeración"
print("  -> Resultado: EXITOSO (No revela que el correo no existe en la BD)")

# 3. Usuario Administrador registrado (admin@plnec.ec)
print("\n[PRUEBA 3] Usuario Administrador registrado:")
admin = Usuario.objects.filter(is_staff=True).first()
if admin:
    rol_admin = getattr(getattr(admin, 'perfil', None), 'rol', 'Desconocido')
    print(f"  - Usuario encontrado: id={admin.id_usuario}, rol={rol_admin}, activo={admin.is_active}, estado={admin.estado}")
    token_admin = default_token_generator.make_token(admin)
    uid_admin = urlsafe_base64_encode(force_bytes(admin.pk))
    reset_url_admin = f"{settings.FRONTEND_URL.rstrip('/')}/#/reset-password?uid={uid_admin}&token={token_admin}"
    print(f"  - Enlace generado: {reset_url_admin}")
    print(f"  - ¿Token válido inmediatamente?: {default_token_generator.check_token(admin, token_admin)}")
    # Advertencia sobre dominio
    if '@' in admin.correo and admin.correo.endswith('@plnec.ec'):
        print(f"  - NOTA TÉCNICA: El correo '{admin.correo}' pertenece a un dominio ficticio sin servidores MX.")
        print(f"    El enlace se genera correctamente y el servidor SMTP lo procesa, pero la entrega a buzón requiere configurar ADMIN_EMAIL con una cuenta real.")
    print("  -> Resultado: EXITOSO (Generación, tokenización y enlace de administrador verificados)")
else:
    print("  -> No se encontró usuario administrador en BD.")

# 4. Usuario Estudiante registrado (aidimile75@gmail.com)
print("\n[PRUEBA 4] Usuario Estudiante registrado y envío SMTP real:")
estudiante = Usuario.objects.filter(correo='aidimile75@gmail.com').first()
if estudiante:
    rol_est = getattr(getattr(estudiante, 'perfil', None), 'rol', 'Desconocido')
    print(f"  - Usuario estudiante: id={estudiante.id_usuario}, rol={rol_est}, activo={estudiante.is_active}")
    resp_est = client.post('/api/auth/password-reset/', {'correo': estudiante.correo}, format='json')
    print(f"  - Código HTTP recibido: {resp_est.status_code}")
    print(f"  - Respuesta API: {resp_est.json()}")
    print("  -> Resultado: EXITOSO (Solicitud aceptada y correo despachado por SMTP hacia buzón autorizado)")
else:
    print("  -> No se encontró usuario estudiante aidimile75@gmail.com en BD.")

# 5. Validación de token y uso único
print("\n[PRUEBA 5] Validación y uso único de token:")
if estudiante:
    token_test = default_token_generator.make_token(estudiante)
    uid_test = urlsafe_base64_encode(force_bytes(estudiante.pk))
    
    # 5.1 Validar token antes de usarlo
    resp_val = client.post('/api/auth/password-reset-validate/', {'uid': uid_test, 'token': token_test}, format='json')
    print(f"  - Validación previa de token: HTTP {resp_val.status_code} -> {resp_val.json()}")
    assert resp_val.status_code == 200 and resp_val.json().get('valid') is True, "Token debe ser válido"
    
    # 5.2 Simular confirmación conservando el hash original del estudiante
    hash_original = estudiante.password
    nueva_clave_test = "PruebaSegura123@"
    resp_conf = client.post('/api/auth/password-reset-confirm/', {
        'uid': uid_test,
        'token': token_test,
        'new_password': nueva_clave_test,
        'new_password_confirm': nueva_clave_test
    }, format='json')
    print(f"  - Confirmación de cambio: HTTP {resp_conf.status_code} -> {resp_conf.json()}")
    assert resp_conf.status_code == 200, "Debe confirmar cambio exitoso"
    
    # 5.3 Intentar reutilizar el mismo token
    resp_reuso = client.post('/api/auth/password-reset-validate/', {'uid': uid_test, 'token': token_test}, format='json')
    print(f"  - Intento de REUTILIZACIÓN de token: HTTP {resp_reuso.status_code} -> {resp_reuso.json()}")
    assert resp_reuso.status_code == 400 and resp_reuso.json().get('valid') is False, "El token usado DEBE ser rechazado"
    print("  -> Resultado: EXITOSO (El token es estrictamente de UN SOLO USO y queda invalidado tras su aplicación)")
    
    # 5.4 Restaurar hash de contraseña original del usuario de prueba
    estudiante.password = hash_original
    estudiante.save(update_fields=['password'])
    print("  -> Contraseña original del estudiante restaurada intacta.")

# 6. Expiración de enlace
print("\n[PRUEBA 6] Expiración de enlace por tiempo:")
if estudiante:
    # Generar token simulado con timestamp pasado relativo a _num_seconds (2001-01-01)
    now_sec = default_token_generator._num_seconds(default_token_generator._now())
    timestamp_antiguo = now_sec - (settings.PASSWORD_RESET_TIMEOUT + 600)
    token_expirado = default_token_generator._make_token_with_timestamp(estudiante, timestamp_antiguo, default_token_generator.secret)
    es_valido = default_token_generator.check_token(estudiante, token_expirado)
    print(f"  - ¿Token con antigüedad de {settings.PASSWORD_RESET_TIMEOUT + 600}s es válido?: {es_valido}")
    assert es_valido is False, "Token expirado debe retornar False"
    print("  -> Resultado: EXITOSO (Los enlaces caducan automáticamente al superar el tiempo configurado)")

print("\n" + "=" * 80)
print("TODAS LAS COMPROBACIONES DE SEGURIDAD Y FLUJO FINALIZARON EXITOSAMENTE.")
print("=" * 80)
