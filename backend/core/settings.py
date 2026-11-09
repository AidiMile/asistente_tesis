import os
from pathlib import Path
from datetime import timedelta

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ['DJANGO_SECRET_KEY']

DEBUG = os.getenv('DEBUG', 'False').lower() in ('true', '1', 'yes')

_raw_allowed = os.getenv('ALLOWED_HOSTS', 'localhost,127.0.0.1')
ALLOWED_HOSTS = [h.strip() for h in _raw_allowed.split(',') if h.strip() and h.strip() != '*']
for _h in ['localhost', '127.0.0.1', 'testserver']:
    if _h not in ALLOWED_HOSTS:
        ALLOWED_HOSTS.append(_h)

_raw_csrf = os.getenv('CSRF_TRUSTED_ORIGINS', 'http://localhost:8080,http://127.0.0.1:8080')
CSRF_TRUSTED_ORIGINS = [o.strip() for o in _raw_csrf.split(',') if o.strip()]

# Integración defensiva con Cloudflare Quick Tunnel (sin comodines '*')
_tunnel_file = BASE_DIR / '.tunnel_host'
if _tunnel_file.exists():
    try:
        _t_host = _tunnel_file.read_text().strip().lower()
        if _t_host and _t_host.endswith('.trycloudflare.com') and '*' not in _t_host:
            if _t_host not in ALLOWED_HOSTS:
                ALLOWED_HOSTS.append(_t_host)
            _t_origin = f'https://{_t_host}'
            if _t_origin not in CSRF_TRUSTED_ORIGINS:
                CSRF_TRUSTED_ORIGINS.append(_t_origin)
    except Exception:
        pass

# Cabecera para proxy inverso de confianza (Cloudflare / Nginx)
SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')

# Configuración defensiva de cookies y cabeceras de seguridad
SESSION_COOKIE_SECURE = os.getenv('SESSION_COOKIE_SECURE', 'False').lower() in ('true', '1', 'yes')
CSRF_COOKIE_SECURE = os.getenv('CSRF_COOKIE_SECURE', 'False').lower() in ('true', '1', 'yes')
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',

    # Terceros
    'corsheaders',
    'rest_framework',
    'rest_framework_simplejwt',

    # Módulos del Sistema Tesis PLN-EC
    'apps.authentication',
    'apps.modismos',
    'apps.asistente',
    'apps.evaluacion',
]

MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

ROOT_URLCONF = 'core.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'core.wsgi.application'

# Configuración de Base de Datos PostgreSQL
DB_NAME = os.getenv('POSTGRES_DB', 'asistente_db')
DB_USER = os.getenv('POSTGRES_USER', 'postgres')
DB_PASSWORD = os.environ['POSTGRES_PASSWORD']
DB_HOST = os.getenv('POSTGRES_HOST', 'db')
DB_PORT = os.getenv('POSTGRES_PORT', '5432')

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': DB_NAME,
        'USER': DB_USER,
        'PASSWORD': DB_PASSWORD,
        'HOST': DB_HOST,
        'PORT': DB_PORT,
    }
}

# Modelo de Usuario personalizado
AUTH_USER_MODEL = 'authentication.Usuario'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator', 'OPTIONS': {'min_length': 6}},
]

# Tiempo de expiración del enlace de recuperación de contraseña (en segundos)
PASSWORD_RESET_TIMEOUT = int(os.getenv('PASSWORD_RESET_TIMEOUT', 3600))  # 1 hora

LANGUAGE_CODE = 'es-ec'
TIME_ZONE = 'America/Guayaquil'
USE_I18N = True
USE_TZ = True

STATIC_URL = 'static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

MEDIA_URL = 'media/'
MEDIA_ROOT = BASE_DIR / 'media'

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# REST Framework y Autenticación JWT
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
        'rest_framework.throttling.ScopedRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/day',
        'user': '1000/day',
        'login': '10/minute',
        'password_reset': '5/minute',
        'generar_texto': '15/minute',
        'modismos': '60/minute',
    },
}

