import hashlib
import secrets

import httpx
from fastapi import APIRouter, Depends, HTTPException, Response, Cookie
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from passlib.context import CryptContext
from jose import jwt, JWTError
from datetime import datetime, timedelta, timezone

from app.database import get_db
from app.models.user import User, RefreshToken
from app.schemas.user import RegisterRequest, LoginRequest, TokenResponse, UserResponse
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

_RECAPTCHA_VERIFY_URL = "https://www.google.com/recaptcha/api/siteverify"
_RECAPTCHA_THRESHOLD  = 0.5


async def _verify_recaptcha(token: str) -> None:
    """점수가 threshold 미만이거나 검증 실패 시 예외."""
    secret = settings.recaptcha_secret_key
    if not secret:
        return  # 키 미설정 시 검증 건너뜀 (로컬 개발)
    async with httpx.AsyncClient() as client:
        res = await client.post(
            _RECAPTCHA_VERIFY_URL,
            data={"secret": secret, "response": token},
        )
    result = res.json()
    if not result.get("success") or result.get("score", 0) < _RECAPTCHA_THRESHOLD:
        raise HTTPException(status_code=400, detail="reCAPTCHA 검증에 실패했습니다. 다시 시도해주세요.")

# ── 유틸 함수 ──────────────────────────────────────────────────
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def create_access_token(user_id: int) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode(
        {"sub": str(user_id), "exp": expire},
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm
    )

def create_refresh_token() -> str:
    return secrets.token_hex(32)

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

# ── 회원가입 ───────────────────────────────────────────────────
@router.post("/register", response_model=UserResponse, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    # 이메일 중복 확인
    result = await db.execute(select(User).where(User.email == body.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=409, detail="이미 사용 중인 이메일입니다.")

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        nickname=body.nickname,
        gender=body.gender,
        age_group=body.age_group,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)
    return user

# ── 로그인 ─────────────────────────────────────────────────────
@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, response: Response, db: AsyncSession = Depends(get_db)):
    if body.recaptcha_token:
        await _verify_recaptcha(body.recaptcha_token)

    # 사용자 조회
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()

    if not user or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="이메일 또는 비밀번호가 올바르지 않습니다.")

    # 토큰 발급
    access_token = create_access_token(user.user_id)
    refresh_token = create_refresh_token()

    # Refresh Token DB 저장
    rt = RefreshToken(
        user_id=user.user_id,
        token_hash=hash_token(refresh_token),
        expires_at=datetime.now(timezone.utc) + timedelta(days=settings.refresh_token_expire_days)
    )
    db.add(rt)

    # Refresh Token httpOnly 쿠키 설정
    cookie_params = dict(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=True,
        samesite="lax",
    )
    if body.auto_login:
        cookie_params["max_age"] = 60 * 60 * 24 * settings.refresh_token_expire_days
    response.set_cookie(**cookie_params)

    return TokenResponse(access_token=access_token)

# ── 토큰 갱신 ──────────────────────────────────────────────────
@router.post("/refresh", response_model=TokenResponse)
async def refresh(response: Response, refresh_token: str = Cookie(None), db: AsyncSession = Depends(get_db)):
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh Token이 없습니다.")

    token_hash = hash_token(refresh_token)
    result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
    rt = result.scalar_one_or_none()

    if not rt or rt.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="만료되었거나 유효하지 않은 토큰입니다.")

    # 새 Access Token 발급
    access_token = create_access_token(rt.user_id)
    return TokenResponse(access_token=access_token)

# ── 로그아웃 ───────────────────────────────────────────────────
@router.post("/logout")
async def logout(response: Response, refresh_token: str = Cookie(None), db: AsyncSession = Depends(get_db)):
    if refresh_token:
        token_hash = hash_token(refresh_token)
        result = await db.execute(select(RefreshToken).where(RefreshToken.token_hash == token_hash))
        rt = result.scalar_one_or_none()
        if rt:
            await db.delete(rt)

    response.delete_cookie("refresh_token")
    return {"message": "로그아웃 되었습니다."}