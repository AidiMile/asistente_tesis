# Instrucciones de instalación

## 1. Requisitos
- Docker 24+ y Docker Compose v2.
- 16 GB de RAM recomendados (Llama 3 8B + BERT + Whisper). 20 GB de disco libre.
- GPU NVIDIA opcional (descomente el bloque `deploy` del servicio `ollama` y use NVIDIA Container Toolkit).

## 2. Despliegue local con Docker Compose
```bash
cp .env.example .env
# edite JWT_SECRET (openssl rand -hex 32), POSTGRES_PASSWORD y ADMIN_PASSWORD
docker compose up -d --build
docker compose logs -f ollama-init     # espere "success" de la descarga del modelo
```
Servicios: `db` (5432 interno), `ollama` (11434), `backend` (8000), `frontend` (8080).
Al iniciar, `backend` ejecuta `alembic upgrade head` (crea tablas + datos semilla) y crea el administrador.

Para usar Mistral: `docker compose exec ollama ollama pull mistral` y actívelo en *Dashboard → Modelo activo*.
Para una instalación ligera sin IA pesada (solo API y panel): `INSTALL_ML=false LLM_BACKEND=mock` en `.env`.

## 3. Entrenar el clasificador de intenciones (BERT)
```bash
docker compose exec backend python ml/train_intent.py --epochs 8
docker compose restart backend
```
Sin este modelo el sistema usa reglas para la intención. Amplíe `backend/ml/intents_seed.jsonl` con consultas reales.

## 4. Desarrollo sin Docker
```bash
# Base de datos
createdb asistente_pln_ec    # o database/00_create_database.sql
cd backend && python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt            # + requirements-ml.txt para IA
cp .env.example .env                       # DATABASE_URL apuntando a localhost
alembic upgrade head && uvicorn app.main:app --reload
pytest                                      # prueba de humo (usa SQLite + LLM simulado)

# Frontend (requiere Flutter SDK)
cd frontend
flutter create --platforms=web,android --project-name asistente_pln_ec .
flutter pub get
flutter run -d chrome --dart-define=API_BASE_URL=http://localhost:8000
```
**Android:** agregue a `android/app/src/main/AndroidManifest.xml` los permisos `INTERNET`, `RECORD_AUDIO` y `<queries>` de reconocimiento de voz (ver documentación de `speech_to_text`); en emulador la API es `http://10.0.2.2:8000`.

## 5. Variables de entorno principales
| Variable | Descripción |
|---|---|
| `JWT_SECRET` | Clave de firma JWT (obligatorio cambiar) |
| `REQUIRE_EMAIL_VERIFICATION` | `true` exige verificar correo (configure `SMTP_*`; sin SMTP el enlace se escribe en el log) |
| `LLM_BACKEND` | `ollama` o `mock` |
| `USE_NER` | Usa BERT-NER para entidades (descarga ~400 MB la primera vez) |
| `WHISPER_MODEL` | `tiny`, `base`, `small`, `medium` |
| `TOKENS_MAX`, `TEMP_MAX`… | Límites de parámetros del modelo (RF09) |
| `PRECISION_THRESHOLD`, `WEIGHT_*` | Umbral y pesos de la precisión global (RNF04) |

## 6. Respaldo
`docker compose exec db pg_dump -U pln asistente_pln_ec > respaldo.sql`