# Configuración de Correo Electrónico (Gmail SMTP / Producción / Desarrollo)
EMAIL_HOST = os.getenv('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.getenv('EMAIL_PORT', 587))
EMAIL_USE_TLS = os.getenv('EMAIL_USE_TLS', 'True').lower() in ('true', '1', 'yes')
EMAIL_USE_SSL = os.getenv('EMAIL_USE_SSL', 'False').lower() in ('true', '1', 'yes')
EMAIL_HOST_USER = os.getenv('EMAIL_HOST_USER', '').strip()
EMAIL_HOST_PASSWORD = os.getenv('EMAIL_HOST_PASSWORD', '').strip()
EMAIL_TIMEOUT = int(os.getenv('EMAIL_TIMEOUT', 15))

# Selección de Backend: si se configuran credenciales SMTP, se usa smtp.EmailBackend; si no, consola para desarrollo seguro.
_default_backend = 'django.core.mail.backends.smtp.EmailBackend' if (EMAIL_HOST_USER and EMAIL_HOST_PASSWORD) else 'django.core.mail.backends.console.EmailBackend'
EMAIL_BACKEND = os.getenv('EMAIL_BACKEND', _default_backend)

# El remitente debe corresponder a la cuenta Gmail autenticada para evitar rechazos de entrega en servidores SMTP
_raw_from = os.getenv('DEFAULT_FROM_EMAIL', '').strip()
if not _raw_from or any(p in _raw_from.lower() for p in ('ejemplo', 'coloca', 'tu_correo', 'soporte@upec.edu.ec')):
    if EMAIL_HOST_USER:
        DEFAULT_FROM_EMAIL = f'Asistente Virtual PLN-EC <{EMAIL_HOST_USER}>'
    else:
        DEFAULT_FROM_EMAIL = 'Asistente Virtual PLN-EC <soporte@upec.edu.ec>'
else:
    DEFAULT_FROM_EMAIL = _raw_from

# URL pública de Frontend para enlaces de recuperación
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://localhost:8080')
if _tunnel_file.exists():
    try:
        _t_host = _tunnel_file.read_text().strip().lower()
        if _t_host and _t_host.endswith('.trycloudflare.com') and '*' not in _t_host:
            FRONTEND_URL = f'https://{_t_host}'
    except Exception:
        pass

# Configuración de Logging para trazabilidad de autenticación y diagnóstico seguro
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'standard': {
            'format': '[%(asctime)s] [%(levelname)s] [%(name)s]: %(message)s',
            'datefmt': '%Y-%m-%d %H:%M:%S',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'standard',
        },
    },
    'loggers': {
        'apps.authentication': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
        'apps.asistente': {
            'handlers': ['console'],
            'level': 'INFO',
            'propagate': False,
        },
    },
}

SIMPLE_JWT = {
    'USER_ID_FIELD': 'id_usuario',
    'USER_ID_CLAIM': 'user_id',
    'ACCESS_TOKEN_LIFETIME': timedelta(days=1),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'AUTH_HEADER_TYPES': ('Bearer',),
}

# Configuración CORS para Angular y Flutter
CORS_ALLOW_ALL_ORIGINS = True
_raw_cors = os.getenv('CORS_ALLOWED_ORIGINS', 'http://localhost:8080,http://127.0.0.1:8080,http://localhost:4200,http://127.0.0.1:4200,http://localhost:8081,http://127.0.0.1:8081,http://localhost:80,http://127.0.0.1:80')
CORS_ALLOWED_ORIGINS = [c.strip() for c in _raw_cors.split(',') if c.strip()]
CORS_ALLOW_CREDENTIALS = True

# Configuración de Redis Cache
REDIS_URL = os.getenv('REDIS_URL', 'redis://redis:6379/1')
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': REDIS_URL,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Configuración del Motor Ollama (Redes Neuronales / LLM)
OLLAMA_BASE_URL = os.getenv('OLLAMA_BASE_URL', 'http://ollama:11434')
OLLAMA_MODEL = os.getenv('OLLAMA_MODEL', 'qwen2.5:1.5b')
OLLAMA_KEEP_ALIVE = os.getenv('OLLAMA_KEEP_ALIVE', '30m')
