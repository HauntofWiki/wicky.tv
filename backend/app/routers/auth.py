import logging
import os
import re
import secrets
import smtplib
from datetime import datetime, timedelta
from email.mime.text import MIMEText

from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
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
from app.models import Follow, InviteCode, PasswordResetToken
from app.models import Session as SessionModel
from app.models import User

logger = logging.getLogger(__name__)

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
@limiter.limit("5/minute")
def signup(request: Request, req: SignupRequest, response: Response, db: Session = Depends(get_db)):
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
    return _user_response(user)


@router.post("/login")
@limiter.limit("10/minute")
def login(request: Request, req: LoginRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.username == req.username).first()
    if not user:
        user = db.query(User).filter(User.email == req.username).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(401, "Invalid credentials")
    session_id = create_session(user.id, db)
    _set_session_cookie(response, session_id)
    return _user_response(user)


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


def _user_response(user: User):
    return {
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "title": user.title,
        "bio": user.bio,
        "profile_picture": user.profile_picture,
        "is_admin": user.is_admin,
        "is_public": user.is_public,
    }


@router.get("/me")
def me(user: User = Depends(get_current_user)):
    return _user_response(user)


class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


@router.post("/forgot-password")
@limiter.limit("5/minute")
def forgot_password(request: Request, req: ForgotPasswordRequest, db: Session = Depends(get_db)):
    # Always return the same response to avoid leaking which emails exist
    user = db.query(User).filter(User.email == req.email.strip().lower()).first()
    if user:
        # Delete any existing tokens for this user
        db.query(PasswordResetToken).filter(PasswordResetToken.user_id == user.id).delete()
        token = secrets.token_urlsafe(32)
        db.add(PasswordResetToken(
            token=token,
            user_id=user.id,
            expires_at=datetime.utcnow() + timedelta(hours=1),
        ))
        db.commit()
        _send_reset_email(user.email, token)
    return {"ok": True}


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    record = db.query(PasswordResetToken).filter(PasswordResetToken.token == req.token).first()
    if not record or record.expires_at < datetime.utcnow():
        raise HTTPException(400, "Invalid or expired reset link")
    if len(req.new_password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters")
    user = db.get(User, record.user_id)
    user.password_hash = hash_password(req.new_password)
    db.delete(record)
    db.commit()
    return {"ok": True}


def _send_reset_email(to_email: str, token: str):
    host = os.environ.get("SMTP_HOST")
    port = int(os.environ.get("SMTP_PORT", 587))
    user = os.environ.get("SMTP_USER")
    password = os.environ.get("SMTP_PASSWORD")
    from_addr = os.environ.get("SMTP_FROM", "red@wicky.tv")
    site_url = os.environ.get("SITE_URL", "https://wicky.tv")

    if not all([host, user, password]):
        logger.error("SMTP not configured — cannot send password reset email")
        return

    link = f"{site_url}/reset-password?token={token}"
    body = f"someone requested a password reset for your wicky.tv account.\n\nreset your password:\n\n  {link}\n\nthis link expires in 1 hour. if you didn't request this, ignore this email."
    msg = MIMEText(body)
    msg["Subject"] = "reset your wicky.tv password"
    msg["From"] = from_addr
    msg["To"] = to_email

    try:
        with smtplib.SMTP(host, port) as smtp:
            smtp.starttls()
            smtp.login(user, password)
            smtp.sendmail(from_addr, to_email, msg.as_string())
        logger.info("Password reset email sent to %s", to_email)
    except Exception as e:
        logger.error("Failed to send reset email to %s: %s", to_email, e)
