"""Builds a minimal, valid single-page PDF so tests never need a binary fixture.

Hand-rolled rather than pulled from a library: the tests need PyPDF2 to be able
to extract the text back out, and nothing more.
"""

from __future__ import annotations


def _escape(text: str) -> str:
    """Escape the characters that terminate a PDF literal string."""
    return text.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")


def make_pdf(text: str = "Sample CV") -> bytes:
    """Return the bytes of a one-page PDF containing `text`."""
    lines = text.splitlines() or [""]

    # Each line is drawn 16pt below the previous one.
    drawing = ["BT", "/F1 12 Tf", "72 720 Td", "16 TL"]
    for index, line in enumerate(lines):
        if index > 0:
            drawing.append("T*")
        drawing.append(f"({_escape(line)}) Tj")
    drawing.append("ET")
    stream = "\n".join(drawing).encode("latin-1", "replace")

    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] "
        b"/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
        b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
        b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
    ]

    out = bytearray(b"%PDF-1.4\n")
    offsets: list[int] = []
    for number, body in enumerate(objects, start=1):
        offsets.append(len(out))
        out += f"{number} 0 obj\n".encode() + body + b"\nendobj\n"

    xref_offset = len(out)
    out += f"xref\n0 {len(objects) + 1}\n".encode()
    out += b"0000000000 65535 f \n"
    for offset in offsets:
        out += f"{offset:010d} 00000 n \n".encode()

    out += f"trailer\n<< /Size {len(objects) + 1} /Root 1 0 R >>\n".encode()
    out += f"startxref\n{xref_offset}\n%%EOF\n".encode()
    return bytes(out)
