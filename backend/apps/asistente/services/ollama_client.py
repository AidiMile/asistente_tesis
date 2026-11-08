import time
import re
import ast
import operator
import unicodedata
import requests
from django.conf import settings
from apps.modismos.models import Modismo
from apps.evaluacion.services.evaluator import MetricasEvaluador


_OPERADORES_ARITMETICOS_SEGUROS = {
    ast.Add: ('+', operator.add),
    ast.Sub: ('-', operator.sub),
    ast.Mult: ('*', operator.mul),
    ast.Div: ('/', operator.truediv),
    ast.USub: ('-', operator.neg),
    ast.UAdd: ('+', operator.pos),
}

def _evaluar_nodo_ast_seguro(nodo):
    """
    Evaluador recursivo seguro sobre AST para expresiones aritméticas elementales.
    Rechaza estrictamente llamadas a funciones, variables, atributos o cualquier nodo no numérico.
    """
    if isinstance(nodo, ast.Constant):
        if isinstance(nodo.value, (int, float)):
            return nodo.value
        raise ValueError("Constante no numérica")
    if hasattr(ast, 'Num') and isinstance(nodo, ast.Num):
        return nodo.n
    if isinstance(nodo, ast.BinOp):
        tipo_op = type(nodo.op)
        if tipo_op not in _OPERADORES_ARITMETICOS_SEGUROS:
            raise ValueError(f"Operador no permitido: {tipo_op}")
        izq = _evaluar_nodo_ast_seguro(nodo.left)
        der = _evaluar_nodo_ast_seguro(nodo.right)
        if tipo_op is ast.Div and der == 0:
            raise ZeroDivisionError("División por cero")
        _, fn = _OPERADORES_ARITMETICOS_SEGUROS[tipo_op]
        return fn(izq, der)
    if isinstance(nodo, ast.UnaryOp):
        tipo_op = type(nodo.op)
        if tipo_op not in _OPERADORES_ARITMETICOS_SEGUROS:
            raise ValueError(f"Operador unario no permitido: {tipo_op}")
        val = _evaluar_nodo_ast_seguro(nodo.operand)
        _, fn = _OPERADORES_ARITMETICOS_SEGUROS[tipo_op]
        return fn(val)
    raise ValueError(f"Nodo AST no permitido: {type(nodo)}")


