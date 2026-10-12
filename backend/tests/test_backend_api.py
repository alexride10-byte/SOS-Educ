"""Backend API tests for CareSync Pro v2 (2 modules: Compta + Agenda).

Scope:
  - Health
  - /api/ocr/receipt returns category in {alimentation,entretien,animation,divers} or null
  - /api/ocr/receipt accepts data: URI
  - /api/ocr/odometer MUST be removed (expect 404)
"""
import base64
import io
import os
import pytest
import requests
from PIL import Image, ImageDraw, ImageFont

BASE_URL = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")

ALLOWED_CATS = {"alimentation", "entretien", "animation", "divers", None}


def _make_receipt_image_b64() -> str:
    """Realistic grocery receipt (should be classified alimentation)."""
    img = Image.new("RGB", (420, 620), "white")
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)
        font_s = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
    except Exception:
        font = ImageFont.load_default()
        font_s = ImageFont.load_default()
    d.text((60, 20), "CARREFOUR MARKET", fill="black", font=font)
    d.text((100, 60), "12 Rue de Paris", fill="black", font=font_s)
    d.text((100, 85), "75001 Paris", fill="black", font=font_s)
    d.text((40, 140), "Date: 15/01/2026   14:32", fill="black", font=font_s)
    d.line((20, 180, 400, 180), fill="black", width=2)
    d.text((40, 200), "Pain complet          2,50", fill="black", font=font_s)
    d.text((40, 230), "Lait 1L               1,20", fill="black", font=font_s)
    d.text((40, 260), "Pommes 1kg            3,80", fill="black", font=font_s)
    d.text((40, 290), "Yaourts x4            2,99", fill="black", font=font_s)
    d.line((20, 330, 400, 330), fill="black", width=2)
    d.text((40, 360), "TOTAL EUR         10,49", fill="black", font=font)
    d.text((40, 410), "CB **** 1234", fill="black", font=font_s)
    d.text((40, 440), "Merci de votre visite", fill="black", font=font_s)
    for i in range(0, 420, 40):
        d.line((i, 590, i + 20, 590), fill="gray", width=1)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode()


@pytest.fixture(scope="module")
def api():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ===== Health =====
def test_health_root(api):
    r = api.get(f"{BASE_URL}/api/", timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data.get("status") == "ok"
    assert "message" in data


# ===== OCR Receipt =====
def test_ocr_receipt_returns_structured_json(api):
    b64 = _make_receipt_image_b64()
    r = api.post(
        f"{BASE_URL}/api/ocr/receipt",
        json={"image_base64": b64, "mime_type": "image/jpeg"},
        timeout=120,
    )
    assert r.status_code == 200, f"status={r.status_code} body={r.text[:500]}"
    data = r.json()
    for k in ("date", "merchant", "amount", "category", "raw"):
        assert k in data, f"missing key {k}"
    assert data["raw"] and len(data["raw"]) > 0
    assert data["amount"] is None or isinstance(data["amount"], (int, float))
    # category MUST be restricted to v2 allowed set (or null)
    assert data["category"] in ALLOWED_CATS, f"disallowed category: {data['category']}"


def test_ocr_receipt_handles_data_uri(api):
    b64 = _make_receipt_image_b64()
    data_uri = f"data:image/jpeg;base64,{b64}"
    r = api.post(
        f"{BASE_URL}/api/ocr/receipt",
        json={"image_base64": data_uri},
        timeout=120,
    )
    assert r.status_code == 200, r.text[:500]
    data = r.json()
    assert data["category"] in ALLOWED_CATS


# ===== OCR Odometer MUST be removed =====
def test_ocr_odometer_removed(api):
    r = api.post(
        f"{BASE_URL}/api/ocr/odometer",
        json={"image_base64": "AAAA", "mime_type": "image/jpeg"},
        timeout=15,
    )
    assert r.status_code == 404, f"expected 404 (endpoint removed), got {r.status_code} body={r.text[:200]}"
