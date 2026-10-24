from datetime import date, datetime
from typing import Optional

from sqlalchemy import (JSON, Boolean, Column, Date, DateTime, ForeignKey, Integer, Numeric,
                        String, Table, Text, UniqueConstraint, func)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base

JSONType = JSON().with_variant(JSONB, "postgresql")

consulta_entidad = Table(
    "consulta_entidad", Base.metadata,
    Column("id_consulta", ForeignKey("consultas.id_consulta", ondelete="CASCADE"), primary_key=True),
    Column("id_entidad", ForeignKey("entidades.id_entidad", ondelete="CASCADE"), primary_key=True))
modismo_contexto = Table(
    "modismo_contexto", Base.metadata,
    Column("id_modismo", ForeignKey("modismos.id_modismo", ondelete="CASCADE"), primary_key=True),
    Column("id_contexto", ForeignKey("contextos.id_contexto", ondelete="CASCADE"), primary_key=True))
modismo_region = Table(
    "modismo_region", Base.metadata,
    Column("id_modismo", ForeignKey("modismos.id_modismo", ondelete="CASCADE"), primary_key=True),
    Column("id_region", ForeignKey("regiones.id_region", ondelete="CASCADE"), primary_key=True))
corpus_modismo = Table(
    "corpus_modismo", Base.metadata,
    Column("id_corpus", ForeignKey("corpus_entrenamiento.id_corpus", ondelete="CASCADE"), primary_key=True),
    Column("id_modismo", ForeignKey("modismos.id_modismo", ondelete="CASCADE"), primary_key=True))

_now = func.now()


class Usuario(Base):
    __tablename__ = "usuarios"
    id_usuario: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100))
    nombre_usuario: Mapped[str] = mapped_column(String(50), unique=True)
    correo: Mapped[str] = mapped_column(String(150), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    fecha_registro: Mapped[datetime] = mapped_column(DateTime, server_default=_now)
    estado: Mapped[str] = mapped_column(String(20), default="Activo")
    correo_verificado: Mapped[bool] = mapped_column(Boolean, default=False)

    perfil: Mapped[Optional["Perfil"]] = relationship(back_populates="usuario", uselist=False,
                                                      cascade="all, delete-orphan")
    consultas: Mapped[list["Consulta"]] = relationship(back_populates="usuario", cascade="all, delete-orphan")
    historial: Mapped[list["Historial"]] = relationship(back_populates="usuario", cascade="all, delete-orphan")
    tokens: Mapped[list["TokenUsuario"]] = relationship(cascade="all, delete-orphan")

    @property
    def rol(self) -> str:
        return self.perfil.rol if self.perfil else "usuario"

    @property
    def foto(self):
        return self.perfil.foto if self.perfil else None

    @property
    def ultima_conexion(self):
        return self.perfil.ultima_conexion if self.perfil else None


class Perfil(Base):
    __tablename__ = "perfiles"
    id_perfil: Mapped[int] = mapped_column(primary_key=True)
    id_usuario: Mapped[int] = mapped_column(ForeignKey("usuarios.id_usuario", ondelete="CASCADE"), unique=True)
    rol: Mapped[str] = mapped_column(String(50), default="usuario")
    foto: Mapped[Optional[str]] = mapped_column(Text)
    ultima_conexion: Mapped[Optional[datetime]] = mapped_column(DateTime)
    usuario: Mapped[Usuario] = relationship(back_populates="perfil")


class TokenUsuario(Base):
    __tablename__ = "tokens_usuario"
    id_token: Mapped[int] = mapped_column(primary_key=True)
    id_usuario: Mapped[int] = mapped_column(ForeignKey("usuarios.id_usuario", ondelete="CASCADE"))
    tipo: Mapped[str] = mapped_column(String(20))
    token_hash: Mapped[str] = mapped_column(String(128), unique=True)
    expira: Mapped[datetime] = mapped_column(DateTime)
    usado: Mapped[bool] = mapped_column(Boolean, default=False)


class Intencion(Base):
    __tablename__ = "intenciones"
    id_intencion: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True)
    descripcion: Mapped[Optional[str]] = mapped_column(Text)


class Entidad(Base):
    __tablename__ = "entidades"
    __table_args__ = (UniqueConstraint("nombre", "tipo"),)
    id_entidad: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(150))
    tipo: Mapped[str] = mapped_column(String(50))


