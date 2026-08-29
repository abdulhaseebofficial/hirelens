"""PDF text extraction."""

from __future__ import annotations

import io

import PyPDF2

from app.core.errors import ValidationError

PDF_MAGIC = b"%PDF-"


class PdfExtractionError(ValidationError):
    code = "pdf_extraction_failed"


def extract_text(data: bytes, filename: str = "document.pdf") -> str:
    """Pull the text out of a PDF byte string.

    Raises PdfExtractionError with a message suitable for showing to the user.
    """
    if not data:
        raise PdfExtractionError(f"{filename} is empty.")

    if not data.lstrip()[:5].startswith(PDF_MAGIC):
        raise PdfExtractionError(f"{filename} is not a valid PDF file.")

    try:
        reader = PyPDF2.PdfReader(io.BytesIO(data))
    except Exception as exc:  # PyPDF2 raises a wide range of parse errors
        raise PdfExtractionError(f"Could not read {filename}: {exc}") from exc

    if reader.is_encrypted:
        # An empty user password is common for "view-only" PDFs and is decryptable.
        try:
            if reader.decrypt("") == 0:
                raise PdfExtractionError(f"{filename} is password-protected.")
        except PdfExtractionError:
            raise
        except Exception as exc:
            raise PdfExtractionError(f"{filename} is password-protected.") from exc

    pages: list[str] = []
    for page in reader.pages:
        try:
            page_text = page.extract_text()
        except Exception:
            # One malformed page should not cost us the rest of the CV.
            continue
        if page_text:
            pages.append(page_text)

    text = "\n".join(pages).strip()
    if not text:
        raise PdfExtractionError(
            f"No text could be extracted from {filename}. It may be a scanned image."
        )
    return text


def truncate(text: str, limit: int) -> str:
    """Cap prompt input, marking the cut so the model knows it is partial."""
    cleaned = (text or "").strip()
    if len(cleaned) <= limit:
        return cleaned
    return cleaned[:limit] + "\n\n[... document truncated ...]"
