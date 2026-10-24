import csv
import io
import json
import re

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import require_admin
from ..models import Corpus, CorpusDocumento, Modismo
from ..schemas import CorpusIn, CorpusOut, IdsIn

router = APIRouter(prefix="/admin/corpus", tags=["Admin · Corpus"], dependencies=[Depends(require_admin)])
CHUNK = 800


def chunk_text(text: str) -> list[str]:
    paras = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    out, cur = [], ""
    for p in paras:
        if len(cur) + len(p) + 1 <= CHUNK:
            cur = f"{cur}\n{p}".strip()
        else:
            if cur:
                out.append(cur)
            while len(p) > CHUNK:
                out.append(p[:CHUNK])
                p = p[CHUNK:]
            cur = p
    if cur:
        out.append(cur)
    return out


def _count(db: Session, cid: int):
    c = db.get(Corpus, cid)
    c.total_registros = db.scalar(select(func.count()).select_from(CorpusDocumento)
                                  .where(CorpusDocumento.id_corpus == cid))
    db.commit()


@router.get("", response_model=list[CorpusOut])
def list_corpus(db: Session = Depends(get_db)):
    return db.scalars(select(Corpus).order_by(Corpus.id_corpus)).all()


@router.post("", response_model=CorpusOut, status_code=201)
def create(d: CorpusIn, db: Session = Depends(get_db)):
    c = Corpus(**d.model_dump())
    db.add(c)
    db.commit()
    return c


@router.put("/{cid}", response_model=CorpusOut)
def update(cid: int, d: CorpusIn, db: Session = Depends(get_db)):
    c = db.get(Corpus, cid)
    if not c:
        raise HTTPException(404, "Corpus no encontrado")
    for k, v in d.model_dump().items():
        setattr(c, k, v)
    db.commit()
    return c


@router.delete("/{cid}", status_code=204)
def delete(cid: int, db: Session = Depends(get_db)):
    c = db.get(Corpus, cid)
    if not c:
        raise HTTPException(404, "Corpus no encontrado")
    db.delete(c)
    db.commit()


@router.post("/{cid}/documents", summary="Cargar .txt, .md, .csv, .json o .jsonl (se fragmenta en pasajes)")
async def upload(cid: int, file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not db.get(Corpus, cid):
        raise HTTPException(404, "Corpus no encontrado")
    raw = (await file.read()).decode("utf-8", errors="replace")
    name = (file.filename or "").lower()
    texts: list[str] = []
    if name.endswith(".csv"):
        texts = [" | ".join(v for v in row.values() if v) for row in csv.DictReader(io.StringIO(raw))]
    elif name.endswith(".jsonl"):
        for line in raw.splitlines():
            if line.strip():
                o = json.loads(line)
                texts.append(o.get("texto") or o.get("text") or json.dumps(o, ensure_ascii=False))
    elif name.endswith(".json"):
        data = json.loads(raw)
        data = data if isinstance(data, list) else [data]
        texts = [(o if isinstance(o, str) else o.get("texto") or o.get("text") or json.dumps(o, ensure_ascii=False))
                 for o in data]
    else:
        texts = chunk_text(raw)
    texts = [t for t in texts if t and t.strip()]
    if not texts:
        raise HTTPException(422, "El archivo no contiene texto utilizable")
    for t in texts:
        db.add(CorpusDocumento(id_corpus=cid, titulo=file.filename, contenido=t[:4000]))
    db.commit()
    _count(db, cid)
    return {"pasajes_cargados": len(texts)}


@router.get("/{cid}/documents")
def documents(cid: int, skip: int = 0, limit: int = 20, db: Session = Depends(get_db)):
    q = select(CorpusDocumento).where(CorpusDocumento.id_corpus == cid)
    total = db.scalar(select(func.count()).select_from(q.subquery()))
    rows = db.scalars(q.order_by(CorpusDocumento.id_documento).offset(skip).limit(limit)).all()
    return {"total": total, "items": [{"id_documento": d.id_documento, "titulo": d.titulo,
                                       "contenido": d.contenido[:300]} for d in rows]}


@router.delete("/{cid}/documents/{did}", status_code=204)
def delete_doc(cid: int, did: int, db: Session = Depends(get_db)):
    d = db.get(CorpusDocumento, did)
    if d and d.id_corpus == cid:
        db.delete(d)
        db.commit()
        _count(db, cid)


@router.put("/{cid}/idioms", summary="Asociar modismos al corpus")
def link(cid: int, d: IdsIn, db: Session = Depends(get_db)):
    c = db.get(Corpus, cid)
    if not c:
        raise HTTPException(404, "Corpus no encontrado")
    c.modismos = list(db.scalars(select(Modismo).where(Modismo.id_modismo.in_(d.ids))))
    db.commit()
    return {"asociados": len(c.modismos)}


@router.get("/{cid}/idioms")
def linked(cid: int, db: Session = Depends(get_db)):
    c = db.get(Corpus, cid)
    if not c:
        raise HTTPException(404, "Corpus no encontrado")
    return [{"id_modismo": m.id_modismo, "nombre_modismo": m.nombre_modismo} for m in c.modismos]
