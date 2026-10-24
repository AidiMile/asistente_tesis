from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from .database import get_db
from .models import Usuario
from .security import decode_token

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/token")


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> Usuario:
    payload = decode_token(token, "access")
    user = db.get(Usuario, int(payload["sub"]))
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Usuario no encontrado")
    if user.estado != "Activo":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Cuenta inactiva o pendiente de verificación")
    return user


def require_admin(user: Usuario = Depends(get_current_user)) -> Usuario:
    if user.rol != "administrador":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Se requiere rol de administrador")
    return user
