import logging
import os
import secrets
import smtplib
from datetime import datetime
from email.mime.text import MIMEText
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import require_admin
from app.database import get_db
from app.models import AccessRequest, InviteCode, User

logger = logging.getLogger(__name__)


def _send_invite_email(to_email: str, invite_code: str):
    host = os.environ.get("SMTP_HOST")
    port = int(os.environ.get("SMTP_PORT", 587))
    user = os.environ.get("SMTP_USER")
    password = os.environ.get("SMTP_PASSWORD")
    from_addr = os.environ.get("SMTP_FROM", "red@wicky.tv")

    if not all([host, user, password]):
        logger.error("SMTP not configured — cannot send invite email")
        return

    body = f"""you've been approved for wicky.tv.

use this invite code to sign up:

  {invite_code}

head to https://wicky.tv to get started.
"""
    msg = MIMEText(body)
    msg["Subject"] = "you're invited to wicky.tv"
    msg["From"] = from_addr
    msg["To"] = to_email

    try:
        with smtplib.SMTP(host, port) as smtp:
            smtp.starttls()
            smtp.login(user, password)
            smtp.sendmail(from_addr, to_email, msg.as_string())
        logger.info("Invite email sent to %s", to_email)
    except Exception as e:
        logger.error("Failed to send invite email to %s: %s", to_email, e)

router = APIRouter(prefix="/api/admin")


class CreateInviteBody(BaseModel):
    max_uses: int = 1
    expires_at: Optional[datetime] = None


@router.post("/invites")
def create_invite(
    req: CreateInviteBody = CreateInviteBody(),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    code = secrets.token_urlsafe(16)
    invite = InviteCode(
        code=code,
        created_by=admin.id,
        max_uses=req.max_uses,
        expires_at=req.expires_at,
    )
    db.add(invite)
    db.commit()
    return {"code": code, "max_uses": req.max_uses, "expires_at": req.expires_at}


@router.get("/invites")
def list_invites(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    invites = db.query(InviteCode).order_by(InviteCode.created_at.desc()).all()
    return [
        {
            "code": i.code,
            "max_uses": i.max_uses,
            "use_count": i.use_count,
            "expires_at": i.expires_at,
            "created_at": i.created_at,
        }
        for i in invites
    ]


@router.get("/access-requests")
def list_access_requests(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    reqs = db.query(AccessRequest).order_by(AccessRequest.created_at.desc()).all()
    return [
        {
            "id": r.id,
            "email": r.email,
            "message": r.message,
            "created_at": r.created_at,
        }
        for r in reqs
    ]


@router.get("/users")
def list_users_admin(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    users = db.query(User).filter(User.is_admin == False).order_by(User.created_at).all()
    return [{"username": u.username, "display_name": u.display_name, "email": u.email, "created_at": u.created_at} for u in users]


@router.delete("/users/{username}")
def delete_user(
    username: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = db.query(User).filter(User.username == username, User.is_admin == False).first()
    if not user:
        from fastapi import HTTPException
        raise HTTPException(404, "User not found")
    db.delete(user)
    db.commit()
    return {"ok": True}


@router.post("/access-requests/{req_id}/approve")
def approve_access_request(
    req_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    req = db.get(AccessRequest, req_id)
    if not req:
        raise HTTPException(404, "Request not found")

    code = secrets.token_urlsafe(16)
    invite = InviteCode(code=code, created_by=admin.id, max_uses=1)
    db.add(invite)
    db.delete(req)
    db.commit()

    _send_invite_email(req.email, code)
    return {"ok": True, "code": code}


@router.delete("/access-requests/{req_id}")
def dismiss_access_request(
    req_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    req = db.get(AccessRequest, req_id)
    if req:
        db.delete(req)
        db.commit()
    return {"ok": True}
