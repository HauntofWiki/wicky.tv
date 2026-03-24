import mimetypes
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import require_admin
from app.database import get_db
from app.models import WeddingMessage
from app import storage

router = APIRouter(prefix="/api/wedding", tags=["wedding"])

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
ALLOWED_MIME_PREFIXES = ("image/", "video/")


class MessageOut(BaseModel):
    id: int
    message: str
    from_name: str
    to_name: Optional[str]
    media_url: Optional[str]
    media_type: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


@router.post("/messages", response_model=MessageOut)
async def submit_message(
    message: str = Form(...),
    from_name: str = Form(...),
    to_name: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
):
    media_key = None
    media_type = None

    if file and file.filename:
        contents = await file.read()
        if len(contents) > MAX_FILE_SIZE:
            raise HTTPException(status_code=400, detail="File too large (max 50MB)")

        mime = file.content_type or mimetypes.guess_type(file.filename)[0] or ""
        if mime.startswith("image/"):
            media_type = "image"
        elif mime.startswith("video/"):
            media_type = "video"
        else:
            raise HTTPException(status_code=400, detail="Only images and videos are allowed")

        ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else "bin"
        media_key = f"wedding/{uuid.uuid4()}.{ext}"
        storage.upload_file(contents, media_key, mime)

    msg = WeddingMessage(
        message=message,
        from_name=from_name,
        to_name=to_name or None,
        media_key=media_key,
        media_type=media_type,
    )
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return _out(msg)


@router.get("/messages", response_model=list[MessageOut])
def list_messages(db: Session = Depends(get_db)):
    msgs = (
        db.query(WeddingMessage)
        .filter(WeddingMessage.hidden == False)
        .order_by(WeddingMessage.created_at.desc())
        .all()
    )
    return [_out(m) for m in msgs]


@router.delete("/messages/{id}")
def hide_message(id: int, db: Session = Depends(get_db), _=Depends(require_admin)):
    msg = db.query(WeddingMessage).filter(WeddingMessage.id == id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Not found")
    msg.hidden = True
    db.commit()
    return {"ok": True}


def _out(m: WeddingMessage) -> dict:
    return {
        "id": m.id,
        "message": m.message,
        "from_name": m.from_name,
        "to_name": m.to_name,
        "media_url": storage.media_url(m.media_key),
        "media_type": m.media_type,
        "created_at": m.created_at,
    }
