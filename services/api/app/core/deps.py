"""Shared FastAPI dependencies.

Import get_current_user / CurrentUser into any router that needs authentication.
"""

from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from jose import JWTError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import verify_token
from app.models.enums import UserStatus
from app.models.user import User


async def get_current_user(
    authorization: Annotated[str, Header()],
    db: AsyncSession = Depends(get_db),
) -> User:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid authorization header")
    token = authorization[7:]
    try:
        payload = verify_token(token)
    except JWTError as e:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token") from e
    if payload.get("type") != "access":
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid token type")
    user = await db.get(User, payload["sub"])
    if not user or user.status == UserStatus.DELETED:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found or deleted")
    return user


CurrentUser = Annotated[User, Depends(get_current_user)]
