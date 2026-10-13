from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import re
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

EMERGENT_LLM_KEY = os.environ.get('EMERGENT_LLM_KEY', '')

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ===================== Health =====================
@api_router.get("/")
async def root():
    return {"message": "CareSync Pro API", "status": "ok"}


# ===================== OCR Models =====================
class OcrReceiptRequest(BaseModel):
    image_base64: str  # data URI OR raw base64
    mime_type: Optional[str] = "image/jpeg"


class OcrReceiptResponse(BaseModel):
    date: Optional[str] = None  # YYYY-MM-DD
    merchant: Optional[str] = None
    amount: Optional[float] = None
    category: Optional[str] = None  # alimentation | entretien | animation | divers | None (a confirmer)
    payment_method: Optional[str] = None  # especes | carte | None (a verifier)
    raw: Optional[str] = None




def _clean_b64(payload: str) -> str:
    if "," in payload and payload.strip().startswith("data:"):
        return payload.split(",", 1)[1]
    return payload


async def _run_vision(prompt: str, image_b64: str) -> str:
    """Run gpt-5.6-terra vision on the given image, return raw text."""
    from emergentintegrations.llm.chat import LlmChat, UserMessage, ImageContent

    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY not configured")

    chat = LlmChat(
        api_key=EMERGENT_LLM_KEY,
        session_id=f"ocr-{datetime.utcnow().timestamp()}",
        system_message=(
            "Tu es un assistant OCR specialise. Tu reponds UNIQUEMENT avec un objet JSON valide, "
            "sans texte autour, sans balises de code."
        ),
    ).with_model("openai", "gpt-5.6-terra")

    msg = UserMessage(
        text=prompt,
        file_contents=[ImageContent(image_base64=image_b64)],
    )
    response = await chat.send_message(msg)
    return response if isinstance(response, str) else str(response)


def _parse_json(text: str) -> dict:
    """Extract JSON object from LLM text (robust to code fences)."""
    if not text:
        return {}
    # Try direct
    try:
        return json.loads(text)
    except Exception:
        pass
    # Extract first { ... }
    m = re.search(r"\{[\s\S]*\}", text)
    if m:
        try:
            return json.loads(m.group(0))
        except Exception:
            return {}
    return {}


ALLOWED_CATEGORIES = {"alimentation", "entretien", "animation", "divers"}
ALLOWED_PAYMENTS = {"especes", "carte"}


@api_router.post("/ocr/receipt", response_model=OcrReceiptResponse)
async def ocr_receipt(req: OcrReceiptRequest):
    img = _clean_b64(req.image_base64)
    prompt = (
        "Analyse ce ticket de caisse. Extrait et retourne UNIQUEMENT un JSON valide avec les cles: "
        "date (format YYYY-MM-DD, utilise la date d'achat si visible sinon null), "
        "merchant (nom du magasin/enseigne, string ou null), "
        "amount (montant TOTAL en euros, number sans symbole, ex 12.45), "
        "category: le MOTIF PRINCIPAL du ticket (pas article par article), parmi: "
        "alimentation (courses principalement alimentaires, meme avec quelques produits d'entretien), "
        "entretien (achat principalement destine a l'entretien de la maison), "
        "animation (sortie, activite, loisir, billetterie), "
        "divers (le reste). "
        "Si le motif principal n'est pas determinable de facon fiable, mets category a null. "
        "payment_method: 'especes' si le ticket indique clairement un paiement en especes (ESPECES, ESP, CASH, rendu monnaie), "
        "'carte' s'il indique clairement une carte bancaire (CB, CARTE, VISA, MASTERCARD, sans contact, ticket carte), "
        "sinon null. Ne devine pas. "
        "Si une info n'est pas lisible, mets null. Ne mets AUCUN texte avant ou apres le JSON."
    )
    try:
        text = await _run_vision(prompt, img)
    except HTTPException:
        raise
    except Exception as e:
        logging.exception("OCR receipt failed")
        raise HTTPException(status_code=500, detail=f"OCR failed: {e}")

    data = _parse_json(text)
    try:
        amount = float(str(data.get("amount")).replace(",", ".")) if data.get("amount") is not None else None
    except ValueError:
        amount = None
    return OcrReceiptResponse(
        date=data.get("date"),
        merchant=data.get("merchant"),
        amount=amount,
        category=data.get("category") if data.get("category") in ALLOWED_CATEGORIES else None,
        payment_method=data.get("payment_method") if data.get("payment_method") in ALLOWED_PAYMENTS else None,
        raw=text,
    )




app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
