import re
from datetime import datetime

from fastapi import APIRouter, Cookie, Depends, HTTPException, Response
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.auth import (
    SECURE_COOKIES,
    create_session,
    get_current_user,
    hash_password,
    verify_password,
)
from app.database import get_db
from app.models import Follow, InviteCode
from app.models import Session as SessionModel
from app.models import User

router = APIRouter(prefix="/api/auth")

SESSION_COOKIE = "session_id"
COOKIE_MAX_AGE = 30 * 24 * 3600


class SignupRequest(BaseModel):
    username: str
    email: str
    password: str
    invite_code: str


class LoginRequest(BaseModel):
    username: str
    password: str


def _set_session_cookie(response: Response, session_id: str):
    response.set_cookie(
        key=SESSION_COOKIE,
        value=session_id,
        httponly=True,
        samesite="lax",
        secure=SECURE_COOKIES,
        max_age=COOKIE_MAX_AGE,
    )


@router.post("/signup")
def signup(req: SignupRequest, response: Response, db: Session = Depends(get_db)):
    if not re.match(r"^[a-z0-9_]{2,32}$", req.username):
        raise HTTPException(400, "Username must be 2–32 lowercase letters, numbers, or underscores")
    if db.query(User).filter(User.username == req.username).first():
        raise HTTPException(400, "Username taken")
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(400, "Email already registered")
    if len(req.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")

    code = db.query(InviteCode).filter(InviteCode.code == req.invite_code).first()
    if not code:
        raise HTTPException(400, "Invalid invite code")
    if code.use_count >= code.max_uses:
        raise HTTPException(400, "Invite code already used")
    if code.expires_at and code.expires_at < datetime.utcnow():
        raise HTTPException(400, "Invite code expired")

    user = User(
        username=req.username,
        email=req.email,
        password_hash=hash_password(req.password),
        invite_code_used=req.invite_code,
    )
    db.add(user)
    code.use_count += 1
    db.flush()

    admin = db.query(User).filter(User.is_admin == True, User.id != user.id).first()
    if admin:
        db.add(Follow(follower_id=user.id, followed_id=admin.id))
        db.add(Follow(follower_id=admin.id, followed_id=user.id))

    session_id = create_session(user.id, db)
    _set_session_cookie(response, session_id)
    return {"username": user.username, "is_admin": user.is_admin}


@router.post("/login")
def login(req: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user:
        user = db.query(User).filter(User.email == req.username).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    session_id = create_session(user.id, db)
    _set_session_cookie(response, session_id)
    return {"username": user.username, "is_admin": user.is_admin}


@router.post("/logout")
def logout(
    response: Response,
    session_id: str = Cookie(default=None),
    db: Session = Depends(get_db),
):
    if session_id:
        db.query(SessionModel).filter(SessionModel.id == session_id).delete()
        db.commit()
    response.delete_cookie(SESSION_COOKIE)
    return {"ok": True}


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "title": user.title,
        "bio": user.bio,
        "profile_picture": user.profile_picture,
        "is_admin": user.is_admin,
    }
