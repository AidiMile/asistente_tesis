import hashlib
import re
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import HTTPException, status

from .config import settings


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode()[:72], bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode()[:72], hashed.encode())
    except ValueError:
        return False


def validate_password_strength(password: str) -> None:
    """RF01: verifica la seguridad de la contrasena."""
    if len(password) < 8 or not re.search(r"[a-z]", password) or not re.search(r"[A-Z]", password) \
            or not re.search(r"\d", password):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY,
                            "Contraseña débil: mínimo 8 caracteres con mayúscula, minúscula y número.")


def create_token(sub: int, kind: str, expires: timedelta) -> str:
    now = datetime.now(timezone.utc)
    return jwt.encode({"sub": str(sub), "type": kind, "iat": now, "exp": now + expires},
                      settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_token(token: str, kind: str) -> dict:
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except jwt.PyJWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Token inválido o expirado",
                            headers={"WWW-Authenticate": "Bearer"})
    if payload.get("type") != kind:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Tipo de token incorrecto")
    return payload


def new_opaque_token() -> tuple[str, str]:
    raw = secrets.token_urlsafe(32)
    return raw, hashlib.sha256(raw.encode()).hexdigest()


def hash_opaque(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()
