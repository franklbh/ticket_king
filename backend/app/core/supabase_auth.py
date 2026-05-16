from dataclasses import dataclass
from functools import lru_cache
from typing import Any

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.config import settings


bearer_scheme = HTTPBearer(auto_error=False)


@dataclass(frozen=True)
class SupabaseUser:
    id: str
    email: str | None
    role: str
    claims: dict[str, Any]


def _get_jwks_url() -> str:
    if not settings.supabase_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase URL is not configured.",
        )

    return f"{settings.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json"


def _get_issuer() -> str:
    if not settings.supabase_url:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Supabase JWT issuer is not configured.",
        )

    return f"{settings.supabase_url.rstrip('/')}/auth/v1"


def verify_supabase_token(token: str) -> SupabaseUser:
    try:
        import jwt
        from jwt.exceptions import InvalidTokenError, PyJWKClientError
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT verification dependencies are not installed.",
        ) from exc

    try:
        signing_key = _jwks_client().get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "ES256"],
            audience="authenticated",
            issuer=_get_issuer(),
        )
    except (InvalidTokenError, PyJWKClientError):
        claims = verify_token_with_supabase(token)

    user_id = claims.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Access token is missing a subject.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    app_metadata = claims.get("app_metadata") or {}
    role = app_metadata.get("role") or claims.get("user_role") or "customer"

    return SupabaseUser(
        id=user_id,
        email=claims.get("email"),
        role=role,
        claims=claims,
    )


@lru_cache(maxsize=1)
def _jwks_client():
    try:
        from jwt import PyJWKClient
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="JWT verification dependencies are not installed.",
        ) from exc
    return PyJWKClient(_get_jwks_url())


def verify_token_with_supabase(token: str) -> dict[str, Any]:
    if not settings.supabase_url or not settings.supabase_publishable_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        import httpx
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="HTTP client dependency is not installed.",
        ) from exc

    try:
        response = httpx.get(
            f"{settings.supabase_url.rstrip('/')}/auth/v1/user",
            headers={
                "apikey": settings.supabase_publishable_key,
                "Authorization": f"Bearer {token}",
            },
            timeout=10,
        )
    except httpx.HTTPError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not verify Supabase access token.",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    if response.status_code != 200:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = response.json()
    app_metadata = user.get("app_metadata") or {}
    user_metadata = user.get("user_metadata") or {}
    return {
        "sub": user.get("id"),
        "email": user.get("email"),
        "app_metadata": app_metadata,
        "user_metadata": user_metadata,
        "user_role": app_metadata.get("role") or user_metadata.get("role"),
    }


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> SupabaseUser:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing bearer token.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return verify_supabase_token(credentials.credentials)


def require_roles(*allowed_roles: str):
    allowed = set(allowed_roles)

    def dependency(user: SupabaseUser = Depends(get_current_user)) -> SupabaseUser:
        if user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not have permission to access this resource.",
            )
        return user

    return dependency
