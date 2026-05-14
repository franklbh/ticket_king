from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.database import get_db


router = APIRouter(tags=["database"])


@router.get("/test-db")
def test_db(db: Session = Depends(get_db)) -> dict[str, str]:
    now = db.execute(text("SELECT NOW()")).scalar_one()

    if isinstance(now, datetime):
        now_value = now.isoformat()
    else:
        now_value = str(now)

    return {"status": "connected", "database_time": now_value}
