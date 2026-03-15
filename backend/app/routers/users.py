import os
import time
from pathlib import Path

from fastapi import APIRouter, Cookie, Depends, File, HTTPException, UploadFile
from PIL import Image
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import get_current_user, get_optional_current_user
from app.database import get_db
from app.models import Follow, User

router = APIRouter(prefix="/api/users")

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/uploads")
AVATAR_DIR = os.path.join(UPLOAD_DIR, "avatars")
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif"}
MAX_AVATAR_BYTES = 10 * 1024 * 1024


def _user_public(user: User) -> dict:
    return {
        "username": user.username,
        "display_name": user.display_name,
        "title": user.title,
        "bio": user.bio,
        "profile_picture": user.profile_picture,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


class UpdateProfileRequest(BaseModel):
    display_name: str | None = None
    title: str | None = None
    bio: str | None = None


@router.get("")
def list_users(
    db: Session = Depends(get_db),
    viewer=Depends(get_optional_current_user),
):
    users = db.query(User).order_by(User.created_at).all()
    result = []
    for u in users:
        is_following = False
        if viewer and viewer.id != u.id:
            is_following = db.query(Follow).filter_by(follower_id=viewer.id, followed_id=u.id).first() is not None
        result.append({
            **_user_public(u),
            "is_admin": u.is_admin,
            "follower_count": db.query(Follow).filter(Follow.followed_id == u.id).count(),
            "is_following": is_following,
        })
    return result


@router.put("/me")
def update_profile(
    req: UpdateProfileRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if req.display_name is not None:
        if len(req.display_name) > 100:
            raise HTTPException(400, "Display name too long (max 100 chars)")
        user.display_name = req.display_name.strip() or None
    if req.title is not None:
        user.title = req.title.strip()[:100] or None
    if req.bio is not None:
        user.bio = req.bio or None
    db.commit()
    return _user_public(user)


@router.post("/me/avatar")
async def upload_avatar(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(400, "Only JPEG, PNG, and GIF images are allowed")

    content = await file.read()
    if len(content) > MAX_AVATAR_BYTES:
        raise HTTPException(400, "Image too large (max 10MB)")

    Path(AVATAR_DIR).mkdir(parents=True, exist_ok=True)

    ext = "jpg"
    if file.filename and "." in file.filename:
        ext = file.filename.rsplit(".", 1)[-1].lower()
    filename = f"{user.username}_{int(time.time())}.{ext}"
    filepath = os.path.join(AVATAR_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(content)

    try:
        img = Image.open(filepath)
        img.thumbnail((400, 400))
        img.save(filepath)
    except Exception:
        pass

    user.profile_picture = f"/uploads/avatars/{filename}"
    db.commit()
    return {"profile_picture": user.profile_picture}


@router.get("/{username}")
def get_profile(
    username: str,
    db: Session = Depends(get_db),
    viewer=Depends(get_optional_current_user),
):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(404, "User not found")

    follower_count = db.query(Follow).filter(Follow.followed_id == user.id).count()
    following_count = db.query(Follow).filter(Follow.follower_id == user.id).count()
    is_following = False
    if viewer and viewer.id != user.id:
        is_following = db.query(Follow).filter_by(follower_id=viewer.id, followed_id=user.id).first() is not None

    return {
        **_user_public(user),
        "is_admin": user.is_admin,
        "follower_count": follower_count,
        "following_count": following_count,
        "is_following": is_following,
    }
