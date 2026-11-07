import time
import re
import requests
from django.conf import settings
from apps.modismos.models import Modismo
from apps.evaluacion.services.evaluator import MetricasEvaluador


class OllamaNLPService:
    """
    Servicio de Inteligencia Artificial para el Asistente Virtual PLN-EC (UPEC).
    Procesa consultas de propósito general (académicas, científicas, cotidianas,
    redacción y análisis) comprendiendo de forma nativa el español ecuatoriano.
    """

    def __init__(self):
        self.base_url = getattr(settings, 'OLLAMA_BASE_URL', 'http://ollama:11434')
        self.model = getattr(settings, 'OLLAMA_MODEL', 'qwen2.5:1.5b')
        self.keep_alive = getattr(settings, 'OLLAMA_KEEP_ALIVE', '60m')
        self.evaluator = MetricasEvaluador()

    def es_consulta_definicion_explicita(self, texto: str) -> tuple[bool, str]:
        """
        Determina si la consulta es una solicitud explícita de definición léxica.
        Retorna (True, termino_buscado) o (False, "").
        Reconoce signos de puntuación (¿?¡!), tildes y variantes sin alterar el texto original.
        No aplica a preguntas que requieran razonamiento, comparación, opinión o contexto general.
        """
        if not texto:
            return False, ""

        t = texto.strip().lower()
        t = re.sub(r'^[¿¡\s«"\'\.]+|[?!«"\'\.\s]+$', '', t).strip()

        # Si contiene conectores o palabras que indican razonamiento complejo o acción, descartar
        indicadores_complejidad = [
            'por qué', 'porque', 'por que', 'compara', 'diferencia', 'origen',
            'historia', 'cuento', 'ensayo', 'resumen', 'recomiendas', 'aconsejas',
            'qué debo hacer', 'que debo hacer', 'cómo se usa', 'como se usa',
            'de dónde viene', 'de donde viene', 'para qué sirve', 'para que sirve'
        ]
        for ind in indicadores_complejidad:
            if ind in t:
                return False, ""

        patrones = [
            # ¿Qué significa X?
            r'^(?:por\s+favor\s+)?(?:dime\s+|sabes\s+)?qu[eé]\s+significa\s+(?:el\s+modismo\s+|la\s+palabra\s+|la\s+expresi[oó]n\s+|el\s+t[eé]rmino\s+)?(.+)$',
            # ¿Qué quiere decir X?
            r'^(?:por\s+favor\s+)?(?:dime\s+|sabes\s+)?qu[eé]\s+quiere\s+decir\s+(?:el\s+modismo\s+|la\s+palabra\s+|la\s+expresi[oó]n\s+|el\s+t[eé]rmino\s+)?(.+)$',
            # ¿Cuál es el significado de X? / significado de X
            r'^(?:por\s+favor\s+)?(?:dime\s+|expl[ií]came\s+)?(?:cu[aá]l\s+es\s+el\s+)?significado\s+de\s+(?:el\s+modismo\s+|la\s+palabra\s+|la\s+expresi[oó]n\s+|el\s+t[eé]rmino\s+)?(.+)$',
            # Definición de X
            r'^(?:por\s+favor\s+)?(?:dime\s+|expl[ií]came\s+)?(?:la\s+)?definici[oó]n\s+de\s+(?:el\s+modismo\s+|la\s+palabra\s+|la\s+expresi[oó]n\s+|el\s+t[eé]rmino\s+)?(.+)$',
            # ¿A qué se refiere X?
            r'^(?:por\s+favor\s+)?(?:dime\s+|sabes\s+)?a\s+qu[eé]\s+se\s+refiere\s+(?:el\s+modismo\s+|la\s+palabra\s+|la\s+expresi[oó]n\s+|el\s+t[eé]rmino\s+)?(.+)$',
        ]

        for p in patrones:
            m = re.match(p, t, re.IGNORECASE)
            if m:
                candidato = m.group(1).strip()
                candidato = re.sub(r'^[«"\'¿¡\s]+|[»"\'!?\s]+$', '', candidato).strip()
                if candidato and len(candidato.split()) <= 5:
                    return True, candidato

        return False, ""

    def buscar_modismo_glosario(self, termino: str):
        """
        Busca un modismo activo en PostgreSQL que coincida con el término consultado,
        contemplando signos de exclamación/interrogación y variantes con pleca '/' (ej. 'bacán / chévere').
        """
        if not termino:
            return None

        termino_norm = re.sub(r'^[¿¡\s«"\'\.]+|[?!«"\'\.\s]+$', '', termino.strip().lower())
        termino_norm = re.sub(r'\s+en\s+(?:el\s+)?ecuador$', '', termino_norm).strip()
        if not termino_norm:
            return None

        modismos_db = Modismo.objects.prefetch_related('significados', 'ejemplos').filter(estado='Activo')
        for m in modismos_db:
            nombre_db = m.nombre_modismo.lower()
            partes = [p.strip() for p in nombre_db.split('/')] if '/' in nombre_db else [nombre_db]
            for p in partes:
                p_limpia = re.sub(r'^[¡¿\s«"\'\.]+|[!?«"\'\.\s]+$', '', p).strip()
                if p_limpia == termino_norm:
                    return m

        return None

    def formatear_respuesta_glosario(self, modismo) -> str:
        """
        Construye una respuesta institucional, estructurada y completa
        a partir del corpus dialectal registrado en PostgreSQL.
        """
        significados = [s.significado.strip() for s in modismo.significados.all() if s.significado.strip()]
        ejemplos = [e.ejemplo.strip() for e in modismo.ejemplos.all() if e.ejemplo.strip()]

        lineas = []
        nombre = modismo.nombre_modismo
        region = modismo.region

        sig_principal = significados[0] if significados else (modismo.descripcion or 'Significado popular de uso extendido.')
        lineas.append(f'En Ecuador, **"{nombre}"** significa: {sig_principal}')
        lineas.append(f'**Región de uso:** {region}.')

        if len(significados) > 1:
            lineas.append('**Otros significados:**')
            for s in significados[1:]:
                lineas.append(f'- {s}')

        if ejemplos:
            lineas.append(f'**Ejemplo:** "{ejemplos[0]}"')
        elif modismo.descripcion and modismo.descripcion != sig_principal:
            lineas.append(f'**Contexto cultural:** {modismo.descripcion}')

        return "\n\n".join(lineas)

    def detectar_modismos(self, texto_usuario: str) -> list:
        """
        Escanea el texto del usuario contra la base de datos de modismos ecuatorianos
        utilizando límites de palabra y división de variantes (por ejemplo 'bacán / chévere').
        No altera el texto del usuario.
        """
        if not texto_usuario:
            return []

        modismos_db = Modismo.objects.prefetch_related('significados').filter(estado='Activo')
        detectados = []
        texto_lower = texto_usuario.lower()
        ids_vistos = set()

        for m in modismos_db:
            if m.id_modismo in ids_vistos:
                continue

            nombre_completo = m.nombre_modismo.lower()
            # Si el modismo tiene variantes con pleca '/', las separamos (ej: 'bacán / chévere')
            partes = [p.strip() for p in nombre_completo.split('/')] if '/' in nombre_completo else [nombre_completo]

            coincide = False
            for parte in partes:
                # Limpiar signos interrogativos o exclamativos iniciales/finales
                variante_limpia = re.sub(r'^[¡¿\s]+|[!?\s]+$', '', parte).strip()
                if not variante_limpia or len(variante_limpia) < 2:
                    continue

                # Búsqueda con límites de caracteres alfanuméricos españoles
                patron = rf'(?<![a-záéíóúüñ]){re.escape(variante_limpia)}(?![a-záéíóúüñ])'
                if re.search(patron, texto_lower, re.IGNORECASE):
                    coincide = True
                    break

            if coincide:
                ids_vistos.add(m.id_modismo)
                significados_txt = [s.significado for s in m.significados.all()]
                detectados.append({
                    'id': m.id_modismo,
                    'nombre': m.nombre_modismo,
                    'region': m.region,
                    'significado': significados_txt[0] if significados_txt else (m.descripcion or '')
                })

        return detectados

    def construir_system_prompt(self, modismos_detectados: list) -> str:
        """
        Construye el System Prompt para el Asistente Virtual UPEC.
        Prioriza las restricciones de formato del usuario, mantiene concisión en CPU
        y previene alucinaciones dialectales.
        """
        prompt = (
            "Eres el Asistente Virtual PLN-EC de propósito general de la Universidad Politécnica Estatal del Carchi (UPEC).\n"
            "Responde en español de forma verídica, clara y directa, respetando estas reglas:\n"
            "1. Cumplimiento estricto de formato: Si el usuario solicita un límite o formato específico "
            "(por ejemplo: cantidad exacta de oraciones, palabras, párrafos, lista o resumen), "
            "CUMPLE ESTRICTAMENTE esa restricción por encima de cualquier otra consideración.\n"
            "2. Estilo por defecto: Si el usuario no pide una longitud o formato específico, entrega una "
            "explicación concisa, clara y completa (de 1 a 2 párrafos breves), terminando siempre tu idea con punto final.\n"
            "3. Manejo de incertidumbre y modismos: Si el usuario consulta sobre una palabra, modismo regional o jerga "
            "ecuatoriana que desconoces o no aparece en tu base de conocimiento, declara honestamente que no tienes "
            "registrada esa expresión. NUNCA inventes significados, etimologías ni dialectos ficticios."
        )

        if modismos_detectados:
            detalles = []
            for m in modismos_detectados:
                significado = m.get('significado', '').strip()
                region = m.get('region', 'Ecuador')
                detalles.append(f'- "{m["nombre"]}": {significado} (Uso en {region}).')

            prompt += (
                "\n\nContexto dialectal ecuatoriano verificado para esta consulta:\n"
                + "\n".join(detalles)
                + "\nInterpreta la consulta con este contexto y responde con total naturalidad."
            )

        return prompt

    def filtrar_historial_contexto(self, historial: list, max_caracteres: int = 1400) -> list:
        """
        Selecciona pares completos de consulta-respuesta del historial reciente,
        asegurando que no sobrepasen el presupuesto de tokens (num_ctx=1024).
        """
        if not historial:
            return []

        pares = []
        par_actual = {}
        for item in historial:
            sender = item.get('sender')
            text = (item.get('text') or '').strip()
            if not text:
                continue
            if sender == 'user':
                par_actual = {'user': text}
            elif sender == 'assistant' and 'user' in par_actual:
                par_actual['assistant'] = text
                pares.append(par_actual)
                par_actual = {}

        seleccionados_rev = []
        caracteres_acumulados = 0

        for par in reversed(pares):
            longitud_par = len(par['user']) + len(par['assistant'])
            if caracteres_acumulados + longitud_par > max_caracteres and seleccionados_rev:
                break
            seleccionados_rev.append(par)
            caracteres_acumulados += longitud_par

        mensajes_historial = []
        for par in reversed(seleccionados_rev):
            mensajes_historial.append({'role': 'user', 'content': par['user']})
            mensajes_historial.append({'role': 'assistant', 'content': par['assistant']})

        return mensajes_historial

    def generar_texto(self, texto_usuario: str, temperatura=0.6, top_p=0.9, max_tokens=250, historial=None) -> dict:
        """
        Procesa la consulta del usuario. Si es una solicitud explícita de definición
        de un modismo existente y activo en PostgreSQL, responde directamente desde la base
        de conocimiento en milisegundos sin invocar a Ollama. Para cualquier otra consulta
        o si el modismo no existe, ejecuta la inferencia con el modelo de lenguaje.
        """
        inicio = time.time()
        texto_limpio = texto_usuario.strip() if texto_usuario else ""

        # 1. Ruta directa para consultas explícitas de significado sobre el glosario UPEC
        es_definicion, termino = self.es_consulta_definicion_explicita(texto_limpio)
        if es_definicion:
            modismo_match = self.buscar_modismo_glosario(termino)
            if modismo_match:
                tiempo_total = round(time.time() - inicio, 4)
                texto_generado = self.formatear_respuesta_glosario(modismo_match)
                sig_primer = modismo_match.significados.first()
                modismos_detectados = [{
                    'id': modismo_match.id_modismo,
                    'nombre': modismo_match.nombre_modismo,
                    'region': modismo_match.region,
                    'significado': sig_primer.significado if sig_primer else (modismo_match.descripcion or '')
                }]
                return {
                    'texto_generado': texto_generado,
                    'tiempo_respuesta': max(tiempo_total, 0.01),
                    'fuente': 'Base de Conocimiento Dialectal UPEC (PostgreSQL)',
                    'modismos_detectados': modismos_detectados,
                    'es_error': False,
                    'tipo_error': None,
                    'es_directa': True,
                    'metricas': {
                        'bleu': None,
                        'rouge': None,
                        'bertscore': None,
                        'tiempo_respuesta': max(tiempo_total, 0.01),
                        'es_error': False,
                        'estado': 'exitosa',
                        'fuente': 'Base de Conocimiento Dialectal UPEC (PostgreSQL)'
                    }
                }

        # 2. Si no es definición explícita o no existe en BD, continúa con inferencia Ollama
        modismos_detectados = self.detectar_modismos(texto_limpio)

        mensajes = [
            {'role': 'system', 'content': self.construir_system_prompt(modismos_detectados)}
        ]

        if historial:
            mensajes.extend(self.filtrar_historial_contexto(historial, max_caracteres=1400))

        # La consulta del usuario se preserva 100% íntegra y original
        mensajes.append({'role': 'user', 'content': texto_limpio})

        payload = {
            "model": self.model,
            "messages": mensajes,
            "stream": False,
            "keep_alive": self.keep_alive,
            "options": {
                "temperature": float(temperatura),
                "top_p": float(top_p),
                "num_predict": int(max_tokens),
                "num_ctx": 1024,
                "repeat_penalty": 1.1,
            }
        }

        texto_generado = ""
        fuente_inferencia = f"Ollama LLM ({self.model})"
        es_error = False
        tipo_error = None

        try:
            resp = requests.post(f"{self.base_url}/api/chat", json=payload, timeout=(5, 90))
            if resp.status_code == 200:
                data = resp.json()
                texto_generado = data.get('message', {}).get('content', '').strip()
                if not texto_generado:
                    raise ValueError('Ollama devolvió una respuesta vacía')

                # Si la generación se cortó por límite de tokens sin puntuación final, podar el fragmento incompleto
                if texto_generado and not texto_generado.endswith(('.', '!', '?', '"', '»', '…', ':')):
                    pos_corte = max(
                        texto_generado.rfind('. '),
                        texto_generado.rfind('.\n'),
                        texto_generado.rfind('!'),
                        texto_generado.rfind('?'),
                        texto_generado.rfind('."'),
                        texto_generado.rfind('.)')
                    )
                    if pos_corte > 40:
                        texto_generado = texto_generado[:pos_corte + 1].strip()
            else:
                es_error = True
                tipo_error = f"error_http_{resp.status_code}"
                fuente_inferencia = f"Error servidor Ollama (HTTP {resp.status_code})"
                texto_generado = self._generar_fallback_honesto(texto_limpio, modismos_detectados)
        except Exception as e:
            es_error = True
            is_timeout = isinstance(e, requests.exceptions.Timeout) or "timeout" in str(e).lower()
            tipo_error = "timeout" if is_timeout else "error_motor"
            fuente_inferencia = "Motor de Respaldo UPEC (Ollama no disponible / timeout)"
            texto_generado = self._generar_fallback_honesto(texto_limpio, modismos_detectados)

        tiempo_total = round(time.time() - inicio, 2)

        # Si ocurrió un timeout o error del motor, no se deben generar métricas de calidad (BLEU, ROUGE, BERTScore)
        # como si fuera una respuesta válida generada por el LLM. Se conserva únicamente el tiempo de respuesta.
        if es_error:
            metricas = {
                'bleu': None,
                'rouge': None,
                'bertscore': None,
                'tiempo_respuesta': tiempo_total,
                'es_error': True,
                'estado': 'fallida',
                'motivo_error': 'Tiempo de espera agotado' if tipo_error == 'timeout' else 'Motor no disponible'
            }
        else:
            # En inferencia conversacional en tiempo real no se presentan métricas científicas simuladas.
            # BLEU, ROUGE y BERTScore se calculan únicamente en protocolos formales de evaluación offline
            # contra un corpus etiquetado y validado. Se preserva con rigor el tiempo de respuesta.
            metricas = {
                'bleu': None,
                'rouge': None,
                'bertscore': None,
                'tiempo_respuesta': tiempo_total,
                'es_error': False,
                'estado': 'exitosa'
            }

        return {
            'texto_generado': texto_generado,
            'tiempo_respuesta': tiempo_total,
            'fuente': fuente_inferencia,
            'modismos_detectados': modismos_detectados,
            'es_error': es_error,
            'tipo_error': tipo_error,
            'metricas': metricas
        }

    def _generar_fallback_honesto(self, texto_usuario: str, modismos_detectados: list) -> str:
        """
        En caso de timeout o indisponibilidad técnica del motor de inferencia,
        evita respuestas evasivas. Si el usuario solicitó específicamente la definición
        de un modismo y este existe en la BD, la entrega; de lo contrario, informa con claridad el fallo.
        """
        texto_lower = texto_usuario.lower()
        es_pregunta_definicion = any(p in texto_lower for p in [
            'qué significa', 'que significa', 'cuál es el significado', 'definición', 'definicion',
            'qué quiere decir', 'que quiere decir', 'a qué se refiere', 'a que se refiere'
        ])

        if es_pregunta_definicion and modismos_detectados:
            explicaciones = []
            for m in modismos_detectados:
                sig = m.get('significado', '') or 'Significado popular de uso extendido.'
                explicaciones.append(f'En Ecuador, **"{m["nombre"]}"** significa: {sig} (Región: {m.get("region", "Nacional")}).')
            return "\n\n".join(explicaciones)

        return (
            "El motor de procesamiento local de lenguaje natural no pudo responder a tiempo "
            "(tiempo de espera agotado o servicio en carga). Por favor, intenta enviar tu consulta "
            "nuevamente o formularla de manera más breve."
        )
