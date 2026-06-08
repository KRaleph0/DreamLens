import asyncio
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from sqlalchemy import select
from app.database import engine, Base, AsyncSessionLocal
from app.config import settings
from app.routers import auth, diary, experience, analysis, user
from app.models.experience import Experience
from app.models.analysis import AnalysisReport


async def _requeue_pending_experiences():
    from app.routers.experience import _run_task_c
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Experience.id).where(Experience.status == "pending")
        )
        ids = result.scalars().all()
    for exp_id in ids:
        asyncio.create_task(_run_task_c(exp_id))
    if ids:
        print(f"[startup] pending 경험 {len(ids)}건 재처리 시작: {ids}", flush=True)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("DB 연결 성공!")
    await _requeue_pending_experiences()
    yield
    await engine.dispose()

app = FastAPI(lifespan=lifespan, root_path="/api")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(diary.router)
app.include_router(experience.router)
app.include_router(analysis.router)
app.include_router(user.router)

@app.get("/health")
async def health():
    return {"status": "ok"}