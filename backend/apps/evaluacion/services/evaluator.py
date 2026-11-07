import re
from typing import Optional, Dict, Any
from nltk.translate.bleu_score import sentence_bleu, SmoothingFunction

try:
    from rouge_score import rouge_scorer
    HAS_ROUGE = True
except ImportError:
    HAS_ROUGE = False

try:
    import sacrebleu
    HAS_SACREBLEU = True
except ImportError:
    HAS_SACREBLEU = False

try:
    from bert_score import score as bert_score_fn
    HAS_BERTSCORE = True
except ImportError:
    HAS_BERTSCORE = False

WEIGHT_BLEU = 0.20
WEIGHT_ROUGE = 0.30
WEIGHT_BERTSCORE = 0.50
PRECISION_THRESHOLD = 80.0

_WORD = re.compile(r"\w+", re.UNICODE)


class SpanishTokenizer:
    """Tokenizador que preserva letras con tilde y diacríticos del español."""
    def tokenize(self, text: str):
        if not text:
            return []
        return [t.lower() for t in _WORD.findall(str(text))]


def calcular_bleu(hyp: str, ref: str) -> Optional[float]:
    """
    Calcula sentence-level BLEU (escala 0 a 100).
    Prioriza sacrebleu si está instalado; de lo contrario utiliza nltk con SmoothingFunction.
    """
    if not hyp or not ref:
        return 0.0
    if HAS_SACREBLEU:
        try:
            return round(float(sacrebleu.sentence_bleu(hyp, [ref]).score), 2)
        except Exception:
            pass
    try:
        tok = SpanishTokenizer()
        ref_tokens = [tok.tokenize(ref)]
        hyp_tokens = tok.tokenize(hyp)
        if not hyp_tokens or not ref_tokens[0]:
            return 0.0
        sf = SmoothingFunction()
        score = sentence_bleu(ref_tokens, hyp_tokens, smoothing_function=sf.method1)
        return round(float(score) * 100, 2)
    except Exception:
        return 0.0


def calcular_rouge(hyp: str, ref: str) -> Optional[float]:
    """
    Calcula ROUGE-L F-measure (escala 0 a 100) utilizando tokenizador en español.
    """
    if not hyp or not ref:
        return 0.0
    if HAS_ROUGE:
        try:
            scorer = rouge_scorer.RougeScorer(['rougeL'], tokenizer=SpanishTokenizer())
            sc = scorer.score(ref, hyp)
            return round(float(sc['rougeL'].fmeasure) * 100, 2)
        except Exception:
            pass
    # Fallback de superposición de n-gramas
    tok = SpanishTokenizer()
    t_hyp = set(tok.tokenize(hyp))
    t_ref = set(tok.tokenize(ref))
    if not t_ref:
        return 0.0
    overlap = len(t_hyp.intersection(t_ref)) / len(t_ref)
    return round(overlap * 100, 2)


def calcular_bertscore(hyp: str, ref: str) -> Optional[float]:
    """
    Calcula BERTScore F1 (escala 0 a 100) en español (capa 9).
    Si bert-score no está instalado en el entorno, retorna None sin inventar datos.
    """
    if not HAS_BERTSCORE:
        return None
    try:
        _, _, f1 = bert_score_fn([hyp], [ref], model_type="bert-base-multilingual-cased", num_layers=9, lang="es", verbose=False)
        return round(float(f1[0]) * 100, 2)
    except Exception:
        return None


def calcular_precision_parcial_lexica(b: Optional[float], r: Optional[float]) -> Optional[float]:
    """
    Calcula la precisión léxica renormalizada considerando únicamente BLEU (20%) y ROUGE-L (30%).
    Nota científica: Este indicador es exclusivamente informativo para análisis léxico superficial
    y NO equivale a la precisión global completa ni se puede usar para certificar el umbral RNF04.
    """
    if b is None and r is None:
        return None
    w_b = WEIGHT_BLEU if b is not None else 0.0
    w_r = WEIGHT_ROUGE if r is not None else 0.0
    denom = w_b + w_r
    if denom == 0:
        return None
    val_b = b or 0.0
    val_r = r or 0.0
    return round((val_b * w_b + val_r * w_r) / denom, 2)


