import logging
from pathlib import Path

from fastapi import HTTPException, UploadFile

logger = logging.getLogger(__name__)

_CHUNK_BYTES = 1024 * 1024


async def save_upload_to_disk(
    upload_file: UploadFile,
    dest: Path,
    max_bytes: int,
    oversize_detail: str,
) -> int:
    """Streams an UploadFile to disk in chunks, enforcing a size cap.

    Returns the bytes written. Cleans up the partial file on any failure.
    """
    size_bytes = 0
    try:
        with open(dest, "wb") as buffer:
            while True:
                chunk = await upload_file.read(_CHUNK_BYTES)
                if not chunk:
                    break
                size_bytes += len(chunk)
                if size_bytes > max_bytes:
                    raise HTTPException(status_code=413, detail=oversize_detail)
                buffer.write(chunk)
    except HTTPException:
        dest.unlink(missing_ok=True)
        raise
    except Exception as e:
        logger.error(f"Failed to save uploaded file: {e}")
        dest.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail="Could not save file to disk")
    return size_bytes
