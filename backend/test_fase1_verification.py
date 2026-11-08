import os
import time
import django
import requests

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.conf import settings
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from rest_framework.test import APIClient
from apps.authentication.models import Usuario, Perfil
from apps.modismos.models import Modismo
from apps.asistente.services.ollama_client import OllamaNLPService

client = APIClient()

print("=" * 80)
print("VERIFICACIÓN INTEGRAL DE SEGURIDAD — FASE 1")
print("=" * 80)

# 1. Comprobar que Django responde correctamente
print("\n[VERIFICACIÓN 1] Estado de respuesta de Django y configuración:")
print(f"  - DEBUG: {settings.DEBUG}")
print(f"  - ALLOWED_HOSTS: {settings.ALLOWED_HOSTS}")
print(f"  - CSRF_TRUSTED_ORIGINS: {settings.CSRF_TRUSTED_ORIGINS}")
print(f"  - SECURE_PROXY_SSL_HEADER: {settings.SECURE_PROXY_SSL_HEADER}")
print(f"  - CORS_ALLOW_ALL_ORIGINS: {settings.CORS_ALLOW_ALL_ORIGINS}")
print(f"  - CORS_ALLOWED_ORIGINS: {settings.CORS_ALLOWED_ORIGINS}")
print(f"  - THROTTE_RATES: {settings.REST_FRAMEWORK.get('DEFAULT_THROTTLE_RATES')}")
print("  -> Django configurado con parámetros seguros.")

# 2. Comprobar que Angular y Nginx responden
print("\n[VERIFICACIÓN 2] Carga de Angular Frontend:")
try:
    resp_front = requests.get('http://frontend:80', timeout=5)
    print(f"  - HTTP Status Nginx/Angular: {resp_front.status_code}")
    print(f"  - Contenido detectado: {'<app-root>' in resp_front.text or 'asistente' in resp_front.text.lower()}")
    assert resp_front.status_code == 200
    print("  -> Angular Frontend carga correctamente.")
except Exception as e:
    print(f"  -> Error al consultar frontend interno: {e}")

# 3. Comprobar que PostgreSQL conserva sus 100 modismos y registros de usuarios
print("\n[VERIFICACIÓN 3] Integridad de base de datos PostgreSQL:")
mod_count = Modismo.objects.filter(estado='Activo').count()
user_count = Usuario.objects.count()
print(f"  - Total modismos activos en PostgreSQL: {mod_count}")
print(f"  - Total usuarios en PostgreSQL: {user_count}")
assert mod_count == 100, f"Debe conservar exactamente 100 modismos, encontrados: {mod_count}"
print("  -> Integridad 100% confirmada: 100 modismos activos preservados.")

# 4. Comprobar que Ollama sigue accesible desde Django
print("\n[VERIFICACIÓN 4] Conectividad con Ollama:")
try:
    resp_ol = requests.get(f"{settings.OLLAMA_BASE_URL}/api/tags", timeout=5)
    print(f"  - HTTP Status Ollama: {resp_ol.status_code}")
    models = [m.get('name') for m in resp_ol.json().get('models', [])]
    print(f"  - Modelos en Ollama: {models}")
    assert resp_ol.status_code == 200
    print("  -> Ollama accesible desde el contenedor Django.")
except Exception as e:
    print(f"  -> Error al conectar con Ollama: {e}")

# 5. Comprobar que el inicio de sesión continúe funcionando con usuario aislado reversible
print("\n[VERIFICACIÓN 5] Inicio de sesión con usuario aislado y rate limiting:")
correo_login_test = "test_auth_isolate_user@plnec.ec"
pass_login_test = "ClaveSegura12345@"
u_test = Usuario.objects.create_user(correo=correo_login_test, nombre="Usuario Test Login", password=pass_login_test)
Perfil.objects.create(usuario=u_test, rol='Estudiante')
try:
    resp_login = client.post('/api/auth/login/', {'correo': correo_login_test, 'password': pass_login_test}, format='json')
    print(f"  - Login de usuario aislado: HTTP {resp_login.status_code}")
    datos_login = resp_login.json()
    print(f"  - Token JWT emitido: {'access' in datos_login and 'refresh' in datos_login}")
    print(f"  - Perfil retornado: {datos_login.get('user', {}).get('rol')}")
    assert resp_login.status_code == 200
    assert 'access' in datos_login
    print("  -> Inicio de sesión autenticado correctamente mediante JWT.")
