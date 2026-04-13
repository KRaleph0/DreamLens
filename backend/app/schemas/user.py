from pydantic import BaseModel, EmailStr
from typing import Optional

# ── 회원가입 ──────────────────────────────────────
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    nickname: str
    gender: Optional[str] = None
    age_group: Optional[str] = None

# ── 로그인 ────────────────────────────────────────
class LoginRequest(BaseModel):
    email: EmailStr
    password: str

# ── 응답 ──────────────────────────────────────────
class UserResponse(BaseModel):
    user_id: int
    email: str
    nickname: Optional[str]
    gender: Optional[str]
    age_group: Optional[str]

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"