import asyncio
import base64
import json
import urllib.parse
import uuid
from datetime import datetime, timezone
from pathlib import Path

import httpx
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import padding
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

from app.core.config import settings

router = APIRouter(prefix="/alphapay", tags=["alphapay"])

ALPHAPAY_BASE_URL = "https://openapi.alphapay.ca"

# paymentRequestId -> asyncio.Queue, kept in memory while the SSE stream is open
_pending: dict[str, asyncio.Queue] = {}


def _load_private_key():
    if settings.alphapay_private_key_path:
        pem = Path(settings.alphapay_private_key_path).read_text()
    elif settings.alphapay_private_key_pem:
        pem = settings.alphapay_private_key_pem.replace("\\n", "\n")
    else:
        raise RuntimeError("No Alphapay private key configured")
    return serialization.load_pem_private_key(pem.encode(), password=None)


def _build_headers(method: str, uri: str, body_str: str) -> dict[str, str]:
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
    nonce = uuid.uuid4().hex  # 32 hex chars
    content = f"{method} {uri}\n{settings.alphapay_partner_code}.{timestamp}.{nonce}.{body_str}"
    private_key = _load_private_key()
    sig_bytes = private_key.sign(content.encode(), padding.PKCS1v15(), hashes.SHA256())
    signature = urllib.parse.quote(base64.b64encode(sig_bytes).decode())
    return {
        "Content-Type": "application/json",
        "Merchant-Code": settings.alphapay_partner_code,
        "Request-Time": timestamp,
        "Nonce": nonce,
        "Signature": f"algorithm=RS256, keyVersion=1, signature={signature}",
    }


class QrRequest(BaseModel):
    method: str  # "alipay" | "wechat"
    amount: int  # total in CAD cents
    payment_request_id: str
    description: str = "Terracotta Warriors VR"


@router.post("/qr")
async def create_qr(req: QrRequest):
    uri = "/api/v2.0/payments/pay"
    body = {
        "scenarioCode": "ONLINE_QRCODE",
        "paymentRequestId": req.payment_request_id,
        "order": {
            "orderAmount": {"value": str(req.amount), "currency": "CAD"},
            "description": req.description,
            "notifyUrl": f"{settings.webhook_base_url}/api/v1/alphapay/webhook",
        },
        "paymentMethod": {
            "paymentMethodType": "Wechat" if req.method == "wechat" else "Alipay"
        },
    }
    body_str = json.dumps(body, separators=(",", ":"))
    headers = _build_headers("POST", uri, body_str)

    async with httpx.AsyncClient() as client:
        resp = await client.post(f"{ALPHAPAY_BASE_URL}{uri}", headers=headers, content=body_str)

    data = resp.json()
    if not data.get("paymentInfo", {}).get("paymentQRImage"):
        msg = data.get("result", {}).get("resultMessage", "Failed to create QR")
        raise HTTPException(status_code=400, detail=msg)

    return {
        "qrImage": data["paymentInfo"]["paymentQRImage"],
        "paymentRequestId": req.payment_request_id,
    }


@router.get("/events/{payment_request_id}")
async def payment_events(payment_request_id: str):
    queue: asyncio.Queue = asyncio.Queue()
    _pending[payment_request_id] = queue

    async def generate():
        try:
            data = await asyncio.wait_for(queue.get(), timeout=300)
            yield f"data: {json.dumps(data)}\n\n"
        except asyncio.TimeoutError:
            yield 'data: {"timeout": true}\n\n'
        finally:
            _pending.pop(payment_request_id, None)

    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "Connection": "keep-alive"},
    )


@router.post("/webhook")
async def alphapay_webhook(request: Request):
    body = await request.json()
    payment_request_id = body.get("paymentRequestId")
    queue = _pending.get(payment_request_id)
    if queue:
        await queue.put({"paid": True})
    return {"result": {"resultCode": "SUCCESS", "resultStatus": "S", "resultMessage": "success"}}