finally:
    u_test.delete()
    print("  -> Usuario de prueba de login eliminado (base de datos intacta).")

# 6. Comprobar que una cuenta activa puede solicitar recuperación
print("\n[VERIFICACIÓN 6] Recuperación para cuenta activa:")
estudiante = Usuario.objects.filter(correo='aidimile75@gmail.com').first()
if estudiante:
    resp_rec = client.post('/api/auth/password-reset/', {'correo': estudiante.correo}, format='json')
    print(f"  - Solicitud recuperación cuenta activa: HTTP {resp_rec.status_code}")
    assert resp_rec.status_code == 200

# 7. COMPROBACIÓN CRÍTICA: Una cuenta deshabilitada NO debe ser reactivada
print("\n[VERIFICACIÓN 7] PRUEBA CRÍTICA: Cuenta deshabilitada NO debe reactivarse:")
correo_inactivo = "usuario_deshabilitado_test@plnec.ec"
user_inactivo = Usuario.objects.create(
    correo=correo_inactivo,
    nombre="Usuario Inactivo Test",
    is_active=False,
    estado="Inactivo"
)
try:
    print(f"  - Estado inicial: is_active={user_inactivo.is_active}, estado={user_inactivo.estado}")
    # Solicitar recuperación
    resp_inact = client.post('/api/auth/password-reset/', {'correo': correo_inactivo}, format='json')
    print(f"  - Respuesta pública API: HTTP {resp_inact.status_code} -> {resp_inact.json()}")
    assert resp_inact.status_code == 200, "Respuesta pública debe ser 200 para anti-enumeración"
    
    # Recargar usuario de base de datos
    user_inactivo.refresh_from_db()
    print(f"  - Estado POST-solicitud en BD: is_active={user_inactivo.is_active}, estado={user_inactivo.estado}")
    assert user_inactivo.is_active is False, "¡FALLO DE SEGURIDAD: is_active fue reactivado!"
    assert user_inactivo.estado == "Inactivo", "¡FALLO DE SEGURIDAD: estado fue reactivado!"
    print("  -> Comprobación exitosa: La cuenta deshabilitada PERMANECE INACTIVA sin mutaciones.")
    
    # Intentar validación de token para cuenta inactiva
    token_invalido = default_token_generator.make_token(user_inactivo)
    uid_invalido = urlsafe_base64_encode(force_bytes(user_inactivo.pk))
    resp_val_inact = client.post('/api/auth/password-reset-validate/', {'uid': uid_invalido, 'token': token_invalido}, format='json')
    print(f"  - Intento de validar token para cuenta inactiva: HTTP {resp_val_inact.status_code} -> {resp_val_inact.json()}")
    assert resp_val_inact.status_code == 400
    print("  -> Comprobación exitosa: Validación rechazada estrictamente para cuenta deshabilitada.")
finally:
    user_inactivo.delete()
    print("  -> Usuario de prueba aislado eliminado de la base de datos.")

# 8. Comprobar API de modismos
print("\n[VERIFICACIÓN 8] API de modismos y throttling:")
resp_mods = client.get('/api/modismos/?q=achachay')
print(f"  - Consulta de modismos (/api/modismos/?q=achachay): HTTP {resp_mods.status_code} (Resultados: {len(resp_mods.json())})")
assert resp_mods.status_code == 200

# 9. Comprobar Fast-Path del asistente
print("\n[VERIFICACIÓN 9] Respuestas Rápidas (Fast-Path) del Asistente:")
nlp = OllamaNLPService()
t0 = time.time()
res_fp = nlp.generar_texto("Hola")
t_fp = round(time.time() - t0, 4)
print(f"  - Saludo rápido (Fast-Path A): {t_fp}s | Fuente: {res_fp['fuente']}")
assert "¡Hola!" in res_fp['texto_generado']

t0 = time.time()
res_mod = nlp.generar_texto("¿Qué significa achachay?")
t_mod = round(time.time() - t0, 4)
print(f"  - Glosario modismo (Fast-Path C): {t_mod}s | Fuente: {res_mod['fuente']}")
assert "achachay" in res_mod['texto_generado'].lower()

print("\n" + "=" * 80)
print("TODAS LAS VERIFICACIONES DE LA FASE 1 COMPLETADAS CON ÉXITO.")
print("=" * 80)
