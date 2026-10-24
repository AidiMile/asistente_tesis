# Arquitectura del sistema

## Vista de componentes
```mermaid
flowchart TD
  U[Usuario] --> F[Flutter Web/Android]
  F -->|API REST + JWT| B[FastAPI]
  B --> PG[(PostgreSQL)]
  B --> STT[Speech-to-Text<br/>faster-whisper]
  B --> NLP[Módulo PLN - BERT]
  NLP --> BM[(Base de modismos)]
  NLP --> CP[(Corpus PLN-EC)]
  B --> LLM[Llama 3 / Mistral<br/>Ollama]
  B --> M[Métricas BLEU/ROUGE/BERTScore]
```

## Flujo de una consulta (`POST /queries`)
1. Validación (≤ 500 caracteres) y, si es audio, transcripción con Whisper.
2. **PLN:** intención (BETO afinado o reglas) → entidades (BERT-NER o reglas) → detección de modismos (índice en memoria: normalización sin tildes, plurales, género, errores tipográficos leves).
3. **Recuperación:** pasajes del corpus por búsqueda de texto completo en español (`to_tsvector('spanish', …)`).
4. **Prompt:** instrucciones del sistema + intención + entidades + glosario de modismos (significado, región, ejemplo) + pasajes + últimos turnos del usuario.
5. **Generación** con el modelo activo y los parámetros del administrador (temperatura, top-p, tokens).
6. **Persistencia:** consulta, entidades, respuesta, historial (una transacción).
7. **Evaluación en segundo plano:** BLEU/ROUGE/BERTScore de la respuesta contra el conocimiento recuperado (glosario + corpus) si `AUTO_EVAL=true`.

## Modelo entidad-relación
```mermaid
erDiagram
  usuarios ||--|| perfiles : tiene
  usuarios ||--o{ tokens_usuario : genera
  usuarios ||--o{ consultas : realiza
  intenciones ||--o{ consultas : clasifica
  consultas }o--o{ entidades : contiene
  consultas ||--o{ respuestas : produce
  modelos_ia ||--o{ respuestas : genera
  modelos_ia ||--|| parametros_modelo : configura
  respuestas ||--o| evaluaciones : evalua
  usuarios ||--o{ historial_interacciones : registra
  consultas ||--o{ historial_interacciones : en
  respuestas ||--o{ historial_interacciones : en
  modismos ||--o{ significados : tiene
  modismos ||--o{ ejemplos_uso : tiene
  modismos }o--o{ contextos : usa
  modismos }o--o{ regiones : pertenece
  corpus_entrenamiento ||--o{ corpus_documentos : contiene
  corpus_entrenamiento }o--o{ modismos : asocia
```

## Seguridad
- Contraseñas con bcrypt; JWT de acceso (60 min) y refresco (7 días); control de acceso por rol en cada ruta `/admin/*`.
- Verificación de correo y recuperación con tokens de un solo uso almacenados como hash SHA-256.
- Nunca se envían datos a APIs externas: modelos, voz y métricas se ejecutan localmente.
- Producción: HTTPS (proxy inverso), `CORS_ORIGINS` restringido, `JWT_SECRET` y claves fuera del repositorio, respaldo de la BD.

## Escalabilidad
Backend sin estado (réplicas tras un balanceador); Ollama/Whisper son los cuellos de botella y pueden moverse a otro host (`OLLAMA_URL`). Reentrenamiento: `GET /admin/knowledge/export.jsonl` exporta el conocimiento de modismos para afinar el modelo sin detener el servicio.