class Consulta(Base):
    __tablename__ = "consultas"
    id_consulta: Mapped[int] = mapped_column(primary_key=True)
    id_usuario: Mapped[int] = mapped_column(ForeignKey("usuarios.id_usuario", ondelete="CASCADE"))
    id_intencion: Mapped[Optional[int]] = mapped_column(ForeignKey("intenciones.id_intencion"))
    texto_consulta: Mapped[str] = mapped_column(Text)
    tipo_entrada: Mapped[str] = mapped_column(String(20), default="texto")
    confianza_intencion: Mapped[Optional[float]] = mapped_column(Numeric(5, 4))
    fecha_consulta: Mapped[datetime] = mapped_column(DateTime, server_default=_now)

    usuario: Mapped[Usuario] = relationship(back_populates="consultas")
    intencion: Mapped[Optional[Intencion]] = relationship()
    entidades: Mapped[list[Entidad]] = relationship(secondary=consulta_entidad)
    respuestas: Mapped[list["Respuesta"]] = relationship(back_populates="consulta", cascade="all, delete-orphan")
    historial: Mapped[list["Historial"]] = relationship(back_populates="consulta", cascade="all, delete-orphan")


class ModeloIA(Base):
    __tablename__ = "modelos_ia"
    id_modelo: Mapped[int] = mapped_column(primary_key=True)
    nombre_modelo: Mapped[str] = mapped_column(String(100), unique=True)
    proveedor: Mapped[str] = mapped_column(String(50), default="ollama")
    version: Mapped[Optional[str]] = mapped_column(String(20))
    fecha_entrenamiento: Mapped[Optional[date]] = mapped_column(Date)
    activo: Mapped[bool] = mapped_column(Boolean, default=False)
    parametros: Mapped[Optional["ParametrosModelo"]] = relationship(back_populates="modelo", uselist=False,
                                                                     cascade="all, delete-orphan")


class ParametrosModelo(Base):
    __tablename__ = "parametros_modelo"
    id_parametro: Mapped[int] = mapped_column(primary_key=True)
    id_modelo: Mapped[int] = mapped_column(ForeignKey("modelos_ia.id_modelo", ondelete="CASCADE"), unique=True)
    temperatura: Mapped[float] = mapped_column(Numeric(4, 2), default=0.7)
    top_p: Mapped[float] = mapped_column(Numeric(4, 2), default=0.9)
    max_tokens: Mapped[int] = mapped_column(Integer, default=300)
    fecha_actualizacion: Mapped[datetime] = mapped_column(DateTime, server_default=_now)
    id_usuario_actualiza: Mapped[Optional[int]] = mapped_column(ForeignKey("usuarios.id_usuario", ondelete="SET NULL"))
    modelo: Mapped[ModeloIA] = relationship(back_populates="parametros")


class Respuesta(Base):
    __tablename__ = "respuestas"
    id_respuesta: Mapped[int] = mapped_column(primary_key=True)
    id_consulta: Mapped[int] = mapped_column(ForeignKey("consultas.id_consulta", ondelete="CASCADE"))
    id_modelo: Mapped[Optional[int]] = mapped_column(ForeignKey("modelos_ia.id_modelo", ondelete="SET NULL"))
    texto_generado: Mapped[str] = mapped_column(Text)
    tiempo_respuesta: Mapped[Optional[float]] = mapped_column(Numeric(7, 2))
    modismos_detectados: Mapped[list] = mapped_column(JSONType, default=list)
    fuentes_corpus: Mapped[list] = mapped_column(JSONType, default=list)
    fecha_respuesta: Mapped[datetime] = mapped_column(DateTime, server_default=_now)

    consulta: Mapped[Consulta] = relationship(back_populates="respuestas")
    modelo: Mapped[Optional[ModeloIA]] = relationship()
    evaluacion: Mapped[Optional["Evaluacion"]] = relationship(back_populates="respuesta", uselist=False,
                                                              cascade="all, delete-orphan")
    historial: Mapped[list["Historial"]] = relationship(back_populates="respuesta", cascade="all, delete-orphan")


class ConocimientoAprendido(Base):
    """Respuesta reutilizable aprendida de una consulta atendida correctamente."""
    __tablename__ = "conocimiento_aprendido"
    id_conocimiento: Mapped[int] = mapped_column(primary_key=True)
    consulta_normalizada: Mapped[str] = mapped_column(Text, unique=True)
    consulta_original: Mapped[str] = mapped_column(Text)
    respuesta: Mapped[str] = mapped_column(Text)
    modelo: Mapped[Optional[str]] = mapped_column(String(100))
    veces_utilizado: Mapped[int] = mapped_column(Integer, default=0)
    fecha_creacion: Mapped[datetime] = mapped_column(DateTime, server_default=_now)
    fecha_actualizacion: Mapped[datetime] = mapped_column(DateTime, server_default=_now, onupdate=_now)


