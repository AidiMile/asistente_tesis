from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select, func
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_admin
from ..models import Perfil, Usuario
from ..schemas import AdminUserCreate, AdminUserUpdate, Page, UsuarioOut
from ..security import hash_password, validate_password_strength

router = APIRouter(prefix="/admin/users", tags=["Admin · Usuarios"])


@router.get("", response_model=Page)
def list_users(skip: int = 0, limit: int = 50, q: str | None = None, _=Depends(require_admin),
               db: Session = Depends(get_db)):
    stmt = select(Usuario)
    if q:
        like = f"%{q}%"
        stmt = stmt.where(or_(Usuario.nombre.ilike(like), Usuario.correo.ilike(like),
                              Usuario.nombre_usuario.ilike(like)))
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(Usuario.id_usuario).offset(skip).limit(limit)).all()
    return {"total": total, "items": [UsuarioOut.model_validate(u).model_dump(mode="json") for u in rows]}


@router.post("", response_model=UsuarioOut, status_code=201)
def create_user(data: AdminUserCreate, _=Depends(require_admin), db: Session = Depends(get_db)):
    validate_password_strength(data.password)
    if db.scalars(select(Usuario).where((Usuario.correo == data.correo.lower()) |
                                        (Usuario.nombre_usuario == data.nombre_usuario))).first():
        raise HTTPException(409, "Correo o nombre de usuario ya existente")
    u = Usuario(nombre=data.nombre, nombre_usuario=data.nombre_usuario, correo=data.correo.lower(),
                password_hash=hash_password(data.password), estado="Activo", correo_verificado=True)
    u.perfil = Perfil(rol="usuario")
    db.add(u)
    db.commit()
    return u


@router.get("/{uid}", response_model=UsuarioOut)
def get_user(uid: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    u = db.get(Usuario, uid)
    if not u:
        raise HTTPException(404, "Usuario no encontrado")
    return u


@router.put("/{uid}", response_model=UsuarioOut)
def update_user(uid: int, data: AdminUserUpdate, admin: Usuario = Depends(require_admin),
                db: Session = Depends(get_db)):
    u = db.get(Usuario, uid)
    if not u:
        raise HTTPException(404, "Usuario no encontrado")
    if uid == admin.id_usuario and ((data.estado and data.estado != "Activo") or
                                    (data.rol and data.rol != "administrador")):
        raise HTTPException(400, "No puede desactivarse ni quitarse el rol de administrador a sí mismo")
    if data.nombre:
        u.nombre = data.nombre
    if data.correo:
        u.correo = data.correo.lower()
    if data.estado:
        u.estado = data.estado
    if data.rol:
        u.perfil.rol = data.rol
    if data.password:
        validate_password_strength(data.password)
        u.password_hash = hash_password(data.password)
    db.commit()
    return u


@router.delete("/{uid}", status_code=204)
def delete_user(uid: int, admin: Usuario = Depends(require_admin), db: Session = Depends(get_db)):
    if uid == admin.id_usuario:
        raise HTTPException(400, "No puede eliminar su propia cuenta")
    u = db.get(Usuario, uid)
    if not u:
        raise HTTPException(404, "Usuario no encontrado")
    db.delete(u)  # elimina tambien su historial (CASCADE). Prefiera desactivar para conservar auditoria.
    db.commit()
