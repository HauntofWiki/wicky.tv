import io
import os
import uuid
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from PIL import Image
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models import Block, Follow, Post, User

router = APIRouter(prefix="/api/posts", tags=["posts"])

UPLOAD_DIR = os.getenv("UPLOAD_DIR", "/app/uploads")
MAX_IMAGE_SIZE = 50 * 1024 * 1024
MAX_VIDEO_SIZE = 500 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/gif"}
ALLOWED_VIDEO_TYPES = {"video/mp4", "video/quicktime"}


def _post_dict(post: Post) -> dict:
    return {
        "id": post.id,
        "title": post.title,
        "description": post.description,
        "media_path": post.media_path,
        "media_type": post.media_type,
        "thumbnail_path": post.thumbnail_path,
        "music_song": post.music_song,
        "music_artist": post.music_artist,
        "music_album": post.music_album,
        "tags": post.tags,
        "is_edited": post.is_edited,
        "created_at": post.created_at.isoformat(),
        "updated_at": post.updated_at.isoformat() if post.updated_at else None,
        "parent_post_id": post.parent_post_id,
        "quoted_post_id": post.quoted_post_id,
        "show_in_feed": post.show_in_feed,
        "user": {
            "username": post.user.username,
            "display_name": post.user.display_name,
            "profile_picture": post.user.profile_picture,
        },
    }


def _make_thumbnail(image_bytes: bytes, save_path: str):
    img = Image.open(io.BytesIO(image_bytes))
    img.thumbnail((800, 800), Image.LANCZOS)
    fmt = img.format or "JPEG"
    img.save(save_path, format=fmt)


