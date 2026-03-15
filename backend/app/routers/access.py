from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..database import get_db
from ..models import AccessRequest

router = APIRouter(tags=["access"])


class AccessRequestBody(BaseModel):
    email: str
    message: str = None


@router.post("/api/request-access")
def request_access(body: AccessRequestBody, db: Session = Depends(get_db)):
    email = body.email.strip().lower()
    if not email or "@" not in email:
        raise HTTPException(400, "Invalid email")
    # Silent dedup — don't reveal if email already submitted
    existing = db.query(AccessRequest).filter(AccessRequest.email == email).first()
    if not existing:
        db.add(AccessRequest(email=email, message=body.message or None))
        db.commit()
    return {"ok": True}
