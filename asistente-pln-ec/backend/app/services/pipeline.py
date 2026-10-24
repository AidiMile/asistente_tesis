"""Flujo completo de una consulta (diagrama de actividad / secuencia del documento)."""
import logging
import time

from fastapi import HTTPException
from sqlalchemy import or_, select, text as sql
from sqlalchemy.orm import Session

from ..config import settings
from ..database import SessionLocal
from ..models import (ConocimientoAprendido, Consulta, CorpusDocumento, Corpus, Entidad, Evaluacion, Historial,
                      Intencion, ModeloIA, ParametrosModelo, Respuesta, Usuario)
from . import llm, metrics
from .idioms import IdiomEntry
from .nlp import Analysis, nlp_service
from .text_utils import keywords, normalize

log = logging.getLogger("pipeline")

SYSTEM_BASE = (
    "Eres PLN-EC, un asistente virtual que comprende y usa el español de Ecuador. "
    "Responde siempre en español, con claridad, coherencia y precisión. "
    "Cuando el usuario use modismos ecuatorianos, interprétalos con el glosario proporcionado; "
    "si un modismo no está en el glosario y no estás seguro de su significado, dilo con honestidad en lugar de inventarlo. "
    "En consultas de salud, brinda orientación general, no diagnostiques ni indiques medicamentos o dosis; "
    "prioriza y nombra las fuentes sanitarias recuperadas. Ante confusión intensa, dificultad para despertar, "
    "convulsiones, respiración lenta o irregular o piel azulada tras beber, indica llamar al ECU 911 en Ecuador, "
    "no dejar sola a la persona y no darle comida ni bebida si está inconsciente. Nunca recomiendes más alcohol "
    "para aliviar una resaca. "
    "Usa únicamente los fragmentos del corpus como apoyo factual cuando sean pertinentes y no inventes datos."
)
INTENT_HINTS = {
    "Saludo": "El usuario saluda: responde con calidez y brevedad.",
    "Pregunta": "El usuario hace una pregunta: responde de forma directa y fundamentada.",
    "Solicitud": "El usuario solicita contenido: si es académico, estructura la respuesta con introducción, desarrollo y conclusión.",
    "Comando": "El usuario da una instrucción: ejecútala si es posible o explica qué puedes hacer.",
    "Consulta_Modismo": "El usuario pregunta por un modismo: explica su significado, da un ejemplo de uso e indica la región o contexto.",
}


def get_active_model(db: Session) -> tuple[ModeloIA | None, dict]:
    model = db.scalars(select(ModeloIA).where(ModeloIA.activo.is_(True))).first()
    p = model.parametros if model else None
    params = {"temperatura": float(p.temperatura) if p else 0.7, "top_p": float(p.top_p) if p else 0.9,
              "max_tokens": int(p.max_tokens) if p else 300}
    return model, params


def _cache_key(query: str) -> str:
    """Normaliza espacios, mayúsculas y tildes para reutilizar preguntas equivalentes."""
    return " ".join(normalize(query).split()).strip(" ¿?¡!.,;:")


def get_learned_answer(db: Session, query: str) -> ConocimientoAprendido | None:
    key = _cache_key(query)
    if not key:
        return None
    return db.scalars(select(ConocimientoAprendido).where(
        ConocimientoAprendido.consulta_normalizada == key)).first()


def remember_answer(db: Session, query: str, answer: str, model: str | None) -> None:
    """Alimenta la base local después de una generación exitosa, sin duplicar preguntas."""
    key = _cache_key(query)
    if not key or not answer.strip():
        return
    learned = db.scalars(select(ConocimientoAprendido).where(
        ConocimientoAprendido.consulta_normalizada == key)).first()
    if learned:
        learned.consulta_original = query
        learned.respuesta = answer
        learned.modelo = model
    else:
        db.add(ConocimientoAprendido(consulta_normalizada=key, consulta_original=query,
                                     respuesta=answer, modelo=model, veces_utilizado=0))


def retrieve_corpus(db: Session, query: str, idioms: list[IdiomEntry]) -> list[dict]:
    kws = keywords(query)[:8] + [i.nombre for i in idioms]
    kws = [k for k in kws if k]
    if not kws:
        return []
    if db.bind.dialect.name == "postgresql":
        ts = " | ".join("".join(ch for ch in k if ch.isalnum()) for k in kws if any(c.isalnum() for c in k))
        if not ts.strip():
            return []
        rows = db.execute(sql(
            "SELECT d.id_documento, d.titulo, d.contenido, c.nombre AS corpus, "
            "ts_rank(to_tsvector('spanish', d.contenido), to_tsquery('spanish', :q)) AS r "
            "FROM corpus_documentos d JOIN corpus_entrenamiento c ON c.id_corpus = d.id_corpus "
            "WHERE c.activo AND to_tsvector('spanish', d.contenido) @@ to_tsquery('spanish', :q) "
            "ORDER BY r DESC LIMIT :k"), {"q": ts, "k": settings.corpus_top_k}).mappings().all()
        return [dict(r) for r in rows]
    cond = or_(*[CorpusDocumento.contenido.ilike(f"%{k}%") for k in kws])
    rows = db.execute(select(CorpusDocumento, Corpus.nombre).join(Corpus).where(Corpus.activo.is_(True), cond)
                      .limit(settings.corpus_top_k)).all()
    return [{"id_documento": d.id_documento, "titulo": d.titulo, "contenido": d.contenido, "corpus": n}
            for d, n in rows]


