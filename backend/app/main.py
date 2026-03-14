import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.auth import hash_password
from app.database import Base, SessionLocal, engine
from app.models import User
from app.routers import admin, auth

app = FastAPI(title="wicky.tv API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://wicky.tv"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(admin.router)


@app.on_event("startup")
async def startup():
    Base.metadata.create_all(bind=engine)
    _seed_admin()


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
