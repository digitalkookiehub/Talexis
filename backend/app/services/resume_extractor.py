"""Resume text extraction supporting PDF, DOCX, and plain text."""
import logging
import os
from io import BytesIO

logger = logging.getLogger(__name__)


def extract_text_from_file(filepath: str) -> str:
    """Extract text from a resume file. Supports PDF, DOCX, TXT."""
    ext = os.path.splitext(filepath)[1].lower()

    if ext == ".pdf":
        return _extract_pdf(filepath)
    if ext in (".docx", ".doc"):
        return _extract_docx(filepath)
    if ext == ".txt":
        return _extract_txt(filepath)

    # Fallback: try as plain text
    return _extract_txt(filepath)


def _extract_pdf(filepath: str) -> str:
    """Extract text from PDF using pypdf."""
    try:
        from pypdf import PdfReader
        reader = PdfReader(filepath)
        text_parts = []
        for page in reader.pages:
            try:
                text_parts.append(page.extract_text() or "")
            except Exception as e:
                logger.warning("Failed to extract page text: %s", str(e))
        text = "\n".join(text_parts).strip()
        if not text:
            logger.warning("PDF extraction returned empty text for %s", filepath)
            return "Could not extract text from PDF (may be scanned image)."
        return text
    except ImportError:
        logger.error("pypdf not installed")
        return "PDF parsing not available (pypdf missing)."
    except Exception as e:
        logger.error("PDF extraction failed: %s", str(e))
        return f"PDF extraction error: {str(e)}"


def _extract_docx(filepath: str) -> str:
    """Extract text from DOCX using python-docx."""
    try:
        from docx import Document
        doc = Document(filepath)
        paragraphs = [p.text for p in doc.paragraphs if p.text.strip()]
        return "\n".join(paragraphs)
    except ImportError:
        logger.error("python-docx not installed")
        return "DOCX parsing not available."
    except Exception as e:
        logger.error("DOCX extraction failed: %s", str(e))
        return f"DOCX extraction error: {str(e)}"


def _extract_txt(filepath: str) -> str:
    """Extract text from plain text file."""
    try:
        with open(filepath, "rb") as f:
            content = f.read()
        # Try UTF-8 first, fall back to latin-1
        try:
            return content.decode("utf-8")
        except UnicodeDecodeError:
            return content.decode("latin-1", errors="ignore")
    except Exception as e:
        logger.error("Text extraction failed: %s", str(e))
        return ""


def extract_text_from_bytes(content: bytes, filename: str) -> str:
    """Extract text from raw bytes (used for in-memory parsing)."""
    ext = os.path.splitext(filename)[1].lower()

    if ext == ".pdf":
        try:
            from pypdf import PdfReader
            reader = PdfReader(BytesIO(content))
            return "\n".join(page.extract_text() or "" for page in reader.pages).strip()
        except Exception as e:
            logger.error("PDF byte extraction failed: %s", str(e))
            return ""

    if ext in (".docx", ".doc"):
        try:
            from docx import Document
            doc = Document(BytesIO(content))
            return "\n".join(p.text for p in doc.paragraphs if p.text.strip())
        except Exception as e:
            logger.error("DOCX byte extraction failed: %s", str(e))
            return ""

    # Plain text
    try:
        return content.decode("utf-8")
    except UnicodeDecodeError:
        return content.decode("latin-1", errors="ignore")
