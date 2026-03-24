import os

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from sqlalchemy import text

from app.auth import hash_password
from app.database import Base, SessionLocal, engine
from app.models import User
from app.routers import access, admin, auth, blocks, follows, notifications, posts, users, wedding

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="wicky.tv API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://wicky.tv"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)
app.include_router(users.router)
app.include_router(follows.router)
app.include_router(posts.router)
app.include_router(blocks.router)
app.include_router(notifications.router)
app.include_router(access.router)
app.include_router(wedding.router)

UPLOAD_DIR = os.environ.get("UPLOAD_DIR", "/uploads")
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR, check_dir=False), name="uploads")


@app.on_event("startup")
async def startup():
    Base.metadata.create_all(bind=engine)
    _migrate()
    _seed_admin()


def _migrate():
    db = SessionLocal()
    try:
        db.execute(text(
            "ALTER TABLE posts ADD COLUMN IF NOT EXISTS parent_post_id INTEGER REFERENCES posts(id)"
        ))
        db.execute(text(
            "ALTER TABLE posts ADD COLUMN IF NOT EXISTS quoted_post_id INTEGER REFERENCES posts(id)"
        ))
        db.execute(text("ALTER TABLE posts ALTER COLUMN title DROP NOT NULL"))
        db.execute(text("ALTER TABLE posts ALTER COLUMN media_path DROP NOT NULL"))
        db.execute(text("ALTER TABLE posts ALTER COLUMN media_type DROP NOT NULL"))
        db.execute(text("DROP TABLE IF EXISTS comments"))
        # Normalize existing tags: strip spaces around commas
        db.execute(text("""
            UPDATE posts SET tags = regexp_replace(tags, '\\s*,\\s*', ',', 'g')
            WHERE tags IS NOT NULL AND tags ~ '\\s*,\\s*'
        """))
        db.execute(text(
            "ALTER TABLE posts ADD COLUMN IF NOT EXISTS show_in_feed BOOLEAN NOT NULL DEFAULT FALSE"
        ))
        db.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS title VARCHAR(64)"
        ))
        db.execute(text(
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE"
        ))
        db.execute(text(
            "ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE"
        ))
        db.execute(text(
            "UPDATE users SET title = LEFT(title, 64) WHERE title IS NOT NULL AND length(title) > 64"
        ))
        db.execute(text(
            "ALTER TABLE users ALTER COLUMN title TYPE VARCHAR(64)"
        ))
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS wedding_messages (
                id SERIAL PRIMARY KEY,
                message TEXT NOT NULL,
                from_name VARCHAR(100) NOT NULL,
                to_name VARCHAR(100),
                media_key VARCHAR(500),
                media_type VARCHAR(10),
                hidden BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        db.execute(text("""
            CREATE TABLE IF NOT EXISTS notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                actor_username VARCHAR(50) NOT NULL,
                type VARCHAR(20) NOT NULL,
                post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
                parent_post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
                is_read BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT NOW()
            )
        """))
        db.commit()
    except Exception:
        db.rollback()
    finally:
        db.close()


def _seed_admin():
    password = os.environ.get("ADMIN_PASSWORD")
    if not password:
        return
    db = SessionLocal()
    try:
        if not db.query(User).filter(User.is_admin == True).first():
            db.add(User(
                username="wicky",
                email="admin@wicky.tv",
                password_hash=hash_password(password),
                display_name="wicky",
                is_admin=True,
            ))
            db.commit()
    finally:
        db.close()


@app.get("/health")
def health():
    return {"status": "ok"}
