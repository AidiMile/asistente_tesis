INSERT INTO intenciones (nombre, descripcion) VALUES
 ('Saludo','Saludo o despedida'),
 ('Pregunta','Pregunta que busca informacion'),
 ('Solicitud','Peticion de contenido (resumen, informe, ensayo, explicacion)'),
 ('Comando','Instruccion directa al sistema'),
 ('Consulta_Modismo','Pregunta por el significado de un modismo ecuatoriano')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO regiones (nombre, tipo) VALUES
 ('Nacional','nacional'),('Costa','region'),('Sierra','region'),('Oriente','region'),('Insular','region'),
 ('Azuay','provincia'),('Bolívar','provincia'),('Cañar','provincia'),('Carchi','provincia'),('Chimborazo','provincia'),
 ('Cotopaxi','provincia'),('El Oro','provincia'),('Esmeraldas','provincia'),('Galápagos','provincia'),('Guayas','provincia'),
 ('Imbabura','provincia'),('Loja','provincia'),('Los Ríos','provincia'),('Manabí','provincia'),('Morona Santiago','provincia'),
 ('Napo','provincia'),('Orellana','provincia'),('Pastaza','provincia'),('Pichincha','provincia'),('Santa Elena','provincia'),
 ('Santo Domingo de los Tsáchilas','provincia'),('Sucumbíos','provincia'),('Tungurahua','provincia'),('Zamora Chinchipe','provincia')
ON CONFLICT (nombre) DO NOTHING;

INSERT INTO contextos (descripcion) VALUES
 ('Coloquial'),('Informal entre amigos'),('Familiar'),('Laboral'),('Comercial'),('Juvenil'),('Expresión de emoción')
ON CONFLICT (descripcion) DO NOTHING;

INSERT INTO modelos_ia (nombre_modelo, proveedor, version, activo) VALUES
 ('llama3','ollama','8B',TRUE),
 ('mistral','ollama','7B',FALSE)
ON CONFLICT (nombre_modelo) DO NOTHING;

INSERT INTO parametros_modelo (id_modelo, temperatura, top_p, max_tokens)
SELECT id_modelo, 0.7, 0.9, 300 FROM modelos_ia
ON CONFLICT (id_modelo) DO NOTHING;

-- Modismos semilla (revisar y ampliar desde el panel administrativo)
INSERT INTO modismos (nombre_modismo, descripcion) VALUES
 ('chuta','Interjección de sorpresa, molestia o lamento'),
 ('chuchaqui','Resaca o malestar posterior al consumo excesivo de alcohol; uso coloquial ecuatoriano'),
 ('ñaño','Hermano; también amigo muy cercano (de origen kichwa)'),
 ('achachay','Interjección que expresa frío intenso (de origen kichwa)'),
 ('guambra','Niño o joven (de origen kichwa)'),
 ('bacán','Algo muy bueno o excelente'),
 ('pana','Amigo o compañero cercano'),
 ('chévere','Agradable, bueno o excelente'),
 ('camello','Trabajo o empleo'),
 ('yapa','Añadidura que se entrega de regalo en una compra'),
 ('chulla','Único, solo uno o impar'),
 ('colita','Aventón: llevar a alguien en un vehículo'),
 ('de ley','Con total seguridad, por supuesto'),
 ('cachar','Entender o captar algo')
ON CONFLICT (nombre_modismo) DO NOTHING;

INSERT INTO significados (id_modismo, significado)
SELECT m.id_modismo, v.s FROM modismos m JOIN (VALUES
 ('chuta','Exclamación para expresar sorpresa, fastidio o lástima, equivalente suave de una interjección más fuerte.'),
 ('chuchaqui','Resaca: malestar que puede aparecer después de beber demasiado alcohol.'),
 ('ñaño','Hermano o hermana (ñaña). Entre amigos, trato de cercanía.'),
 ('achachay','Expresa que hace mucho frío.'),
 ('guambra','Niño, niña o joven.'),
 ('bacán','Excelente, genial, muy bueno.'),
 ('pana','Amigo, compañero de confianza.'),
 ('chévere','Que está muy bien, agradable o de buena calidad.'),
 ('camello','Trabajo, empleo u ocupación.'),
 ('yapa','Un poco más de producto que el vendedor regala al comprador.'),
 ('chulla','Que es único, uno solo o desparejado (un solo zapato, un solo guante).'),
 ('colita','Favor de llevar a alguien en el vehículo que ya va en esa dirección.'),
 ('de ley','Sin duda, seguro, obligatoriamente.'),
 ('cachar','Entender, darse cuenta de algo.')
) AS v(n,s) ON v.n = m.nombre_modismo
WHERE NOT EXISTS (SELECT 1 FROM significados x WHERE x.id_modismo = m.id_modismo);

