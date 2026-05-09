from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db, AsyncSessionLocal
from app.dependencies import get_current_user_id
from app.models.experience import Experience
from app.schemas.experience import (
    ExperienceCreate, ExperienceUpdate, ExperienceResponse,
    CompressRequest, CompressResponse,
)
from app import runpod

router = APIRouter(prefix="/experience", tags=["experience"])


# ── Task C 백그라운드 작업 ────────────────────────────────────────
async def _run_task_c(exp_id: int) -> None:
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Experience).where(Experience.id == exp_id))
        exp = result.scalar_one_or_none()
        if not exp:
            return
        try:
            output = await runpod.summarize(exp.content)
            exp.summary = output.get("summary")
            exp.status = "done"
            await db.commit()
        except Exception:
            pass  # 실패해도 경험 기록은 그대로 유지


# ── CRUD ─────────────────────────────────────────────────────────
@router.get("", response_model=List[ExperienceResponse])
async def list_experiences(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Experience)
        .where(Experience.user_id == user_id)
        .order_by(Experience.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=ExperienceResponse, status_code=201)
async def create_experience(
    body: ExperienceCreate,
    background_tasks: BackgroundTasks,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    exp = Experience(
        user_id=user_id,
        title=body.title,
        time_value=body.time_value,
        time_text=body.time_text,
        content=body.content,
        status="pending",
    )
    db.add(exp)
    await db.flush()
    await db.refresh(exp)

    background_tasks.add_task(_run_task_c, exp.id)
    return exp


@router.get("/{exp_id}", response_model=ExperienceResponse)
async def get_experience(
    exp_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Experience).where(Experience.id == exp_id, Experience.user_id == user_id)
    )
    exp = result.scalar_one_or_none()
    if not exp:
        raise HTTPException(status_code=404, detail="존재하지 않는 경험 기록입니다.")
    return exp


@router.put("/{exp_id}", response_model=ExperienceResponse)
async def update_experience(
    exp_id: int,
    body: ExperienceUpdate,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Experience).where(Experience.id == exp_id, Experience.user_id == user_id)
    )
    exp = result.scalar_one_or_none()
    if not exp:
        raise HTTPException(status_code=404, detail="존재하지 않는 경험 기록입니다.")

    if body.title is not None:
        exp.title = body.title
    if body.time_value is not None:
        exp.time_value = body.time_value
    if body.time_text is not None:
        exp.time_text = body.time_text
    if body.content is not None:
        exp.content = body.content
    await db.flush()
    await db.refresh(exp)
    return exp


@router.delete("/{exp_id}", status_code=204)
async def delete_experience(
    exp_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Experience).where(Experience.id == exp_id, Experience.user_id == user_id)
    )
    exp = result.scalar_one_or_none()
    if not exp:
        raise HTTPException(status_code=404, detail="존재하지 않는 경험 기록입니다.")
    await db.delete(exp)


# ── Task C-Ext: 자동압축 ─────────────────────────────────────────
@router.post("/{exp_id}/compress", response_model=CompressResponse)
async def compress_experience(
    exp_id: int,
    body: CompressRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Experience).where(Experience.id == exp_id, Experience.user_id == user_id)
    )
    exp = result.scalar_one_or_none()
    if not exp:
        raise HTTPException(status_code=404, detail="존재하지 않는 경험 기록입니다.")

    try:
        output = await runpod.compress(exp.content, body.target_tokens)
        return CompressResponse(**output)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI 서버 오류: {str(e)}")


# ── 한줄요약 수동 재시도 ───────────────────────────────────────────
@router.post("/{exp_id}/summarize", response_model=ExperienceResponse)
async def summarize_experience(
    exp_id: int,
    background_tasks: BackgroundTasks,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Experience).where(Experience.id == exp_id, Experience.user_id == user_id)
    )
    exp = result.scalar_one_or_none()
    if not exp:
        raise HTTPException(status_code=404, detail="존재하지 않는 경험 기록입니다.")

    exp.status = "pending"
    exp.summary = None
    await db.commit()
    await db.refresh(exp)

    background_tasks.add_task(_run_task_c, exp.id)
    return exp
