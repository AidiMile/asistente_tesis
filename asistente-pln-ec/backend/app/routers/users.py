from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import Usuario
from ..schemas import PasswordChange, ProfileUpdate, UsuarioOut
from ..security import hash_password, validate_password_strength, verify_password

router = APIRouter(prefix="/users", tags=["Perfil"])


@router.get("/me", response_model=UsuarioOut)
def me(user: Usuario = Depends(get_current_user)):
    return user


@router.put("/me", response_model=UsuarioOut)
def update_me(data: ProfileUpdate, user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    if data.nombre:
        user.nombre = data.nombre
    if data.foto is not None:
        user.perfil.foto = data.foto
    db.commit()
    return user


@router.put("/me/password")
def change_password(data: PasswordChange, user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(data.actual, user.password_hash):
        raise HTTPException(400, "La contraseña actual es incorrecta")
    validate_password_strength(data.nueva)
    user.password_hash = hash_password(data.nueva)
    db.commit()
    return {"mensaje": "Contraseña actualizada"}
