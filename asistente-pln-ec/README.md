# Asistente Virtual PLN-EC

Asistente virtual que comprende **español ecuatoriano** (modismos, expresiones coloquiales, variantes regionales) mediante PLN, BERT y un modelo generativo local (Llama 3 / Mistral vía Ollama). Acepta **texto, dictado por voz y mensajes de audio**, genera contenido académico, guarda historial y ofrece un panel administrativo para gestionar el conocimiento lingüístico.

| Capa | Tecnología |
|---|---|
| Frontend | Flutter (Web + Android) |
| Backend | FastAPI + SQLAlchemy + Alembic, JWT, Swagger |
| BD | PostgreSQL 16 (FTS en español) |
| PLN | BERT (BETO afinado para intención, BERT-NER) + índice de modismos |
| Generación | Llama 3 / Mistral con Ollama (100 % local) |
| Voz→texto | faster-whisper (audio) · Web Speech / Android (dictado) |
| Métricas | sacrebleu, rouge-score, bert-score |
| Infra | Docker + Docker Compose |

## Arranque rápido
```bash
cp .env.example .env          # cambie JWT_SECRET y contraseñas
docker compose up -d --build  # primera vez: descarga imágenes y el modelo llama3 (~4.7 GB)
```
- App web: http://localhost:8080 · API/Swagger: http://localhost:8000/docs
- Administrador inicial: `ADMIN_EMAIL` / `ADMIN_PASSWORD` del `.env` (por defecto `admin@plnec.ec` / `Admin12345`; **cámbielos**).

Cada consulta busca primero una coincidencia en `conocimiento_aprendido`. Si no existe, recupera fragmentos
del corpus local, genera la respuesta con Ollama y la guarda para reutilizarla en futuras consultas equivalentes.
La cuenta indicada por `ADMIN_EMAIL` es la única administradora; todo registro nuevo recibe siempre el rol `usuario`.

Más detalle en `docs/instalacion.md`. Estructura:
```
backend/    API FastAPI, servicios de IA, migraciones Alembic, pruebas, ml/ (entrenamiento BERT)
database/   schema.sql, seed.sql, 00_create_database.sql
frontend/   app Flutter + Dockerfile (nginx)
docs/       manual técnico, manual de usuario, instalación, arquitectura
docker-compose.yml
```
