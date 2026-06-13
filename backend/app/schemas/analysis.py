from pydantic import BaseModel
from typing import Optional, List, Literal
from datetime import datetime


# ── 공통 ─────────────────────────────────────────────────────────
class ExperienceSelection(BaseModel):
    """경험 선택 UI에서 사용자가 선택한 경험 항목."""
    exp_id: int
    mode: Literal["original", "summary", "compressed"]
    target_tokens: Optional[int] = None  # compressed 모드에서만 사용


# ── 버튼 2: 심층 해석 (Task D) ────────────────────────────────────
class DeepAnalysisRequest(BaseModel):
    experiences: List[ExperienceSelection] = []


class DeepAnalysisCreated(BaseModel):
    id: int


# ── 버튼 3: 기간별 분석 Step 1 (Task B-1 × 3) ────────────────────
class PeriodTierRequest(BaseModel):
    period: Literal["1w", "1m", "3m"]


class PeriodTierResponse(BaseModel):
    period: str
    diary_count: int
    interp_p: str
    interp_s: str
    interp_t: str


# ── 버튼 3: 기간별 분석 Step 2 (Task B-2) ────────────────────────
class PeriodFinalRequest(BaseModel):
    period: Literal["1w", "1m", "3m"]
    interp_p: str
    interp_s: str
    interp_t: str
    experiences: List[ExperienceSelection] = []


# ── 분석 리포트 조회 ──────────────────────────────────────────────
class AnalysisListItem(BaseModel):
    id: int
    type: str
    dream_title: Optional[str] = None
    period: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class AnalysisDetailResponse(BaseModel):
    id: int
    type: str
    dream_title: Optional[str] = None
    dream_content: Optional[str] = None
    keywords: Optional[List[str]] = None
    ai_report: Optional[str] = None
    experiences: Optional[List[dict]] = None
    period: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


# ── 기간별 분석 최종 응답 ─────────────────────────────────────────
class KeywordFreq(BaseModel):
    keyword: str
    count: int


class CategoryStat(BaseModel):
    name: str
    percentage: float


class BroadAnalysisResponse(BaseModel):
    id: int
    ai_report: str
    keyword_freq: List[KeywordFreq] = []
    categories: List[CategoryStat] = []