@router.post("")
async def create_post(
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    music_song: Optional[str] = Form(None),
    music_artist: Optional[str] = Form(None),
    music_album: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    parent_post_id: Optional[int] = Form(None),
    quoted_post_id: Optional[int] = Form(None),
    show_in_feed: bool = Form(False),
    media: Optional[UploadFile] = File(None),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    is_reply = parent_post_id is not None

    # Replies don't need a title or media; root posts require both
    if not is_reply:
        if not title or not title.strip():
            raise HTTPException(400, "title is required")
        if not media or not media.filename:
            raise HTTPException(400, "media is required")

    if is_reply:
        # Validate parent exists
        parent = db.get(Post, parent_post_id)
        if not parent:
            raise HTTPException(404, "Parent post not found")
        # Block check
        if parent.user_id != current_user.id:
            block = db.query(Block).filter_by(
                blocker_id=parent.user_id, blocked_id=current_user.id
            ).first()
            if block:
                raise HTTPException(403, "You cannot reply to this post")
        # Must have something to say
        if not description and not media:
            raise HTTPException(400, "Reply must have text or media")

    if quoted_post_id:
        quoted = db.get(Post, quoted_post_id)
        if not quoted:
            raise HTTPException(400, "Quoted post not found")

    media_path = None
    media_type = None
    thumbnail_path = None

    if media and media.filename:
        content_type = media.content_type
        if content_type in ALLOWED_IMAGE_TYPES:
            media_type = "image"
            max_size = MAX_IMAGE_SIZE
        elif content_type in ALLOWED_VIDEO_TYPES:
            media_type = "video"
            max_size = MAX_VIDEO_SIZE
        else:
            raise HTTPException(400, f"Unsupported file type: {content_type}")

        contents = await media.read()
        if len(contents) > max_size:
            raise HTTPException(400, f"File exceeds {max_size // (1024*1024)}MB limit")

        ext = media.filename.rsplit(".", 1)[-1].lower() if "." in (media.filename or "") else "bin"
        timestamp = int(datetime.utcnow().timestamp())
        uid = uuid.uuid4().hex[:8]
        subdir = "replies" if is_reply else "posts"
        filename = f"{current_user.username}_{timestamp}_{uid}.{ext}"

        save_dir = os.path.join(UPLOAD_DIR, subdir)
        thumbs_dir = os.path.join(UPLOAD_DIR, "thumbnails")
        os.makedirs(save_dir, exist_ok=True)
        os.makedirs(thumbs_dir, exist_ok=True)

        with open(os.path.join(save_dir, filename), "wb") as f:
            f.write(contents)
        media_path = f"{subdir}/{filename}"

        if media_type == "image":
            thumb_filename = f"thumb_{filename}"
            _make_thumbnail(contents, os.path.join(thumbs_dir, thumb_filename))
            thumbnail_path = f"thumbnails/{thumb_filename}"

    post = Post(
        user_id=current_user.id,
        title=title.strip() if title and title.strip() else None,
        description=description.strip() if description else None,
        media_path=media_path,
        media_type=media_type,
        thumbnail_path=thumbnail_path,
        music_song=music_song.strip() if music_song else None,
        music_artist=music_artist.strip() if music_artist else None,
        music_album=music_album.strip() if music_album else None,
        tags=tags.strip() if tags else None,
        parent_post_id=parent_post_id,
        quoted_post_id=quoted_post_id,
        show_in_feed=show_in_feed if is_reply else True,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return _post_dict(post)


@router.get("/feed")
def get_feed(
    limit: int = 50,
    offset: int = 0,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    followed_ids = [
        f.followed_id for f in db.query(Follow).filter(Follow.follower_id == current_user.id).all()
    ]
    if not followed_ids:
        return []
    from sqlalchemy import or_
    posts = (
        db.query(Post)
        .filter(
            Post.user_id.in_(followed_ids),
            or_(Post.parent_post_id == None, Post.show_in_feed == True),
        )
        .order_by(Post.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    result = []
    for p in posts:
        d = _post_dict(p)
        if p.parent_post_id:
            parent = db.get(Post, p.parent_post_id)
            if parent:
                d["parent_preview"] = {
                    "id": parent.id,
                    "title": parent.title,
                    "user": {"username": parent.user.username},
                }
        result.append(d)
    return result


@router.get("")
def list_posts(
    username: Optional[str] = None,
    tag: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: Session = Depends(get_db),
):
    from sqlalchemy import func
    q = db.query(Post).join(User).filter(Post.parent_post_id == None)
    if username:
        q = q.filter(User.username == username)
    if tag:
        needle = f',{tag.lower().strip()},'
        padded = func.concat(',', func.lower(Post.tags), ',')
        q = q.filter(padded.contains(needle))
    posts = q.order_by(Post.created_at.desc()).offset(offset).limit(limit).all()
    return [_post_dict(p) for p in posts]


@router.get("/{post_id}/replies")
def list_replies(post_id: int, db: Session = Depends(get_db)):
    post = db.get(Post, post_id)
    if not post:
        raise HTTPException(404, "Post not found")
    replies = (
        db.query(Post)
        .filter(Post.parent_post_id == post_id)
        .order_by(Post.created_at)
        .all()
    )
    return [_post_dict(r) for r in replies]


@router.get("/{post_id}")
def get_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    return _post_dict(post)


@router.put("/{post_id}")
def update_post(
    post_id: int,
    title: Optional[str] = Form(None),
    description: Optional[str] = Form(None),
    music_song: Optional[str] = Form(None),
    music_artist: Optional[str] = Form(None),
    music_album: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    if post.user_id != current_user.id:
        raise HTTPException(403, "Not your post")

    if title is not None:
        post.title = title.strip() or None
    if description is not None:
        post.description = description.strip() or None
    if music_song is not None:
        post.music_song = music_song.strip() or None
    if music_artist is not None:
        post.music_artist = music_artist.strip() or None
    if music_album is not None:
        post.music_album = music_album.strip() or None
    if tags is not None:
        post.tags = tags.strip() or None

    post.is_edited = True
    post.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(post)
    return _post_dict(post)


@router.delete("/{post_id}")
def delete_post(
    post_id: int,
    current_user=Depends(get_current_user),
    db: Session = Depends(get_db),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(404, "Post not found")
    if post.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(403, "Not your post")

    for rel_path in [post.media_path, post.thumbnail_path]:
        if rel_path:
            full = os.path.join(UPLOAD_DIR, rel_path)
            if os.path.exists(full):
                os.remove(full)

    db.delete(post)
    db.commit()
    return {"ok": True}