class OllamaNLPService:
    """
    Servicio de Inteligencia Artificial para el Asistente Virtual PLN-EC (UPEC).
    Procesa consultas de propósito general (académicas, científicas, cotidianas,
    redacción y análisis) comprendiendo de forma nativa el español ecuatoriano.
    """

    def __init__(self):
        self.base_url = getattr(settings, 'OLLAMA_BASE_URL', 'http://ollama:11434')
        self.model = getattr(settings, 'OLLAMA_MODEL', 'qwen2.5:1.5b')
        self.keep_alive = getattr(settings, 'OLLAMA_KEEP_ALIVE', '30m')
        self.evaluator = MetricasEvaluador()

    @staticmethod
    def _normalizar_texto(texto: str) -> str:
        """
        Normaliza el texto a minúsculas, eliminando tildes y diéresis pero PRESERVANDO la letra 'ñ'.
        """
        if not texto:
            return ""
        texto = texto.lower()
        texto = texto.replace('ñ', '___enie___')
        texto = ''.join(c for c in unicodedata.normalize('NFD', texto) if unicodedata.category(c) != 'Mn')
        texto = texto.replace('___enie___', 'ñ')
        return texto

    @staticmethod
    def _es_falso_positivo_polisemico(termino: str, texto_norm: str) -> bool:
        """
        Detecta si una palabra polisémica se está utilizando en su sentido estándar / literal
        y NO como modismo ecuatoriano. Retorna True si es un falso positivo (debe excluirse).
        """
        termino_clean = termino.strip().lower()

        # 1. 'camello': En Ecuador = trabajo/empleo. Sentido literal = animal del desierto.
        if 'camello' in termino_clean:
            indicadores_animal = [
                'animal', 'desierto', 'joroba', 'dromedario', 'sahara', 'mamifero',
                'zoo', 'zoologico', 'fauna', 'especie', 'herbivoro', 'arena', 'duna'
            ]
            if any(ind in texto_norm for ind in indicadores_animal):
                return True

        # 2. 'chapa': En Ecuador = policía / apodo. Sentido literal = cerradura, lámina metálica.
        if 'chapa' in termino_clean:
            indicadores_cerradura = [
                'puerta', 'cerradura', 'llave', 'candado', 'cerrojo', 'metal', 'lamina', 'chapa de metal'
            ]
            if any(ind in texto_norm for ind in indicadores_cerradura):
                return True

        # 3. 'foco': En Ecuador = vergüenza, bochorno ('qué foco'). Sentido literal = bombilla, luz, centro de atención.
        if 'foco' in termino_clean:
            indicadores_luz = [
                'luz', 'bombilla', 'led', 'lampara', 'apagar', 'encender', 'iluminar', 'vatio', 'foco de atencion', 'foco central'
            ]
            if any(ind in texto_norm for ind in indicadores_luz):
                return True

        # 4. 'coche': En Ecuador (Sierra sur) = cerdo, puerco o sucio. Sentido estándar = automóvil / carro.
        if 'coche' in termino_clean:
            indicadores_vehiculo = [
                'carro', 'auto', 'vehiculo', 'automovil', 'manejar', 'conducir', 'motor', 'gasolina', 'ruedas', 'llanta', 'parquear', 'estacionar'
            ]
            if any(ind in texto_norm for ind in indicadores_vehiculo):
                return True

        # 5. 'biela': En Ecuador = cerveza. Sentido mecánico = biela de motor.
        if 'biela' in termino_clean:
            indicadores_mecanica = [
                'motor', 'piston', 'cigueñal', 'mecanica', 'cárter', 'cilindro'
            ]
            if any(ind in texto_norm for ind in indicadores_mecanica):
                return True

        # 6. 'puntas': En Ecuador = aguardiente artesanal de caña. Sentido geométrico = extremos, esquinas.
        if 'puntas' in termino_clean:
            indicadores_geometricos = [
                'estrella', 'lapiz', 'dedos', 'flecha', 'triangulo', 'esquinas', 'extremos', 'clavos'
            ]
            if any(ind in texto_norm for ind in indicadores_geometricos):
                return True

        return False

    @staticmethod
    def formatear_seccion_modismos_detectados(modismos_detectados: list) -> str:
        """
        Construye la sección informativa estructurada de modismos ecuatorianos detectados
        para anexar al final de la respuesta generada.
        """
        if not modismos_detectados:
            return ""

        lineas = ["\n\n🇪🇨 **Modismos ecuatorianos detectados:**"]
        vistos = set()
        for m in modismos_detectados:
            nombre = m.get('nombre', '')
            if not nombre or nombre in vistos:
                continue
            vistos.add(nombre)
            sig = (m.get('significado') or '').strip()
            if not sig:
                sig = 'Expresión dialectal ecuatoriana registrada en el corpus institucional.'
            lineas.append(f"- **{nombre}**: {sig}")

        return "\n".join(lineas)

    def resolver_saludo_o_cortesia(self, texto: str) -> tuple[bool, str]:
        """
        Ruta Rápida (Fast-Path) para saludos, despedidas y cortesías aisladas.
        Retorna (True, respuesta) si es un saludo o cortesía puramente aislado,
        o (False, "") si contiene contenido mixto, dialógico o sustantivo que debe procesar Ollama.
        """
        if not texto:
            return False, ""

        t = texto.strip().lower()
        t_limpio = re.sub(r'^[^\w\s\d]+|[^\w\s\d]+$', '', t).strip()
        t_limpio = re.sub(r'[,;:]', ' ', t_limpio)
        t_limpio = re.sub(r'\s+', ' ', t_limpio).strip()

        # Si contiene palabras o conectores que implican preguntas sustantivas o dialectales, enviar a Ollama
        palabras_sustantivas = [
            'explica', 'explícame', 'explicame', 'qué es', 'que es', 'qué son', 'que son',
            'por qué', 'porque', 'por que', 'cómo puedo', 'como puedo', 'cómo funciona',
            'chiro', 'ñaño', 'achachay', 'modismo', 'red neuronal', 'tesis', 'significa',
            'ayúdame con', 'ayudame con', 'necesito', 'duda', 'pregunta', 'segundo punto'
        ]
        if any(p in t_limpio for p in palabras_sustantivas):
            return False, ""

        # 1. Saludos directos aislados
        patron_saludo = r'^(?:¡?hola!?|buenos?\s+d[ií]as?|buenas?\s+tardes?|buenas?\s+noches?|saludos?|hola\s+buenos?\s+d[ií]as?|hola\s+buenas?\s+tardes?|hola\s+buenas?\s+noches?)$'
        if re.match(patron_saludo, t_limpio):
            return True, "¡Hola! Soy el Asistente Virtual PLN-EC de la Universidad Politécnica Estatal del Carchi (UPEC). ¿En qué puedo orientarte o ayudarte hoy?"

        # 2. Estado de ánimo / qué tal
        patron_estado = r'^(?:c[oó]mo\s+est[aá]s?|qu[eé]\s+tal|c[oó]mo\s+te\s+va|c[oó]mo\s+ha\s+ido)$'
        if re.match(patron_estado, t_limpio):
            return True, "¡Hola! Me encuentro muy bien y listo para ayudarte con consultas académicas, tecnológicas, culturales o temas cotidianos. ¿De qué te gustaría hablar?"

        # 3. Agradecimiento aislado
        patron_gracias = r'^(?:muchas\s+gracias|gracias|te\s+lo\s+agradezco|gracias\s+por\s+tu\s+ayuda|mil\s+gracias)$'
        if re.match(patron_gracias, t_limpio):
            return True, "¡Con mucho gusto! Si tienes alguna otra inquietud o necesitas profundizar en cualquier tema, aquí estaré para asistirte."

        # 4. Despedida aislada
        patron_despedida = r'^(?:adi[oó]s|hasta\s+luego|hasta\s+pronto|chao|nos\s+vemos|hasta\s+ma[ñn]ana)$'
        if re.match(patron_despedida, t_limpio):
            return True, "¡Hasta pronto! Que tengas un excelente día y mucho éxito en tus actividades académicas. Vuelve cuando lo desees."

        return False, ""

    def resolver_operacion_aritmetica(self, texto: str) -> tuple[bool, str]:
        """
        Ruta Rápida (Fast-Path) para operaciones aritméticas elementales (+, -, *, /).
        Utiliza un parser sobre AST con lista blanca estricta; jamás evalúa código arbitrario.
        Retorna (True, respuesta) o (False, "").
        """
        if not texto:
            return False, ""

        t = texto.strip().lower()
        t_limpio = re.sub(r'^[^\w\s\d]+|[^\w\s\d]+$', '', t).strip()

        # Excluir consultas conceptuales, dialectales o que requieran análisis conversacional
        palabras_excluyentes = [
            'red', 'neuronal', 'tesis', 'significa', 'chiro', 'ahorrar', 'hola',
            'cómo', 'como', 'por qué', 'porque', 'conversación', 'conversacion',
            'explica', 'explícame', 'diferencia', 'resumen', 'ensayo', 'punto'
        ]
        if any(p in t_limpio for p in palabras_excluyentes):
            return False, ""

        # Limpiar prefijo habitual de preguntas aritméticas
        expr = re.sub(r'^(?:por\s+favor\s+)?(?:dime\s+|sabes\s+)?(?:cu[aá]nto\s+es|calcula|resuelve)\s+', '', t_limpio).strip()

        # Normalizar operadores expresados en lenguaje natural
        expr = re.sub(r'\bmultiplicado\s+por\b', '*', expr)
        expr = re.sub(r'\s+por\s+', ' * ', expr)
        expr = re.sub(r'\bdividido\s+(?:entre|para|por)\b', '/', expr)
        expr = re.sub(r'\bm[aá]s\b', '+', expr)
        expr = re.sub(r'\bmenos\b', '-', expr)
        expr = expr.replace('x', '*').replace('×', '*').replace('÷', '/')

        # Comprobación de seguridad estricta: debe contener dígitos y solo caracteres aritméticos
        if not re.search(r'\d', expr) or not re.match(r'^[0-9\s\+\-\*\/\(\)\.]+$', expr):
            return False, ""

        try:
            tree = ast.parse(expr, mode='eval')
            res = _evaluar_nodo_ast_seguro(tree.body)
            if isinstance(res, float) and res.is_integer():
                res = int(res)
            elif isinstance(res, float):
                res = round(res, 4)

            t_pregunta = texto.strip().rstrip('?').lstrip('¿').strip()
            return True, f"{t_pregunta} es igual a **{res}**."
        except ZeroDivisionError:
            return True, "En matemáticas, la división entre cero no está definida."
        except Exception:
            return False, ""

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
        t = re.sub(r'^[^\w\s\d]+|[^\w\s\d]+$', '', t).strip()

        # Si contiene conectores o palabras que indican razonamiento complejo, acción o contexto conversacional, descartar
        indicadores_complejidad = [
            'por qué', 'porque', 'por que', 'compara', 'diferencia', 'origen',
            'historia', 'cuento', 'ensayo', 'resumen', 'recomiendas', 'aconsejas',
            'qué debo hacer', 'que debo hacer', 'cómo se usa', 'como se usa',
            'de dónde viene', 'de donde viene', 'para qué sirve', 'para que sirve',
            'en esta conversación', 'en esta conversacion', 'en este contexto',
            'en la oración', 'en la oracion', 'en el texto', 'en la frase'
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
        contemplando signos de exclamación/interrogación, variantes con pleca '/' (ej. 'bacán / chévere')
        y tolerancia a tildes o variaciones diacríticas (preservando 'ñ').
        """
        if not termino:
            return None

        termino_limpio = re.sub(r'^[¿¡\s«"\'\.]+|[?!«"\'\.\s]+$', '', termino.strip().lower())
        termino_limpio = re.sub(r'\s+en\s+(?:el\s+)?ecuador$', '', termino_limpio).strip()
        if not termino_limpio:
            return None

        termino_norm = self._normalizar_texto(termino_limpio)
        modismos_db = Modismo.objects.prefetch_related('significados', 'ejemplos').filter(estado='Activo')
        for m in modismos_db:
            nombre_db = m.nombre_modismo.lower()
            partes = [p.strip() for p in nombre_db.split('/')] if '/' in nombre_db else [nombre_db]
            for p in partes:
                p_limpia = re.sub(r'^[¡¿\s«"\'\.]+|[!?«"\'\.\s]+$', '', p).strip().lower()
                p_norm = self._normalizar_texto(p_limpia)
                if p_limpia == termino_limpio or p_norm == termino_norm:
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
        Escanea el texto del usuario contra la base de datos de 100 modismos ecuatorianos activos.
        - Prioriza frases compuestas sobre palabras individuales mediante ordenación por longitud.
        - Evita solapamientos entre términos más largos y sub-términos (span tracking).
        - Desambigua términos polisémicos (ej. 'camello' animal vs. trabajo) mediante análisis contextual.
        - Tolera mayúsculas, minúsculas, tildes (preservando 'ñ') y signos de puntuación sin alterar el texto original.
        """
        if not texto_usuario:
            return []

        texto_lower = texto_usuario.lower()
        texto_norm = self._normalizar_texto(texto_usuario)

        modismos_db = list(Modismo.objects.prefetch_related('significados').filter(estado='Activo'))

        candidatos = []
        for m in modismos_db:
            nombre_completo = m.nombre_modismo
            partes = [p.strip() for p in nombre_completo.split('/')] if '/' in nombre_completo else [nombre_completo]
            for p in partes:
                p_limpia = re.sub(r'^[¡¿\s«"\'\.]+|[!?«"\'\.\s]+$', '', p).strip().lower()
                if p_limpia and len(p_limpia) >= 2:
                    p_norm = self._normalizar_texto(p_limpia)
                    candidatos.append((len(p_limpia), p_limpia, p_norm, m))

        # Ordenar por longitud descendente para evaluar primero modismos compuestos
        candidatos.sort(key=lambda x: x[0], reverse=True)

        detectados = []
        ids_vistos = set()
        spans_ocupados = []

        for _, var_limpia, var_norm, m in candidatos:
            if m.id_modismo in ids_vistos:
                continue

            # Buscar patrón con límites alfanuméricos españoles en texto normalizado
            patron_norm = rf'(?<![a-záéíóúüñ0-9]){re.escape(var_norm)}(?![a-záéíóúüñ0-9])'
            match = re.search(patron_norm, texto_norm)
            if not match:
                patron_limpia = rf'(?<![a-záéíóúüñ0-9]){re.escape(var_limpia)}(?![a-záéíóúüñ0-9])'
                match = re.search(patron_limpia, texto_lower)

            if match:
                start, end = match.span()
                # Verificar si se superpone con un span de un modismo más largo ya detectado
                if any(start < s_end and end > s_start for s_start, s_end in spans_ocupados):
                    continue

                # Desambiguar palabras polisémicas
                if self._es_falso_positivo_polisemico(var_norm, texto_norm):
                    continue

                spans_ocupados.append((start, end))
                ids_vistos.add(m.id_modismo)
                sig_primer = m.significados.first()
                detectados.append({
                    'id': m.id_modismo,
                    'nombre': m.nombre_modismo,
                    'region': m.region,
                    'significado': sig_primer.significado if sig_primer else (m.descripcion or '')
                })

        return detectados

    def construir_system_prompt(self, modismos_detectados: list = None) -> str:
        """
        Construye el System Prompt para el Asistente Virtual UPEC.
        Diferencia de manera clara las consultas de propósito general (académicas,
        científicas, cotidianas) frente a consultas con expresiones dialectales ecuatorianas,
        optimizando la completitud, naturalidad y coherencia.
        """
        prompt_base = (
            "Eres el Asistente Virtual PLN-EC de la Universidad Politécnica Estatal del Carchi (UPEC), "
            "un asistente inteligente de propósito general con comprensión nativa del español y de la cultura ecuatoriana.\n"
            "Directrices fundamentales:\n"
            "1. Claridad y rigor: Responde siempre en español de forma verídica, clara, estructurada y coherente.\n"
            "2. Conocimiento general amplio: Responde a preguntas académicas, científicas, tecnológicas, matemáticas, "
            "culturales y de la vida cotidiana empleando tu conocimiento general de manera abierta y rigurosa.\n"
            "3. Respuestas completas: Desarrolla explicaciones completas y bien articuladas, concluyendo siempre tus ideas adecuadamente con punto final.\n"
            "4. Cumplimiento de formato: Si el usuario solicita un formato o límite específico (resumen, lista numerada, cantidad de oraciones o párrafos), cúmplelo estrictamente."
        )

        if modismos_detectados:
            detalles = []
            for m in modismos_detectados:
                significado = m.get('significado', '').strip()
                region = m.get('region', 'Ecuador')
                detalles.append(f'- "{m["nombre"]}": {significado} ({region}).')

            prompt_dialectal = (
                "\n\nContexto de expresiones ecuatorianas detectadas en esta consulta:\n"
                + "\n".join(detalles)
                + "\nInstrucciones contextuales:\n"
                "- Comprende el sentido de estas expresiones ecuatorianas dentro del mensaje del usuario.\n"
                "- Responde de manera natural, empática y directa a lo que el usuario consulta, integrando el significado contextual.\n"
                "- NO es necesario definir el modismo a menos que el usuario pregunte explícitamente su significado.\n"
                "- Mantén un tono natural, cercano y respetuoso en español."
            )
            return prompt_base + prompt_dialectal
        else:
            prompt_general = (
                "\n\nInstrucciones para consultas generales:\n"
                "- Utiliza plenamente tu conocimiento general sobre el tema consultado para brindar una respuesta útil, instructiva y completa.\n"
                "- Solo si el usuario pregunta explícitamente qué significa un modismo o jerga regional de Ecuador que desconoces o no está registrado, aclara con honestidad que no dispones de ese término en el registro dialectal. Para cualquier otro tema, responde con normalidad y profundidad."
            )
            return prompt_base + prompt_general

    def filtrar_historial_contexto(self, historial: list, max_caracteres: int = 3000) -> list:
        """
        Selecciona pares completos de consulta-respuesta del historial reciente,
        asegurando que conserven la continuidad de la conversación sin exceder la ventana
        de contexto (num_ctx=2048).
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

    def generar_texto(self, texto_usuario: str, temperatura=0.6, top_p=0.9, max_tokens=90, historial=None) -> dict:
        """
        Procesa la consulta del usuario. Si es una solicitud explícita de definición
        de un modismo existente y activo en PostgreSQL, responde directamente desde la base
        de conocimiento en milisegundos sin invocar a Ollama. Para cualquier otra consulta
        o si el modismo no existe, ejecuta la inferencia con el modelo de lenguaje.
        """
        inicio = time.time()
        texto_limpio = texto_usuario.strip() if texto_usuario else ""

        # Detección automática de modismos en todas las consultas
        modismos_detectados = self.detectar_modismos(texto_limpio)

        # 1. Fast-Path A: Saludos, despedidas y cortesías aisladas (< 0.01s, determinista)
        es_saludo, resp_saludo = self.resolver_saludo_o_cortesia(texto_limpio)
        if es_saludo:
            tiempo_total = round(time.time() - inicio, 4)
            texto_generado = resp_saludo
            if modismos_detectados:
                texto_generado += self.formatear_seccion_modismos_detectados(modismos_detectados)
            return {
                'texto_generado': texto_generado,
                'tiempo_respuesta': max(tiempo_total, 0.001),
                'fuente': 'Respuesta Rápida (Determinista / Fast-Path UPEC)',
                'modismos_detectados': modismos_detectados,
                'es_error': False,
                'tipo_error': None,
                'es_directa': True,
                'metricas': {
                    'bleu': None,
                    'rouge': None,
                    'bertscore': None,
                    'tiempo_respuesta': max(tiempo_total, 0.001),
                    'es_error': False,
                    'estado': 'exitosa',
                    'fuente': 'Respuesta Rápida (Determinista / Fast-Path UPEC)'
                }
            }

        # 2. Fast-Path B: Operaciones aritméticas elementales seguras (< 0.01s, parser AST sin eval)
        es_aritmetica, resp_aritmetica = self.resolver_operacion_aritmetica(texto_limpio)
        if es_aritmetica:
            tiempo_total = round(time.time() - inicio, 4)
            texto_generado = resp_aritmetica
            if modismos_detectados:
                texto_generado += self.formatear_seccion_modismos_detectados(modismos_detectados)
            return {
                'texto_generado': texto_generado,
                'tiempo_respuesta': max(tiempo_total, 0.001),
                'fuente': 'Respuesta Rápida Aritmética (Fast-Path UPEC)',
                'modismos_detectados': modismos_detectados,
                'es_error': False,
                'tipo_error': None,
                'es_directa': True,
                'metricas': {
                    'bleu': None,
                    'rouge': None,
                    'bertscore': None,
                    'tiempo_respuesta': max(tiempo_total, 0.001),
                    'es_error': False,
                    'estado': 'exitosa',
                    'fuente': 'Respuesta Rápida Aritmética (Fast-Path UPEC)'
                }
            }

        # 3. Fast-Path C: Consultas explícitas de significado sobre el glosario UPEC (< 0.25s)
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

        # 4. Ruta Generativa: Si no es ruta rápida ni definición léxica, continúa con inferencia Ollama
        mensajes = [
            {'role': 'system', 'content': self.construir_system_prompt(modismos_detectados)}
        ]

        if historial:
            mensajes.extend(self.filtrar_historial_contexto(historial, max_caracteres=3000))

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
                "num_thread": 2,
                "num_ctx": 2048,
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

                # Si la generación se cortó por límite de tokens sin puntuación final,
                # podar únicamente la última cláusula u oración incompleta sin eliminar párrafos completos.
                if texto_generado and not texto_generado.endswith(('.', '!', '?', '"', '»', '…', ':')):
                    pos_corte = max(
                        texto_generado.rfind('. '),
                        texto_generado.rfind('.\n'),
                        texto_generado.rfind('!'),
                        texto_generado.rfind('?'),
                        texto_generado.rfind('."'),
                        texto_generado.rfind('.)'),
                        texto_generado.rfind(':')
                    )
                    # Si hay un corte terminal válido que preserve la mayor parte del contenido (> 50 caracteres)
                    if pos_corte > 50:
                        texto_generado = texto_generado[:pos_corte + 1].strip()
                    else:
                        # Si no hay puntuación previa pero el texto es coherente, cerramos con punto final
                        texto_generado = texto_generado.strip() + '.'
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

        # Anexar sección informativa de modismos detectados (si los hay y no fue una definición explícita directa)
        if modismos_detectados and not es_definicion:
            seccion_modismos = self.formatear_seccion_modismos_detectados(modismos_detectados)
            if seccion_modismos and "Modismos ecuatorianos detectados" not in texto_generado:
                texto_generado = texto_generado.strip() + seccion_modismos

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
