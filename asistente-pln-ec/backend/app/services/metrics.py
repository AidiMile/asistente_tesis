"""BLEU, ROUGE y BERTScore (RF12). Todas las puntuaciones en escala 0-100."""
import re
from typing import Optional

from ..config import settings

_WORD = re.compile(r"\w+", re.UNICODE)


class _Tok:  # el tokenizador por defecto de rouge-score elimina letras con tilde
    def tokenize(self, text):
        return [t.lower() for t in _WORD.findall(text)]


def bleu(hyp: str, ref: str) -> Optional[float]:
    try:
        import sacrebleu
        return round(sacrebleu.sentence_bleu(hyp, [ref]).score, 2)
    except ImportError:
        return None


def rouge(hyp: str, ref: str) -> Optional[float]:
    try:
        from rouge_score import rouge_scorer
        sc = rouge_scorer.RougeScorer(["rougeL"], tokenizer=_Tok())
        return round(sc.score(ref, hyp)["rougeL"].fmeasure * 100, 2)
    except ImportError:
        return None


def bertscore(hyp: str, ref: str) -> Optional[float]:
    try:
        from bert_score import score
        _, _, f1 = score([hyp], [ref], model_type=settings.bertscore_model, num_layers=9, lang="es", verbose=False)
        return round(float(f1[0]) * 100, 2)
    except ImportError:
        return None


def global_precision(b: Optional[float], r: Optional[float], bs: Optional[float]) -> Optional[float]:
    parts = [(b, settings.weight_bleu), (r, settings.weight_rouge), (bs, settings.weight_bertscore)]
    parts = [(v, w) for v, w in parts if v is not None]
    if not parts:
        return None
    return round(sum(v * w for v, w in parts) / sum(w for _, w in parts), 2)


def evaluate(hyp: str, ref: str) -> dict:
    b, r, bs = bleu(hyp, ref), rouge(hyp, ref), bertscore(hyp, ref)
    return {"bleu": b, "rouge": r, "bertscore": bs, "precision_global": global_precision(b, r, bs)}
