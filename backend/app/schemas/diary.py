from pydantic import BaseModel
from typing import Optional, Any
from datetime import date, datetime


class DiaryCreate(BaseModel):
    date: date
    content: str


class DiaryUpdate(BaseModel):
    date: Optional[date] = None
    content: Optional[str] = None


class DiaryListItem(BaseModel):
    id: int
    date: date
    content: str
    task_a_result: Optional[Any] = None
    task_d_result: Optional[Any] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DiaryResponse(BaseModel):
    id: int
    user_id: int
    date: date
    content: str
    task_a_result: Optional[Any] = None
    task_d_result: Optional[Any] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
