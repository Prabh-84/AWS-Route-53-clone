from fastapi import Depends, Request
from sqlalchemy.orm import Session as DbSession

from app.core.database import get_db
from app.core.errors import AppError
from app.models import User
from app.services import auth_service

SESSION_COOKIE = "session"


def get_current_user(request: Request, db: DbSession = Depends(get_db)) -> User:
    token = request.cookies.get(SESSION_COOKIE)
    user = auth_service.get_user_by_session(db, token) if token else None
    if user is None:
        raise AppError("NotAuthenticated", "You must be signed in to perform this action.", 401)
    return user
