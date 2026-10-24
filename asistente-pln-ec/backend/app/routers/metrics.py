from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..deps import require_admin
from ..models import Consulta, Evaluacion, Intencion, Modismo, Respuesta, Usuario, Corpus
from ..schemas import EvalIn
from ..services import metrics as m

router = APIRouter(prefix="/admin", tags=["Admin · Métricas"], dependencies=[Depends(require_admin)])


def _f(v):
    return round(float(v), 2) if v is not None else None


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    since = datetime.utcnow() - timedelta(days=13)
    per_day = db.execute(select(func.date(Consulta.fecha_consulta), func.count())
                         .where(Consulta.fecha_consulta >= since).group_by(func.date(Consulta.fecha_consulta))
                         .order_by(func.date(Consulta.fecha_consulta))).all()
    by_input = db.execute(select(Consulta.tipo_entrada, func.count()).group_by(Consulta.tipo_entrada)).all()
    by_intent = db.execute(select(Intencion.nombre, func.count()).join(Consulta, Consulta.id_intencion == Intencion.id_intencion)
                           .group_by(Intencion.nombre)).all()
    return {
        "usuarios": db.scalar(select(func.count(Usuario.id_usuario))),
        "consultas": db.scalar(select(func.count(Consulta.id_consulta))),
        "modismos": db.scalar(select(func.count(Modismo.id_modismo))),
        "corpus": db.scalar(select(func.count(Corpus.id_corpus))),
        "tiempo_medio_s": _f(db.scalar(select(func.avg(Respuesta.tiempo_respuesta)))),
        "consultas_por_dia": [{"fecha": str(d), "total": n} for d, n in per_day],
        "por_tipo_entrada": {k: v for k, v in by_input},
        "por_intencion": {k: v for k, v in by_intent},
    }


@router.get("/metrics/summary")
def summary(db: Session = Depends(get_db)):
    avg = lambda col: _f(db.scalar(select(func.avg(col))))
    pg = avg(Evaluacion.precision_global)
    return {"evaluaciones": db.scalar(select(func.count(Evaluacion.id_evaluacion))),
            "bleu": avg(Evaluacion.bleu), "rouge": avg(Evaluacion.rouge), "bertscore": avg(Evaluacion.bertscore),
            "precision_global": pg, "umbral": settings.precision_threshold,
            "cumple_umbral": (pg is not None and pg >= settings.precision_threshold),
            "pesos": {"bleu": settings.weight_bleu, "rouge": settings.weight_rouge, "bertscore": settings.weight_bertscore}}


@router.get("/metrics/evaluations")
def evaluations(skip: int = 0, limit: int = 30, db: Session = Depends(get_db)):
    rows = db.scalars(select(Evaluacion).order_by(Evaluacion.id_evaluacion.desc()).offset(skip).limit(limit)).all()
    return [{"id_evaluacion": e.id_evaluacion, "id_respuesta": e.id_respuesta, "bleu": _f(e.bleu), "rouge": _f(e.rouge),
             "bertscore": _f(e.bertscore), "precision_global": _f(e.precision_global), "origen": e.origen,
             "fecha": e.fecha_evaluacion} for e in rows]


@router.post("/metrics/evaluate", summary="Evalúa una respuesta contra un texto de referencia")
def evaluate(d: EvalIn, db: Session = Depends(get_db)):
    r = db.get(Respuesta, d.id_respuesta)
    if not r:
        raise HTTPException(404, "Respuesta no encontrada")
    res = m.evaluate(r.texto_generado, d.texto_referencia)
    if res["precision_global"] is None:
        raise HTTPException(501, "Librerías de métricas no instaladas (INSTALL_ML=true)")
    ev = r.evaluacion or Evaluacion(id_respuesta=r.id_respuesta)
    ev.texto_referencia, ev.origen, ev.fecha_evaluacion = d.texto_referencia, "manual", datetime.utcnow()
    for k, v in res.items():
        setattr(ev, k, v)
    db.add(ev)
    db.commit()
    return {**res, "cumple_umbral": res["precision_global"] >= settings.precision_threshold}
