from collections import Counter
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.dependencies import get_current_user_id
from app.models.analysis import AnalysisReport
from app.models.diary import Diary
from app.schemas.analysis import (
    DeepAnalysisRequest, BroadAnalysisRequest,
    AnalysisListItem, AnalysisDetailResponse,
    DeepAnalysisCreated, BroadAnalysisResponse,
    KeywordFreq, CategoryStat,
)
from app import runpod

router = APIRouter(prefix="/analysis", tags=["analysis"])

_PERIOD_DAYS = {"1w": 7, "1m": 30, "3m": 90}


@router.get("", response_model=List[AnalysisListItem])
async def list_analyses(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AnalysisReport)
        .where(AnalysisReport.user_id == user_id)
        .order_by(AnalysisReport.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{analysis_id}", response_model=AnalysisDetailResponse)
async def get_analysis(
    analysis_id: int,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AnalysisReport).where(
            AnalysisReport.id == analysis_id,
            AnalysisReport.user_id == user_id,
        )
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="존재하지 않는 분석 리포트입니다.")
    return report


@router.post("/deep", response_model=DeepAnalysisCreated, status_code=201)
async def create_deep_analysis(
    body: DeepAnalysisRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Diary).where(Diary.id == body.diary_id, Diary.user_id == user_id)
    )
    diary = result.scalar_one_or_none()
    if not diary:
        raise HTTPException(status_code=404, detail="존재하지 않는 꿈일기입니다.")

    experiences_for_ai = [
        {"title": exp.title, "text": exp.text, "mode": exp.mode}
        for exp in body.experiences
    ]

    try:
        output = await runpod.deep_analyze(diary.content, experiences_for_ai)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI 서버 오류: {str(e)}")

    dream_title = diary.content[:80]
    exp_details = [
        {"title": exp.title, "category": exp.time_text or "", "date": ""}
        for exp in body.experiences
    ]

    report = AnalysisReport(
        user_id=user_id,
        type="deep",
        diary_id=body.diary_id,
        dream_title=dream_title,
        dream_content=diary.content,
        keywords=None,
        ai_report=output.get("interpretation"),
        experiences=exp_details,
    )
    db.add(report)
    await db.flush()
    await db.refresh(report)
    return DeepAnalysisCreated(id=report.id)


@router.post("/broad", response_model=BroadAnalysisResponse)
async def create_broad_analysis(
    body: BroadAnalysisRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    days = _PERIOD_DAYS.get(body.period, 30)
    since = datetime.now(timezone.utc) - timedelta(days=days)

    result = await db.execute(
        select(Diary)
        .where(Diary.user_id == user_id, Diary.created_at >= since)
        .order_by(Diary.date.desc())
    )
    diaries = result.scalars().all()

    diaries_for_ai = [{"date": str(d.date), "text": d.content} for d in diaries]
    experiences_for_ai = [
        {"title": exp.title, "text": exp.text}
        for exp in body.experiences
    ]

    try:
        output = await runpod.broad_analyze(body.period, diaries_for_ai, experiences_for_ai)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI 서버 오류: {str(e)}")

    # 기간 내 꿈일기 task_a_result에서 키워드 빈도 집계
    kw_counter: Counter = Counter()
    for diary in diaries:
        ta = diary.task_a_result
        if not ta or not isinstance(ta, dict):
            continue
        for field in ("primary_keywords", "secondary_keywords", "tertiary_keywords", "keywords"):
            kws = ta.get(field, [])
            if isinstance(kws, list):
                kw_counter.update(kws)

    keyword_freq = [
        KeywordFreq(keyword=kw, count=cnt)
        for kw, cnt in kw_counter.most_common(5)
    ]

    # RunPod Task B가 categories를 반환하면 사용, 없으면 빈 목록
    raw_cats = output.get("categories", [])
    categories = [
        CategoryStat(name=c["name"], percentage=c.get("percentage", c.get("count", 0)))
        for c in raw_cats
        if isinstance(c, dict) and "name" in c
    ]

    return BroadAnalysisResponse(
        keywords=output.get("keywords"),
        ai_report=output.get("report", ""),
        keyword_freq=keyword_freq,
        categories=categories,
    )
