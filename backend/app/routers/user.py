from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.database import get_db
from app.dependencies import get_current_user_id
from app.models.user import User

router = APIRouter(prefix="/user", tags=["user"])


class ProfileResponse(BaseModel):
    user_id: int
    email: str
    nickname: Optional[str] = None
    gender: Optional[str] = None
    age_group: Optional[str] = None
    profile_image: Optional[str] = None

    class Config:
        from_attributes = True


class ProfileUpdate(BaseModel):
    nickname: Optional[str] = None
    gender: Optional[str] = None
    age_group: Optional[str] = None
    profile_image: Optional[str] = None


@router.get("/profile", response_model=ProfileResponse)
async def get_profile(
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    return user


@router.put("/profile", response_model=ProfileResponse)
async def update_profile(
    body: ProfileUpdate,
    user_id: int = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.user_id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")

    if body.nickname is not None:
        user.nickname = body.nickname
    if body.gender is not None:
        user.gender = body.gender
    if body.age_group is not None:
        user.age_group = body.age_group
    if body.profile_image is not None:
        user.profile_image = body.profile_image

    await db.flush()
    await db.refresh(user)
    return user
