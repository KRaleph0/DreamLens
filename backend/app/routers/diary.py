from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db, AsyncSessionLocal
from app.dependencies import get_current_user_id
from app.models.diary import Diary
from app.models.experience import Experience
from app.schemas.diary import DiaryCreate, DiaryUpdate, DiaryResponse, DiaryListItem
from app.schemas.analysis import DeepAnalysisRequest
from app import runpod

router = APIRouter(prefix="/diary", tags=["diary"])

_analyzing: set[int] = set()


async def _run_task_a(diary_id: int) -> None:
    _analyzing.add(diary_id)
    try:
        async with AsyncSessionLocal() as db:
            result = await db.execute(select(Diary).where(Diary.id == diary_id))
            diary = result.scalar_one_or_none()
            if not diary:
                return
            print(f"[Task A] diary_id={diary_id} RunPod 호출 시작", flush=True)
            output = await runpod.analyze_dream(diary.content)
            diary.task_a_result = output
            await db.commit()
            print(f"[Task A] diary_id={diary_id} 완료", flush=True)
    except Exception as e:
        print(f"[Task A] diary_id={diary_id} 실패: {e}", flush=True)
    finally:
        _analyzing.discard(diary_id)


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


@router.post("/{diary_id}/analyze", response_model=DiaryResponse, status_code=202)
async def analyze_diary(
    diary_id: int,
    background_tasks: BackgroundTasks,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Diary).where(Diary.id == diary_id, Diary.user_id == user_id)
    )
    diary = result.scalar_one_or_none()
    if not diary:
        raise HTTPException(status_code=404, detail="존재하지 않는 꿈일기입니다.")

    if not diary.task_a_result and diary_id not in _analyzing:
        background_tasks.add_task(_run_task_a, diary_id)

    return diary


@router.post("/{diary_id}/analyze/deep", response_model=DiaryResponse)
async def analyze_diary_deep(
    diary_id: int,
    body: DeepAnalysisRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Diary).where(Diary.id == diary_id, Diary.user_id == user_id)
    )
    diary = result.scalar_one_or_none()
    if not diary:
        raise HTTPException(status_code=404, detail="존재하지 않는 꿈일기입니다.")

    lines: list[str] = []
    for sel in body.experiences:
        r = await db.execute(
            select(Experience).where(Experience.id == sel.exp_id, Experience.user_id == user_id)
        )
        exp = r.scalar_one_or_none()
        if not exp:
            continue
        if sel.mode == "original":
            lines.append(f"[경험-원문] {exp.content}")
        elif sel.mode == "summary":
            lines.append(f"[경험-요약] {exp.summary or exp.content}")
        elif sel.mode == "compressed":
            target = sel.target_tokens or 200
            out = await runpod.compress(exp.content, target)
            lines.append(f"[경험-자동압축] {out['summary']}")

    experience_block = "\n".join(lines)

    try:
        output = await runpod.deep_analyze(diary.content, experience_block)
        diary.task_d_result = output
        await db.flush()
        await db.refresh(diary)
        return diary
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI 서버 오류: {str(e)}")


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
