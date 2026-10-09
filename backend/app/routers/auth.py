from fastapi import APIRouter, Depends, Request, Response
from sqlalchemy.orm import Session as DbSession

from app.core.config import settings
from app.core.database import get_db
from app.core.security import SESSION_COOKIE, get_current_user
from app.models import User
from app.schemas.auth import LoginRequest, MessageOut, UserOut
from app.services import auth_service

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=UserOut)
def login(body: LoginRequest, response: Response, db: DbSession = Depends(get_db)) -> User:
    user = auth_service.authenticate(db, body.email, body.password)
    token = auth_service.create_session(db, user)
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=settings.SESSION_TTL_HOURS * 3600,
        httponly=True,
        samesite="lax",
        secure=settings.COOKIE_SECURE,
        path="/",
    )
    return user


@router.post("/logout", response_model=MessageOut)
def logout(request: Request, response: Response, db: DbSession = Depends(get_db)) -> dict[str, str]:
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        auth_service.delete_session(db, token)
    response.delete_cookie(SESSION_COOKIE, path="/", secure=settings.COOKIE_SECURE, httponly=True, samesite="lax")
    return {"message": "Logged out"}


@router.get("/me", response_model=UserOut)
def me(user: User = Depends(get_current_user)) -> User:
    return user
