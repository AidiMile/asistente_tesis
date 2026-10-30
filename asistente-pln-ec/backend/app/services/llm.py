import httpx
from fastapi import HTTPException

from ..config import settings


def chat(messages: list[dict], model: str, temperature: float, top_p: float, max_tokens: int) -> str:
    if settings.llm_backend == "mock":
        last = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
        return f"[respuesta simulada] Recibí tu consulta: {last[:120]}"

    def _call_ollama(target_model: str) -> str:
        payload = {
            "model": target_model,
            "messages": messages,
            "stream": False,
            "keep_alive": "24h",
            "options": {
                "temperature": temperature,
                "top_p": top_p,
                "num_predict": max_tokens,
                "num_ctx": 2048,
                "num_thread": 8,
            },
        }
        with httpx.Client(timeout=settings.llm_timeout_s) as c:
            r = c.post(f"{settings.ollama_url}/api/chat", json=payload)
            r.raise_for_status()
            return r.json()["message"]["content"].strip()

    try:
        return _call_ollama(model)
    except httpx.HTTPStatusError as exc:
        # Si el modelo solicitado (ej: mistral) no existe en Ollama (404), intentar con el modelo por defecto
        if exc.response.status_code == 404 and model != settings.default_model:
            try:
                return _call_ollama(settings.default_model)
            except Exception:
                pass
        detail = ""
        try:
            detail = exc.response.json().get("error", "")
        except ValueError:
            pass
        raise HTTPException(
            503,
            f"Ollama no pudo ejecutar el modelo '{model}' "
            f"({exc.response.status_code}{': ' + detail if detail else ''}). "
            f"Verifique que terminó 'ollama pull {model}'.",
        )
    except httpx.TimeoutException:
        raise HTTPException(504, "El modelo tardó demasiado en responder. Revise recursos y estado de Ollama.")
    except httpx.HTTPError as exc:
        raise HTTPException(503, f"No se pudo conectar con Ollama en {settings.ollama_url}: {exc.__class__.__name__}.")


def health() -> dict:
    if settings.llm_backend == "mock":
        return {"ok": True, "backend": "mock", "models": []}
    try:
        r = httpx.get(f"{settings.ollama_url}/api/tags", timeout=5)
        r.raise_for_status()
        return {"ok": True, "backend": "ollama", "models": [m["name"] for m in r.json().get("models", [])]}
    except httpx.HTTPError:
        return {"ok": False, "backend": "ollama", "models": []}
