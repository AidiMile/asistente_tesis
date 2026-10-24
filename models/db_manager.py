from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Usuario(db.Model):
    __tablename__ = 'usuarios'
    
    id_usuario = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    correo = db.Column(db.String(150), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    fecha_registro = db.Column(db.DateTime, server_default=db.func.now())
    estado = db.Column(db.String(20), default='Activo')
    
    perfil = db.relationship('Perfil', backref='usuario', uselist=False, lazy=True)
    consultas = db.relationship('Consulta', backref='usuario', lazy=True)
    historial = db.relationship('HistorialInteraccion', backref='usuario', lazy=True)


class Perfil(db.Model):
    __tablename__ = 'perfiles'
    
    id_perfil = db.Column(db.Integer, primary_key=True)
    id_usuario = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario'), unique=True)
    rol = db.Column(db.String(50))
    foto = db.Column(db.Text)
    ultima_conexion = db.Column(db.DateTime)


class Modismo(db.Model):
    __tablename__ = 'modismos'
    
    id_modismo = db.Column(db.Integer, primary_key=True)
    nombre_modismo = db.Column(db.String(100), unique=True)
    descripcion = db.Column(db.Text)
    estado = db.Column(db.String(20))
    
    significados = db.relationship('Significado', backref='modismo', lazy=True)
    ejemplos = db.relationship('EjemploUso', backref='modismo', lazy=True)


class Significado(db.Model):
    __tablename__ = 'significados'
    
    id_significado = db.Column(db.Integer, primary_key=True)
    id_modismo = db.Column(db.Integer, db.ForeignKey('modismos.id_modismo'), nullable=False)
    significado = db.Column(db.Text, nullable=False)


class EjemploUso(db.Model):
    __tablename__ = 'ejemplos_uso'
    
    id_ejemplo = db.Column(db.Integer, primary_key=True)
    id_modismo = db.Column(db.Integer, db.ForeignKey('modismos.id_modismo'), nullable=False)
    ejemplo = db.Column(db.Text, nullable=False)


class Intencion(db.Model):
    __tablename__ = 'intenciones'
    
    id_intencion = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False)
    descripcion = db.Column(db.Text)
    consultas = db.relationship('Consulta', backref='intencion', lazy=True)


class Consulta(db.Model):
    __tablename__ = 'consultas'
    
    id_consulta = db.Column(db.Integer, primary_key=True)
    id_usuario = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario'), nullable=False)
    id_intencion = db.Column(db.Integer, db.ForeignKey('intenciones.id_intencion'))
    texto_consulta = db.Column(db.Text, nullable=False)
    tipo_entrada = db.Column(db.String(20))
    fecha_consulta = db.Column(db.DateTime, server_default=db.func.now())
    
    respuestas = db.relationship('Respuesta', backref='consulta', lazy=True)


class ModeloIA(db.Model):
    __tablename__ = 'modelos_ia'
    
    id_modelo = db.Column(db.Integer, primary_key=True)
    nombre_modelo = db.Column(db.String(100))
    version = db.Column(db.String(20))
    fecha_entrenamiento = db.Column(db.Date)
    
    parametros = db.relationship('ParametroModelo', backref='modelo', lazy=True)
    respuestas = db.relationship('Respuesta', backref='modelo', lazy=True)


class ParametroModelo(db.Model):
    __tablename__ = 'parametros_modelo'
    
    id_parametro = db.Column(db.Integer, primary_key=True)
    id_modelo = db.Column(db.Integer, db.ForeignKey('modelos_ia.id_modelo'), nullable=False)
    temperatura = db.Column(db.Numeric(4, 2))
    top_p = db.Column(db.Numeric(4, 2))
    max_tokens = db.Column(db.Integer)


class Respuesta(db.Model):
    __tablename__ = 'respuestas'
    
    id_respuesta = db.Column(db.Integer, primary_key=True)
    id_consulta = db.Column(db.Integer, db.ForeignKey('consultas.id_consulta'), nullable=False)
    id_modelo = db.Column(db.Integer, db.ForeignKey('modelos_ia.id_modelo'))
    texto_generado = db.Column(db.Text, nullable=False)
    tiempo_respuesta = db.Column(db.Numeric(5, 2))
    fecha_respuesta = db.Column(db.DateTime, server_default=db.func.now())
    
    evaluacion = db.relationship('Evaluacion', backref='respuesta', uselist=False, lazy=True)


class Evaluacion(db.Model):
    __tablename__ = 'evaluaciones'
    
    id_evaluacion = db.Column(db.Integer, primary_key=True)
    id_respuesta = db.Column(db.Integer, db.ForeignKey('respuestas.id_respuesta'), unique=True)
    bleu = db.Column(db.Numeric(5, 2))
    rouge = db.Column(db.Numeric(5, 2))
    bertscore = db.Column(db.Numeric(5, 2))
    fecha_evaluacion = db.Column(db.DateTime, server_default=db.func.now())


class HistorialInteraccion(db.Model):
    __tablename__ = 'historial_interacciones'
    
    id_historial = db.Column(db.Integer, primary_key=True)
    id_usuario = db.Column(db.Integer, db.ForeignKey('usuarios.id_usuario'))
    id_consulta = db.Column(db.Integer, db.ForeignKey('consultas.id_consulta'))
    id_respuesta = db.Column(db.Integer, db.ForeignKey('respuestas.id_respuesta'))
    fecha = db.Column(db.DateTime, server_default=db.func.now())