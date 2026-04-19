"""Whisper-based speech-to-text transcription service.

Uses faster-whisper (local) by default. Can fall back to OpenAI Whisper API
if the local model fails or isn't available.
"""
import logging
import os
import tempfile
from io import BytesIO

from app.config import settings

logger = logging.getLogger(__name__)


class WhisperService:
    """Lazy-loaded Whisper transcription service."""

    def __init__(self) -> None:
        self._model = None
        # tiny=39M, base=74M, small=244M, medium=769M, large=1550M
        self.model_size = os.getenv("WHISPER_MODEL", "base")
        self.compute_type = os.getenv("WHISPER_COMPUTE", "int8")  # int8 = fast on CPU

    @property
    def model(self):
        """Lazy-load the Whisper model on first use."""
        if self._model is None:
            try:
                from faster_whisper import WhisperModel
                logger.info("Loading faster-whisper model: %s (%s)", self.model_size, self.compute_type)
                self._model = WhisperModel(
                    self.model_size,
                    device="cpu",
                    compute_type=self.compute_type,
                )
                logger.info("Whisper model loaded")
            except ImportError as e:
                raise RuntimeError("faster-whisper not installed") from e
        return self._model

    def transcribe_file(self, filepath: str, language: str = "en") -> dict:
        """Transcribe an audio file to text."""
        try:
            segments, info = self.model.transcribe(
                filepath,
                language=language,
                beam_size=5,
                vad_filter=True,  # Voice activity detection — skips silence
            )
            text_parts = [seg.text for seg in segments]
            text = " ".join(text_parts).strip()
            return {
                "text": text,
                "language": info.language,
                "duration": info.duration,
                "provider": "local",
            }
        except Exception as e:
            logger.error("Local Whisper transcription failed: %s", repr(e))
            # Fall back to OpenAI if configured
            if settings.OPENAI_API_KEY:
                return self._transcribe_openai(filepath)
            raise

    def transcribe_bytes(self, audio_bytes: bytes, filename: str = "audio.webm") -> dict:
        """Transcribe raw audio bytes by writing to a temp file first."""
        ext = os.path.splitext(filename)[1] or ".webm"
        fd, path = tempfile.mkstemp(suffix=ext)
        try:
            with os.fdopen(fd, "wb") as f:
                f.write(audio_bytes)
            return self.transcribe_file(path)
        finally:
            try:
                os.unlink(path)
            except OSError:
                pass

    def _transcribe_openai(self, filepath: str) -> dict:
        """Fall back to OpenAI Whisper API."""
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.OPENAI_API_KEY)
            with open(filepath, "rb") as f:
                response = client.audio.transcriptions.create(
                    model="whisper-1",
                    file=f,
                )
            return {
                "text": response.text.strip(),
                "language": "unknown",
                "duration": 0.0,
                "provider": "openai",
            }
        except Exception as e:
            logger.error("OpenAI Whisper fallback failed: %s", repr(e))
            raise


whisper_service = WhisperService()
