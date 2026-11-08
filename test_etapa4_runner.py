import os
import sys
import time
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from apps.asistente.services.ollama_client import OllamaNLPService

service = OllamaNLPService()

casos_prueba = [
    {
        "id": 1,
        "consulta": "Hola",
        "descripcion": "Saludo simple aislado (Fast-Path A, sin modismos)",
        "max_tokens": 80
    },
    {
        "id": 2,
        "consulta": "¿Qué significa achachay?",
        "descripcion": "Definición explícita de modismo (Fast-Path C, glosario directo sin apéndice duplicado)",
        "max_tokens": 150
    },
    {
        "id": 3,
        "consulta": "Ñaño, estoy chiro",
        "descripcion": "Consulta corta con 2 modismos (ñaño, chiro)",
        "max_tokens": 120
    },
    {
        "id": 4,
        "consulta": "Estoy chiro, ¿cómo puedo ahorrar?",
        "descripcion": "Consulta explicativa con 1 modismo (chiro)",
        "max_tokens": 180
    },
    {
        "id": 5,
        "consulta": "Ñaño, explícame qué es la inteligencia artificial",
        "descripcion": "Consulta general con 1 modismo vocativo (ñaño)",
        "max_tokens": 180
    },
    {
        "id": 6,
        "consulta": "Necesito conseguir camello",
        "descripcion": "Consulta con modismo polisémico en sentido dialectal laboral (camello)",
        "max_tokens": 140
    },
    {
        "id": 7,
        "consulta": "Ñaño, estoy chiro y necesito conseguir camello.",
        "descripcion": "Consulta con 3 modismos dialectales simultáneos (ñaño, chiro, camello)",
        "max_tokens": 180
    },
    {
        "id": 8,
        "consulta": "¿Qué es una red neuronal?",
        "descripcion": "Consulta científica/técnica general (0 modismos dialectales)",
        "max_tokens": 180
    },
    {
        "id": 9,
        "consulta": "El camello es un animal adaptado para vivir en el desierto.",
        "descripcion": "Consulta con término polisémico en sentido zoológico literal (camello = animal, NO modismo)",
        "max_tokens": 150
    }
]

print("=" * 80)
print("EJECUCIÓN SECUENCIAL CONTROLADA DE PRUEBAS — ETAPA 4")
print("=" * 80)

resultados = []

for caso in casos_prueba:
    cid = caso["id"]
    q = caso["consulta"]
    desc = caso["descripcion"]
    mt = caso["max_tokens"]
    
    print(f"\n[{cid}/9] Evaluando: '{q}'")
    print(f"      Descripción: {desc}")
    
    t0 = time.time()
    try:
        res = service.generar_texto(q, temperatura=0.6, top_p=0.9, max_tokens=mt)
        duracion = round(time.time() - t0, 2)
        
        texto_gen = res.get("texto_generado", "")
        mod_det = res.get("modismos_detectados", [])
        fuente = res.get("fuente", "")
        t_resp = res.get("tiempo_respuesta", 0)
        es_err = res.get("es_error", False)
        
        nombres_mods = [m.get("nombre") for m in mod_det]
        tiene_seccion = "🇪🇨 **Modismos ecuatorianos detectados:**" in texto_gen
        
        print(f"      Fuente: {fuente}")
        print(f"      Tiempo: {t_resp}s (real: {duracion}s)")
        print(f"      Modismos detectados ({len(mod_det)}): {nombres_mods}")
        print(f"      Sección informativa presente: {tiene_seccion}")
        print(f"      Respuesta generada (primeros 250 caracteres):")
        print(f"      \"{texto_gen[:250]}...\"" if len(texto_gen) > 250 else f"      \"{texto_gen}\"")
        
        resultados.append({
            "id": cid,
            "consulta": q,
            "descripcion": desc,
            "fuente": fuente,
            "tiempo": t_resp,
            "modismos": nombres_mods,
            "tiene_seccion": tiene_seccion,
            "es_error": es_err,
            "texto_completo": texto_gen
        })
    except Exception as e:
        print(f"      ERROR EN CASO {cid}: {e}")
        resultados.append({
            "id": cid,
            "consulta": q,
            "descripcion": desc,
            "error": str(e)
        })

print("\n" + "=" * 80)
print("RESUMEN FINAL DE PRUEBAS ETAPA 4:")
print("=" * 80)
for r in resultados:
    if "error" in r:
        print(f"Caso {r['id']}: FALLÓ -> {r['error']}")
    else:
        print(f"Caso {r['id']} ({r['consulta']}): {r['tiempo']}s | Mods: {r['modismos']} | Sección: {r['tiene_seccion']} | Fuente: {r['fuente'][:30]}")

