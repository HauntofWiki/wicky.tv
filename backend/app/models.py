from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean,
    DateTime, ForeignKey, UniqueConstraint
)
from sqlalchemy.orm import relationship
from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    display_name = Column(String(100))
    bio = Column(Text)
    profile_picture = Column(String(255))
    is_admin = Column(Boolean, default=False, nullable=False)
    invite_code_used = Column(String(64), ForeignKey("invite_codes.code"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    posts = relationship("Post", back_populates="user", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="user", cascade="all, delete-orphan")
    following = relationship("Follow", foreign_keys="Follow.follower_id", back_populates="follower", cascade="all, delete-orphan")
    followers = relationship("Follow", foreign_keys="Follow.followed_id", back_populates="followed", cascade="all, delete-orphan")


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    title = Column(String(255))
    description = Column(Text)
    media_path = Column(String(500))
    media_type = Column(String(10))  # 'image' or 'video'
    thumbnail_path = Column(String(500))
    music_song = Column(String(255))
    music_artist = Column(String(255))
    music_album = Column(String(255))
    tags = Column(String(500))
    is_edited = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    parent_post_id = Column(Integer, ForeignKey("posts.id"), nullable=True)
    quoted_post_id = Column(Integer, ForeignKey("posts.id"), nullable=True)

    user = relationship("User", back_populates="posts")


class InviteCode(Base):
    __tablename__ = "invite_codes"

    code = Column(String(64), primary_key=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    max_uses = Column(Integer, default=1)
    use_count = Column(Integer, default=0)
    expires_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Follow(Base):
    __tablename__ = "follows"

    follower_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    followed_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    follower = relationship("User", foreign_keys=[follower_id], back_populates="following")
    followed = relationship("User", foreign_keys=[followed_id], back_populates="followers")


class Session(Base):
    __tablename__ = "sessions"

    id = Column(String(128), primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    expires_at = Column(DateTime, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="sessions")


class Block(Base):
    __tablename__ = "blocks"

    blocker_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    blocked_id = Column(Integer, ForeignKey("users.id"), primary_key=True)
    created_at = Column(DateTime, default=datetime.utcnow)
