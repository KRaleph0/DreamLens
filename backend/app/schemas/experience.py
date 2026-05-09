from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


class ExperienceCreate(BaseModel):
    title: str
    time_value: Optional[str] = None
    time_text: Optional[str] = None
    content: str


class ExperienceUpdate(BaseModel):
    title: Optional[str] = None
    time_value: Optional[str] = None
    time_text: Optional[str] = None
    content: Optional[str] = None


class ExperienceResponse(BaseModel):
    id: int
    user_id: int
    title: str
    time_value: Optional[str] = None
    time_text: Optional[str] = None
    content: str
    status: str
    summary: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CompressRequest(BaseModel):
    target_tokens: int = Field(..., ge=50, le=400)


class CompressResponse(BaseModel):
    summary: str
    token_count: int
    char_count: int
