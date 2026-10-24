import os
import tempfile

from fastapi import HTTPException

from ..config import settings

_model = None


def transcribe(data: bytes, suffix: str = ".wav") -> str:
    """Speech-to-Text local con faster-whisper (RF05)."""
    global _model
    try:
        from faster_whisper import WhisperModel
    except ImportError:
        raise HTTPException(501, "faster-whisper no está instalado (construya la imagen con INSTALL_ML=true).")
    if _model is None:
        _model = WhisperModel(settings.whisper_model, device=settings.whisper_device,
                              compute_type=settings.whisper_compute_type)
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as f:
        f.write(data)
        path = f.name
    try:
        segments, _ = _model.transcribe(path, language="es", vad_filter=True, beam_size=5)
        return " ".join(s.text.strip() for s in segments).strip()
    finally:
        os.unlink(path)
