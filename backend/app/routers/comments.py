import os
import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Block, Comment, Post, User

router = APIRouter(tags=["comments"])

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/uploads")
MAX_IMAGE_SIZE = 50 * 1024 * 1024
MAX_VIDEO_SIZE = 500 * 1024 * 1024
ALLOWED_IMAGES = {"image/jpeg", "image/png", "image/gif"}
ALLOWED_VIDEOS = {"video/mp4", "video/quicktime"}


def _comment_dict(comment):
    return {
        "id": comment.id,
        "post_id": comment.post_id,
        "user": {
            "username": comment.user.username,
            "display_name": comment.user.display_name,
            "profile_picture": comment.user.profile_picture,
        },
        "body": comment.body,
        "media_path": comment.media_path,
        "media_type": comment.media_type,
        "quoted_comment_id": comment.quoted_comment_id,
        "is_edited": comment.is_edited,
        "created_at": comment.created_at.isoformat() if comment.created_at else None,
        "edited_at": comment.edited_at.isoformat() if comment.edited_at else None,
    }


@router.get("/api/posts/{post_id}/comments")
def list_comments(post_id: int, db: Session = Depends(get_db)):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(404, "Post not found")
    comments = (
        db.query(Comment)
        .filter(Comment.post_id == post_id)
        .order_by(Comment.created_at)
        .all()
    )
    return [_comment_dict(c) for c in comments]


@router.post("/api/posts/{post_id}/comments")
async def create_comment(
    post_id: int,
    body: str = Form(None),
    quoted_comment_id: int = Form(None),
    file: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(404, "Post not found")

    if post.user_id != current_user.id:
        block = db.query(Block).filter_by(
            blocker_id=post.user_id, blocked_id=current_user.id
        ).first()
        if block:
            raise HTTPException(403, "You cannot comment on this post")

    if not body and not file:
        raise HTTPException(400, "Comment must have body or media")

    if body and len(body) > 10000:
        raise HTTPException(400, "Comment too long")

    if quoted_comment_id:
        quoted = db.get(Comment, quoted_comment_id)
        if not quoted or quoted.post_id != post_id:
            raise HTTPException(400, "Quoted comment not found")

    media_path = None
    media_type = None

    if file and file.filename:
        contents = await file.read()
        content_type = file.content_type

        if content_type in ALLOWED_IMAGES:
            if len(contents) > MAX_IMAGE_SIZE:
                raise HTTPException(400, "Image too large (max 50MB)")
            media_type = "image"
            ext = "jpg" if content_type == "image/jpeg" else content_type.split("/")[1]
        elif content_type in ALLOWED_VIDEOS:
            if len(contents) > MAX_VIDEO_SIZE:
                raise HTTPException(400, "Video too large (max 500MB)")
            media_type = "video"
            ext = "mp4" if "mp4" in content_type else "mov"
        else:
            raise HTTPException(400, "Unsupported file type")

        filename = (
            f"comments/{current_user.username}"
            f"_{int(datetime.utcnow().timestamp())}"
            f"_{uuid.uuid4().hex[:8]}.{ext}"
        )
        full_path = os.path.join(UPLOAD_DIR, filename)
        os.makedirs(os.path.dirname(full_path), exist_ok=True)
        with open(full_path, "wb") as f:
            f.write(contents)
        media_path = filename

    comment = Comment(
        post_id=post_id,
        user_id=current_user.id,
        body=body or None,
        media_path=media_path,
        media_type=media_type,
        quoted_comment_id=quoted_comment_id,
    )
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return _comment_dict(comment)


@router.patch("/api/comments/{comment_id}")
def edit_comment(
    comment_id: int,
    body: str = Form(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(404, "Comment not found")
    if comment.user_id != current_user.id:
        raise HTTPException(403, "Not your comment")

    comment.body = body
    comment.is_edited = True
    comment.edited_at = datetime.utcnow()
    db.commit()
    db.refresh(comment)
    return _comment_dict(comment)


@router.delete("/api/comments/{comment_id}")
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    comment = db.get(Comment, comment_id)
    if not comment:
        raise HTTPException(404, "Comment not found")
    if comment.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(403, "Not your comment")

    if comment.media_path:
        full_path = os.path.join(UPLOAD_DIR, comment.media_path)
        if os.path.exists(full_path):
            os.remove(full_path)

    db.delete(comment)
    db.commit()
    return {"ok": True}


@router.post("/api/users/{username}/block")
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

    existing = db.query(Block).filter_by(
        blocker_id=current_user.id, blocked_id=target.id
    ).first()
    if not existing:
        db.add(Block(blocker_id=current_user.id, blocked_id=target.id))
        db.commit()
    return {"ok": True}


@router.delete("/api/users/{username}/block")
def unblock_user(
    username: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    target = db.query(User).filter(User.username == username).first()
    if not target:
        raise HTTPException(404, "User not found")

    block = db.query(Block).filter_by(
        blocker_id=current_user.id, blocked_id=target.id
    ).first()
    if block:
        db.delete(block)
        db.commit()
    return {"ok": True}
