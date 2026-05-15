from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.supabase_auth import SupabaseUser
from app.models import User


def ensure_user(auth_user: SupabaseUser, db: Session) -> User:
    if not auth_user.email:
        raise ValueError("Authenticated user is missing an email address.")

    user_id = UUID(auth_user.id)
    user = db.scalar(select(User).where(User.id == user_id))
    name = get_display_name(auth_user)

    if user is None:
        user = User(id=user_id, email=auth_user.email, name=name)
        db.add(user)
    else:
        user.email = auth_user.email
        user.name = name

    db.commit()
    db.refresh(user)
    return user


def get_display_name(auth_user: SupabaseUser) -> str:
    metadata = auth_user.claims.get("user_metadata") or {}
    if metadata.get("name"):
        return metadata["name"]
    return auth_user.email.split("@", 1)[0] if auth_user.email else "Customer"
