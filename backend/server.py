from fastapi import FastAPI, APIRouter, HTTPException, Query
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
# from motor.motor_asyncio import AsyncIOMotorClient
from mongomock_motor import AsyncMongoMockClient
import os
import logging
import json
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import random
# from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
# load_dotenv(ROOT_DIR / '.env')

# mongo_url = os.environ['MONGO_URL']
client = AsyncMongoMockClient()
db = client['ghostclear_mock_db']

app = FastAPI()
api_router = APIRouter(prefix="/api")

EMERGENT_KEY = ''

# ==================== EXISTING MODELS ====================
class Container(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    container_id: str
    position_x: int
    position_y: int
    stack_level: int
    dwell_days: int
    status: str
    shipping_line: str
    arrival_date: str
    size: str

class IngestionPipeline(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    source_name: str
    source_type: str
    status: str
    last_sync: str
    records_ingested: int
    sync_interval_min: int

class Anomaly(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    container_id: str
    risk_score: float
    anomaly_type: str
    detected_at: str
    dwell_days: int
    expected_max_days: int
    shipping_line: str
    position_x: int
    position_y: int

class OwnershipNode(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    node_id: str
    node_type: str
    label: str
    x: float
    y: float
    confidence_score: Optional[float] = None
    details: Optional[dict] = None

class OwnershipEdge(BaseModel):
    model_config = ConfigDict(extra="ignore")
    source: str
    target: str
    relationship: str

# ==================== NEW TRACKING MODELS ====================
class Shipper(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    company: str
    email: str
    phone: str
    country: str

class TrackingContainer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    container_id: str
    shipper_id: str
    shipper_name: str
    origin_port: str
    origin_country: str
    destination_warehouse: str
    destination_country: str
    status: str  # at_port, in_transit, customs_hold, delivered
    eta: str
    departure_date: str
    port_arrival_date: Optional[str] = None
    customs_clearance_date: Optional[str] = None
    delivery_date: Optional[str] = None
    size: str
    weight_tons: float
    cargo_type: str

class ShipmentHistoryEntry(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    shipment_id: str
    shipper_id: str
    container_id: str
    date: str
    origin: str
    destination: str
    status: str  # delivered, delayed, customs_hold, dispute
    delay_days: int
    cargo_type: str

# ==================== SEED DATA ====================
SHIPPING_LINES = ["Maersk", "MSC", "CMA CGM", "COSCO", "Hapag-Lloyd", "Evergreen", "ONE", "Yang Ming"]
OFFICER_NAMES = ["Lt. Chen", "Cpt. Rodriguez", "Off. Patel", "Insp. Nakamura", "Sgt. Williams"]
PORTS = ["Shanghai", "Singapore", "Rotterdam", "Busan", "Hong Kong", "Shenzhen", "Ningbo", "Guangzhou", "Qingdao", "Dubai"]
COUNTRIES = {"Shanghai": "China", "Singapore": "Singapore", "Rotterdam": "Netherlands", "Busan": "South Korea", "Hong Kong": "China", "Shenzhen": "China", "Ningbo": "China", "Guangzhou": "China", "Qingdao": "China", "Dubai": "UAE"}
WAREHOUSES = ["Alpha Logistics Hub", "Central Distribution", "Pacific Storage", "Global Trade Center", "Metro Warehouse", "Harbor Point"]
DEST_COUNTRIES = ["USA", "UK", "Germany", "Japan", "Australia", "Canada"]
CARGO_TYPES = ["Electronics", "Textiles", "Machinery", "Auto Parts", "Chemicals", "Food Products", "Raw Materials", "Consumer Goods"]
COMPANIES = [
    {"name": "James Chen", "company": "TransOcean Logistics Ltd.", "email": "j.chen@transocean.sg", "phone": "+65-9123-4567", "country": "Singapore"},
    {"name": "Maria Santos", "company": "Pacific Freight Co.", "email": "m.santos@pacfreight.hk", "phone": "+852-6789-0123", "country": "Hong Kong"},
    {"name": "Erik Johansen", "company": "NordShip GmbH", "email": "e.johansen@nordship.de", "phone": "+49-40-555-1234", "country": "Germany"},
    {"name": "Yuki Tanaka", "company": "Sakura Maritime Inc.", "email": "y.tanaka@sakura-m.jp", "phone": "+81-3-5555-6789", "country": "Japan"},
    {"name": "Ahmed Al-Rashid", "company": "Gulf Cargo Solutions", "email": "a.rashid@gulfcargo.ae", "phone": "+971-4-555-8901", "country": "UAE"},
    {"name": "Sarah Williams", "company": "Atlantic Trade Corp.", "email": "s.williams@atlantictrade.us", "phone": "+1-212-555-3456", "country": "USA"},
    {"name": "Li Wei", "company": "Dragon Shipping Co.", "email": "l.wei@dragonship.cn", "phone": "+86-21-5555-7890", "country": "China"},
    {"name": "Priya Sharma", "company": "IndoPac Logistics", "email": "p.sharma@indopac.in", "phone": "+91-22-5555-2345", "country": "India"},
]

STATUSES = ["at_port", "in_transit", "customs_hold", "delivered"]

async def seed_containers():
    count = await db.containers.count_documents({})
    if count > 0:
        return
    containers = []
    for row in range(6):
        for col in range(8):
            for stack in range(random.randint(1, 4)):
                dwell = random.randint(1, 365)
                status = "normal" if dwell <= 90 else ("overdue" if dwell <= 180 else "ghost")
                c = Container(
                    container_id=f"GC{random.choice(['U','L','R'])}{random.randint(1000000,9999999)}",
                    position_x=col, position_y=row, stack_level=stack, dwell_days=dwell,
                    status=status, shipping_line=random.choice(SHIPPING_LINES),
                    arrival_date=(datetime.now(timezone.utc) - timedelta(days=dwell)).isoformat(),
                    size=random.choice(["20ft", "40ft"])
                )
                containers.append(c.model_dump())
    await db.containers.insert_many(containers)

async def seed_pipelines():
    count = await db.ingestion_pipelines.count_documents({})
    if count > 0:
        return
    sources = [
        {"source_name": "Port TOS", "source_type": "terminal_os", "status": "active", "records_ingested": 48230, "sync_interval_min": 15},
        {"source_name": "NAVIS N4", "source_type": "yard_management", "status": "active", "records_ingested": 35120, "sync_interval_min": 15},
        {"source_name": "Maersk API", "source_type": "shipping_line", "status": "active", "records_ingested": 12450, "sync_interval_min": 30},
        {"source_name": "MSC Connect", "source_type": "shipping_line", "status": "syncing", "records_ingested": 9800, "sync_interval_min": 30},
        {"source_name": "Customs EDI", "source_type": "government", "status": "active", "records_ingested": 67800, "sync_interval_min": 60},
        {"source_name": "CMA CGM Portal", "source_type": "shipping_line", "status": "error", "records_ingested": 5430, "sync_interval_min": 30},
    ]
    pipelines = [IngestionPipeline(last_sync=datetime.now(timezone.utc).isoformat(), **s).model_dump() for s in sources]
    await db.ingestion_pipelines.insert_many(pipelines)

async def seed_anomalies():
    count = await db.anomalies.count_documents({})
    if count > 0:
        return
    containers = await db.containers.find({}, {"_id": 0}).to_list(100)
    ghost_overdue = [c for c in containers if c["status"] in ("ghost", "overdue")]
    types = ["excessive_dwell", "no_documentation", "abandoned", "unclaimed", "expired_permit"]
    anomalies = []
    for c in ghost_overdue[:15]:
        a = Anomaly(
            container_id=c["container_id"],
            risk_score=round(random.uniform(0.8 if c["status"] == "ghost" else 0.6, 0.99), 2),
            anomaly_type=random.choice(types),
            detected_at=(datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 72))).isoformat(),
            dwell_days=c["dwell_days"],
            expected_max_days=90,
            shipping_line=c["shipping_line"],
            position_x=c["position_x"],
            position_y=c["position_y"]
        )
        anomalies.append(a.model_dump())
    if anomalies:
        await db.anomalies.insert_many(anomalies)

async def seed_ownership():
    count = await db.ownership_nodes.count_documents({})
    if count > 0:
        return
    sample = await db.containers.find({}, {"_id": 0, "container_id": 1}).to_list(5)
    c1_id = sample[0]["container_id"] if len(sample) > 0 else "GCLU7234521"
    c2_id = sample[1]["container_id"] if len(sample) > 1 else "GCR4891023"
    nodes = [
        OwnershipNode(node_id="c1", node_type="container", label=c1_id, x=100, y=250, details={"size": "40ft", "dwell_days": 234}),
        OwnershipNode(node_id="c2", node_type="container", label=c2_id, x=100, y=400, details={"size": "20ft", "dwell_days": 178}),
        OwnershipNode(node_id="r1", node_type="registry", label="Lloyd's Register", x=350, y=200, confidence_score=0.92, details={"registry_type": "Classification Society"}),
        OwnershipNode(node_id="r2", node_type="registry", label="BIC Registry", x=350, y=350, confidence_score=0.88, details={"registry_type": "Container Bureau"}),
        OwnershipNode(node_id="r3", node_type="registry", label="Port Authority DB", x=350, y=500, confidence_score=0.75, details={"registry_type": "Government"}),
        OwnershipNode(node_id="o1", node_type="owner", label="TransOcean Ltd.", x=600, y=150, confidence_score=0.95, details={"country": "Singapore", "contact": "ops@transocean.sg", "status": "Active"}),
        OwnershipNode(node_id="o2", node_type="owner", label="Pacific Freight Co.", x=600, y=300, confidence_score=0.72, details={"country": "Hong Kong", "contact": "info@pacfreight.hk", "status": "Dormant"}),
        OwnershipNode(node_id="o3", node_type="owner", label="Unknown Entity", x=600, y=450, confidence_score=0.31, details={"country": "Unknown", "contact": "N/A", "status": "Unverified"}),
    ]
    edges = [
        OwnershipEdge(source="c1", target="r1", relationship="registered_with"),
        OwnershipEdge(source="c1", target="r2", relationship="tracked_by"),
        OwnershipEdge(source="c2", target="r2", relationship="tracked_by"),
        OwnershipEdge(source="c2", target="r3", relationship="recorded_in"),
        OwnershipEdge(source="r1", target="o1", relationship="owned_by"),
        OwnershipEdge(source="r2", target="o2", relationship="leased_to"),
        OwnershipEdge(source="r3", target="o3", relationship="last_known"),
    ]
    await db.ownership_nodes.insert_many([n.model_dump() for n in nodes])
    await db.ownership_edges.insert_many([e.model_dump() for e in edges])

async def seed_shippers():
    count = await db.shippers.count_documents({})
    if count > 0:
        return
    shippers = []
    for i, c in enumerate(COMPANIES):
        s = Shipper(id=f"shipper-{i+1}", **c)
        shippers.append(s.model_dump())
    await db.shippers.insert_many(shippers)

async def seed_tracking_containers():
    count = await db.tracking_containers.count_documents({})
    if count > 0:
        return
    shippers = await db.shippers.find({}, {"_id": 0}).to_list(100)
    anomalies = await db.anomalies.find({}, {"_id": 0, "container_id": 1, "shipping_line": 1, "dwell_days": 1}).to_list(100)
    sample_containers = await db.containers.find({}, {"_id": 0, "container_id": 1, "shipping_line": 1, "dwell_days": 1}).to_list(5)
    
    # Merge anomalies and sample containers without duplicates
    to_track = {c["container_id"]: c for c in anomalies + sample_containers}.values()

    containers = []
    
    # Track anomalous and owner trace containers
    for item in to_track:
        shipper = next((s for s in shippers if s["name"] == item.get("shipping_line")), random.choice(shippers))
        origin_port = random.choice(PORTS)
        dep = datetime.now(timezone.utc) - timedelta(days=item.get("dwell_days", 30) + random.randint(10, 30))
        eta_days = random.randint(10, 30)
        c = TrackingContainer(
            container_id=item["container_id"],
            shipper_id=shipper["id"], shipper_name=shipper["name"],
            origin_port=origin_port, origin_country=COUNTRIES.get(origin_port, "Unknown"),
            destination_warehouse=random.choice(WAREHOUSES), destination_country=random.choice(DEST_COUNTRIES),
            status="delivered", eta=(dep + timedelta(days=eta_days)).isoformat(),
            departure_date=dep.isoformat(),
            port_arrival_date=(dep + timedelta(days=random.randint(2, 8))).isoformat(),
            customs_clearance_date=(dep + timedelta(days=random.randint(8, 14))).isoformat(),
            delivery_date=(datetime.now(timezone.utc) - timedelta(days=item.get("dwell_days", 30))).isoformat(),
            size=random.choice(["20ft", "40ft"]), weight_tons=round(random.uniform(5, 28), 1),
            cargo_type=random.choice(CARGO_TYPES)
        )
        containers.append(c.model_dump())

    # Add random tracking containers
    for i in range(24):
        shipper = random.choice(shippers)
        origin_port = random.choice(PORTS)
        status = random.choice(STATUSES)
        dep = datetime.now(timezone.utc) - timedelta(days=random.randint(5, 45))
        eta_days = random.randint(3, 20)
        c = TrackingContainer(
            container_id=f"TRK{random.choice(['U','L','R'])}{random.randint(1000000,9999999)}",
            shipper_id=shipper["id"], shipper_name=shipper["name"],
            origin_port=origin_port, origin_country=COUNTRIES.get(origin_port, "Unknown"),
            destination_warehouse=random.choice(WAREHOUSES), destination_country=random.choice(DEST_COUNTRIES),
            status=status, eta=(dep + timedelta(days=eta_days)).isoformat(),
            departure_date=dep.isoformat(),
            port_arrival_date=(dep + timedelta(days=random.randint(2, 8))).isoformat() if status in ["at_port", "customs_hold", "delivered"] else None,
            customs_clearance_date=(dep + timedelta(days=random.randint(8, 14))).isoformat() if status in ["delivered"] else None,
            delivery_date=(dep + timedelta(days=eta_days)).isoformat() if status == "delivered" else None,
            size=random.choice(["20ft", "40ft"]), weight_tons=round(random.uniform(5, 28), 1),
            cargo_type=random.choice(CARGO_TYPES)
        )
        containers.append(c.model_dump())
    await db.tracking_containers.insert_many(containers)

async def seed_shipment_history():
    count = await db.shipment_history.count_documents({})
    if count > 0:
        return
    shippers = await db.shippers.find({}, {"_id": 0}).to_list(100)
    entries = []
    for shipper in shippers:
        num_shipments = random.randint(8, 25)
        for j in range(num_shipments):
            delay = 0
            status = random.choices(["delivered", "delayed", "customs_hold", "dispute"], weights=[55, 25, 12, 8])[0]
            if status == "delayed":
                delay = random.randint(1, 14)
            elif status == "dispute":
                delay = random.randint(3, 21)
            origin_port = random.choice(PORTS)
            entry = ShipmentHistoryEntry(
                shipment_id=f"SH-{random.randint(10000,99999)}",
                shipper_id=shipper["id"],
                container_id=f"TRK{random.choice(['U','L','R'])}{random.randint(1000000,9999999)}",
                date=(datetime.now(timezone.utc) - timedelta(days=random.randint(10, 365))).isoformat(),
                origin=f"{origin_port}, {COUNTRIES.get(origin_port, 'Unknown')}",
                destination=f"{random.choice(WAREHOUSES)}, {random.choice(DEST_COUNTRIES)}",
                status=status, delay_days=delay, cargo_type=random.choice(CARGO_TYPES)
            )
            entries.append(entry.model_dump())
    await db.shipment_history.insert_many(entries)


@app.on_event("startup")
async def startup():
    await seed_containers()       # must be first
    await seed_pipelines()
    await seed_anomalies()        # depends on containers
    await seed_ownership()        # depends on containers
    await seed_shippers()
    await seed_tracking_containers()
    await seed_shipment_history()
    logger.info("Database seeded successfully")


# ==================== EXISTING ENDPOINTS ====================
@api_router.get("/")
async def root():
    return {"message": "GhostClear API"}

@api_router.get("/containers")
async def get_containers():
    return await db.containers.find({}, {"_id": 0}).to_list(500)

@api_router.get("/containers/stats")
async def get_container_stats():
    total = await db.containers.count_documents({})
    ghost = await db.containers.count_documents({"status": "ghost"})
    overdue = await db.containers.count_documents({"status": "overdue"})
    normal = await db.containers.count_documents({"status": "normal"})
    return {"total": total, "ghost": ghost, "overdue": overdue, "normal": normal}

@api_router.get("/pipelines")
async def get_pipelines():
    return await db.ingestion_pipelines.find({}, {"_id": 0}).to_list(100)

@api_router.get("/anomalies")
async def get_anomalies():
    return await db.anomalies.find({}, {"_id": 0}).to_list(100)

@api_router.post("/anomalies/{anomaly_id}/dismiss")
async def dismiss_anomaly(anomaly_id: str):
    result = await db.anomalies.delete_one({"id": anomaly_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Anomaly not found")
    return {"message": "dismissed"}


@api_router.get("/ownership")
async def get_ownership():
    nodes = await db.ownership_nodes.find({}, {"_id": 0}).to_list(100)
    edges = await db.ownership_edges.find({}, {"_id": 0}).to_list(100)
    return {"nodes": nodes, "edges": edges}


# ==================== NEW TRACKING ENDPOINTS ====================

@api_router.get("/containers/{container_id}/anomalies")
async def get_anomalies_for_container(container_id: str):
    docs = await db.anomalies.find(
        {"container_id": container_id, "dismissed": {"$ne": True}},
        {"_id": 0}
    ).to_list(10)
    return docs

@api_router.get("/containers/{container_id}/ownership")
async def get_ownership_for_container(container_id: str):
    node = await db.ownership_nodes.find_one(
        {"label": container_id, "node_type": "container"}, {"_id": 0}
    )
    if not node:
        return {"node": None, "chain": []}
    edges = await db.ownership_edges.find({"source": node["node_id"]}, {"_id": 0}).to_list(10)
    chain = []
    for edge in edges:
        target = await db.ownership_nodes.find_one({"node_id": edge["target"]}, {"_id": 0})
        if target:
            chain.append({"relationship": edge["relationship"], "node": target})
    return {"node": node, "chain": chain}

@api_router.get("/tracking/containers/lookup/{container_id}")
async def lookup_tracking_by_container_id(container_id: str):
    doc = await db.tracking_containers.find_one({"container_id": container_id}, {"_id": 0})
    if not doc:
        return None
    return {"id": doc["id"], "shipper_id": doc["shipper_id"], "shipper_name": doc["shipper_name"], "status": doc["status"]}

@api_router.get("/tracking/shippers/{shipper_id}/anomaly-summary")
async def get_shipper_anomaly_summary(shipper_id: str):
    shipper_containers = await db.tracking_containers.find(
        {"shipper_id": shipper_id}, {"_id": 0, "container_id": 1}
    ).to_list(1000)
    container_ids = [c["container_id"] for c in shipper_containers]
    if not container_ids:
        return {"total": 0, "critical": 0}
    anomalies = await db.anomalies.find(
        {"container_id": {"$in": container_ids}, "dismissed": {"$ne": True}},
        {"_id": 0}
    ).to_list(100)
    return {
        "total": len(anomalies),
        "critical": len([a for a in anomalies if a["risk_score"] >= 0.8])
    }

@api_router.get("/tracking/containers")
async def get_tracking_containers(
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    status: Optional[str] = Query(None)
):
    query = {}
    if status and status != "all":
        query["status"] = status
    skip = (page - 1) * limit
    total = await db.tracking_containers.count_documents(query)
    docs = await db.tracking_containers.find(query, {"_id": 0}).skip(skip).limit(limit).to_list(limit)
    return {"data": docs, "total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit}

@api_router.get("/tracking/containers/{container_id}")
async def get_tracking_container_detail(container_id: str):
    doc = await db.tracking_containers.find_one({"id": container_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Container not found")
    shipper = await db.shippers.find_one({"id": doc["shipper_id"]}, {"_id": 0})
    return {"container": doc, "shipper": shipper}

@api_router.get("/tracking/shippers")
async def get_shippers():
    return await db.shippers.find({}, {"_id": 0}).to_list(100)

@api_router.get("/tracking/shippers/{shipper_id}/history")
async def get_shipper_history(
    shipper_id: str,
    page: int = Query(1, ge=1),
    limit: int = Query(10, ge=1, le=50),
    status: Optional[str] = Query(None),
    sort_by: Optional[str] = Query("date"),
    sort_order: Optional[str] = Query("desc")
):
    query = {"shipper_id": shipper_id}
    if status and status != "all":
        query["status"] = status
    total = await db.shipment_history.count_documents(query)
    sort_dir = -1 if sort_order == "desc" else 1
    skip = (page - 1) * limit
    docs = await db.shipment_history.find(query, {"_id": 0}).sort(sort_by, sort_dir).skip(skip).limit(limit).to_list(limit)
    # Compute metrics
    all_docs = await db.shipment_history.find({"shipper_id": shipper_id}, {"_id": 0}).to_list(1000)
    total_shipments = len(all_docs)
    delayed = [d for d in all_docs if d["status"] in ("delayed", "dispute")]
    delayed_pct = round((len(delayed) / total_shipments * 100), 1) if total_shipments > 0 else 0
    avg_delay = round(sum(d["delay_days"] for d in delayed) / len(delayed), 1) if delayed else 0
    disputes = len([d for d in all_docs if d["status"] == "dispute"])
    holds = len([d for d in all_docs if d["status"] == "customs_hold"])
    metrics = {
        "total_shipments": total_shipments,
        "delayed_pct": delayed_pct,
        "avg_delay_days": avg_delay,
        "disputes": disputes,
        "customs_holds": holds,
        "on_time_pct": round(100 - delayed_pct, 1),
    }
    return {"data": docs, "total": total, "page": page, "limit": limit, "pages": (total + limit - 1) // limit, "metrics": metrics}


# In-memory trust score cache
trust_score_cache = {}

@api_router.get("/tracking/shippers/{shipper_id}/trust-score")
async def get_trust_score(shipper_id: str):
    # Check cache
    if shipper_id in trust_score_cache:
        cached = trust_score_cache[shipper_id]
        cache_age = (datetime.now(timezone.utc) - datetime.fromisoformat(cached["cached_at"])).total_seconds()
        if cache_age < 300:  # 5 min cache
            return cached["data"]

    shipper = await db.shippers.find_one({"id": shipper_id}, {"_id": 0})
    if not shipper:
        raise HTTPException(status_code=404, detail="Shipper not found")

    history = await db.shipment_history.find({"shipper_id": shipper_id}, {"_id": 0}).to_list(1000)
    total = len(history)
    if total == 0:
        return {"score": 50, "category": "Medium Risk", "breakdown": [], "explanation": "No shipment history available.", "trend": "stable"}

    delivered = len([h for h in history if h["status"] == "delivered"])
    delayed = len([h for h in history if h["status"] in ("delayed", "dispute")])
    disputes = len([h for h in history if h["status"] == "dispute"])
    holds = len([h for h in history if h["status"] == "customs_hold"])
    avg_delay = round(sum(h["delay_days"] for h in history if h["delay_days"] > 0) / max(len([h for h in history if h["delay_days"] > 0]), 1), 1)
    on_time_rate = round(delivered / total * 100, 1)
    delay_rate = round(delayed / total * 100, 1)

    summary = f"""Shipper: {shipper['name']} ({shipper['company']})
Total shipments: {total}
On-time deliveries: {delivered} ({on_time_rate}%)
Delayed shipments: {delayed} ({delay_rate}%)
Average delay: {avg_delay} days
Customs holds: {holds}
Disputes: {disputes}"""

    prompt = f"""You are a logistics trust scoring AI. Analyze this shipper's data and return a JSON object with:
1. "score": integer 0-100
2. "category": "Low Risk" (80-100), "Medium Risk" (50-79), or "High Risk" (<50)
3. "breakdown": array of objects with "factor" (string), "impact" (positive integer with + or negative with -), "description" (short)
4. "explanation": 2-3 sentence natural language explanation of the score
5. "trend": "increasing", "stable", or "decreasing"

Shipper Data:
{summary}

Return ONLY valid JSON, no markdown, no code blocks."""

    # Using Fallback scoring (LLM integration removed for local mocking)
    # Trend: compare most recent 10 shipments vs prior 10
    sorted_history = sorted(history, key=lambda x: x.get("date", ""), reverse=True)
    recent_10 = sorted_history[:10]
    prev_10 = sorted_history[10:20]
    recent_on_time = round(len([h for h in recent_10 if h["status"] == "delivered"]) / max(len(recent_10), 1) * 100, 1)
    prev_on_time = round(len([h for h in prev_10 if h["status"] == "delivered"]) / max(len(prev_10), 1) * 100, 1)
    trend_delta = round(recent_on_time - prev_on_time, 1)

    worst_delays = sorted([h for h in history if h["delay_days"] > 0], key=lambda x: x["delay_days"], reverse=True)[:3]
    dispute_events = [h for h in history if h["status"] == "dispute"][:3]
    customs_events = [h for h in history if h["status"] == "customs_hold"][:3]

    score = max(0, min(100, int(on_time_rate * 0.4 + (100 - delay_rate) * 0.3 + (100 - min(disputes * 10, 50)) * 0.2 + (100 - min(holds * 5, 30)) * 0.1)))
    category = "Low Risk" if score >= 80 else ("Medium Risk" if score >= 50 else "High Risk")

    result = {
        "score": score,
        "category": category,
        "trend": "decreasing" if trend_delta < -10 else ("increasing" if trend_delta > 10 else "stable"),
        "trend_delta": trend_delta,
        "stats": {
            "total": total, "delivered": delivered, "delayed": delayed,
            "disputes": disputes, "customs_holds": holds, "avg_delay_days": avg_delay,
            "on_time_rate": on_time_rate, "delay_rate": delay_rate,
            "recent_on_time_rate": recent_on_time, "prev_on_time_rate": prev_on_time,
        },
        "breakdown": [
            {"factor": "On-time Rate", "impact": f"+{int(on_time_rate * 0.4)}", "description": f"{on_time_rate}% of {total} shipments delivered on time", "detail": f"{delivered} on-time, {total - delivered} not"},
            {"factor": "Delay Frequency", "impact": f"-{int(delay_rate * 0.3)}", "description": f"{delay_rate}% of shipments were delayed", "detail": f"Avg delay {avg_delay}d across {len([h for h in history if h['delay_days'] > 0])} delayed shipments"},
            {"factor": "Disputes", "impact": f"-{disputes * 5}", "description": f"{disputes} formal disputes on record", "detail": f"Dispute rate {round(disputes/total*100,1)}% — industry benchmark <3%"},
            {"factor": "Customs Compliance", "impact": f"-{holds * 3}", "description": f"{holds} customs holds recorded", "detail": f"Hold rate {round(holds/total*100,1)}%"},
        ],
        "explanation": (
            f"{shipper['name']} ({shipper['company']}) has a {on_time_rate}% on-time delivery rate across {total} shipments. "
            + (f"The {delay_rate}% delay rate and {disputes} disputes are above acceptable thresholds. " if delay_rate > 20 or disputes > 2 else "Compliance record is within acceptable limits. ")
            + (f"Recent performance is declining: on-time rate dropped {abs(trend_delta)}% over the last 10 shipments." if trend_delta < -10 else f"Recent performance is improving: on-time rate gained {trend_delta}% over the last 10 shipments." if trend_delta > 10 else "Performance trend is stable.")
        ),
        "reference_events": {
            "worst_delays": [{"shipment_id": h["shipment_id"], "container_id": h["container_id"], "date": h["date"][:10], "delay_days": h["delay_days"], "route": f"{h['origin']} → {h['destination']}", "cargo": h["cargo_type"]} for h in worst_delays],
            "disputes": [{"shipment_id": h["shipment_id"], "container_id": h["container_id"], "date": h["date"][:10], "route": f"{h['origin']} → {h['destination']}", "cargo": h["cargo_type"]} for h in dispute_events],
            "customs_holds": [{"shipment_id": h["shipment_id"], "container_id": h["container_id"], "date": h["date"][:10], "route": f"{h['origin']} → {h['destination']}"} for h in customs_events],
        },
    }

    # Cache result
    trust_score_cache[shipper_id] = {"data": result, "cached_at": datetime.now(timezone.utc).isoformat()}
    return result


# ==================== INCLUDE ROUTER + MIDDLEWARE ====================
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
