import time
from transformers import pipeline

class NLPGenerator:
    def __init__(self, model_name="mrm8488/spanish-gpt2"):
        """
        Inicializa el pipeline de Hugging Face con un modelo optimizado en español.
        """
        self.model_name = model_name
        try:
            print(f"Cargando modelo de Hugging Face: {model_name}...")
            # Usamos pipeline de generación de texto en español
            self.generator = pipeline('text-generation', model=model_name)
            print("¡Modelo cargado exitosamente!")
        except Exception as e:
            print(f"Advertencia: No se pudo cargar el modelo de IA ({e}). Se usará modo respaldo.")
            self.generator = None

    def generar_respuesta(self, texto_usuario, modismo_detectado=None, temperature=0.7, top_p=0.9, max_length=150):
        """
        Genera texto adaptado al contexto ecuatoriano combinando el prompt y los modismos.
        """
        # Construcción del contexto ecuatoriano para la red neuronal
        contexto_sistema = (
            "Eres un asistente virtual ecuatoriano amigable, experto en la cultura, modismos "
            "y expresiones locales del Ecuador (como 'mijin', 'achachay', 'canchero', etc.). "
        )
        
        if modismo_detectado:
            contexto_sistema += f"Término local identificado: '{modismo_detectado}'. "

        prompt_completo = f"{contexto_sistema}\nUsuario: {texto_usuario}\nAsistente:"

        inicio_tiempo = time.time()
        
        if self.generator:
            try:
                # Generación mediante red neuronal Transformers
                outputs = self.generator(
                    prompt_completo,
                    max_length=int(max_length),
                    temperature=float(temperature),
                    top_p=float(top_p),
                    do_sample=True,
                    truncation=True,
                    pad_token_id=50256
                )
                texto_generado = outputs[0]['generated_text']
                # Limpiamos el texto para extraer solo la respuesta del asistente
                respuesta_final = texto_generado.replace(prompt_completo, "").strip()
                if not respuesta_final:
                    respuesta_final = "¡Claro que sí, mijin! Entendido tu requerimiento, lo revisamos de una vez por todas."
            except Exception as e:
                respuesta_final = f"Error en la inferencia neuronal: {str(e)}"
        else:
            # Respuesta simulada en caso de entorno ligero
            respuesta_final = (
                f"¡Qué hubo, mijin! Recibí tu consulta: '{texto_usuario}'. "
                "Desde nuestra hermosa Mitad del Mundo, te ayudo con todo gusto a resolver este tema de tesis."
            )

        tiempo_respuesta = round(time.time() - inicio_tiempo, 2)
        return respuesta_final, tiempo_respuesta