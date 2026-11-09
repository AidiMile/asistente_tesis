import requests
from datetime import timedelta
from django.test import TestCase, override_settings
from django.core.cache import cache, caches
from django.core.cache.backends.locmem import LocMemCache
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from unittest.mock import patch, MagicMock
from apps.authentication.models import Perfil
from apps.modismos.models import Modismo, Significado
from apps.asistente.models import Conversacion, Consulta, Respuesta, HistorialInteraccion, ModeloIA
from apps.evaluacion.models import Evaluacion
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


@override_settings(
    CACHES={
        'default': {
            'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
            'LOCATION': 'test-editar-consultas-cache',
        }
    }
)
class EditarConsultaAPITests(TestCase):
    """
    Suite automatizada de Etapa 7A para PUT/PATCH /api/asistente/consultas/<id>/editar/.
    Ejecutada en la base de datos aislada de Django TestCase con Ollama simulado.
    """

    def setUp(self):
        if isinstance(caches['default'], LocMemCache):
            caches['default'].clear()

        User = get_user_model()
        self.user_a = User.objects.create_user(
            correo='estudiante.edicion@upec.edu.ec',
            nombre='Estudiante Prueba',
            password='PasswordTest123!'
        )
        Perfil.objects.create(usuario=self.user_a, rol='Estudiante')

        self.user_b = User.objects.create_user(
            correo='otro.usuario@upec.edu.ec',
            nombre='Otro Usuario',
            password='PasswordTest123!'
        )
        Perfil.objects.create(usuario=self.user_b, rol='Estudiante')

        self.modelo = ModeloIA.objects.create(
            nombre_modelo='qwen2.5:1.5b',
            version='1.5b-instruct-q4_k_m',
            proveedor='Ollama'
        )

        # Modismo de prueba para validar edición hacia ruta rápida directa
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

        self.client_a = APIClient()
        self.client_a.force_authenticate(user=self.user_a)

        self.client_b = APIClient()
        self.client_b.force_authenticate(user=self.user_b)

        self.client_anon = APIClient()

        # Conversación principal de 3 turnos para User A con tiempos crecientes explícitos
        t_base = timezone.now() - timedelta(minutes=10)
        self.conv_principal = Conversacion.objects.create(
            usuario=self.user_a,
            titulo='Explica qué es un algoritmo.'
        )

        self.c1, self.r1, self.e1, self.h1 = self._crear_turno(
            self.user_a, self.conv_principal,
            texto_q='Explica qué es un algoritmo.',
            texto_r='Un algoritmo es una secuencia finita de pasos.',
            fecha=t_base,
            bleu='0.4500'
        )
        self.c2, self.r2, self.e2, self.h2 = self._crear_turno(
            self.user_a, self.conv_principal,
            texto_q='Dame un ejemplo sencillo de algoritmo.',
            texto_r='Por ejemplo, seguir una receta de cocina paso a paso.',
            fecha=t_base + timedelta(minutes=2),
            bleu='0.5200'
        )
        self.c3, self.r3, self.e3, self.h3 = self._crear_turno(
            self.user_a, self.conv_principal,
            texto_q='¿Cómo se representa en pseudocódigo?',
            texto_r='Mediante instrucciones estructuradas Inicio, Leer, Procesar y Fin.',
            fecha=t_base + timedelta(minutes=4),
            bleu='0.6100'
        )

        # Segunda conversación independiente que jamás debe verse afectada
        self.conv_otra = Conversacion.objects.create(
            usuario=self.user_a,
            titulo='Conversación independiente'
        )
        self.c_otra, self.r_otra, self.e_otra, self.h_otra = self._crear_turno(
            self.user_a, self.conv_otra,
            texto_q='¿Cuál es la capital del Carchi?',
            texto_r='La capital de la provincia del Carchi es Tulcán.',
            fecha=t_base + timedelta(minutes=6),
            bleu='0.7000'
        )

    def tearDown(self):
        if isinstance(caches['default'], LocMemCache):
            caches['default'].clear()
        super().tearDown()

    def _crear_turno(self, user, conversacion, texto_q, texto_r, fecha, bleu=None):
        c = Consulta.objects.create(
            usuario=user,
            conversacion=conversacion,
            texto_consulta=texto_q,
            tipo_entrada='Texto'
        )
        Consulta.objects.filter(pk=c.pk).update(fecha_consulta=fecha)
        c.refresh_from_db()

        r = Respuesta.objects.create(
            consulta=c,
            modelo=self.modelo,
            texto_generado=texto_r,
            tiempo_respuesta=2.50,
            modismos_detectados=[]
        )
        Respuesta.objects.filter(pk=r.pk).update(fecha_respuesta=fecha + timedelta(seconds=2))
        r.refresh_from_db()

        ev = None
        if bleu is not None:
            ev = Evaluacion.objects.create(
                respuesta=r,
                bleu=bleu,
                rouge='0.5000',
                bertscore='0.8500',
                observaciones='Evaluación de referencia prueba'
            )

        hist = HistorialInteraccion.objects.create(
            usuario=user,
            consulta=c,
            respuesta=r
        )
        return c, r, ev, hist

    @staticmethod
    def _mock_ollama_ok(contenido="Respuesta regenerada correctamente."):
        resp_mock = MagicMock()
        resp_mock.status_code = 200
        resp_mock.json.return_value = {
            "done_reason": "stop",
            "message": {"content": contenido}
        }
        return resp_mock

    def test_01_editar_ultimo_mensaje_exitoso_y_preserva_contexto_previo(self):
        """
        Editar el último mensaje de la conversación NO requiere confirmación de truncado,
        reutiliza el contexto anterior [C1->R1, C2->R2] y reemplaza solo C3/R3/H3.
        """
        url = f'/api/asistente/consultas/{self.c3.id_consulta}/editar/'
        nuevo_texto = '¿Cómo se representa un algoritmo mediante diagrama de flujo?'
        nueva_resp = 'Un diagrama de flujo utiliza símbolos estandarizados conectados por flechas.'

        with patch.object(OllamaNLPService, 'esta_modelo_en_memoria', return_value=True), \
             patch('requests.post', return_value=self._mock_ollama_ok(nueva_resp)) as mock_post:
            res = self.client_a.put(url, {'texto': nuevo_texto}, format='json')

        self.assertEqual(res.status_code, 200)
        self.assertTrue(res.data['editada'])
        self.assertEqual(res.data['texto_consulta'], nuevo_texto)
        self.assertEqual(res.data['texto_generado'], nueva_resp)
        self.assertEqual(res.data['consultas_eliminadas'], 0)
        self.assertEqual(res.data['id_consulta'], self.c3.id_consulta)
        self.assertFalse(res.data['es_error'])

        # Verificar que el prompt enviado a Ollama incluyó C1->R1 y C2->R2 y al final C3 editado
        payload = mock_post.call_args[1]['json']
        mensajes_llm = payload['messages']
        self.assertEqual(mensajes_llm[1]['content'], self.c1.texto_consulta)
        self.assertEqual(mensajes_llm[2]['content'], self.r1.texto_generado)
        self.assertEqual(mensajes_llm[3]['content'], self.c2.texto_consulta)
        self.assertEqual(mensajes_llm[4]['content'], self.r2.texto_generado)
        self.assertEqual(mensajes_llm[5]['content'], nuevo_texto)

        # Verificar integridad en PostgreSQL
        self.c3.refresh_from_db()
        self.assertEqual(self.c3.texto_consulta, nuevo_texto)
        self.assertEqual(self.c3.respuestas.count(), 1)
        nueva_r3 = self.c3.respuestas.first()
        self.assertNotEqual(nueva_r3.id_respuesta, self.r3.id_respuesta)
        self.assertEqual(nueva_r3.texto_generado, nueva_resp)
        self.assertFalse(Evaluacion.objects.filter(pk=self.e3.pk).exists())
        self.assertEqual(HistorialInteraccion.objects.filter(consulta=self.c3).count(), 1)
        self.assertEqual(self.conv_principal.consultas.count(), 3)
        self.assertEqual(len(res.data['mensajes']), 6)

        # C1, C2 y la otra conversación están intactas
        self.assertTrue(Consulta.objects.filter(pk=self.c1.pk).exists())
        self.assertTrue(Consulta.objects.filter(pk=self.c2.pk).exists())
        self.assertTrue(Evaluacion.objects.filter(pk=self.e1.pk).exists())
        self.assertTrue(Evaluacion.objects.filter(pk=self.e2.pk).exists())
        self.assertTrue(Consulta.objects.filter(pk=self.c_otra.pk).exists())

    def test_02_editar_mensaje_intermedio_requiere_confirmacion_y_trunca_posteriores(self):
        """
        Editar C2 con C3 posterior exige confirmar_truncado=True (409 primero) y, al confirmar,
        trunca C3/R3/E3/H3 reconstruyendo el contexto estrictamente desde C1->R1.
        """
        url = f'/api/asistente/consultas/{self.c2.id_consulta}/editar/'
        texto_editado = 'Dame un ejemplo en programación Python de ese concepto.'
        resp_editada = 'En Python puedes ordenar una lista usando un bucle for paso a paso.'

        # 1. Sin confirmación -> 409 y cero mutaciones ni llamada a Ollama
        with patch('requests.post') as mock_post:
            res_sin_conf = self.client_a.patch(url, {'texto': texto_editado}, format='json')

        self.assertEqual(res_sin_conf.status_code, 409)
        self.assertTrue(res_sin_conf.data['requiere_confirmacion'])
        self.assertEqual(res_sin_conf.data['consultas_posteriores'], 1)
        self.assertEqual(res_sin_conf.data['mensajes_posteriores'], 2)
        self.assertFalse(mock_post.called)
        self.assertEqual(self.conv_principal.consultas.count(), 3)
        self.assertTrue(Consulta.objects.filter(pk=self.c3.pk).exists())

        # 2. Con confirmación explícita -> 200 y truncado seguro de C3
        with patch.object(OllamaNLPService, 'esta_modelo_en_memoria', return_value=True), \
             patch('requests.post', return_value=self._mock_ollama_ok(resp_editada)) as mock_post:
            res_ok = self.client_a.patch(
                url,
                {'texto': texto_editado, 'confirmar_truncado': True},
                format='json'
            )

        self.assertEqual(res_ok.status_code, 200)
        self.assertEqual(res_ok.data['consultas_eliminadas'], 1)
        self.assertEqual(len(res_ok.data['mensajes']), 4)

        # El LLM recibió únicamente System + Turno 1 (C1->R1) + C2 editado
        mensajes_llm = mock_post.call_args[1]['json']['messages']
        self.assertEqual(len(mensajes_llm), 4)
        self.assertEqual(mensajes_llm[1]['content'], self.c1.texto_consulta)
        self.assertEqual(mensajes_llm[2]['content'], self.r1.texto_generado)
        self.assertEqual(mensajes_llm[3]['content'], texto_editado)

        # Verificar eliminación en cascada de C3, R3, E3 y H3
        self.assertFalse(Consulta.objects.filter(pk=self.c3.pk).exists())
        self.assertFalse(Respuesta.objects.filter(pk=self.r3.pk).exists())
        self.assertFalse(Evaluacion.objects.filter(pk=self.e3.pk).exists())
        self.assertFalse(HistorialInteraccion.objects.filter(pk=self.h3.pk).exists())

        # C1 intacta y conversación paralela intacta
        self.c1.refresh_from_db()
        self.assertEqual(self.c1.texto_consulta, 'Explica qué es un algoritmo.')
        self.assertEqual(self.conv_principal.consultas.count(), 2)
        self.assertTrue(Consulta.objects.filter(pk=self.c_otra.pk).exists())

    def test_03_editar_primer_mensaje_actualiza_titulo_automatico_y_trunca(self):
        """
        Editar la primera consulta cuando el título fue autogenerado actualiza el título
        de la conversación y elimina C2 y C3 al confirmar.
        """
        url = f'/api/asistente/consultas/{self.c1.id_consulta}/editar/'
        nuevo_texto_1 = '¿Cuáles son las diferencias entre IA simbólica y machine learning?'
        resp_1 = 'La IA simbólica se basa en reglas explícitas y el machine learning aprende de datos.'

        with patch.object(OllamaNLPService, 'esta_modelo_en_memoria', return_value=True), \
             patch('requests.post', return_value=self._mock_ollama_ok(resp_1)) as mock_post:
            res = self.client_a.put(
                url,
                {'texto': nuevo_texto_1, 'confirmar_truncado': True},
                format='json'
            )

        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data['consultas_eliminadas'], 2)
        self.assertEqual(res.data['titulo_conversacion'], nuevo_texto_1[:120])
        self.conv_principal.refresh_from_db()
        self.assertEqual(self.conv_principal.titulo, nuevo_texto_1[:120])
        self.assertEqual(self.conv_principal.consultas.count(), 1)

        mensajes_llm = mock_post.call_args[1]['json']['messages']
        self.assertEqual(len(mensajes_llm), 2)  # [System, C1_editado]
        self.assertEqual(mensajes_llm[1]['content'], nuevo_texto_1)

    def test_04_rechazar_edicion_sin_autenticacion(self):
        """Usuario no autenticado recibe HTTP 401 sin modificar la consulta."""
        url = f'/api/asistente/consultas/{self.c3.id_consulta}/editar/'
        res_put = self.client_anon.put(url, {'texto': 'Intento anónimo'}, format='json')
        res_patch = self.client_anon.patch(url, {'texto': 'Intento anónimo'}, format='json')

        self.assertEqual(res_put.status_code, 401)
        self.assertEqual(res_patch.status_code, 401)
        self.c3.refresh_from_db()
        self.assertEqual(self.c3.texto_consulta, '¿Cómo se representa en pseudocódigo?')

    def test_05_rechazar_edicion_de_consulta_de_otro_usuario(self):
        """Un usuario autenticado NO puede editar consultas pertenecientes a otro usuario."""
        url = f'/api/asistente/consultas/{self.c3.id_consulta}/editar/'
        with patch('requests.post') as mock_post:
            res = self.client_b.put(url, {'texto': 'Texto intruso', 'confirmar_truncado': True}, format='json')

        self.assertIn(res.status_code, (403, 404))
        self.assertFalse(mock_post.called)
        self.c3.refresh_from_db()
        self.assertEqual(self.c3.texto_consulta, '¿Cómo se representa en pseudocódigo?')

    def test_06_validar_texto_vacio_o_excesivo(self):
        """Texto vacío, espacios en blanco, faltante o mayor a 1000 caracteres retorna 400."""
        url = f'/api/asistente/consultas/{self.c3.id_consulta}/editar/'
        casos_invalidos = [
            {},
            {'texto': ''},
            {'texto': '     '},
            {'texto': 'x' * 1001},
        ]
        with patch('requests.post') as mock_post:
            for payload in casos_invalidos:
                res = self.client_a.put(url, payload, format='json')
                self.assertEqual(res.status_code, 400, f"Debió fallar con 400 para payload={list(payload.keys())}")
        self.assertFalse(mock_post.called)
        self.c3.refresh_from_db()
        self.assertEqual(self.c3.texto_consulta, '¿Cómo se representa en pseudocódigo?')

    def test_07_fallo_o_timeout_ollama_preserva_mensajes_existentes_sin_truncar(self):
        """
        Si Ollama falla por timeout o error HTTP 500 incluso con confirmar_truncado=True,
        se conservan íntegros la consulta original, su respuesta, su evaluación y las posteriores.
        """
        url = f'/api/asistente/consultas/{self.c1.id_consulta}/editar/'
        texto_original_c1 = self.c1.texto_consulta
        texto_original_r1 = self.r1.texto_generado

        # Caso A: Timeout de Ollama -> 504 y cero pérdida de datos
        with patch.object(OllamaNLPService, 'esta_modelo_en_memoria', return_value=True), \
             patch('requests.post', side_effect=requests.exceptions.Timeout('Read timed out')):
            res_timeout = self.client_a.put(
                url,
                {'texto': 'Nueva pregunta que da timeout', 'confirmar_truncado': True},
                format='json'
            )

        self.assertEqual(res_timeout.status_code, 504)
        self.assertTrue(res_timeout.data['es_error'])
        self.assertTrue(res_timeout.data['conservado'])
        self.c1.refresh_from_db()
        self.r1.refresh_from_db()
        self.assertEqual(self.c1.texto_consulta, texto_original_c1)
        self.assertEqual(self.r1.texto_generado, texto_original_r1)
        self.assertTrue(Evaluacion.objects.filter(pk=self.e1.pk).exists())
        self.assertEqual(self.conv_principal.consultas.count(), 3)
        self.assertTrue(Consulta.objects.filter(pk=self.c2.pk).exists())
        self.assertTrue(Consulta.objects.filter(pk=self.c3.pk).exists())

        # Caso B: Error HTTP 500 de Ollama -> 503, datos intactos y bloqueo liberado
        resp_500 = MagicMock()
        resp_500.status_code = 500
        with patch.object(OllamaNLPService, 'esta_modelo_en_memoria', return_value=True), \
             patch('requests.post', return_value=resp_500):
            res_500 = self.client_a.put(
                url,
                {'texto': 'Nueva pregunta con error 500', 'confirmar_truncado': True},
                format='json'
            )

        self.assertEqual(res_500.status_code, 503)
        self.assertTrue(res_500.data['es_error'])
        self.assertTrue(res_500.data['conservado'])
        self.assertEqual(self.conv_principal.consultas.count(), 3)

        # Verificar que el bloqueo se liberó en finally tras el fallo
        url_c3 = f'/api/asistente/consultas/{self.c3.id_consulta}/editar/'
        with patch.object(OllamaNLPService, 'esta_modelo_en_memoria', return_value=True), \
             patch('requests.post', return_value=self._mock_ollama_ok('Recuperado tras error.')):
            res_recovery = self.client_a.put(url_c3, {'texto': 'Consulta tras recuperación'}, format='json')
        self.assertEqual(res_recovery.status_code, 200)

    def test_08_concurrencia_rechaza_edicion_simultanea_misma_conversacion(self):
        """
        Mientras una edición está en inferencia en conv_principal:
        - Una segunda petición simultánea sobre la misma conversación recibe 409 en_curso=True.
        - Otra conversación independiente (conv_otra) SÍ puede editarse en paralelo.
        - Al finalizar, el bloqueo se libera limpiamente.
        """
        url_c3 = f'/api/asistente/consultas/{self.c3.id_consulta}/editar/'
        url_otra = f'/api/asistente/consultas/{self.c_otra.id_consulta}/editar/'
        respuestas_anidadas = {}

        def simular_ollama_y_concurrencia(*args, **kwargs):
            if not respuestas_anidadas.get('en_curso'):
                respuestas_anidadas['en_curso'] = True
                # 1. Petición concurrente sobre la misma conversación -> debe rechazarse con 409
                respuestas_anidadas['misma_conv'] = self.client_a.put(
                    url_c3,
                    {'texto': 'Edición simultánea conflictiva'},
                    format='json'
                )
                # 2. Edición paralela sobre OTRA conversación -> debe permitirse aunque conv_principal esté bloqueada
                respuestas_anidadas['otra_conv'] = self.client_a.put(
                    url_otra,
                    {'texto': 'Confirma la capital del Carchi'},
                    format='json'
                )
                return self._mock_ollama_ok('Primera edición completada con éxito.')
            return self._mock_ollama_ok('Tulcán es la capital del Carchi.')

        with patch.object(OllamaNLPService, 'esta_modelo_en_memoria', return_value=True), \
             patch('requests.post', side_effect=simular_ollama_y_concurrencia) as mock_post:
            res_primera = self.client_a.put(url_c3, {'texto': 'Primera edición válida'}, format='json')

        self.assertEqual(res_primera.status_code, 200)
        self.assertEqual(mock_post.call_count, 2)  # Solo conv_principal (1a) y conv_otra; la conflictiva no llamó Ollama

        res_conflictiva = respuestas_anidadas['misma_conv']
        self.assertEqual(res_conflictiva.status_code, 409)
        self.assertTrue(res_conflictiva.data['en_curso'])
        self.assertTrue(res_conflictiva.data['conservado'])

        res_otra = respuestas_anidadas['otra_conv']
        self.assertEqual(res_otra.status_code, 200)
        self.assertEqual(res_otra.data['texto_generado'], 'Tulcán es la capital del Carchi.')

        # Verificar que tras completar res_primera el bloqueo ya está liberado en conv_principal
        with patch.object(OllamaNLPService, 'esta_modelo_en_memoria', return_value=True), \
             patch('requests.post', return_value=self._mock_ollama_ok('Edición posterior libre.')):
            res_siguiente = self.client_a.put(url_c3, {'texto': 'Edición secuencial posterior'}, format='json')
        self.assertEqual(res_siguiente.status_code, 200)

    def test_09_integridad_evaluaciones_historial_y_edicion_hacia_ruta_directa(self):
        """
        Editar una consulta hacia una pregunta directa del glosario dialectal UPEC:
        - No invoca Ollama.
        - Sustituye Respuesta y HistorialInteraccion manteniendo relación 1:1.
        - Elimina la Evaluacion obsoleta ligada a la respuesta anterior sin afectar otras.
        """
        url = f'/api/asistente/consultas/{self.c3.id_consulta}/editar/'
        with patch('requests.post') as mock_post:
            res = self.client_a.put(url, {'texto': '¿Qué significa achachay?'}, format='json')

        self.assertEqual(res.status_code, 200)
        self.assertFalse(mock_post.called)
        self.assertEqual(res.data['fuente'], 'Base de Conocimiento Dialectal UPEC (PostgreSQL)')
        self.assertIn('Sensación de frío intenso', res.data['texto_generado'])

        # Integridad 1:1 por consulta en la conversación
        for c in self.conv_principal.consultas.all():
            self.assertEqual(c.respuestas.count(), 1)
            self.assertEqual(HistorialInteraccion.objects.filter(consulta=c).count(), 1)

        # Evaluación obsoleta de R3 eliminada; evaluaciones de R1, R2 y conv_otra preservadas
        self.assertFalse(Evaluacion.objects.filter(pk=self.e3.pk).exists())
        self.assertTrue(Evaluacion.objects.filter(pk=self.e1.pk).exists())
        self.assertTrue(Evaluacion.objects.filter(pk=self.e2.pk).exists())
        self.assertTrue(Evaluacion.objects.filter(pk=self.e_otra.pk).exists())

    def test_10_guardia_optimista_rechaza_cambio_externo_durante_inferencia(self):
        """
        Si se inserta una nueva consulta en la conversación mientras Ollama estaba generando,
        la guardia optimista dentro de transaction.atomic() aborta sin sobrescribir ni borrar datos.
        """
        url_c3 = f'/api/asistente/consultas/{self.c3.id_consulta}/editar/'
        texto_c3_original = self.c3.texto_consulta
        ids_creados = []

        def insertar_consulta_mientras_infiere(*args, **kwargs):
            nueva_c4 = Consulta.objects.create(
                usuario=self.user_a,
                conversacion=self.conv_principal,
                texto_consulta='Mensaje C4 enviado durante la edición',
                tipo_entrada='Texto',
            )
            ids_creados.append(nueva_c4.id_consulta)
            return self._mock_ollama_ok('Respuesta que no debe sobrescribir.')

        with patch.object(OllamaNLPService, 'esta_modelo_en_memoria', return_value=True), \
             patch('requests.post', side_effect=insertar_consulta_mientras_infiere):
            res = self.client_a.put(url_c3, {'texto': 'Edición interrumpida por C4'}, format='json')

        self.assertEqual(res.status_code, 409)
        self.assertTrue(res.data['conservado'])
        self.c3.refresh_from_db()
        self.assertEqual(self.c3.texto_consulta, texto_c3_original)
        self.assertTrue(Consulta.objects.filter(pk=ids_creados[0]).exists())
        self.assertEqual(self.conv_principal.consultas.count(), 4)




