from collections.abc import Generator

from fastapi import HTTPException, status
from sqlalchemy import URL, create_engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker
from sqlalchemy.pool import NullPool

from app.core.config import settings


class Base(DeclarativeBase):
    pass


def get_database_url() -> str | URL | None:
    if settings.database_url:
        return settings.database_url

    if not all([settings.db_user, settings.db_password, settings.db_host, settings.db_name]):
        return None

    return URL.create(
        "postgresql+psycopg2",
        username=settings.db_user,
        password=settings.db_password,
        host=settings.db_host,
        port=settings.db_port,
        database=settings.db_name,
        query={"sslmode": "require"},
    )


database_url = get_database_url()

engine = (
    create_engine(
        database_url,
        pool_pre_ping=True,
        poolclass=NullPool,
    )
    if database_url
    else None
)

SessionLocal = (
    sessionmaker(autocommit=False, autoflush=False, bind=engine)
    if engine is not None
    else None
)


def init_db() -> None:
    if engine is None:
        return

    from app import models  # noqa: F401

    Base.metadata.create_all(bind=engine)


def get_db() -> Generator[Session, None, None]:
    if SessionLocal is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Database connection is not configured in backend/.env",
        )

    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