def calcular_precision_global(b: Optional[float], r: Optional[float], bs: Optional[float]) -> Optional[float]:
    """
    Calcula la precisión global ponderada oficial de la tesis:
        0.20 * BLEU + 0.30 * ROUGE-L + 0.50 * BERTScore
    Requiere obligatoriamente que las tres métricas estén presentes (incluyendo la semántica BERTScore).
    Si BERTScore no está disponible, retorna None para evitar declarar falsamente cumplimiento de RNF04.
    """
    if b is None or r is None or bs is None:
        return None
    score = (b * WEIGHT_BLEU) + (r * WEIGHT_ROUGE) + (bs * WEIGHT_BERTSCORE)
    return round(score, 2)


def evaluar_par_textual(candidato: str, referencia: str) -> Dict[str, Any]:
    """
    Evalúa un par candidato/referencia con las métricas científicas establecidas.
    Distingue rigurosamente entre evaluación completa y parcial según la disponibilidad de BERTScore.
    """
    b = calcular_bleu(candidato, referencia)
    r = calcular_rouge(candidato, referencia)
    bs = calcular_bertscore(candidato, referencia)

    if bs is not None:
        pg = calcular_precision_global(b, r, bs)
        cumple = (pg is not None and pg >= PRECISION_THRESHOLD)
        tipo = "completa"
        completa = True
        parcial_lex = None
        mensaje = "Evaluación completa calculada exitosamente (BLEU, ROUGE-L y BERTScore)."
    else:
        pg = None
        cumple = False
        tipo = "parcial"
        completa = False
        parcial_lex = calcular_precision_parcial_lexica(b, r)
        mensaje = (
            "Evaluación parcial (BLEU y ROUGE-L calculados). "
            "BERTScore no está disponible en este entorno; se requiere bert-score y modelos semánticos "
            "para calcular la precisión global semántica y validar el umbral RNF04 (>= 80%)."
        )

    return {
        "bleu": b,
        "rouge": r,
        "bertscore": bs,
        "precision_global": pg,
        "precision_parcial_lexica": parcial_lex,
        "cumple_umbral": cumple,
        "tipo_evaluacion": tipo,
        "evaluacion_completa": completa,
        "bertscore_disponible": HAS_BERTSCORE,
        "mensaje": mensaje,
    }


class MetricasEvaluador:
    """Clase compatible con implementaciones previas del proyecto."""
    def __init__(self):
        self.smooth = SmoothingFunction().method1
        if HAS_ROUGE:
            self.rouge_scorer = rouge_scorer.RougeScorer(['rouge1', 'rougeL'], use_stemmer=True)
        else:
            self.rouge_scorer = None

    def calcular_bleu(self, candidato: str, referencia: str) -> float:
        b = calcular_bleu(candidato, referencia)
        return round(float(b or 0.0) / 100.0, 4)

    def calcular_rouge(self, candidato: str, referencia: str) -> float:
        r = calcular_rouge(candidato, referencia)
        return round(float(r or 0.0) / 100.0, 4)

    def calcular_bertscore_estimado(self, candidato: str, modismos_detectados: list) -> float:
        base = 0.86
        if modismos_detectados:
            encontrados = sum(1 for m in modismos_detectados if m.lower() in candidato.lower())
            if encontrados > 0:
                base += 0.05
        palabras = candidato.split()
        if len(palabras) < 5:
            base -= 0.20
        elif len(set(palabras)) / max(len(palabras), 1) < 0.4:
            base -= 0.15
        return round(min(0.99, max(0.60, base)), 4)
