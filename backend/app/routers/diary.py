from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.dependencies import get_current_user_id
from app.models.diary import Diary
from app.schemas.diary import DiaryCreate, DiaryUpdate, DiaryResponse, DiaryListItem

router = APIRouter(prefix="/diary", tags=["diary"])


@router.get("", response_model=List[DiaryListItem])
async def list_diaries(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Diary)
        .where(Diary.user_id == user_id)
        .order_by(Diary.date.desc(), Diary.created_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=DiaryResponse, status_code=201)
async def create_diary(
    body: DiaryCreate,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    diary = Diary(user_id=user_id, date=body.date, content=body.content)
    db.add(diary)
    await db.flush()
    await db.refresh(diary)
    return diary


@router.get("/{diary_id}", response_model=DiaryResponse)
async def get_diary(
    diary_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Diary).where(Diary.id == diary_id, Diary.user_id == user_id)
    )
    diary = result.scalar_one_or_none()
    if not diary:
        raise HTTPException(status_code=404, detail="존재하지 않는 꿈일기입니다.")
    return diary


@router.put("/{diary_id}", response_model=DiaryResponse)
async def update_diary(
    diary_id: int,
    body: DiaryUpdate,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Diary).where(Diary.id == diary_id, Diary.user_id == user_id)
    )
    diary = result.scalar_one_or_none()
    if not diary:
        raise HTTPException(status_code=404, detail="존재하지 않는 꿈일기입니다.")

    if body.date is not None:
        diary.date = body.date
    if body.content is not None:
        diary.content = body.content
        diary.task_a_result = None  # 내용 변경 시 AI 결과 초기화
    await db.flush()
    await db.refresh(diary)
    return diary


@router.delete("/{diary_id}", status_code=204)
async def delete_diary(
    diary_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Diary).where(Diary.id == diary_id, Diary.user_id == user_id)
    )
    diary = result.scalar_one_or_none()
    if not diary:
        raise HTTPException(status_code=404, detail="존재하지 않는 꿈일기입니다.")
    await db.delete(diary)
