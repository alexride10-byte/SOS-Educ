"""Backend API tests for CareSync Pro - health, OCR receipt, OCR odometer."""
import base64
import io
import os
import pytest
import requests
from PIL import Image, ImageDraw, ImageFont

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://admin-companion-5.preview.emergentagent.com").rstrip("/")


def _make_receipt_image_b64() -> str:
    """Create a realistic receipt image with text (merchant, date, items, total)."""
    img = Image.new("RGB", (400, 600), "white")
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 20)
        font_s = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 16)
    except Exception:
        font = ImageFont.load_default()
        font_s = ImageFont.load_default()
    d.text((80, 20), "CARREFOUR MARKET", fill="black", font=font)
    d.text((100, 60), "12 Rue de Paris", fill="black", font=font_s)
    d.text((100, 90), "75001 Paris", fill="black", font=font_s)
    d.text((40, 140), "Date: 15/01/2026   14:32", fill="black", font=font_s)
    d.line((20, 180, 380, 180), fill="black", width=2)
    d.text((40, 200), "Pain complet          2,50", fill="black", font=font_s)
    d.text((40, 230), "Lait 1L               1,20", fill="black", font=font_s)
    d.text((40, 260), "Pommes 1kg            3,80", fill="black", font=font_s)
    d.text((40, 290), "Yaourts x4            2,99", fill="black", font=font_s)
    d.line((20, 330, 380, 330), fill="black", width=2)
    d.text((40, 350), "TOTAL EUR         10,49", fill="black", font=font)
    d.text((40, 400), "CB **** 1234", fill="black", font=font_s)
    d.text((40, 430), "Merci de votre visite", fill="black", font=font_s)
    # add some texture
    for i in range(0, 400, 40):
        d.line((i, 580, i + 20, 580), fill="gray", width=1)
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.b64encode(buf.getvalue()).decode()


def _make_odometer_image_b64() -> str:
    """Create an odometer-like image with large digits on dark bg."""
    img = Image.new("RGB", (500, 220), (20, 20, 20))
    d = ImageDraw.Draw(img)
    try:
        font_big = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 90)
        font_s = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 20)
    except Exception:
        font_big = ImageFont.load_default()
        font_s = ImageFont.load_default()
    # rounded panel
    d.rectangle((40, 50, 460, 170), fill=(0, 0, 0), outline=(80, 80, 80), width=3)
    d.text((70, 55), "123456", fill=(255, 180, 0), font=font_big)
    d.text((380, 140), "km", fill=(255, 180, 0), font=font_s)
    d.text((60, 15), "ODO", fill=(200, 200, 200), font=font_s)
    # add small marks for texture
    for i in range(0, 500, 20):
        d.line((i, 200, i + 5, 200), fill=(60, 60, 60), width=1)
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
        timeout=90,
    )
    assert r.status_code == 200, f"status={r.status_code} body={r.text[:500]}"
    data = r.json()
    # schema keys present
    for k in ("date", "merchant", "amount", "category", "raw"):
        assert k in data, f"missing key {k}"
    # raw should not be empty (LLM responded)
    assert data["raw"] and len(data["raw"]) > 0
    # types
    assert data["amount"] is None or isinstance(data["amount"], (int, float))
    # category must be one of the allowed values or null
    allowed = {"alimentation", "vetements", "transport", "loisirs", "sante", "divers", "autre", None}
    assert data["category"] in allowed


def test_ocr_receipt_handles_data_uri(api):
    b64 = _make_receipt_image_b64()
    data_uri = f"data:image/jpeg;base64,{b64}"
    r = api.post(
        f"{BASE_URL}/api/ocr/receipt",
        json={"image_base64": data_uri},
        timeout=90,
    )
    assert r.status_code == 200, r.text[:500]


# ===== OCR Odometer =====
def test_ocr_odometer_returns_json(api):
    b64 = _make_odometer_image_b64()
    r = api.post(
        f"{BASE_URL}/api/ocr/odometer",
        json={"image_base64": b64, "mime_type": "image/jpeg"},
        timeout=90,
    )
    assert r.status_code == 200, f"status={r.status_code} body={r.text[:500]}"
    data = r.json()
    assert "kilometers" in data
    assert "raw" in data
    assert data["kilometers"] is None or isinstance(data["kilometers"], int)
    assert data["raw"] and len(data["raw"]) > 0
