# Manual técnico

## 1. Trazabilidad con los requisitos
| Requisito | Implementación |
|---|---|
| RF01 Registro | `POST /auth/register` (valida duplicados y fortaleza; verificación por correo opcional) |
| RF02 Autenticación | `/auth/login`, `/auth/token`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password` |
| RF03 Entrada | `POST /queries` (texto/dictado), `POST /queries/audio`; máx. 500 caracteres |
| RF04/RF06 Contexto, intención, entidades | `services/nlp.py` (BETO/BERT-NER + reglas de respaldo) |
| RF05 Audio y dictado | Whisper en backend; dictado en el cliente (`speech_to_text`) |
| RF07/RF11 Modismos | `services/idioms.py`, CRUD `/admin/idioms`, `/admin/knowledge/integrate` |
| RF08/RF10 Generación | `services/llm.py` + `pipeline.py` (prompt según intención; contenido académico estructurado) |
| RF09 Parámetros | `PUT /admin/model/params` (rangos validados) |
| RF12 Evaluación | `services/metrics.py`, `/admin/metrics/*`; tabla `evaluaciones` |
| RF13 Registro | `consultas`, `respuestas`, `historial_interacciones` |
| RNF03 Seguridad | bcrypt, JWT, roles, tokens hash |
| RNF07 Escalabilidad | `export.jsonl`, `ml/train_intent.py`, backend sin estado |
| RNF08 Mantenimiento | Módulos separados, Alembic, pruebas, Git |

## 2. API (Swagger en `/docs`)
Grupos: Autenticación · Perfil · Consultas · Admin (usuarios, modismos, corpus, modelo IA, métricas). Autorice en Swagger con el botón *Authorize* (usuario = correo). Listados paginados devuelven `{total, items}`.

## 3. Base de datos
`database/schema.sql` (DDL) y `database/seed.sql` (intenciones, 29 regiones/provincias, contextos, modelos y 13 modismos de ejemplo). Se aplican con Alembic (`0001`, `0002`). Cambios futuros: nuevas revisiones en `backend/alembic/versions`.
Respecto al esquema del documento: se añadieron `nombre_usuario`, `correo_verificado`, `tokens_usuario`, `corpus_documentos` (texto real del corpus), campos de auditoría, restricciones CHECK y `ON DELETE CASCADE`.

## 4. Módulo de PLN
- **Intención:** clasificador BETO afinado (`ml/train_intent.py`) en `INTENT_MODEL_DIR`; si no existe, reglas con regex.
- **Entidades:** `mrm8488/bert-spanish-cased-finetuned-ner` (PERSONA, LUGAR, ORGANIZACION, OTRO) + FECHA y TEMA por reglas.
- **Modismos:** índice en memoria reconstruido en cada cambio del CRUD. Soporta frases de varias palabras, plurales, género (o/a) y coincidencia aproximada (≥ 0.88).
- **Integración al modelo:** los modismos detectados viajan como *glosario* en el prompt (RAG); el JSONL exportado permite afinación posterior.

## 5. Métricas
Escala 0–100. `precision_global` = media ponderada (`WEIGHT_BLEU` 0.2, `WEIGHT_ROUGE` 0.3, `WEIGHT_BERTSCORE` 0.5) y se compara con `PRECISION_THRESHOLD` (80, RNF04). Evaluaciones: *automática* (contra glosario/corpus recuperados) o *manual* (texto de referencia del administrador).

## 6. Pruebas
`cd backend && pytest` cubre registro, roles, modismos, consulta, historial, límites, corpus y borrado (SQLite + LLM simulado). Las migraciones y la recuperación FTS se validaron en PostgreSQL 16.

## 7. Limitaciones y decisiones a revisar
1. **RNF01 (< 5 s):** un modelo de 7–8 B parámetros en CPU tarda decenas de segundos. Con GPU y `max_tokens` moderados es alcanzable; si no, documente el tiempo medido (se muestra en el panel).
2. **RF09 (50–500 tokens):** limita los ensayos largos; suba `TOKENS_MAX` en `.env` si lo necesita.
3. **BLEU alto (≥ 80 %)** es poco realista en texto generado libre; por eso la precisión es ponderada y configurable. Defina con su tutora la fórmula final.
4. **BERTScore** usa `bert-base-multilingual-cased` por defecto (cambie `BERTSCORE_MODEL`).
5. Los 13 modismos semilla deben ser validados por usted; la base se alimenta con su encuesta.
6. El cliente Flutter **no fue compilado** en el entorno de desarrollo del asistente (sin SDK): ejecute `flutter pub get && flutter analyze` y ajuste versiones de paquetes si hiciera falta.
