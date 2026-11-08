import os
import sys
import time

if '/app' not in sys.path:
    sys.path.insert(0, '/app')

try:
    import django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
    django.setup()
except RuntimeError:
    pass

from apps.asistente.services.ollama_client import OllamaNLPService
from apps.asistente.views import GenerarTextoAPIView

nlp = OllamaNLPService()

test_cases = [
    {
        "id": 1,
        "nombre": "Saludo aislado",
        "pregunta": "Hola",
        "esperado": "Ruta Rápida (Determinista / Fast-Path UPEC)"
    },
    {
        "id": 2,
        "nombre": "Operación matemática básica",
        "pregunta": "¿Cuánto es 25 multiplicado por 8?",
        "esperado": "Ruta Rápida Aritmética (Fast-Path UPEC)"
    },
    {
        "id": 3,
        "nombre": "Definición de 'achachay'",
        "pregunta": "¿Qué significa achachay?",
        "esperado": "Base de Conocimiento Dialectal UPEC (PostgreSQL)"
    },
    {
        "id": 4,
        "nombre": "Consulta general breve",
        "pregunta": "Explícame qué es el procesamiento del lenguaje natural.",
        "esperado": "Ollama LLM (qwen2.5:1.5b)"
    },
    {
        "id": 5,
        "nombre": "Consulta contextual dialectal",
        "pregunta": "Estoy chiro, ¿cómo puedo ahorrar?",
        "esperado": "Ollama LLM (qwen2.5:1.5b)"
    }
]

resultados = []

for tc in test_cases:
    q = tc["pregunta"]
    tokens = GenerarTextoAPIView._calcular_max_tokens_adaptable(q)
    print(f"\n=======================================================")
    print(f"TEST {tc['id']}: {tc['nombre']}")
    print(f"Consulta: '{q}' | Tokens adaptables: {tokens}")
    print(f"=======================================================")
    
    t0 = time.time()
    try:
        res = nlp.generar_texto(
            texto_usuario=q,
            temperatura=0.6,
            top_p=0.9,
            max_tokens=tokens,
            historial=None
        )
        t_calc = round(time.time() - t0, 3)
        res_text = res.get("texto_generado", "")
        fuente = res.get("fuente", "")
        t_resp = res.get("tiempo_respuesta", t_calc)
        modismos = res.get("modismos_detectados", [])
        es_error = res.get("es_error", False)
        
        print(f"Tiempo: {t_resp}s (Medido: {t_calc}s)")
        print(f"Fuente: {fuente}")
        print(f"Modismos detectados: {modismos}")
        print(f"Longitud: {len(res_text)} caracteres | {len(res_text.split())} palabras")
        print(f"Error: {es_error}")
        print(f"Texto Generado:\n{res_text}")
        
        resultados.append({
            **tc,
            "tokens": tokens,
            "tiempo": t_resp,
            "fuente": fuente,
            "texto": res_text,
            "es_error": es_error
        })
    except Exception as e:
        t_calc = round(time.time() - t0, 3)
        print(f"EXCEPCIÓN EN TEST {tc['id']}: {e}")
        resultados.append({
            **tc,
            "tokens": tokens,
            "tiempo": t_calc,
            "fuente": "Excepción",
            "texto": str(e),
            "es_error": True
        })
    
    # Pausa de 3 segundos entre pruebas para no encolar el procesador
    time.sleep(3)

print("\n\n=======================================================")
print("RESUMEN DE RESULTADOS — ETAPA 3")
print("=======================================================")
for r in resultados:
    print(f"Test {r['id']} | {r['nombre']:<30} | {r['tiempo']:>7}s | Fuente: {r['fuente']}")
