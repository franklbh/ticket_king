from uuid import UUID

import httpx
from fastapi import HTTPException, status
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.core.config import settings
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


async def create_customer_account(*, email: str, name: str, password: str, db: Session) -> User:
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Backend signup is missing SUPABASE_SERVICE_ROLE_KEY. "
                "The customer role is assigned by the backend; this secret key is only used server-side to create a confirmed Supabase Auth user."
            ),
        )

    email = email.strip().lower()
    name = name.strip()
    if "@" not in email or "." not in email.rsplit("@", 1)[-1]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Enter a valid email address.")

    auth_user = await _get_or_create_confirmed_auth_user(email=email, name=name, password=password, db=db)
    user_id = UUID(str(auth_user["id"]))

    user = db.scalar(select(User).where(User.id == user_id))
    existing_email_user = db.scalar(select(User).where(User.email == email))
    if existing_email_user and existing_email_user.id != user_id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user profile already exists for this email with a different Auth user id.",
        )

    if user is None:
        user = User(id=user_id, email=email, name=name, role="customer")
        db.add(user)
    else:
        user.email = email
        user.name = name
        user.role = user.role or "customer"

    db.commit()
    db.refresh(user)
    return user


async def _get_or_create_confirmed_auth_user(*, email: str, name: str, password: str, db: Session) -> dict:
    existing = _find_auth_user_by_email(email, db)
    if existing:
        return existing

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            response = await client.post(
                f"{settings.supabase_url.rstrip('/')}/auth/v1/admin/users",
                headers={
                    "apikey": settings.supabase_service_role_key,
                    "Authorization": f"Bearer {settings.supabase_service_role_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "email": email,
                    "password": password,
                    "email_confirm": True,
                    "app_metadata": {"role": "customer"},
                    "user_metadata": {"name": name},
                },
            )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Could not create Supabase Auth user.",
        ) from exc

    if response.status_code in {200, 201}:
        data = response.json()
        user = data.get("user") if isinstance(data.get("user"), dict) else data
        if user.get("id"):
            return {"id": user["id"], "email": user.get("email") or email}

    detail = _supabase_error_detail(response)
    if response.status_code in {400, 409, 422} and any(word in detail.lower() for word in ("already", "registered", "exists")):
        existing = _find_auth_user_by_email(email, db)
        if existing:
            return existing

    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def _find_auth_user_by_email(email: str, db: Session) -> dict | None:
    row = db.execute(
        text("select id, email from auth.users where lower(email) = lower(:email) limit 1"),
        {"email": email},
    ).mappings().first()
    return dict(row) if row else None


def _supabase_error_detail(response: httpx.Response) -> str:
    try:
        data = response.json()
    except ValueError:
        return response.text or "Supabase Auth user creation failed."
    return (
        data.get("msg")
        or data.get("message")
        or data.get("error_description")
        or data.get("error")
        or "Supabase Auth user creation failed."
    )


def get_display_name(auth_user: SupabaseUser) -> str:
    metadata = auth_user.claims.get("user_metadata") or {}
    if metadata.get("name"):
        return metadata["name"]
    return auth_user.email.split("@", 1)[0] if auth_user.email else "Customer"
