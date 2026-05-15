from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.supabase_auth import SupabaseUser, get_current_user
from app.core.database import get_db
from app.models import User
from app.schemas import UserRead
from app.services.users import ensure_user


router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=UserRead)
def get_me(
    auth_user: SupabaseUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    return get_or_create_user(auth_user, db)


@router.post("/user", response_model=UserRead)
def sync_user(
    auth_user: SupabaseUser = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> User:
    return get_or_create_user(auth_user, db)


def get_or_create_user(auth_user: SupabaseUser, db: Session) -> User:
    try:
        return ensure_user(auth_user, db)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
