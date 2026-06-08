from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class ExperienceInput(BaseModel):
    exp_id: int
    title: str
    text: str
    mode: str = "original"   # 'original' | 'summary' | 'compress'
    time_text: Optional[str] = None


class DeepAnalysisRequest(BaseModel):
    diary_id: int
    experiences: List[ExperienceInput]


class BroadAnalysisRequest(BaseModel):
    period: str  # '1w' | '1m' | '3m'
    experiences: List[ExperienceInput]


class AnalysisListItem(BaseModel):
    id: int
    type: str
    dream_title: Optional[str] = None
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
    created_at: datetime

    class Config:
        from_attributes = True


class DeepAnalysisCreated(BaseModel):
    id: int


class KeywordFreq(BaseModel):
    keyword: str
    count: int


class CategoryStat(BaseModel):
    name: str
    percentage: float


class BroadAnalysisResponse(BaseModel):
    keywords: Optional[List[str]] = None
    ai_report: str
    keyword_freq: List[KeywordFreq] = []
    categories: List[CategoryStat] = []
