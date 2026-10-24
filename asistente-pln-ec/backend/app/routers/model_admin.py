from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import PlainTextResponse
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..config import settings
from ..database import get_db
from ..deps import require_admin
from ..models import Modismo, ModeloIA, ParametrosModelo, Usuario
from ..schemas import ModelIn, ParamsIn
from ..services import llm
from ..services.idioms import idiom_index

router = APIRouter(prefix="/admin", tags=["Admin · Modelo IA y conocimiento"])


def _model_out(m: ModeloIA) -> dict:
    p = m.parametros
    return {"id_modelo": m.id_modelo, "nombre_modelo": m.nombre_modelo, "proveedor": m.proveedor,
            "version": m.version, "activo": m.activo,
            "parametros": {"temperatura": float(p.temperatura), "top_p": float(p.top_p),
                           "max_tokens": p.max_tokens} if p else None}


@router.get("/model")
def get_model(_=Depends(require_admin), db: Session = Depends(get_db)):
    models = db.scalars(select(ModeloIA).options(selectinload(ModeloIA.parametros)).order_by(ModeloIA.id_modelo)).all()
    return {"modelos": [_model_out(m) for m in models],
            "limites": {"temperatura": [settings.temp_min, settings.temp_max], "top_p": [settings.top_p_min, settings.top_p_max],
                        "max_tokens": [settings.tokens_min, settings.tokens_max]}}


@router.post("/model/models", status_code=201)
def add_model(d: ModelIn, _=Depends(require_admin), db: Session = Depends(get_db)):
    if db.scalars(select(ModeloIA).where(ModeloIA.nombre_modelo == d.nombre_modelo)).first():
        raise HTTPException(409, "El modelo ya está registrado")
    m = ModeloIA(**d.model_dump(), activo=False)
    m.parametros = ParametrosModelo(temperatura=0.7, top_p=0.9, max_tokens=300)
    db.add(m)
    db.commit()
    return _model_out(m)


@router.put("/model/models/{mid}/activate")
def activate(mid: int, _=Depends(require_admin), db: Session = Depends(get_db)):
    target = db.get(ModeloIA, mid)
    if not target:
        raise HTTPException(404, "Modelo no encontrado")
    for m in db.scalars(select(ModeloIA)):
        m.activo = m.id_modelo == mid
    db.commit()
    return _model_out(target)


@router.put("/model/params")
def set_params(d: ParamsIn, admin: Usuario = Depends(require_admin), db: Session = Depends(get_db)):
    if not settings.temp_min <= d.temperatura <= settings.temp_max:
        raise HTTPException(422, f"temperatura debe estar entre {settings.temp_min} y {settings.temp_max}")
    if not settings.top_p_min <= d.top_p <= settings.top_p_max:
        raise HTTPException(422, f"top_p debe estar entre {settings.top_p_min} y {settings.top_p_max}")
    if not settings.tokens_min <= d.max_tokens <= settings.tokens_max:
        raise HTTPException(422, f"max_tokens debe estar entre {settings.tokens_min} y {settings.tokens_max}")
    m = db.get(ModeloIA, d.id_modelo) if d.id_modelo else db.scalars(select(ModeloIA).where(ModeloIA.activo.is_(True))).first()
    if not m:
        raise HTTPException(404, "No hay un modelo activo")
    if not m.parametros:
        m.parametros = ParametrosModelo()
    m.parametros.temperatura, m.parametros.top_p, m.parametros.max_tokens = d.temperatura, d.top_p, d.max_tokens
    m.parametros.fecha_actualizacion, m.parametros.id_usuario_actualiza = datetime.utcnow(), admin.id_usuario
    db.commit()
    return _model_out(m)


@router.get("/model/health")
def health(_=Depends(require_admin)):
    return llm.health()


@router.post("/knowledge/integrate", summary="Actualizar el conocimiento lingüístico del modelo (RF11)")
def integrate(_=Depends(require_admin), db: Session = Depends(get_db)):
    n = idiom_index.rebuild(db)
    return {"modismos_activos_indexados": n, "mensaje": "Conocimiento lingüístico actualizado; disponible en la próxima consulta."}


@router.get("/knowledge/export.jsonl", response_class=PlainTextResponse,
            summary="Exporta modismos como pares instrucción-respuesta (JSONL) para afinar el modelo")
def export_jsonl(_=Depends(require_admin), db: Session = Depends(get_db)):
    import json
    lines = []
    for m in db.scalars(select(Modismo).where(Modismo.estado == "Activo").options(
            selectinload(Modismo.significados), selectinload(Modismo.ejemplos), selectinload(Modismo.regiones))):
        reg = ", ".join(r.nombre for r in m.regiones) or "Ecuador"
        ans = f"'{m.nombre_modismo}' significa: {' / '.join(s.significado for s in m.significados)}. Región: {reg}."
        if m.ejemplos:
            ans += f" Ejemplo: {m.ejemplos[0].ejemplo}"
        lines.append(json.dumps({"instruction": f"¿Qué significa '{m.nombre_modismo}' en el español ecuatoriano?",
                                 "output": ans}, ensure_ascii=False))
    return "\n".join(lines)
