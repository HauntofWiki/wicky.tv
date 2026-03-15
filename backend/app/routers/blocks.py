from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Block, User

router = APIRouter(prefix="/api/users", tags=["blocks"])


@router.post("/{username}/block")
def block_user(
    username: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target = db.query(User).filter(User.username == username).first()
    if not target:
        raise HTTPException(404, "User not found")
    if target.is_admin:
        raise HTTPException(400, "Cannot block admin")
    if target.id == current_user.id:
        raise HTTPException(400, "Cannot block yourself")

    existing = db.query(Block).filter_by(blocker_id=current_user.id, blocked_id=target.id).first()
    if not existing:
        db.add(Block(blocker_id=current_user.id, blocked_id=target.id))
        db.commit()
    return {"ok": True}


@router.delete("/{username}/block")
def unblock_user(
    username: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target = db.query(User).filter(User.username == username).first()
    if not target:
        raise HTTPException(404, "User not found")

    block = db.query(Block).filter_by(blocker_id=current_user.id, blocked_id=target.id).first()
    if block:
        db.delete(block)
        db.commit()
    return {"ok": True}
