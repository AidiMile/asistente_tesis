from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models import Perfil, TokenUsuario, Usuario
from ..schemas import (ForgotIn, LoginIn, RefreshIn, RegisterIn, ResetIn, TokenOut, UsuarioOut)
from ..security import (create_token, decode_token, hash_opaque, hash_password, new_opaque_token,
                        validate_password_strength, verify_password)
from ..services.mailer import send_mail

router = APIRouter(prefix="/auth", tags=["Autenticación"])


def _issue_opaque(db: Session, user: Usuario, tipo: str, hours: int) -> str:
    raw, h = new_opaque_token()
    db.add(TokenUsuario(id_usuario=user.id_usuario, tipo=tipo, token_hash=h,
                        expira=datetime.utcnow() + timedelta(hours=hours)))
    db.commit()
    return raw


def _consume(db: Session, raw: str, tipo: str) -> Usuario:
    t = db.scalars(select(TokenUsuario).where(TokenUsuario.token_hash == hash_opaque(raw),
                                              TokenUsuario.tipo == tipo)).first()
    if not t or t.usado or t.expira < datetime.utcnow():
        raise HTTPException(400, "Enlace inválido o expirado")
    t.usado = True
    return db.get(Usuario, t.id_usuario)


def _tokens(user: Usuario) -> TokenOut:
    return TokenOut(
        access_token=create_token(user.id_usuario, "access", timedelta(minutes=settings.access_token_minutes)),
        refresh_token=create_token(user.id_usuario, "refresh", timedelta(days=settings.refresh_token_days)),
        usuario=UsuarioOut.model_validate(user))


def _login(db: Session, correo: str, password: str) -> TokenOut:
    user = db.scalars(select(Usuario).where(Usuario.correo == correo.lower())).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Credenciales incorrectas. Puede restablecer su contraseña.")
    if user.estado == "Pendiente":
        raise HTTPException(403, "Debe verificar su correo electrónico para activar la cuenta")
    if user.estado != "Activo":
        raise HTTPException(403, "Cuenta desactivada. Contacte al administrador")
    if user.perfil:
        user.perfil.ultima_conexion = datetime.utcnow()
    db.commit()
    return _tokens(user)


@router.post("/register", status_code=201)
def register(data: RegisterIn, db: Session = Depends(get_db)):
    validate_password_strength(data.password)
    if db.scalars(select(Usuario).where(Usuario.correo == data.correo.lower())).first():
        raise HTTPException(409, "El correo ya está registrado")
    if db.scalars(select(Usuario).where(Usuario.nombre_usuario == data.nombre_usuario)).first():
        raise HTTPException(409, "El nombre de usuario ya existe")
    verify = settings.require_email_verification
    user = Usuario(nombre=data.nombre, nombre_usuario=data.nombre_usuario, correo=data.correo.lower(),
                   password_hash=hash_password(data.password), estado="Pendiente" if verify else "Activo",
                   correo_verificado=not verify)
    user.perfil = Perfil(rol="usuario")
    db.add(user)
    db.commit()
    if verify:
        raw = _issue_opaque(db, user, "verificacion", 48)
        send_mail(user.correo, "Verifique su cuenta - PLN-EC",
                  f"Hola {user.nombre}, active su cuenta en: {settings.frontend_url}/#/verify?token={raw}")
    return {"mensaje": "Registro exitoso" + (". Revise su correo para activar la cuenta." if verify else ""),
            "usuario": UsuarioOut.model_validate(user)}


@router.post("/verify-email")
def verify_email(token: str, db: Session = Depends(get_db)):
    user = _consume(db, token, "verificacion")
    user.estado, user.correo_verificado = "Activo", True
    db.commit()
    return {"mensaje": "Cuenta verificada. Ya puede iniciar sesión."}


@router.post("/login", response_model=TokenOut)
def login(data: LoginIn, db: Session = Depends(get_db)):
    return _login(db, data.correo, data.password)


@router.post("/token", response_model=TokenOut, include_in_schema=True,
             summary="Login OAuth2 (botón Authorize de Swagger; username = correo)")
def token(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    return _login(db, form.username, form.password)


@router.post("/refresh", response_model=TokenOut)
def refresh(data: RefreshIn, db: Session = Depends(get_db)):
    payload = decode_token(data.refresh_token, "refresh")
    user = db.get(Usuario, int(payload["sub"]))
    if not user or user.estado != "Activo":
        raise HTTPException(401, "Sesión no válida")
    return _tokens(user)


@router.post("/forgot-password")
def forgot(data: ForgotIn, db: Session = Depends(get_db)):
    user = db.scalars(select(Usuario).where(Usuario.correo == data.correo.lower())).first()
    if user and user.estado != "Inactivo":
        raw = _issue_opaque(db, user, "recuperacion", 1)
        send_mail(user.correo, "Restablecer contraseña - PLN-EC",
                  f"Use este enlace (vigente 1 hora): {settings.frontend_url}/#/reset?token={raw}\n"
                  f"Código: {raw}")
    return {"mensaje": "Si el correo existe, recibirá instrucciones para restablecer su contraseña."}


@router.post("/reset-password")
def reset(data: ResetIn, db: Session = Depends(get_db)):
    validate_password_strength(data.nueva_password)
    user = _consume(db, data.token, "recuperacion")
    user.password_hash = hash_password(data.nueva_password)
    db.commit()
    return {"mensaje": "Contraseña actualizada"}
