"""Afina BETO (BERT en español) para clasificar intenciones (RF06).

Uso (dentro del contenedor backend o con requirements-ml instalado):
    python ml/train_intent.py --data ml/intents_seed.jsonl --out /models/intent-beto --epochs 8
Amplíe intents_seed.jsonl con consultas reales en español ecuatoriano (idealmente cientos por clase);
con el conjunto semilla el modelo es solo una demostración.
"""
import argparse
import json

import numpy as np
from datasets import Dataset
from transformers import (AutoModelForSequenceClassification, AutoTokenizer, Trainer, TrainingArguments)

LABELS = ["Saludo", "Pregunta", "Solicitud", "Comando", "Consulta_Modismo"]

ap = argparse.ArgumentParser()
ap.add_argument("--data", default="ml/intents_seed.jsonl")
ap.add_argument("--out", default="/models/intent-beto")
ap.add_argument("--base", default="dccuchile/bert-base-spanish-wwm-cased")
ap.add_argument("--epochs", type=int, default=8)
a = ap.parse_args()

rows = [json.loads(l) for l in open(a.data, encoding="utf-8") if l.strip()]
for r in rows:
    r["label"] = LABELS.index(r["label"])
ds = Dataset.from_list(rows).train_test_split(test_size=0.2, seed=42)
tok = AutoTokenizer.from_pretrained(a.base)
enc = lambda b: tok(b["text"], truncation=True, padding="max_length", max_length=64)
ds = ds.map(enc, batched=True)
model = AutoModelForSequenceClassification.from_pretrained(
    a.base, num_labels=len(LABELS), id2label=dict(enumerate(LABELS)), label2id={l: i for i, l in enumerate(LABELS)})


def acc(p):
    return {"accuracy": float((np.argmax(p.predictions, -1) == p.label_ids).mean())}


args = TrainingArguments(a.out, num_train_epochs=a.epochs, per_device_train_batch_size=8, learning_rate=3e-5,
                         eval_strategy="epoch", save_strategy="no", report_to=[])
tr = Trainer(model=model, args=args, train_dataset=ds["train"], eval_dataset=ds["test"], compute_metrics=acc)
tr.train()
print(tr.evaluate())
tr.save_model(a.out)
tok.save_pretrained(a.out)