def build_messages(db: Session, user: Usuario, texto: str, a: Analysis, snippets: list[dict]) -> list[dict]:
    sys_parts = [SYSTEM_BASE, INTENT_HINTS.get(a.intent, "")]
    if a.entities:
        sys_parts.append("Entidades detectadas: " + "; ".join(f"{n} ({t})" for n, t in a.entities))
    if a.idioms:
        gl = []
        for i in a.idioms:
            line = f"- {i.nombre}: {' / '.join(i.significados)}"
            if i.regiones:
                line += f" [Región: {', '.join(i.regiones)}]"
            if i.ejemplos:
                line += f" Ejemplo: {i.ejemplos[0]}"
            gl.append(line)
        sys_parts.append("Glosario de modismos ecuatorianos presentes en la consulta:\n" + "\n".join(gl))
    if snippets:
        sys_parts.append("Fragmentos del corpus PLN-EC:\n" + "\n".join(
            f"[{k + 1}] Fuente: {s.get('titulo') or 'Documento sin título'}; "
            f"corpus: {s.get('corpus') or 'general'}. {s['contenido'][:700]}"
            for k, s in enumerate(snippets)))
    msgs = [{"role": "system", "content": "\n\n".join(p for p in sys_parts if p)}]
    prev = db.execute(select(Consulta.texto_consulta, Respuesta.texto_generado)
                      .join(Respuesta, Respuesta.id_consulta == Consulta.id_consulta)
                      .where(Consulta.id_usuario == user.id_usuario)
                      .order_by(Consulta.id_consulta.desc()).limit(settings.history_turns)).all()
    for q, r in reversed(prev):
        msgs += [{"role": "user", "content": q}, {"role": "assistant", "content": r[:1200]}]
    msgs.append({"role": "user", "content": texto})
    return msgs


def process_query(db: Session, user: Usuario, texto: str, tipo_entrada: str) -> dict:
    t0 = time.perf_counter()
    texto = texto.strip()
    if not texto:
        raise HTTPException(422, "La consulta está vacía")
    if len(texto) > settings.max_query_chars:
        raise HTTPException(422, f"La consulta supera el máximo de {settings.max_query_chars} caracteres")

    analysis = nlp_service.analyze(texto)
    learned = get_learned_answer(db, texto)
    snippets = retrieve_corpus(db, texto, analysis.idioms)
    model, params = get_active_model(db)
    model_name = model.nombre_modelo if model else settings.default_model
    if learned:
        answer = learned.respuesta
        learned.veces_utilizado += 1
        origin = "base_local"
    else:
        messages = build_messages(db, user, texto, analysis, snippets)
        answer = llm.chat(messages, model_name, params["temperatura"], params["top_p"], params["max_tokens"])
        remember_answer(db, texto, answer, model_name)
        origin = "modelo_generativo"
    elapsed = round(time.perf_counter() - t0, 2)

    intent = db.scalars(select(Intencion).where(Intencion.nombre == analysis.intent)).first()
    consulta = Consulta(id_usuario=user.id_usuario, id_intencion=intent.id_intencion if intent else None,
                        texto_consulta=texto, tipo_entrada=tipo_entrada,
                        confianza_intencion=round(analysis.confidence, 4))
    for n, ty in analysis.entities:
        ent = db.scalars(select(Entidad).where(Entidad.nombre == n, Entidad.tipo == ty)).first()
        consulta.entidades.append(ent or Entidad(nombre=n, tipo=ty))
    db.add(consulta)
    db.flush()
    hits = [{"id_modismo": i.id_modismo, "modismo": i.nombre, "significados": i.significados,
             "regiones": i.regiones, "contextos": i.contextos} for i in analysis.idioms]
    resp = Respuesta(id_consulta=consulta.id_consulta, id_modelo=model.id_modelo if model else None,
                     texto_generado=answer, tiempo_respuesta=elapsed, modismos_detectados=hits,
                     fuentes_corpus=[{"id_documento": s["id_documento"], "corpus": s.get("corpus")} for s in snippets])
    db.add(resp)
    db.flush()
    db.add(Historial(id_usuario=user.id_usuario, id_consulta=consulta.id_consulta,
                     id_respuesta=resp.id_respuesta, tipo_entrada=tipo_entrada))
    db.commit()

    reference = "\n".join([f"{i.nombre}: {' '.join(i.significados)}" for i in analysis.idioms] +
                          [s["contenido"][:700] for s in snippets])
    return {"id_consulta": consulta.id_consulta, "id_respuesta": resp.id_respuesta, "texto_consulta": texto,
            "tipo_entrada": tipo_entrada, "intencion": analysis.intent, "confianza": float(analysis.confidence),
            "entidades": [{"nombre": n, "tipo": t} for n, t in analysis.entities], "modismos": hits,
            "respuesta": answer, "tiempo_respuesta": elapsed,
            "modelo": learned.modelo if learned else model_name, "origen_respuesta": origin,
            "fecha": resp.fecha_respuesta, "_reference": reference}


def auto_evaluate(id_respuesta: int, reference: str) -> None:
    """Evaluacion automatica de coherencia contra el conocimiento recuperado (corre en segundo plano)."""
    if not (settings.auto_eval and reference.strip()):
        return
    db = SessionLocal()
    try:
        r = db.get(Respuesta, id_respuesta)
        if not r or r.evaluacion:
            return
        res = metrics.evaluate(r.texto_generado, reference)
        if res["precision_global"] is None:
            return
        db.add(Evaluacion(id_respuesta=id_respuesta, texto_referencia=reference, origen="automatica", **res))
        db.commit()
    except Exception as exc:  # pragma: no cover
        log.warning("auto_evaluate fallo: %s", exc)
    finally:
        db.close()
