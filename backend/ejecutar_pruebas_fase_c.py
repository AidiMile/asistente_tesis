import os
import time
import json
import requests
import django

os.environ['DJANGO_SETTINGS_MODULE'] = 'core.settings'
django.setup()

from apps.authentication.models import Usuario
from rest_framework_simplejwt.tokens import RefreshToken

usuario = Usuario.objects.filter(is_superuser=True).first() or Usuario.objects.first()
token = str(RefreshToken.for_user(usuario).access_token)
headers = {
    'Authorization': f'Bearer {token}',
    'Content-Type': 'application/json'
}

print(f"Usuario para pruebas: {usuario.correo}")
print(f"Iniciando ejecucion secuencial de 6 pruebas controladas...")

def ejecutar_test(numero, titulo, texto, id_conversacion=None):
    print(f"\n==========================================")
    print(f"PRUEBA {numero}: {titulo}")
    print(f"Prompt: {texto}")
    payload = {
        'texto': texto,
        'tipo_entrada': 'Texto'
    }
    if id_conversacion:
        payload['id_conversacion'] = id_conversacion

    t0 = time.time()
    try:
        r = requests.post('http://localhost:8000/api/asistente/generar/', json=payload, headers=headers, timeout=120)
        t_http = round(time.time() - t0, 3)
        if r.status_code == 200:
            data = r.json()
            print(f"Status: {r.status_code} OK")
            print(f"Tiempo HTTP medido: {t_http} s")
            print(f"Tiempo registrado asistente: {data.get('tiempo_respuesta')} s")
            print(f"Fuente: {data.get('fuente')}")
            print(f"Modismos detectados: {[m.get('nombre') for m in data.get('modismos_detectados', [])]}")
            txt = data.get('texto_generado', '')
            print(f"Longitud respuesta: {len(txt)} caracteres")
            print(f"Respuesta generada:\n{txt}")
            return data
        else:
            print(f"Error HTTP {r.status_code}: {r.text[:300]}")
            return None
    except Exception as e:
        print(f"Excepcion en peticion: {e}")
        return None

resultados = {}

# 1. Saludo cotidiano
resultados['1_saludo'] = ejecutar_test(
    "1", "Saludo cotidiano",
    "¡Hola, buenos días!"
)

# 2. Consulta directa de un modismo
resultados['2_modismo_directo'] = ejecutar_test(
    "2", "Consulta directa de un modismo ecuatoriano",
    "¿Qué significa achachay?"
)

# 3. Pregunta conversacional que requiere Ollama (90 tokens aprox)
resultados['3_conversacional'] = ejecutar_test(
    "3", "Pregunta conversacional cotidiana en Ollama",
    "¿Qué lugares turísticos me recomiendas visitar en Tulcán?"
)

# 4. Pregunta explicativa que requiere Ollama (130 tokens aprox)
resultados['4_explicativa'] = ejecutar_test(
    "4", "Pregunta explicativa conceptual en Ollama",
    "Explica qué es una red neuronal artificial y cómo aprende en tres oraciones claras."
)

# 5. Dos preguntas consecutivas relacionadas (continuidad)
res_5a = ejecutar_test(
    "5A", "Continuidad - Pregunta inicial",
    "Me gusta la gastronomía ecuatoriana. ¿Qué plato típico me sugieres probar primero?"
)
conv_id = res_5a.get('id_conversacion') if res_5a else None

res_5b = ejecutar_test(
    "5B", "Continuidad - Pregunta de seguimiento",
    "¿Y qué ingredientes principales lleva ese plato que mencionaste?",
    id_conversacion=conv_id
)
resultados['5a_continuidad'] = res_5a
resultados['5b_continuidad'] = res_5b

# 6. Pregunta ambigua con modismos contextuales
resultados['6_modismos_contextuales'] = ejecutar_test(
    "6", "Interpretación contextual de modismos ecuatorianos",
    "El fin de semana me fui a la caleta de un pana pero estaba chiro y hacía un frío de achachay, ¿qué podíamos hacer sin gastar plata?"
)

print("\n==========================================")
print("TODAS LAS PRUEBAS CONTROLADAS HAN FINALIZADO.")
