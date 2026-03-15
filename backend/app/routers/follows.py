from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Follow, User

router = APIRouter(prefix="/api/users", tags=["follows"])


@router.post("/{username}/follow")
def follow_user(
    username: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.username == username).first()
    if not target:
        raise HTTPException(404, "User not found")
    if target.id == current_user.id:
        raise HTTPException(400, "Cannot follow yourself")

    existing = db.query(Follow).filter_by(follower_id=current_user.id, followed_id=target.id).first()
    if existing:
        return {"ok": True}

    db.add(Follow(follower_id=current_user.id, followed_id=target.id))
    db.commit()
    return {"ok": True}


@router.delete("/{username}/follow")
def unfollow_user(
    username: str,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    target = db.query(User).filter(User.username == username).first()
    if not target:
        raise HTTPException(404, "User not found")
    if target.is_admin:
        raise HTTPException(400, "Cannot unfollow admin")

    follow = db.query(Follow).filter_by(follower_id=current_user.id, followed_id=target.id).first()
    if follow:
        db.delete(follow)
        db.commit()
    return {"ok": True}
