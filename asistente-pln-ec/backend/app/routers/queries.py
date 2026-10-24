from fastapi import APIRouter, BackgroundTasks, Depends, File, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import get_current_user, require_admin
from ..models import Consulta, Historial, Respuesta, Usuario
from ..schemas import HistoryItem, Page, QueryIn, QueryOut
from ..services import stt
from ..services.pipeline import auto_evaluate, process_query

router = APIRouter(tags=["Consultas"])
MAX_AUDIO_BYTES = 15 * 1024 * 1024


def _run(db, user, texto, tipo, bg: BackgroundTasks):
    out = process_query(db, user, texto, tipo)
    ref = out.pop("_reference")
    bg.add_task(auto_evaluate, out["id_respuesta"], ref)
    return out


@router.post("/queries", response_model=QueryOut, summary="Consulta por texto o dictado por voz (ya transcrito)")
def query_text(data: QueryIn, bg: BackgroundTasks, user: Usuario = Depends(get_current_user),
               db: Session = Depends(get_db)):
    return _run(db, user, data.texto, data.tipo_entrada, bg)


@router.post("/queries/audio", response_model=QueryOut, summary="Mensaje de voz (audio → texto con Whisper)")
async def query_audio(bg: BackgroundTasks, file: UploadFile = File(...), user: Usuario = Depends(get_current_user),
                      db: Session = Depends(get_db)):
    data = await file.read()
    if not data or len(data) > MAX_AUDIO_BYTES:
        raise HTTPException(413, "Audio vacío o demasiado grande (máx. 15 MB)")
    suffix = "." + (file.filename or "a.wav").rsplit(".", 1)[-1]
    from starlette.concurrency import run_in_threadpool
    texto = await run_in_threadpool(stt.transcribe, data, suffix)
    if not texto:
        raise HTTPException(422, "No se detectó voz en el audio")
    return await run_in_threadpool(_run, db, user, texto[:settings.max_query_chars], "audio", bg)


def hist_item(h: Historial, with_user: bool = False) -> dict:
    return {"id_historial": h.id_historial, "id_consulta": h.id_consulta, "id_respuesta": h.id_respuesta,
            "fecha": h.fecha, "tipo_entrada": h.tipo_entrada, "consulta": h.consulta.texto_consulta,
            "respuesta": h.respuesta.texto_generado,
            "intencion": h.consulta.intencion.nombre if h.consulta.intencion else None,
            "tiempo_respuesta": float(h.respuesta.tiempo_respuesta or 0),
            "modismos": [m["modismo"] for m in (h.respuesta.modismos_detectados or [])],
            "usuario": h.usuario.nombre_usuario if with_user else None}


def paged(db: Session, stmt, skip, limit, with_user=False):
    total = db.scalar(select(func.count()).select_from(stmt.subquery()))
    rows = db.scalars(stmt.order_by(Historial.fecha.desc(), Historial.id_historial.desc())
                      .offset(skip).limit(limit)).all()
    return {"total": total, "items": [hist_item(h, with_user) for h in rows]}


@router.get("/history", response_model=Page, summary="Historial personal")
def my_history(skip: int = 0, limit: int = 20, q: str | None = None, user: Usuario = Depends(get_current_user),
               db: Session = Depends(get_db)):
    stmt = select(Historial).where(Historial.id_usuario == user.id_usuario)
    if q:
        stmt = stmt.join(Consulta, Consulta.id_consulta == Historial.id_consulta).where(
            Consulta.texto_consulta.ilike(f"%{q}%"))
    return paged(db, stmt, skip, min(limit, 100))


@router.get("/history/{id_historial}", response_model=HistoryItem)
def my_history_item(id_historial: int, user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    h = db.get(Historial, id_historial)
    if not h or h.id_usuario != user.id_usuario:
        raise HTTPException(404, "Registro no encontrado")
    return hist_item(h)


@router.get("/admin/history", response_model=Page, tags=["Admin"], summary="Historial global")
def global_history(skip: int = 0, limit: int = 20, usuario: str | None = None, q: str | None = None,
                   _: Usuario = Depends(require_admin), db: Session = Depends(get_db)):
    stmt = select(Historial)
    if usuario:
        stmt = stmt.join(Usuario, Usuario.id_usuario == Historial.id_usuario).where(
            Usuario.nombre_usuario.ilike(f"%{usuario}%"))
    if q:
        stmt = stmt.join(Consulta, Consulta.id_consulta == Historial.id_consulta).where(
            Consulta.texto_consulta.ilike(f"%{q}%"))
    return paged(db, stmt, skip, min(limit, 200), with_user=True)
