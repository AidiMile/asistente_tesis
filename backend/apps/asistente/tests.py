from django.test import TestCase
from unittest.mock import patch, MagicMock
from apps.modismos.models import Modismo, Significado
from apps.asistente.services.ollama_client import OllamaNLPService


class AsistenteGeneralFase1Tests(TestCase):
    """
    Suite de pruebas para validar las prioridades de la Fase 1:
    - Asistente de propósito general (académico, científico, cultural, redacción).
    - Preservación íntegra de la consulta original.
    - Detección precisa de modismos como contexto auxiliar sin distorsión.
    - Eliminación de respuestas genéricas evasivas.
    - Seguimiento conversacional multi-turno.
    """

    def setUp(self):
        self.service = OllamaNLPService()

        # Modismos de prueba para verificar detección individual y compuesta
        self.modismo_achachay = Modismo.objects.create(
            nombre_modismo="¡achachay!",
            region="Sierra / Carchi",
            descripcion="Expresión que denota frío extremo.",
            estado="Activo"
        )
        Significado.objects.create(
            modismo=self.modismo_achachay,
            significado="Sensación de frío intenso."
        )

        self.modismo_compuesto = Modismo.objects.create(
            nombre_modismo="bacán / chévere",
            region="Nacional",
            descripcion="Algo excelente o positivo.",
            estado="Activo"
        )
        Significado.objects.create(
            modismo=self.modismo_compuesto,
            significado="Excelente, agradable, de buena calidad."
        )

        self.modismo_frase = Modismo.objects.create(
            nombre_modismo="no seas malito",
            region="Sierra",
            descripcion="Petición cortés.",
            estado="Activo"
        )
        Significado.objects.create(
            modismo=self.modismo_frase,
            significado="Por favor, ten la bondad."
        )

    def test_01_deteccion_modismos_y_limites_de_palabra(self):
        """Verifica que detecte variantes individuales y evite falsos positivos."""
        # 1. Variante individual separada por '/'
        detectados = self.service.detectar_modismos("Ese proyecto quedó bien chévere.")
        self.assertEqual(len(detectados), 1)
        self.assertEqual(detectados[0]['nombre'], "bacán / chévere")

        # 2. Expresión con signos de admiración en la base
        detectados_frio = self.service.detectar_modismos("Achachay, qué viento hace hoy en Tulcán.")
        self.assertEqual(len(detectados_frio), 1)
        self.assertEqual(detectados_frio[0]['nombre'], "¡achachay!")

        # 3. Frase multi-palabra
        detectados_frase = self.service.detectar_modismos("No seas malito préstame tu cuaderno.")
        self.assertEqual(len(detectados_frase), 1)

        # 4. Ausencia de falsos positivos en subcadenas
        # Si hubiera modismo "ve", no debe activarse con "velocidad"
        detectados_general = self.service.detectar_modismos("La velocidad de la luz es constante en el vacío.")
        self.assertEqual(len(detectados_general), 0)

    def test_02_preservacion_total_texto_usuario(self):
        """Verifica que el mensaje enviado a Ollama sea 100% el texto original sin sustituciones."""
        pregunta_original = "¿Por qué la gente dice achachay cuando hace frío?"
        
        with patch("requests.post") as mock_post:
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = {
                "message": {"content": "En Ecuador, 'achachay' es una interjección de origen kichwa..."}
            }

            resultado = self.service.generar_texto(pregunta_original)

            # Verificar argumentos enviados en la petición HTTP
            self.assertTrue(mock_post.called)
            payload = mock_post.call_args[1]["json"]
            mensajes = payload["messages"]

            # El último mensaje debe ser exactamente el texto original del usuario
            self.assertEqual(mensajes[-1]["role"], "user")
            self.assertEqual(mensajes[-1]["content"], pregunta_original)

            # La respuesta no debe estar vacía y debe registrar la fuente
            self.assertIn("kichwa", resultado["texto_generado"])
            self.assertEqual(len(resultado["modismos_detectados"]), 1)

    def test_03_consulta_general_academica_sin_modismos(self):
        """Verifica que consultas académicas y científicas funcionen limpiamente sin contexto dialectal forzado."""
        pregunta_academica = "Explica la diferencia entre complejidad temporal O(1) y O(n)."

        with patch("requests.post") as mock_post:
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = {
                "message": {"content": "O(1) representa tiempo constante mientras que O(n) crece linealmente con la entrada."}
            }

            resultado = self.service.generar_texto(pregunta_academica)

            payload = mock_post.call_args[1]["json"]
            mensajes = payload["messages"]

            # System prompt no debe incluir bloque de modismos si no hay
            system_msg = mensajes[0]["content"]
            self.assertNotIn("Contexto dialectal ecuatoriano presente", system_msg)
            self.assertIn("propósito general", system_msg)

            # Contenido recibido
            self.assertIn("O(1)", resultado["texto_generado"])
            self.assertEqual(len(resultado["modismos_detectados"]), 0)

    def test_04_redaccion_generacion_texto(self):
        """Verifica que el servicio procese solicitudes de redacción de texto completas."""
        pedido_redaccion = "Redacta un correo formal solicitando una prórroga para entrega de tesis."

        with patch("requests.post") as mock_post:
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = {
                "message": {"content": "Estimado Coordinador:\nPor medio de la presente solicito formalmente una prórroga..."}
            }

            resultado = self.service.generar_texto(pedido_redaccion, max_tokens=400)
            self.assertTrue(len(resultado["texto_generado"]) > 20)
            self.assertIn("Estimado", resultado["texto_generado"])

    def test_05_seguimiento_conversacional_multiturno(self):
        """Verifica que el historial previo se concatene correctamente en el payload de Ollama."""
        historial = [
            {"sender": "user", "text": "Hablemos de la provincia del Carchi."},
            {"sender": "assistant", "text": "El Carchi es una provincia del norte de Ecuador, conocida por su clima andino y agricultura."}
        ]
        consulta_actual = "¿Cuál es su capital y qué lugares turísticos tiene?"

        with patch("requests.post") as mock_post:
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = {
                "message": {"content": "Su capital es Tulcán, famosa por el Cementerio José María Azaël Franco..."}
            }

            self.service.generar_texto(consulta_actual, historial=historial)

            payload = mock_post.call_args[1]["json"]
            mensajes = payload["messages"]

            # Mensajes: [System, Turno 1 user, Turno 1 assistant, Turno 2 user]
            self.assertEqual(len(mensajes), 4)
            self.assertEqual(mensajes[1]["content"], "Hablemos de la provincia del Carchi.")
            self.assertEqual(mensajes[2]["content"], historial[1]["text"])
            self.assertEqual(mensajes[3]["content"], consulta_actual)

    def test_06_eliminacion_de_evasivas_en_fallback(self):
        """Verifica que si Ollama falla, NO devuelva respuestas genéricas que afirman haber entendido sin contestar."""
        # 1. Caso de falla en pregunta general -> Mensaje honesto de indisponibilidad
        with patch("requests.post", side_effect=Exception("Connection timeout")):
            resultado = self.service.generar_texto("Explica la ley de la gravitación universal.")
            
            # NO debe contener el texto evasivo anterior
            self.assertNotIn("te confirmo que comprendo el dialecto", resultado["texto_generado"])
            self.assertNotIn("¿En qué más te puedo colaborar el día de hoy, ñaño?", resultado["texto_generado"])
            
            # Debe informar con veracidad el estado
            self.assertIn("no pudo responder a tiempo", resultado["texto_generado"])

        # 2. Caso de falla cuando el usuario solicita específicamente la definición de un modismo de la BD
        with patch("requests.post", side_effect=Exception("Connection timeout")):
            resultado_modismo = self.service.generar_texto("¿Qué significa achachay?")
            self.assertIn("Sensación de frío intenso", resultado_modismo["texto_generado"])

    def test_07_solicitud_fallida_no_genera_metricas_calidad(self):
        """
        Verifica que ante un timeout o fallo del motor de inferencia:
        - Se identifique claramente como error/solicitud fallida.
        - NO se generen métricas ficticias de calidad (BLEU, ROUGE, BERTScore deben ser None).
        - Se preserve el tiempo de respuesta registrado.
        """
        with patch("requests.post", side_effect=Exception("Connection timeout")):
            resultado = self.service.generar_texto("¿Qué es la inteligencia artificial?")

            self.assertTrue(resultado["es_error"])
            self.assertEqual(resultado["tipo_error"], "timeout")
            self.assertIsNone(resultado["metricas"]["bleu"])
            self.assertIsNone(resultado["metricas"]["rouge"])
            self.assertIsNone(resultado["metricas"]["bertscore"])
            self.assertTrue(resultado["metricas"]["es_error"])
            self.assertEqual(resultado["metricas"]["estado"], "fallida")
            self.assertGreaterEqual(resultado["metricas"]["tiempo_respuesta"], 0.0)

    def test_08_consulta_definicion_modismo_existente_responde_desde_postgres(self):
        """
        Verifica que ante preguntas explícitas de significado sobre modismos existentes en la BD:
        - Responda directamente desde la base de conocimiento UPEC en milisegundos.
        - NO llame a Ollama (requests.post no debe invocarse).
        - Registre la fuente exacta: 'Base de Conocimiento Dialectal UPEC (PostgreSQL)'.
        - Registre estado exitoso y métricas de calidad nulas (no inventadas).
        """
        consultas_prueba = [
            "¿Qué significa achachay?",
            "que significa achachay",
            "¿Qué quiere decir achachay?",
            "Significado de achachay",
            "¿Cuál es el significado de no seas malito?"
        ]

        with patch("requests.post") as mock_post:
            for consulta in consultas_prueba:
                resultado = self.service.generar_texto(consulta)

                # Ollama no debe haber sido llamado
                self.assertFalse(mock_post.called, f"Ollama fue llamado indebidamente para: {consulta}")
                self.assertEqual(resultado["fuente"], "Base de Conocimiento Dialectal UPEC (PostgreSQL)")
                self.assertTrue(resultado.get("es_directa"))
                self.assertFalse(resultado["es_error"])
                self.assertIsNone(resultado["metricas"]["bleu"])
                self.assertIsNone(resultado["metricas"]["rouge"])
                self.assertIsNone(resultado["metricas"]["bertscore"])
                self.assertEqual(resultado["metricas"]["estado"], "exitosa")
                self.assertLess(resultado["tiempo_respuesta"], 1.0)
                self.assertTrue(len(resultado["texto_generado"]) > 20)

    def test_09_consulta_definicion_modismo_inexistente_continua_ollama(self):
        """
        Verifica que si se pregunta la definición de un término que NO existe en la BD de modismos,
        el flujo continúe normalmente hacia Ollama sin fallar ni inventar datos.
        """
        with patch("requests.post") as mock_post:
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = {
                "message": {"content": "Blockchain es una tecnología de registro distribuido..."}
            }

            resultado = self.service.generar_texto("¿Qué significa blockchain?")

            # Al no ser modismo en la BD, DEBE llamar a Ollama
            self.assertTrue(mock_post.called)
            self.assertFalse(resultado.get("es_directa", False))
            self.assertIn("Ollama LLM", resultado["fuente"])
            self.assertIn("Blockchain", resultado["texto_generado"])

    def test_10_consulta_ambigua_o_razonamiento_no_aplica_ruta_directa(self):
        """
        Verifica que consultas complejas, con modismos pero que requieran razonamiento,
        opinión, contexto cultural o consejos NO tomen la ruta directa y vayan a Ollama.
        """
        consultas_complejas = [
            "¿Por qué la gente dice achachay cuando hace frío en la sierra?",
            "Tengo chuchaqui, ¿qué me recomiendas tomar para sentirme mejor?",
            "Compara el modismo achachay con arrarray y explica sus orígenes."
        ]

        for consulta in consultas_complejas:
            with patch("requests.post") as mock_post:
                mock_post.return_value.status_code = 200
                mock_post.return_value.json.return_value = {
                    "message": {"content": "Respuesta generada con razonamiento por el LLM..."}
                }

                resultado = self.service.generar_texto(consulta)

                # DEBE pasar por Ollama para razonamiento
                self.assertTrue(mock_post.called, f"Ollama debía ser llamado para consulta compleja: {consulta}")
                self.assertFalse(resultado.get("es_directa", False))
                self.assertIn("Ollama LLM", resultado["fuente"])

    def test_11_conservacion_historial_conversacional_con_ruta_directa(self):
        """
        Verifica que una respuesta directa se incorpore al historial y se pase
        como contexto a la siguiente consulta en turnos posteriores.
        """
        # Turno 1 directo
        resultado_t1 = self.service.generar_texto("¿Qué significa achachay?")
        self.assertEqual(resultado_t1["fuente"], "Base de Conocimiento Dialectal UPEC (PostgreSQL)")

        historial = [
            {"sender": "user", "text": "¿Qué significa achachay?"},
            {"sender": "assistant", "text": resultado_t1["texto_generado"]}
        ]

        # Turno 2 contextual que requiere Ollama
        with patch("requests.post") as mock_post:
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = {
                "message": {"content": "En una oración cotidiana se usa por ejemplo: ¡Achachay, préstame un saco!"}
            }

            self.service.generar_texto("¿Cómo lo uso en una oración?", historial=historial)

            # Verificar que el historial del turno 1 fue enviado en el payload
            payload = mock_post.call_args[1]["json"]
            mensajes = payload["messages"]
            self.assertEqual(mensajes[1]["content"], "¿Qué significa achachay?")
            self.assertIn("¡achachay!", mensajes[2]["content"])
            self.assertEqual(mensajes[3]["content"], "¿Cómo lo uso en una oración?")



