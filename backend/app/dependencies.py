from fastapi import Depends, HTTPException
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.config import settings
from app.database import get_db

bearer_scheme = HTTPBearer()


async def get_current_user_id(
    creds: HTTPAuthorizationCredentials = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> int:
    try:
        payload = jwt.decode(
            creds.credentials,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
        user_id = int(payload["sub"])
    except (JWTError, KeyError, TypeError, ValueError):
        raise HTTPException(status_code=401, detail="유효하지 않은 토큰입니다.")

    from app.models.user import User
    result = await db.execute(select(User.user_id).where(User.user_id == user_id))
    if result.scalar_one_or_none() is None:
        raise HTTPException(status_code=401, detail="존재하지 않는 계정입니다. 다시 로그인해주세요.")
    return user_id
