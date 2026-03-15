import secrets
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import require_admin
from app.database import get_db
from app.models import AccessRequest, InviteCode, User

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
