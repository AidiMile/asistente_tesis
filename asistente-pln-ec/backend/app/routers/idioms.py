from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from ..database import get_db
from ..deps import require_admin
from ..models import (Contexto, EjemploUso, Modismo, Region, Significado)
from ..schemas import IdiomIn, IdiomOut, NameIn, Page
from ..services.idioms import idiom_index

router = APIRouter(prefix="/admin", tags=["Admin · Modismos"], dependencies=[Depends(require_admin)])


def out(m: Modismo) -> dict:
    return {"id_modismo": m.id_modismo, "nombre_modismo": m.nombre_modismo, "descripcion": m.descripcion,
            "estado": m.estado, "significados": [s.significado for s in m.significados],
            "ejemplos": [e.ejemplo for e in m.ejemplos], "contextos": [c.descripcion for c in m.contextos],
            "regiones": [r.nombre for r in m.regiones], "fecha_actualizacion": m.fecha_actualizacion}


def _apply(db: Session, m: Modismo, d: IdiomIn):
    m.nombre_modismo, m.descripcion, m.estado = d.nombre_modismo.strip(), d.descripcion, d.estado
    m.significados = [Significado(significado=s.strip()) for s in d.significados if s.strip()]
    m.ejemplos = [EjemploUso(ejemplo=e.strip()) for e in d.ejemplos if e.strip()]
    m.contextos = []
    for c in {c.strip() for c in d.contextos if c.strip()}:
        m.contextos.append(db.scalars(select(Contexto).where(Contexto.descripcion == c)).first()
                           or Contexto(descripcion=c))
    m.regiones = []
    for r in {r.strip() for r in d.regiones if r.strip()}:
        m.regiones.append(db.scalars(select(Region).where(Region.nombre == r)).first()
                          or Region(nombre=r, tipo="region"))
    m.fecha_actualizacion = func.now()


def _opts():
    return (selectinload(Modismo.significados), selectinload(Modismo.ejemplos),
            selectinload(Modismo.contextos), selectinload(Modismo.regiones))


@router.get("/idioms", response_model=Page)
def list_idioms(skip: int = 0, limit: int = 50, q: str | None = None, region: str | None = None,
                db: Session = Depends(get_db)):
    stmt = select(Modismo)
    if q:
        stmt = stmt.where(Modismo.nombre_modismo.ilike(f"%{q}%"))
    if region:
        stmt = stmt.where(Modismo.regiones.any(Region.nombre == region))
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.options(*_opts()).order_by(Modismo.nombre_modismo).offset(skip).limit(limit)).all()
    return {"total": total, "items": [out(m) for m in rows]}


@router.post("/idioms", response_model=IdiomOut, status_code=201)
def create_idiom(d: IdiomIn, db: Session = Depends(get_db)):
    if db.scalars(select(Modismo).where(func.lower(Modismo.nombre_modismo) == d.nombre_modismo.strip().lower())).first():
        raise HTTPException(409, "El modismo ya existe")
    m = Modismo()
    _apply(db, m, d)
    db.add(m)
    db.commit()
    idiom_index.rebuild(db)
    return out(db.get(Modismo, m.id_modismo))


@router.get("/idioms/{mid}", response_model=IdiomOut)
def get_idiom(mid: int, db: Session = Depends(get_db)):
    m = db.get(Modismo, mid)
    if not m:
        raise HTTPException(404, "Modismo no encontrado")
    return out(m)


@router.put("/idioms/{mid}", response_model=IdiomOut)
def update_idiom(mid: int, d: IdiomIn, db: Session = Depends(get_db)):
    m = db.get(Modismo, mid)
    if not m:
        raise HTTPException(404, "Modismo no encontrado")
    _apply(db, m, d)
    db.commit()
    idiom_index.rebuild(db)
    return out(db.get(Modismo, mid))


@router.delete("/idioms/{mid}", status_code=204)
def delete_idiom(mid: int, db: Session = Depends(get_db)):
    m = db.get(Modismo, mid)
    if not m:
        raise HTTPException(404, "Modismo no encontrado")
    db.delete(m)
    db.commit()
    idiom_index.rebuild(db)


@router.post("/idioms/import", summary="Carga masiva de modismos (lista JSON de IdiomIn)")
def import_idioms(items: list[IdiomIn], db: Session = Depends(get_db)):
    created = updated = 0
    for d in items:
        m = db.scalars(select(Modismo).where(func.lower(Modismo.nombre_modismo) == d.nombre_modismo.strip().lower())).first()
        if m:
            updated += 1
        else:
            m = Modismo()
            db.add(m)
            created += 1
        _apply(db, m, d)
        db.flush()
    db.commit()
    idiom_index.rebuild(db)
    return {"creados": created, "actualizados": updated}


@router.get("/regions")
def regions(db: Session = Depends(get_db)):
    return [{"id_region": r.id_region, "nombre": r.nombre, "tipo": r.tipo}
            for r in db.scalars(select(Region).order_by(Region.tipo, Region.nombre))]


@router.post("/regions", status_code=201)
def add_region(d: NameIn, db: Session = Depends(get_db)):
    if db.scalars(select(Region).where(Region.nombre == d.nombre)).first():
        raise HTTPException(409, "Ya existe")
    r = Region(nombre=d.nombre, tipo=d.tipo)
    db.add(r)
    db.commit()
    return {"id_region": r.id_region, "nombre": r.nombre, "tipo": r.tipo}


@router.delete("/regions/{rid}", status_code=204)
def del_region(rid: int, db: Session = Depends(get_db)):
    r = db.get(Region, rid)
    if r:
        db.delete(r)
        db.commit()
        idiom_index.rebuild(db)


@router.get("/contexts")
def contexts(db: Session = Depends(get_db)):
    return [{"id_contexto": c.id_contexto, "descripcion": c.descripcion}
            for c in db.scalars(select(Contexto).order_by(Contexto.descripcion))]


@router.post("/contexts", status_code=201)
def add_context(d: NameIn, db: Session = Depends(get_db)):
    if db.scalars(select(Contexto).where(Contexto.descripcion == d.nombre)).first():
        raise HTTPException(409, "Ya existe")
    c = Contexto(descripcion=d.nombre)
    db.add(c)
    db.commit()
    return {"id_contexto": c.id_contexto, "descripcion": c.descripcion}


@router.delete("/contexts/{cid}", status_code=204)
def del_context(cid: int, db: Session = Depends(get_db)):
    c = db.get(Contexto, cid)
    if c:
        db.delete(c)
        db.commit()
        idiom_index.rebuild(db)
