from fastapi import FastAPI, APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import io
import csv

from contextlib import asynccontextmanager

from rule_engine import translate_rule_text
from classificador_co2 import classificar_co2


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# Configure logging early
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Módulo-level handles — atribuídos no startup, None antes disso
client = None
db = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global client, db
    mongo_url = os.environ.get('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.environ.get('DB_NAME', 'urbanflow')
    try:
        client = AsyncIOMotorClient(mongo_url, serverSelectionTimeoutMS=3000)
        await client.admin.command('ping')
        db = client[db_name]
        logger.info("MongoDB ligado: %s / %s", mongo_url, db_name)
    except Exception:
        logger.warning("MongoDB indisponível — endpoints de persistência desativados.")
        client = None
        db = None
    yield
    if client is not None:
        client.close()
        logger.info("MongoDB desligado.")

# Create the main app without a prefix
app = FastAPI(lifespan=lifespan)

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")  # Ignore MongoDB's _id field
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str


class RuleTranslateRequest(BaseModel):
    text: str = Field(min_length=1)


class RuleTranslateResponse(BaseModel):
    ok: bool
    rule: Optional[dict] = None
    error: Optional[str] = None


class MetricSnapshot(BaseModel):
    scenario: str
    mode: str
    grid_size: int
    duration: float
    avg_wait_time: float
    flow_rate: float
    co2_emissions: float
    emergency_response_time: float
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MetricsSaveRequest(BaseModel):
    scenario: str
    mode: str
    grid_size: int
    duration: float
    avg_wait_time: float
    flow_rate: float
    co2_emissions: float
    emergency_response_time: float
    timestamp: Optional[datetime] = None


class MetricsExportRequest(BaseModel):
    snapshots: List[MetricSnapshot]


class Campaign(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    campaign_id: str
    scenario: str
    mode: str
    repetitions: int
    grid_size: int
    duration: float
    seed: Optional[int] = None
    pairs: Optional[List[dict]] = None  # For paired analysis
    results_summary: Optional[dict] = None  # Aggregated results
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class CampaignSaveRequest(BaseModel):
    campaign_id: str
    scenario: str
    mode: str
    repetitions: int
    grid_size: int
    duration: float
    seed: Optional[int] = None
    pairs: Optional[List[dict]] = None
    results_summary: Optional[dict] = None


class Co2ClassifyRequest(BaseModel):
    valor: float


class Co2ClassifyResponse(BaseModel):
    valor: float
    classificacao: str


# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "Hello World"}


@api_router.get("/health")
async def health_check():
    """Health check endpoint para Render/Vercel deployment."""
    db_status = "connected" if db is not None else "unavailable"
    return {
        "status": "ok",
        "service": "UrbanFlow AI - Backend API",
        "database": db_status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }


def _require_db():
    if db is None:
        raise HTTPException(status_code=503, detail="Base de dados indisponível.")


@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(input: StatusCheckCreate):
    _require_db()
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks():
    _require_db()
    status_checks = await db.status_checks.find({}, {"_id": 0}).to_list(1000)
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    return status_checks


@api_router.post("/rules/translate", response_model=RuleTranslateResponse)
async def rules_translate(payload: RuleTranslateRequest):
    try:
        rule = translate_rule_text(payload.text)
        return RuleTranslateResponse(ok=True, rule=rule)
    except Exception as exc:
        logger.exception("Erro ao traduzir regra")
        return RuleTranslateResponse(ok=False, error=str(exc))


@api_router.post("/metrics/save")
async def metrics_save(payload: MetricsSaveRequest):
    _require_db()
    document = payload.model_dump()
    document["id"] = str(uuid.uuid4())
    if not document.get("timestamp"):
        document["timestamp"] = datetime.now(timezone.utc).isoformat()
    elif isinstance(document["timestamp"], datetime):
        document["timestamp"] = document["timestamp"].isoformat()
    await db.metrics_snapshots.insert_one(document)
    return {"ok": True, "id": document["id"]}


@api_router.post("/metrics/export")
async def metrics_export(payload: MetricsExportRequest):
    
    async def csv_generator():
        output = io.StringIO()
        fieldnames = [
            "timestamp", "scenario", "mode", "grid_size",
            "duration", "avg_wait_time", "flow_rate",
            "co2_emissions", "emergency_response_time",
        ]
        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()
        yield output.getvalue().encode("utf-8")
        output.seek(0)
        output.truncate()

        for snapshot in payload.snapshots:
            row = snapshot.model_dump()
            if isinstance(row.get("timestamp"), datetime):
                row["timestamp"] = row["timestamp"].isoformat()
            writer.writerow(row)
            yield output.getvalue().encode("utf-8")
            output.seek(0)
            output.truncate()

    headers = {
        "Content-Disposition": 'attachment; filename="urbanflow_metricas.csv"'
    }
    return StreamingResponse(csv_generator(), media_type="text/csv", headers=headers)


@api_router.post("/campaigns/save", response_model=Campaign)
async def campaigns_save(payload: CampaignSaveRequest):
    _require_db()
    campaign_dict = payload.model_dump()
    campaign_obj = Campaign(**campaign_dict)
    doc = campaign_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    await db.campaigns.insert_one(doc)
    return campaign_obj


@api_router.get("/campaigns", response_model=List[Campaign])
async def get_campaigns(limit: int = 100):
    _require_db()
    campaigns = await db.campaigns.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    for campaign in campaigns:
        if isinstance(campaign.get('timestamp'), str):
            campaign['timestamp'] = datetime.fromisoformat(campaign['timestamp'])
    return campaigns


@api_router.post("/co2/classify", response_model=Co2ClassifyResponse)
async def co2_classify(payload: Co2ClassifyRequest):
    classificacao = classificar_co2(payload.valor)
    return Co2ClassifyResponse(valor=payload.valor, classificacao=classificacao)


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Logger is already configured at the top

# Shutdown logic handled in lifespan
