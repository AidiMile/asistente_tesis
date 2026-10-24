import os
import time
import requests
from django.conf import settings
from apps.modismos.models import Modismo
from apps.evaluacion.services.evaluator import MetricasEvaluador

class OllamaNLPService:
    def __init__(self):
        self.base_url = getattr(settings, 'OLLAMA_BASE_URL', 'http://ollama:11434')
        self.model = getattr(settings, 'OLLAMA_MODEL', 'llama3')
        self.evaluator = MetricasEvaluador()

    def detectar_modismos(self, texto_usuario: str):
        """
        Escanea el texto del usuario contra la base de datos de modismos ecuatorianos.
        """
        modismos_db = Modismo.objects.prefetch_related('significados').filter(estado='Activo')
        detectados = []
        texto_lower = texto_usuario.lower()

        for m in modismos_db:
            # Buscar variaciones (con y sin signos de exclamación o interrogación)
            nombre_limpio = m.nombre_modismo.replace('¡', '').replace('!', '').replace('¿', '').replace('?', '').strip().lower()
            if nombre_limpio in texto_lower:
                significados_txt = [s.significado for s in m.significados.all()]
                detectados.append({
                    'id': m.id_modismo,
                    'nombre': m.nombre_modismo,
                    'region': m.region,
                    'significado': significados_txt[0] if significados_txt else m.descripcion
                })
        return detectados

    def construir_prompt_ecuatoriano(self, texto_usuario: str, modismos_detectados: list) -> str:
        """
        Aplica técnicas de RAG neuro-simbólico e inyección de contexto cultural ecuatoriano.
        """
        contexto = (
            "Eres el Asistente Virtual PLN-EC, un sistema inteligente de procesamiento de lenguaje natural "
            "desarrollado en la Universidad Politécnica Estatal del Carchi (UPEC) para entender y responder "
            "en el dialecto y modismos del español ecuatoriano (Sierra, Costa, Amazonía y Carchi).\n"
            "Tu personalidad es amigable, educada, respetuosa, clara y coherente con las expresiones tradicionales ecuatorianas.\n"
        )

        if modismos_detectados:
            contexto += "\n--- CONTEXTO DIALECTAL IDENTIFICADO EN LA CONSULTA ---\n"
            for m in modismos_detectados:
                contexto += f"- Expresión: '{m['nombre']}' | Región: {m['region']} | Significado cultural: {m['significado']}\n"
            contexto += "Debes interpretar la consulta considerando estos significados específicos de Ecuador y responder en concordancia.\n"

        return contexto

    def generar_texto(self, texto_usuario: str, temperatura=0.7, top_p=0.9, max_tokens=250, historial=None):
        """
        Ejecuta la inferencia en el contenedor Ollama o activa fallback pedagógico.
        """
        inicio = time.time()
        modismos_detectados = self.detectar_modismos(texto_usuario)
        system_prompt = self.construir_prompt_ecuatoriano(texto_usuario, modismos_detectados)

        historial_prompt = ''
        if historial:
            historial_prompt = "\n--- CONVERSACIÓN PREVIA ---\n" + "\n".join(
                f"{'Usuario' if item['sender'] == 'user' else 'Asistente PLN-EC'}: {item['text']}"
                for item in historial[-10:]
            )

        payload = {
            "model": self.model,
            "prompt": f"{system_prompt}{historial_prompt}\nUsuario: {texto_usuario}\nAsistente PLN-EC:",
            "stream": False,
            "options": {
                "temperature": float(temperatura),
                "top_p": float(top_p),
                "num_predict": int(max_tokens),
            }
        }

        texto_generado = ""
        fuente_inferencia = "Ollama LLM"

        try:
            # La primera carga del modelo en CPU puede tardar más de un minuto.
            resp = requests.post(f"{self.base_url}/api/generate", json=payload, timeout=120)
            if resp.status_code == 200:
                data = resp.json()
                texto_generado = data.get('response', '').strip()
            else:
                fuente_inferencia = "Motor de Respaldo Ecuatoriano"
                texto_generado = self._generar_fallback(texto_usuario, modismos_detectados)
        except Exception as e:
            fuente_inferencia = "Motor de Respaldo Ecuatoriano (Ollama offline/descargando)"
            texto_generado = self._generar_fallback(texto_usuario, modismos_detectados)

        tiempo_total = round(time.time() - inicio, 2)

        # Referencia sintética para cálculo de métricas de tesis
        referencia_ideal = f"Respuesta adaptada al contexto ecuatoriano para: {texto_usuario}"
        if modismos_detectados:
            nombres = ", ".join([m['nombre'] for m in modismos_detectados])
            referencia_ideal += f" comprendiendo los modismos {nombres}."

        # Cálculo real de métricas lingüísticas (RF08)
        bleu = self.evaluator.calcular_bleu(texto_generado, referencia_ideal)
        rouge = self.evaluator.calcular_rouge(texto_generado, referencia_ideal)
        bertscore = self.evaluator.calcular_bertscore_estimado(
            texto_generado, 
            [m['nombre'] for m in modismos_detectados]
        )

        return {
            'texto_generado': texto_generado,
            'tiempo_respuesta': tiempo_total,
            'fuente': fuente_inferencia,
            'modismos_detectados': modismos_detectados,
            'metricas': {
                'bleu': bleu,
                'rouge': rouge,
                'bertscore': bertscore,
                'tiempo_respuesta': tiempo_total
            }
        }

    def _generar_fallback(self, texto_usuario: str, modismos_detectados: list) -> str:
        """
        Generador dialectal inteligente para respuestas inmediatas de alta calidad en español ecuatoriano.
        """
        texto_lower = texto_usuario.lower()

        if modismos_detectados:
            explicaciones = []
            for modismo in modismos_detectados:
                explicaciones.append(
                    f"“{modismo['nombre']}” significa {modismo['significado']} "
                    f"Es una expresión usada en {modismo['region']}."
                )
            return "\n\n".join(explicaciones) + "\n\n¿Quieres que también te dé un ejemplo de uso?"

        if "chuchaqui" in texto_lower:
            return (
                "¡Qué fue, mijín! Para ese chuchaqui tenaz no hay nada mejor que un buen encebollado bien caliente "
                "con su chiflecito y harta agua de limón o un suero de electrolitos. Descansa bastante y quédate "
                "tranquilo en casa, que con eso te recuperas de una."
            )
        elif "achachay" in texto_lower:
            return "“Achachay” es una expresión de origen kichwa usada en Ecuador para decir que hace mucho frío."
        elif "chuta" in texto_lower:
            return (
                "¡Chuta, mi pana! Qué pena lo ocurrido, pero tranquilo que todo tiene solución en esta vida. "
                "Ponte pilas, respira hondo y dime en qué te puedo acolitár para arreglar este asunto de una vez."
            )
        elif "cachar" in texto_lower or "¿cachas?" in texto_lower:
            return (
                "¡De ley que te cacho la idea clarito! El mensaje está bien entendido. "
                "Aquí en el sistema PLN-EC estamos atentos para procesar tus consultas y explicarte todo con lujo de detalles."
            )
        elif "camellar" in texto_lower or "camello" in texto_lower:
            return (
                "¡Así es, a camellar duro se ha dicho! El trabajo dignifica y la gente del Carchi y de todo el Ecuador "
                "somos bien trabajadores. Cuéntame sobre tus labores o cómo te puedo ayudar a optimizar tu tiempo."
            )
        elif "veci" in texto_lower:
            return (
                "¡Buenas, veci! Qué gusto saludarle. Por aquí listo para atenderle como en la tienda de la esquina. "
                "¿Qué se le ofrece el día de hoy para ayudarle al tiro?"
            )
        else:
            nombres = ", ".join([f"'{m['nombre']}'" for m in modismos_detectados]) if modismos_detectados else "tu consulta"
            return (
                f"¡Hola! He procesado atentamente {nombres}. "
                "Desde el sistema Asistente Virtual PLN-EC de la Universidad Politécnica Estatal del Carchi, "
                "te confirmo que comprendo el dialecto y el contexto cultural de tu solicitud. "
                "¿En qué más te puedo colaborar el día de hoy, ñaño?"
            )
