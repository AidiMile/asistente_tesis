"""Indice en memoria de modismos ecuatorianos (RF07/RF11)."""
import difflib
import threading
from dataclasses import dataclass, field

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from ..models import Modismo
from .text_utils import normalize, tokens


@dataclass
class IdiomEntry:
    id_modismo: int
    nombre: str
    significados: list[str]
    ejemplos: list[str] = field(default_factory=list)
    regiones: list[str] = field(default_factory=list)
    contextos: list[str] = field(default_factory=list)


def _variants(tok: str) -> set[str]:
    v = {tok}
    if tok.endswith("s") and len(tok) > 3:
        v.add(tok[:-1])
    if tok.endswith("es") and len(tok) > 4:
        v.add(tok[:-2])
    if tok.endswith("a"):
        v.add(tok[:-1] + "o")
    return v


class IdiomIndex:
    def __init__(self):
        self._lock = threading.Lock()
        self.entries: dict[str, IdiomEntry] = {}
        self.max_len = 1

    def rebuild(self, db: Session) -> int:
        rows = db.scalars(select(Modismo).where(Modismo.estado == "Activo").options(
            selectinload(Modismo.significados), selectinload(Modismo.ejemplos),
            selectinload(Modismo.contextos), selectinload(Modismo.regiones))).all()
        entries, mx = {}, 1
        for m in rows:
            e = IdiomEntry(m.id_modismo, m.nombre_modismo, [s.significado for s in m.significados],
                           [x.ejemplo for x in m.ejemplos], [r.nombre for r in m.regiones],
                           [c.descripcion for c in m.contextos])
            key = " ".join(tokens(m.nombre_modismo))
            if key:
                entries[key] = e
                mx = max(mx, len(key.split()))
        with self._lock:
            self.entries, self.max_len = entries, mx
        return len(entries)

    def find(self, text: str) -> list[IdiomEntry]:
        toks = tokens(text)
        found, used = [], set()
        singles = [k for k in self.entries if " " not in k]
        i = 0
        while i < len(toks):
            hit = None
            for n in range(min(self.max_len, len(toks) - i), 0, -1):
                chunk = toks[i:i + n]
                if n == 1:
                    cands = _variants(chunk[0])
                    key = next((c for c in cands if c in self.entries), None)
                    if not key and len(chunk[0]) >= 5:
                        close = difflib.get_close_matches(chunk[0], singles, n=1, cutoff=0.88)
                        key = close[0] if close else None
                else:
                    key = " ".join(chunk) if " ".join(chunk) in self.entries else None
                if key:
                    hit = (self.entries[key], n)
                    break
            if hit:
                if hit[0].id_modismo not in used:
                    used.add(hit[0].id_modismo)
                    found.append(hit[0])
                i += hit[1]
            else:
                i += 1
        return found


idiom_index = IdiomIndex()