class Evaluacion(Base):
    __tablename__ = "evaluaciones"
    id_evaluacion: Mapped[int] = mapped_column(primary_key=True)
    id_respuesta: Mapped[int] = mapped_column(ForeignKey("respuestas.id_respuesta", ondelete="CASCADE"), unique=True)
    bleu: Mapped[Optional[float]] = mapped_column(Numeric(6, 2))
    rouge: Mapped[Optional[float]] = mapped_column(Numeric(6, 2))
    bertscore: Mapped[Optional[float]] = mapped_column(Numeric(6, 2))
    precision_global: Mapped[Optional[float]] = mapped_column(Numeric(6, 2))
    texto_referencia: Mapped[Optional[str]] = mapped_column(Text)
    origen: Mapped[str] = mapped_column(String(20), default="automatica")
    fecha_evaluacion: Mapped[datetime] = mapped_column(DateTime, server_default=_now)
    respuesta: Mapped[Respuesta] = relationship(back_populates="evaluacion")


class Historial(Base):
    __tablename__ = "historial_interacciones"
    id_historial: Mapped[int] = mapped_column(primary_key=True)
    id_usuario: Mapped[int] = mapped_column(ForeignKey("usuarios.id_usuario", ondelete="CASCADE"))
    id_consulta: Mapped[int] = mapped_column(ForeignKey("consultas.id_consulta", ondelete="CASCADE"))
    id_respuesta: Mapped[int] = mapped_column(ForeignKey("respuestas.id_respuesta", ondelete="CASCADE"))
    tipo_entrada: Mapped[Optional[str]] = mapped_column(String(20))
    fecha: Mapped[datetime] = mapped_column(DateTime, server_default=_now)
    usuario: Mapped[Usuario] = relationship(back_populates="historial")
    consulta: Mapped[Consulta] = relationship(back_populates="historial")
    respuesta: Mapped[Respuesta] = relationship(back_populates="historial")


class Contexto(Base):
    __tablename__ = "contextos"
    id_contexto: Mapped[int] = mapped_column(primary_key=True)
    descripcion: Mapped[str] = mapped_column(String(100), unique=True)


class Region(Base):
    __tablename__ = "regiones"
    id_region: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(100), unique=True)
    tipo: Mapped[str] = mapped_column(String(20), default="region")


class Significado(Base):
    __tablename__ = "significados"
    id_significado: Mapped[int] = mapped_column(primary_key=True)
    id_modismo: Mapped[int] = mapped_column(ForeignKey("modismos.id_modismo", ondelete="CASCADE"))
    significado: Mapped[str] = mapped_column(Text)


class EjemploUso(Base):
    __tablename__ = "ejemplos_uso"
    id_ejemplo: Mapped[int] = mapped_column(primary_key=True)
    id_modismo: Mapped[int] = mapped_column(ForeignKey("modismos.id_modismo", ondelete="CASCADE"))
    ejemplo: Mapped[str] = mapped_column(Text)


class Modismo(Base):
    __tablename__ = "modismos"
    id_modismo: Mapped[int] = mapped_column(primary_key=True)
    nombre_modismo: Mapped[str] = mapped_column(String(100), unique=True)
    descripcion: Mapped[Optional[str]] = mapped_column(Text)
    estado: Mapped[str] = mapped_column(String(20), default="Activo")
    fecha_registro: Mapped[datetime] = mapped_column(DateTime, server_default=_now)
    fecha_actualizacion: Mapped[datetime] = mapped_column(DateTime, server_default=_now)

    significados: Mapped[list[Significado]] = relationship(cascade="all, delete-orphan")
    ejemplos: Mapped[list[EjemploUso]] = relationship(cascade="all, delete-orphan")
    contextos: Mapped[list[Contexto]] = relationship(secondary=modismo_contexto)
    regiones: Mapped[list[Region]] = relationship(secondary=modismo_region)


class Corpus(Base):
    __tablename__ = "corpus_entrenamiento"
    id_corpus: Mapped[int] = mapped_column(primary_key=True)
    nombre: Mapped[str] = mapped_column(String(200))
    fuente: Mapped[Optional[str]] = mapped_column(String(200))
    tipo_dato: Mapped[Optional[str]] = mapped_column(String(100))
    descripcion: Mapped[Optional[str]] = mapped_column(Text)
    total_registros: Mapped[int] = mapped_column(Integer, default=0)
    activo: Mapped[bool] = mapped_column(Boolean, default=True)
    fecha_carga: Mapped[datetime] = mapped_column(DateTime, server_default=_now)
    documentos: Mapped[list["CorpusDocumento"]] = relationship(cascade="all, delete-orphan")
    modismos: Mapped[list[Modismo]] = relationship(secondary=corpus_modismo)


class CorpusDocumento(Base):
    __tablename__ = "corpus_documentos"
    id_documento: Mapped[int] = mapped_column(primary_key=True)
    id_corpus: Mapped[int] = mapped_column(ForeignKey("corpus_entrenamiento.id_corpus", ondelete="CASCADE"))
    titulo: Mapped[Optional[str]] = mapped_column(String(200))
    contenido: Mapped[str] = mapped_column(Text)
    fecha_carga: Mapped[datetime] = mapped_column(DateTime, server_default=_now)
