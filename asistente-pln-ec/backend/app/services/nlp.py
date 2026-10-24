"""Modulo PLN: intencion (BERT afinado o reglas), entidades (BERT-NER o reglas) y modismos."""
import logging
import os
import re
from dataclasses import dataclass, field

from ..config import settings
from .idioms import IdiomEntry, idiom_index
from .text_utils import normalize

log = logging.getLogger("nlp")

INTENTS = ["Saludo", "Pregunta", "Solicitud", "Comando", "Consulta_Modismo"]

_RE_SALUDO = re.compile(r"^\s*(hola|holi|buen[oa]s?|saludos|qu[eé] tal|hey|ey|buenas|adi[oó]s|chao|gracias)\b", re.I)
_RE_MODISMO = re.compile(r"(qu[eé] (significa|quiere decir)|significado de|qu[eé] es (un|una|el|la)?\s*\w+\?|"
                         r"c[oó]mo se usa|modismo|expresi[oó]n ecuatoriana)", re.I)
_RE_COMANDO = re.compile(r"^\s*(muestra|mu[eé]strame|abre|cierra|borra|elimina|limpia|cambia|activa|desactiva|lista|"
                         r"salir|reinicia)\b", re.I)
_RE_SOLICITUD = re.compile(r"\b(necesito|quiero|redacta|resume|resumen|genera|crea|escribe|elabora|haz(me)?|"
                           r"explica(me)?|por favor|podr[ií]as|puedes|dame|ens[eé]ñame|informe|ensayo)\b", re.I)
_RE_PREGUNTA = re.compile(r"(\?|^\s*(qu[eé]|qui[eé]n|cu[aá]l|cu[aá]nto|c[oó]mo|d[oó]nde|cu[aá]ndo|por qu[eé]|para qu[eé]))", re.I)
_RE_FECHA = re.compile(r"\b(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{1,2} de (enero|febrero|marzo|abril|mayo|junio|julio|agosto|"
                       r"septiembre|setiembre|octubre|noviembre|diciembre)( de \d{4})?|hoy|ma[ñn]ana|ayer|"
                       r"(?:19|20)\d{2})\b", re.I)
_RE_TEMA = re.compile(r"(?:sobre|acerca de|respecto a|tema de)\s+(.+?)(?:[.?!,;]|$)", re.I)
_RE_NOMBRE = re.compile(r"(?<![.!?¿¡]\s)(?<!^)\b([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)*)")


@dataclass
class Analysis:
    intent: str
    confidence: float
    entities: list[tuple[str, str]] = field(default_factory=list)
    idioms: list[IdiomEntry] = field(default_factory=list)


class NLPService:
    def __init__(self):
        self._intent_pipe = None
        self._ner_pipe = None
        self._tried_intent = False
        self._tried_ner = False

    # ---------- intencion
    def _load_intent(self):
        self._tried_intent = True
        if os.path.isdir(settings.intent_model_dir):
            try:
                from transformers import pipeline
                self._intent_pipe = pipeline("text-classification", model=settings.intent_model_dir, top_k=1)
                log.info("Clasificador BERT de intenciones cargado")
            except Exception as exc:  # pragma: no cover
                log.warning("No se pudo cargar el clasificador BERT: %s", exc)

    def classify_intent(self, text: str, has_idiom: bool) -> tuple[str, float]:
        if not self._tried_intent:
            self._load_intent()
        if self._intent_pipe:
            try:
                out = self._intent_pipe(text[:512])
                best = out[0][0] if isinstance(out[0], list) else out[0]
                if best["label"] in INTENTS:
                    return best["label"], float(best["score"])
            except Exception as exc:  # pragma: no cover
                log.warning("Fallo BERT intent: %s", exc)
        return self._rules(text, has_idiom)

    @staticmethod
    def _rules(text: str, has_idiom: bool) -> tuple[str, float]:
        if _RE_SALUDO.search(text) and len(text.split()) <= 6:
            return "Saludo", 0.7
        if has_idiom and _RE_MODISMO.search(text):
            return "Consulta_Modismo", 0.75
        if _RE_COMANDO.search(text):
            return "Comando", 0.6
        if _RE_SOLICITUD.search(text):
            return "Solicitud", 0.6
        if _RE_PREGUNTA.search(text):
            return "Pregunta", 0.6
        return "Solicitud", 0.4

    # ---------- entidades
    def _load_ner(self):
        self._tried_ner = True
        if settings.use_ner:
            try:
                from transformers import pipeline
                self._ner_pipe = pipeline("ner", model=settings.ner_model, aggregation_strategy="simple")
            except Exception as exc:  # pragma: no cover
                log.warning("No se pudo cargar BERT-NER: %s", exc)

    def extract_entities(self, text: str) -> list[tuple[str, str]]:
        if not self._tried_ner:
            self._load_ner()
        ents: list[tuple[str, str]] = []
        if self._ner_pipe:
            mapping = {"PER": "PERSONA", "LOC": "LUGAR", "ORG": "ORGANIZACION", "MISC": "OTRO"}
            try:
                for e in self._ner_pipe(text[:512]):
                    ents.append((e["word"].strip(), mapping.get(e["entity_group"], "OTRO")))
            except Exception as exc:  # pragma: no cover
                log.warning("Fallo NER: %s", exc)
        else:
            for m in _RE_NOMBRE.finditer(text):
                ents.append((m.group(1), "NOMBRE"))
        for m in _RE_FECHA.finditer(text):
            ents.append((m.group(0), "FECHA"))
        t = _RE_TEMA.search(text)
        if t:
            ents.append((t.group(1).strip()[:150], "TEMA"))
        seen, out = set(), []
        for n, ty in ents:
            if (n.lower(), ty) not in seen and n:
                seen.add((n.lower(), ty))
                out.append((n[:150], ty))
        return out

    def analyze(self, text: str) -> Analysis:
        idioms = idiom_index.find(text)
        intent, conf = self.classify_intent(text, bool(idioms))
        return Analysis(intent, conf, self.extract_entities(text), idioms)


nlp_service = NLPService()
