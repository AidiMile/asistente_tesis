-- =====================================================================
-- Asistente Virtual PLN-EC - Esquema PostgreSQL 16
-- Basado en el modelo del documento de requisitos, con ajustes:
--   * nombre_usuario (RF01), correo_verificado y tokens (RF01/RF02)
--   * restricciones CHECK, ON DELETE CASCADE, indices y FTS en espanol
--   * corpus_documentos: texto real del corpus (RF11)
-- =====================================================================
CREATE TABLE usuarios (
  id_usuario SERIAL PRIMARY KEY,
  nombre VARCHAR(100) NOT NULL,
  nombre_usuario VARCHAR(50) UNIQUE NOT NULL,
  correo VARCHAR(150) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  estado VARCHAR(20) NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo','Inactivo','Pendiente')),
  correo_verificado BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE perfiles (
  id_perfil SERIAL PRIMARY KEY,
  id_usuario INT UNIQUE NOT NULL,
  rol VARCHAR(50) NOT NULL DEFAULT 'usuario' CHECK (rol IN ('usuario','administrador')),
  foto TEXT,
  ultima_conexion TIMESTAMP,
  CONSTRAINT fk_perfil_usuario FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

CREATE TABLE tokens_usuario (
  id_token SERIAL PRIMARY KEY,
  id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('verificacion','recuperacion')),
  token_hash VARCHAR(128) UNIQUE NOT NULL,
  expira TIMESTAMP NOT NULL,
  usado BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE intenciones (
  id_intencion SERIAL PRIMARY KEY,
  nombre VARCHAR(100) UNIQUE NOT NULL,
  descripcion TEXT
);

CREATE TABLE consultas (
  id_consulta SERIAL PRIMARY KEY,
  id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  id_intencion INT REFERENCES intenciones(id_intencion),
  texto_consulta TEXT NOT NULL,
  tipo_entrada VARCHAR(20) NOT NULL DEFAULT 'texto' CHECK (tipo_entrada IN ('texto','audio','dictado')),
  confianza_intencion NUMERIC(5,4),
  fecha_consulta TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE entidades (
  id_entidad SERIAL PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  UNIQUE (nombre, tipo)
);

CREATE TABLE consulta_entidad (
  id_consulta INT REFERENCES consultas(id_consulta) ON DELETE CASCADE,
  id_entidad INT REFERENCES entidades(id_entidad) ON DELETE CASCADE,
  PRIMARY KEY (id_consulta, id_entidad)
);

CREATE TABLE modelos_ia (
  id_modelo SERIAL PRIMARY KEY,
  nombre_modelo VARCHAR(100) NOT NULL UNIQUE,
  proveedor VARCHAR(50) NOT NULL DEFAULT 'ollama',
  version VARCHAR(20),
  fecha_entrenamiento DATE,
  activo BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE parametros_modelo (
  id_parametro SERIAL PRIMARY KEY,
  id_modelo INT UNIQUE NOT NULL REFERENCES modelos_ia(id_modelo) ON DELETE CASCADE,
  temperatura NUMERIC(4,2) NOT NULL DEFAULT 0.7 CHECK (temperatura > 0),
  top_p NUMERIC(4,2) NOT NULL DEFAULT 0.9 CHECK (top_p > 0 AND top_p <= 1),
  max_tokens INT NOT NULL DEFAULT 300 CHECK (max_tokens > 0),
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  id_usuario_actualiza INT REFERENCES usuarios(id_usuario) ON DELETE SET NULL
);

CREATE TABLE respuestas (
  id_respuesta SERIAL PRIMARY KEY,
  id_consulta INT NOT NULL REFERENCES consultas(id_consulta) ON DELETE CASCADE,
  id_modelo INT REFERENCES modelos_ia(id_modelo) ON DELETE SET NULL,
  texto_generado TEXT NOT NULL,
  tiempo_respuesta NUMERIC(7,2),
  modismos_detectados JSONB NOT NULL DEFAULT '[]'::jsonb,
  fuentes_corpus JSONB NOT NULL DEFAULT '[]'::jsonb,
  fecha_respuesta TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE evaluaciones (
  id_evaluacion SERIAL PRIMARY KEY,
  id_respuesta INT UNIQUE NOT NULL REFERENCES respuestas(id_respuesta) ON DELETE CASCADE,
  bleu NUMERIC(6,2),
  rouge NUMERIC(6,2),
  bertscore NUMERIC(6,2),
  precision_global NUMERIC(6,2),
  texto_referencia TEXT,
  origen VARCHAR(20) NOT NULL DEFAULT 'automatica' CHECK (origen IN ('automatica','manual')),
  fecha_evaluacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE conocimiento_aprendido (
  id_conocimiento SERIAL PRIMARY KEY,
  consulta_normalizada TEXT UNIQUE NOT NULL,
  consulta_original TEXT NOT NULL,
  respuesta TEXT NOT NULL,
  modelo VARCHAR(100),
  veces_utilizado INT NOT NULL DEFAULT 0,
  fecha_creacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE historial_interacciones (
  id_historial SERIAL PRIMARY KEY,
  id_usuario INT NOT NULL REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
  id_consulta INT NOT NULL REFERENCES consultas(id_consulta) ON DELETE CASCADE,
  id_respuesta INT NOT NULL REFERENCES respuestas(id_respuesta) ON DELETE CASCADE,
  tipo_entrada VARCHAR(20),
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE modismos (
  id_modismo SERIAL PRIMARY KEY,
  nombre_modismo VARCHAR(100) UNIQUE NOT NULL,
  descripcion TEXT,
  estado VARCHAR(20) NOT NULL DEFAULT 'Activo' CHECK (estado IN ('Activo','Inactivo')),
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE significados (
  id_significado SERIAL PRIMARY KEY,
  id_modismo INT NOT NULL REFERENCES modismos(id_modismo) ON DELETE CASCADE,
  significado TEXT NOT NULL
);

CREATE TABLE ejemplos_uso (
  id_ejemplo SERIAL PRIMARY KEY,
  id_modismo INT NOT NULL REFERENCES modismos(id_modismo) ON DELETE CASCADE,
  ejemplo TEXT NOT NULL
);

CREATE TABLE contextos (
  id_contexto SERIAL PRIMARY KEY,
  descripcion VARCHAR(100) UNIQUE NOT NULL
);

CREATE TABLE modismo_contexto (
  id_modismo INT REFERENCES modismos(id_modismo) ON DELETE CASCADE,
  id_contexto INT REFERENCES contextos(id_contexto) ON DELETE CASCADE,
  PRIMARY KEY (id_modismo, id_contexto)
);

CREATE TABLE regiones (
  id_region SERIAL PRIMARY KEY,
  nombre VARCHAR(100) UNIQUE NOT NULL,
  tipo VARCHAR(20) NOT NULL DEFAULT 'region' CHECK (tipo IN ('region','provincia','nacional'))
);

CREATE TABLE modismo_region (
  id_modismo INT REFERENCES modismos(id_modismo) ON DELETE CASCADE,
  id_region INT REFERENCES regiones(id_region) ON DELETE CASCADE,
  PRIMARY KEY (id_modismo, id_region)
);

CREATE TABLE corpus_entrenamiento (
  id_corpus SERIAL PRIMARY KEY,
  nombre VARCHAR(200) NOT NULL,
  fuente VARCHAR(200),
  tipo_dato VARCHAR(100),
  descripcion TEXT,
  total_registros INT NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  fecha_carga TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE corpus_documentos (
  id_documento SERIAL PRIMARY KEY,
  id_corpus INT NOT NULL REFERENCES corpus_entrenamiento(id_corpus) ON DELETE CASCADE,
  titulo VARCHAR(200),
  contenido TEXT NOT NULL,
  fecha_carga TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE corpus_modismo (
  id_corpus INT REFERENCES corpus_entrenamiento(id_corpus) ON DELETE CASCADE,
  id_modismo INT REFERENCES modismos(id_modismo) ON DELETE CASCADE,
  PRIMARY KEY (id_corpus, id_modismo)
);

CREATE INDEX idx_consultas_usuario_fecha ON consultas (id_usuario, fecha_consulta DESC);
CREATE INDEX idx_historial_usuario_fecha ON historial_interacciones (id_usuario, fecha DESC);
CREATE INDEX idx_respuestas_consulta ON respuestas (id_consulta);
CREATE INDEX idx_corpus_doc_fts ON corpus_documentos USING GIN (to_tsvector('spanish', contenido));
