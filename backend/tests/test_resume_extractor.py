import os
import tempfile

from app.services.resume_extractor import extract_text_from_file, extract_text_from_bytes


def _make_test_pdf() -> str:
    """Create a simple test PDF using reportlab if available."""
    try:
        from reportlab.pdfgen import canvas
    except ImportError:
        return ""

    fd, path = tempfile.mkstemp(suffix=".pdf")
    os.close(fd)
    c = canvas.Canvas(path)
    c.drawString(100, 750, "Jane Smith")
    c.drawString(100, 730, "Data Scientist")
    c.drawString(100, 710, "Skills: Python, ML, Statistics")
    c.save()
    return path


def test_extract_txt_file():
    fd, path = tempfile.mkstemp(suffix=".txt")
    os.close(fd)
    with open(path, "w") as f:
        f.write("Hello world\nThis is a test resume")

    text = extract_text_from_file(path)
    assert "Hello world" in text
    assert "test resume" in text
    os.unlink(path)


def test_extract_pdf_file():
    pdf_path = _make_test_pdf()
    if not pdf_path:
        return  # Skip if reportlab not available

    text = extract_text_from_file(pdf_path)
    assert "Jane Smith" in text
    assert "Data Scientist" in text
    assert "Python" in text
    os.unlink(pdf_path)


def test_extract_text_from_bytes_txt():
    content = b"Plain text resume"
    text = extract_text_from_bytes(content, "resume.txt")
    assert text == "Plain text resume"


def test_extract_unknown_format_fallback():
    fd, path = tempfile.mkstemp(suffix=".xyz")
    os.close(fd)
    with open(path, "w") as f:
        f.write("Some content")

    text = extract_text_from_file(path)
    assert "Some content" in text
    os.unlink(path)
