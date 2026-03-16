import logging
import os
import smtplib
from email.mime.text import MIMEText

from fastapi import APIRouter, Depends, HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AccessRequest

router = APIRouter(tags=["access"])

logger = logging.getLogger(__name__)


def _notify_admin_new_request(email: str, message: str):
    host = os.environ.get("SMTP_HOST")
    port = int(os.environ.get("SMTP_PORT", 587))
    user = os.environ.get("SMTP_USER")
    password = os.environ.get("SMTP_PASSWORD")
    from_addr = os.environ.get("SMTP_FROM", "red@wicky.tv")
    admin_email = os.environ.get("ADMIN_EMAIL", from_addr)

    if not all([host, user, password]):
        return

    body = f"new access request on wicky.tv\n\nemail: {email}\nmessage: {message or '(none)'}\n\nhttps://wicky.tv/admin"
    msg = MIMEText(body)
    msg["Subject"] = f"new access request: {email}"
    msg["From"] = from_addr
    msg["To"] = admin_email

    try:
        with smtplib.SMTP(host, port) as smtp:
            smtp.starttls()
            smtp.login(user, password)
            smtp.sendmail(from_addr, admin_email, msg.as_string())
    except Exception as e:
        logger.error("Failed to send admin notification: %s", e)


class AccessRequestBody(BaseModel):
    email: str
    message: str = None


@router.post("/api/request-access")
@limiter.limit("5/minute")
def request_access(request: Request, body: AccessRequestBody, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(400, "Invalid email")
    # Silent dedup — don't reveal if email already submitted
    existing = db.query(AccessRequest).filter(AccessRequest.email == email).first()
    if not existing:
        db.add(AccessRequest(email=email, message=body.message or None))
        db.commit()
        _notify_admin_new_request(email, body.message)
    return {"ok": True}
