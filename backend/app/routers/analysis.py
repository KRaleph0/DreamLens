import asyncio
from collections import Counter
from datetime import date, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List

from app.database import get_db
from app.dependencies import get_current_user_id
from app.models.analysis import AnalysisReport
from app.models.diary import Diary
from app.models.experience import Experience
from app.schemas.analysis import (
    DeepAnalysisRequest, DeepAnalysisCreated,
    PeriodTierRequest, PeriodTierResponse,
    PeriodFinalRequest, BroadAnalysisResponse,
    AnalysisListItem, AnalysisDetailResponse,
    KeywordFreq, CategoryStat,
)
from app.constants import MATRIX_SET, KEYWORD_CATEGORY, PERIOD_LABEL, TIER_LABEL
from app import runpod

router = APIRouter(prefix="/analysis", tags=["analysis"])

_PERIOD_DAYS = {"1w": 7, "1m": 30, "3m": 90}


# ── 기간 시작일 ────────────────────────────────────────────────────
def _period_start(period: str) -> date:
    return date.today() - timedelta(days=_PERIOD_DAYS.get(period, 30))


# ── 통계 블록 생성 ─────────────────────────────────────────────────
def _build_statistics_block(period: str, tier: str, diary_count: int, kw_counts: Counter) -> str:
    """명세 4장 포맷에 맞게 statistics_block 텍스트를 생성한다."""
    tier_label   = TIER_LABEL[tier]
    period_label = PERIOD_LABEL[period]

    # 매트릭스 필터 (비어 있으면 전체 허용)
    if MATRIX_SET:
        filtered = {kw: cnt for kw, cnt in kw_counts.items() if kw in MATRIX_SET}
    else:
        filtered = dict(kw_counts)

    sorted_kw = sorted(filtered.items(), key=lambda x: x[1], reverse=True)

    # 카테고리 분포
    cat_totals: Counter = Counter()
    total_hits = 0
    for kw, cnt in sorted_kw:
        cat = KEYWORD_CATEGORY.get(kw, "기타")
        cat_totals[cat] += cnt
        total_hits += cnt

    lines = [
        f"[분석 기간] {period_label}",
        f"[티어] {tier_label}",
        f"[총 꿈 건수] {diary_count}건",
        "",
        f"[키워드 빈도 — {tier_label} 티어]",
    ]
    if sorted_kw:
        for kw, cnt in sorted_kw:
            lines.append(f"{kw}: {cnt}회")
    else:
        lines.append("(해당 기간 키워드 없음)")

    lines.append("")
    lines.append("[카테고리 분포]")
    if total_hits > 0:
        for cat, cnt in sorted(cat_totals.items(), key=lambda x: x[1], reverse=True):
            pct = round(cnt / total_hits * 100)
            lines.append(f"{cat}: {pct}%")
    else:
        lines.append("(데이터 없음)")

    return "\n".join(lines)


# ── 경험 블록 조립 ─────────────────────────────────────────────────
async def _build_experience_block(selections: list, user_id: int, db: AsyncSession) -> str:
    """명세 5장 포맷: [경험-원문] / [경험-요약] / [경험-자동압축] 한 줄씩."""
    if not selections:
        return ""

    lines: list[str] = []
    for sel in selections:
        result = await db.execute(
            select(Experience).where(
                Experience.id == sel.exp_id,
                Experience.user_id == user_id,
            )
        )
        exp = result.scalar_one_or_none()
        if not exp:
            continue

        if sel.mode == "original":
            lines.append(f"[경험-원문] {exp.content}")
        elif sel.mode == "summary":
            lines.append(f"[경험-요약] {exp.summary or exp.content}")
        elif sel.mode == "compressed":
            target = sel.target_tokens or 200
            output = await runpod.compress(exp.content, target)
            lines.append(f"[경험-자동압축] {output['summary']}")

    return "\n".join(lines)


# ── 분석 이력 조회 ─────────────────────────────────────────────────
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


