import re
import unicodedata

_TOKEN = re.compile(r"\w+", re.UNICODE)


def normalize(text: str) -> str:
    """Minusculas y sin tildes, conservando la n con tilde (ñ)."""
    s = text.lower().replace("ñ", "\x01")
    s = "".join(c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn")
    return s.replace("\x01", "ñ")


def tokens(text: str) -> list[str]:
    return _TOKEN.findall(normalize(text))


STOPWORDS = set("""de la que el en y a los del se las por un para con no una su al lo como mas pero sus le ya o este si
porque esta entre cuando muy sin sobre tambien me hasta hay donde quien desde todo nos durante todos uno les ni contra
otros ese eso ante ellos e esto mi antes algunos que unos yo otro otras otra el tanto esa estos mucho quienes nada muchos
cual poco ella estar estas algunas algo nosotros mis tu te ti tus ellas nosotras vosotros es son fue ser dame dime quiero
necesito puedes podrias favor explica explicame significa significado quiere decir hacer haz genera redacta resume""".split())


def keywords(text: str, min_len: int = 4) -> list[str]:
    seen, out = set(), []
    for t in tokens(text):
        if len(t) >= min_len and t not in STOPWORDS and t not in seen and t.isalpha():
            seen.add(t)
            out.append(t)
    return out
