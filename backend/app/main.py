from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base

app = FastAPI(title="wicky.tv API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "https://wicky.tv"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
    return {"status": "ok"}
