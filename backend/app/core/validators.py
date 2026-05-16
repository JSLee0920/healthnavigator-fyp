import re

from fastapi import HTTPException

MEDLINEPLUS_XML_PATTERN = re.compile(r"^mplus_topics_.+\.xml$", re.IGNORECASE)
MEDLINEPLUS_HINT = "mplus_topics_*.xml"
PDF_MAX_BYTES = 20 * 1024 * 1024
XML_MAX_BYTES = 100 * 1024 * 1024


def validate_filename(filename: str) -> str:
    if ".." in filename or "/" in filename or "\\" in filename:
        raise HTTPException(400, "Invalid filename")
    return filename


def check_uploaded_file(filename: str, size_bytes: int) -> None:
    validate_filename(filename)
    is_pdf = filename.lower().endswith(".pdf")
    is_allowed_xml = bool(MEDLINEPLUS_XML_PATTERN.match(filename))

    if not is_pdf and not is_allowed_xml:
        raise HTTPException(
            status_code=400,
            detail=(
                f"Only PDF files or MedlinePlus XML ('{MEDLINEPLUS_HINT}') are supported."
            ),
        )
    if is_pdf and size_bytes > PDF_MAX_BYTES:
        raise HTTPException(status_code=413, detail="PDF exceeds 20MB limit.")
    if is_allowed_xml and size_bytes > XML_MAX_BYTES:
        raise HTTPException(status_code=413, detail="XML exceeds 100MB limit.")
