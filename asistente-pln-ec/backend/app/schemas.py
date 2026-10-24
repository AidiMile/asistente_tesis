from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


# ---- Usuarios / auth
class RegisterIn(BaseModel):
    nombre: str = Field(min_length=2, max_length=100)
    nombre_usuario: str = Field(min_length=3, max_length=50, pattern=r"^[A-Za-z0-9_.-]+$")
    correo: EmailStr
    password: str


class LoginIn(BaseModel):
    correo: EmailStr
    password: str


class UsuarioOut(ORM):
    id_usuario: int
    nombre: str
    nombre_usuario: str
    correo: str
    estado: str
    rol: str
    foto: Optional[str] = None
    fecha_registro: Optional[datetime] = None
    ultima_conexion: Optional[datetime] = None
    correo_verificado: bool = False


class TokenOut(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    usuario: UsuarioOut


class RefreshIn(BaseModel):
    refresh_token: str


class ForgotIn(BaseModel):
    correo: EmailStr


class ResetIn(BaseModel):
    token: str
    nueva_password: str


class ProfileUpdate(BaseModel):
    nombre: Optional[str] = Field(default=None, min_length=2, max_length=100)
    foto: Optional[str] = None


class PasswordChange(BaseModel):
    actual: str
    nueva: str


class AdminUserCreate(RegisterIn):
    rol: Literal["usuario"] = "usuario"


class AdminUserUpdate(BaseModel):
    nombre: Optional[str] = None
    correo: Optional[EmailStr] = None
    estado: Optional[Literal["Activo", "Inactivo", "Pendiente"]] = None
    rol: Optional[Literal["usuario"]] = None
    password: Optional[str] = None


# ---- Consultas
class QueryIn(BaseModel):
    texto: str = Field(min_length=1)
    tipo_entrada: Literal["texto", "dictado"] = "texto"


class IdiomHit(BaseModel):
    id_modismo: int
    modismo: str
    significados: list[str]
    regiones: list[str] = []
    contextos: list[str] = []


class EntityOut(BaseModel):
    nombre: str
    tipo: str


class QueryOut(BaseModel):
    id_consulta: int
    id_respuesta: int
    texto_consulta: str
    tipo_entrada: str
    intencion: str
    confianza: float
    entidades: list[EntityOut]
    modismos: list[IdiomHit]
    respuesta: str
    tiempo_respuesta: float
    modelo: Optional[str] = None
    origen_respuesta: Literal["base_local", "modelo_generativo"] = "modelo_generativo"
    fecha: datetime


class HistoryItem(BaseModel):
    id_historial: int
    id_consulta: int
    id_respuesta: int
    fecha: Optional[datetime]
    tipo_entrada: Optional[str]
    consulta: str
    respuesta: str
    intencion: Optional[str]
    tiempo_respuesta: Optional[float]
    modismos: list[str] = []
    usuario: Optional[str] = None


class Page(BaseModel):
    total: int
    items: list


# ---- Modismos
class IdiomIn(BaseModel):
    nombre_modismo: str = Field(min_length=1, max_length=100)
    descripcion: Optional[str] = None
    estado: Literal["Activo", "Inactivo"] = "Activo"
    significados: list[str] = Field(min_length=1)
    ejemplos: list[str] = []
    contextos: list[str] = []
    regiones: list[str] = []


class IdiomOut(BaseModel):
    id_modismo: int
    nombre_modismo: str
    descripcion: Optional[str]
    estado: str
    significados: list[str]
    ejemplos: list[str]
    contextos: list[str]
    regiones: list[str]
    fecha_actualizacion: Optional[datetime] = None


class NameIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=100)
    tipo: Literal["region", "provincia", "nacional"] = "region"


# ---- Corpus
class CorpusIn(BaseModel):
    nombre: str = Field(min_length=1, max_length=200)
    fuente: Optional[str] = None
    tipo_dato: Optional[str] = None
    descripcion: Optional[str] = None
    activo: bool = True


class CorpusOut(ORM):
    id_corpus: int
    nombre: str
    fuente: Optional[str]
    tipo_dato: Optional[str]
    descripcion: Optional[str]
    total_registros: int
    activo: bool
    fecha_carga: Optional[datetime]


class IdsIn(BaseModel):
    ids: list[int]


# ---- Modelo IA
class ParamsIn(BaseModel):
    temperatura: float
    top_p: float
    max_tokens: int
    id_modelo: Optional[int] = None


class ModelIn(BaseModel):
    nombre_modelo: str
    proveedor: str = "ollama"
    version: Optional[str] = None
    fecha_entrenamiento: Optional[date] = None


class EvalIn(BaseModel):
    id_respuesta: int
    texto_referencia: str = Field(min_length=1)
