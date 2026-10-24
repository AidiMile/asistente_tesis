from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "Asistente Virtual PLN-EC"
    database_url: str = "postgresql+psycopg2://pln:pln@localhost:5432/asistente_pln_ec"
    cors_origins: str = "*"

    # Seguridad / JWT
    jwt_secret: str = "cambie-esta-clave"
    jwt_algorithm: str = "HS256"
    access_token_minutes: int = 60
    refresh_token_days: int = 7
    require_email_verification: bool = False
    frontend_url: str = "http://localhost:8080"
    admin_email: str = "admin@plnec.ec"
    admin_password: str = "Admin12345"
    admin_name: str = "Administrador"

    # SMTP (opcional; si no hay host, los enlaces se escriben en el log)
    smtp_host: str = ""
    smtp_port: int = 587
    smtp_user: str = ""
    smtp_password: str = ""
    smtp_from: str = "no-reply@plnec.ec"

    # Consultas (RF03)
    max_query_chars: int = 500

    # Limites de parametros del modelo (RF09). Ajustables.
    temp_min: float = 0.1
    temp_max: float = 1.0
    top_p_min: float = 0.1
    top_p_max: float = 1.0
    tokens_min: int = 50
    tokens_max: int = 500

    # LLM
    llm_backend: str = "ollama"  # ollama | mock
    ollama_url: str = "http://localhost:11434"
    default_model: str = "llama3"
    llm_timeout_s: float = 180.0
    history_turns: int = 3

    # PLN
    intent_model_dir: str = "/models/intent-beto"
    use_ner: bool = False
    ner_model: str = "mrm8488/bert-spanish-cased-finetuned-ner"
    corpus_top_k: int = 3

    # Voz
    whisper_model: str = "small"
    whisper_device: str = "cpu"
    whisper_compute_type: str = "int8"

    # Metricas (RF12, RNF04)
    auto_eval: bool = True
    bertscore_model: str = "bert-base-multilingual-cased"
    precision_threshold: float = 80.0
    weight_bleu: float = 0.2
    weight_rouge: float = 0.3
    weight_bertscore: float = 0.5


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
