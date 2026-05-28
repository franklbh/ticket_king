from __future__ import annotations

import asyncio
import io
import logging
import smtplib
from email.mime.image import MIMEImage
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

from app.core.config import settings

logger = logging.getLogger(__name__)


def _qr_png_bytes(payload: str) -> bytes:
    import qrcode

    img = qrcode.make(payload)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return buf.getvalue()


def _build_html(name: str, order_number: str, tickets: list[dict[str, Any]]) -> str:
    ticket_cards = ""
    for i, t in enumerate(tickets):
        qr_payload = t.get("verification_code") or t.get("qr_payload") or ""
        qr_img = (
            f'<img src="cid:qr_{i}" width="200" height="200" alt="QR Code" style="display:block;margin:0 auto">'
            if qr_payload
            else ""
        )
        ticket_cards += f"""
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin:16px 0;text-align:center">
          <p style="font-weight:bold;margin:0 0 4px">{t.get("ticket_type", "Ticket")}</p>
          <p style="font-size:12px;color:#6b7280;margin:0 0 12px">{t.get("ticket_number", "")}</p>
          {qr_img}
          <p style="font-size:12px;color:#6b7280;margin:12px 0 0">Verification: <strong>{t.get("verification_code", "")}</strong></p>
        </div>"""

    return f"""<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1a1a1a">
  <h1 style="color:#2563eb;margin-bottom:4px">Booking Confirmed &#10003;</h1>
  <p>Hi {name or "there"},</p>
  <p>Your booking is confirmed. Order number: <strong>{order_number}</strong></p>
  <hr style="border:none;border-top:1px solid #e5e7eb">
  {ticket_cards}
  <hr style="border:none;border-top:1px solid #e5e7eb">
  <p style="font-size:13px;color:#6b7280">Show the QR code at entry. Keep this email for your records.</p>
</body>
</html>"""


def _smtp_send(msg: MIMEMultipart) -> None:
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port) as server:
        server.starttls()
        server.login(settings.smtp_user, settings.smtp_password)  # type: ignore[arg-type]
        server.send_message(msg)


async def send_booking_confirmation(
    to_email: str,
    to_name: str,
    order_number: str,
    tickets: list[dict[str, Any]],
) -> bool:
    if not settings.smtp_user or not settings.smtp_password:
        logger.warning("SMTP not configured — skipping booking confirmation email")
        return False
    if not to_email:
        logger.warning("No recipient email for order %s — skipping", order_number)
        return False

    from_addr = settings.smtp_from_email or settings.smtp_user

    # multipart/related lets HTML reference attached images via cid:
    related = MIMEMultipart("related")
    related.attach(MIMEText(_build_html(to_name, order_number, tickets), "html"))

    for i, t in enumerate(tickets):
        qr_payload = t.get("verification_code") or t.get("qr_payload") or ""
        if not qr_payload:
            continue
        png = _qr_png_bytes(qr_payload)
        img_part = MIMEImage(png, _subtype="png")
        img_part.add_header("Content-ID", f"<qr_{i}>")
        img_part.add_header("Content-Disposition", "inline")
        related.attach(img_part)

    outer = MIMEMultipart("mixed")
    outer["Subject"] = f"Booking Confirmed — {order_number}"
    outer["From"] = f"{settings.smtp_from_name} <{from_addr}>"
    outer["To"] = to_email
    outer.attach(related)

    try:
        await asyncio.to_thread(_smtp_send, outer)
        logger.info("Confirmation email sent to %s for order %s", to_email, order_number)
        return True
    except Exception:
        logger.exception("Failed to send confirmation email for order %s", order_number)
        return False