INSERT INTO ejemplos_uso (id_modismo, ejemplo)
SELECT m.id_modismo, v.e FROM modismos m JOIN (VALUES
 ('chuta','¡Chuta, me olvidé las llaves en la casa!'),
 ('chuchaqui','Amanecí con chuchaqui después de la fiesta.'),
 ('ñaño','Mi ñaño me prestó su bicicleta.'),
 ('achachay','¡Achachay, qué frío hace en la mañana!'),
 ('guambra','Los guambras juegan fútbol en la cancha.'),
 ('bacán','Qué bacán la fiesta de ayer.'),
 ('pana','Ese pana siempre me ayuda con las tareas.'),
 ('chévere','Está chévere tu idea para el proyecto.'),
 ('camello','Hoy tengo mucho camello en la oficina.'),
 ('yapa','Pídele la yapa al casero cuando compres.'),
 ('chulla','Solo me quedó un chulla zapato.'),
 ('colita','¿Me das una colita hasta el terminal?'),
 ('de ley','Mañana voy de ley a la reunión.'),
 ('cachar','¿Cachaste lo que explicó el profe?')
) AS v(n,e) ON v.n = m.nombre_modismo
WHERE NOT EXISTS (SELECT 1 FROM ejemplos_uso x WHERE x.id_modismo = m.id_modismo);

INSERT INTO modismo_region (id_modismo, id_region)
SELECT m.id_modismo, r.id_region FROM modismos m JOIN regiones r ON r.nombre IN ('Nacional')
WHERE m.nombre_modismo IN ('chuta','chuchaqui','bacán','pana','chévere','camello','colita','de ley','cachar')
ON CONFLICT DO NOTHING;
INSERT INTO modismo_region (id_modismo, id_region)
SELECT m.id_modismo, r.id_region FROM modismos m JOIN regiones r ON r.nombre = 'Sierra'
WHERE m.nombre_modismo IN ('ñaño','achachay','guambra','yapa','chulla')
ON CONFLICT DO NOTHING;

INSERT INTO modismo_contexto (id_modismo, id_contexto)
SELECT m.id_modismo, c.id_contexto FROM modismos m JOIN contextos c ON c.descripcion = 'Coloquial'
ON CONFLICT DO NOTHING;

INSERT INTO corpus_entrenamiento (nombre, fuente, tipo_dato, descripcion, total_registros, activo)
SELECT 'Chuchaqui y resaca: orientación general de salud',
			 'NIAAA; NHS', 'guia_salud',
			 'Información educativa sobre resaca, autocuidado prudente y señales de posible intoxicación alcohólica.',
			 0, TRUE
WHERE NOT EXISTS (
		SELECT 1 FROM corpus_entrenamiento
		WHERE nombre = 'Chuchaqui y resaca: orientación general de salud'
);

INSERT INTO corpus_documentos (id_corpus, titulo, contenido)
SELECT c.id_corpus, 'Chuchaqui: autocuidado y señales de alarma',
			 'En Ecuador, chuchaqui es el nombre coloquial de la resaca: malestar que puede aparecer después de beber demasiado alcohol e incluir sed, cansancio, dolor de cabeza, náusea y malestar estomacal. La atención y la coordinación pueden seguir afectadas; no conduzcas ni operes maquinaria. Fuentes: NIAAA, https://www.niaaa.nih.gov/publications/brochures-and-fact-sheets/hangovers'
			 || E'\n\n' ||
			 'Para el chuchaqui no existe una cura inmediata comprobada; el cuerpo necesita tiempo. Si la persona está despierta y puede tragar, puede beber agua a sorbos y descansar. Más alcohol, café o una ducha no curan la resaca. No se debe recomendar una dosis de medicamentos: el alcohol combinado con paracetamol puede dañar el hígado; aspirina e ibuprofeno pueden irritar el estómago. Consulta a un profesional de salud o farmacéutico antes de tomar medicamentos.'
			 || E'\n\n' ||
			'El chuchaqui no debe confundirse con una posible intoxicación alcohólica. Confusión intensa, dificultad para despertar o pérdida del conocimiento, convulsiones, respiración lenta o irregular y piel azulada o muy pálida son señales de urgencia: en Ecuador llama al ECU 911. No dejes sola a la persona; si está inconsciente, no le des comida, bebida ni más alcohol. Fuente: NHS, https://www.nhs.uk/conditions/alcohol-poisoning/'
FROM corpus_entrenamiento c
WHERE c.nombre = 'Chuchaqui y resaca: orientación general de salud'
	AND NOT EXISTS (
			SELECT 1 FROM corpus_documentos d
			WHERE d.id_corpus = c.id_corpus
				AND d.titulo = 'Chuchaqui: autocuidado y señales de alarma'
	);

UPDATE corpus_entrenamiento c
SET total_registros = (
		SELECT count(*) FROM corpus_documentos d WHERE d.id_corpus = c.id_corpus
)
WHERE c.nombre = 'Chuchaqui y resaca: orientación general de salud';
