from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app.database import engine, Base
from app.config import settings

@asynccontextmanager
async def lifespan(app: FastAPI):
    # 앱 시작 시 DB 연결 확인
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("DB 연결 성공!")
    yield
    # 앱 종료 시 풀 정리
    await engine.dispose()

app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health():
    return {"status": "ok"}