# ── 버튼 2: 심층 해석 (Task D) ────────────────────────────────────
@router.post("/deep", response_model=DeepAnalysisCreated, status_code=201)
async def create_deep_analysis(
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

    try:
        experience_block = await _build_experience_block(body.experiences, user_id, db)
        output = await runpod.deep_analyze(diary.content, experience_block)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI 서버 오류: {str(e)}")

    exp_details = []
    for sel in body.experiences:
        r = await db.execute(select(Experience).where(Experience.id == sel.exp_id, Experience.user_id == user_id))
        exp = r.scalar_one_or_none()
        if exp:
            exp_details.append({"title": exp.title, "category": exp.time_text or "", "date": ""})

    report = AnalysisReport(
        user_id=user_id,
        type="deep",
        diary_id=diary_id,
        dream_title=diary.content[:80],
        dream_content=diary.content,
        keywords=None,
        ai_report=output.get("interpretation"),
        experiences=exp_details,
    )
    db.add(report)
    await db.flush()
    await db.refresh(report)
    return DeepAnalysisCreated(id=report.id)


# ── 버튼 3 Step 1: 기간별 티어 해석 (Task B-1 × 3) ──────────────
@router.post("/period/tier", response_model=PeriodTierResponse)
async def analyze_period_tier(
    body: PeriodTierRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    start = _period_start(body.period)
    result = await db.execute(
        select(Diary).where(
            Diary.user_id == user_id,
            Diary.date >= start,
            Diary.task_a_result.isnot(None),
        )
    )
    diaries = result.scalars().all()
    if not diaries:
        raise HTTPException(status_code=422, detail="해당 기간에 분석된 꿈일기가 없습니다.")

    diary_count = len(diaries)

    # 티어별 키워드 빈도 집계
    counters = {"primary": Counter(), "secondary": Counter(), "tertiary": Counter()}
    for d in diaries:
        ta = d.task_a_result or {}
        for kw in ta.get("primary_keywords", []):
            if kw:
                counters["primary"][kw] += 1
        for kw in ta.get("secondary_keywords", []):
            if kw:
                counters["secondary"][kw] += 1
        for kw in ta.get("tertiary_keywords", []):
            if kw:
                counters["tertiary"][kw] += 1

    # 통계 블록 3개 생성
    blocks = {
        tier: _build_statistics_block(body.period, tier, diary_count, counters[tier])
        for tier in ("primary", "secondary", "tertiary")
    }

    # Task B-1 × 3 병렬 호출
    try:
        p_out, s_out, t_out = await asyncio.gather(
            runpod.period_tier(blocks["primary"]),
            runpod.period_tier(blocks["secondary"]),
            runpod.period_tier(blocks["tertiary"]),
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI 서버 오류: {str(e)}")

    return PeriodTierResponse(
        period=body.period,
        diary_count=diary_count,
        interp_p=p_out.get("interpretation", ""),
        interp_s=s_out.get("interpretation", ""),
        interp_t=t_out.get("interpretation", ""),
    )


# ── 버튼 3 Step 2: 종합 재해석 (Task B-2) ────────────────────────
@router.post("/period/final", response_model=BroadAnalysisResponse)
async def analyze_period_final(
    body: PeriodFinalRequest,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    try:
        experience_block = await _build_experience_block(body.experiences, user_id, db)
        output = await runpod.period_summary(
            interp_p=body.interp_p,
            interp_s=body.interp_s,
            interp_t=body.interp_t,
            experience_block=experience_block,
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"AI 서버 오류: {str(e)}")

    # 기간 내 키워드 빈도 집계 (프론트 표시용)
    start = _period_start(body.period)
    dr = await db.execute(
        select(Diary).where(
            Diary.user_id == user_id,
            Diary.date >= start,
            Diary.task_a_result.isnot(None),
        )
    )
    diaries = dr.scalars().all()

    kw_counter: Counter = Counter()
    cat_counter: Counter = Counter()
    for d in diaries:
        ta = d.task_a_result or {}
        for field in ("primary_keywords", "secondary_keywords", "tertiary_keywords"):
            for kw in ta.get(field, []):
                if kw and (not MATRIX_SET or kw in MATRIX_SET):
                    kw_counter[kw] += 1
                    cat_counter[KEYWORD_CATEGORY.get(kw, "기타")] += 1

    total_cat = sum(cat_counter.values())
    keyword_freq = [KeywordFreq(keyword=kw, count=cnt) for kw, cnt in kw_counter.most_common(5)]
    categories = [
        CategoryStat(name=cat, percentage=round(cnt / total_cat * 100, 1))
        for cat, cnt in sorted(cat_counter.items(), key=lambda x: x[1], reverse=True)
    ] if total_cat > 0 else []

    # 분석 결과 저장
    report = AnalysisReport(
        user_id=user_id,
        type="broad",
        period=body.period,
        ai_report=output.get("interpretation", ""),
        dream_title=None,
        dream_content=None,
        keywords=list(kw_counter.keys()),
        experiences=None,
    )
    db.add(report)
    await db.flush()
    await db.refresh(report)

    return BroadAnalysisResponse(
        id=report.id,
        ai_report=output.get("interpretation", ""),
        keyword_freq=keyword_freq,
        categories=categories,
    )
