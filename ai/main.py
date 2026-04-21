import json
import time
import os
import base64
import asyncio
import redis.asyncio as redis
from datetime import datetime, timezone
from dotenv import load_dotenv
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any

load_dotenv()

class MediaCapture(BaseModel):
    photo: Optional[str] = None
    video: Optional[str] = None
    audio: Optional[str] = None

class CrisisEvidencePayload(BaseModel):
    venue_id: Optional[str] = ""
    device_id: Optional[str] = "unknown"
    device_mac: Optional[str] = None
    timestamp: Optional[str] = ""
    location: Optional[Dict[str, Any]] = Field(default_factory=dict)
    sensors: Optional[Dict[str, Any]] = Field(default_factory=dict)
    media: Optional[MediaCapture] = None

class CrisisClassification(BaseModel):
    crisis_detected: bool = Field(description="Whether a crisis is occurring")
    crisis_type: str = Field(description="Type of crisis: fire, gas_leak, earthquake, security, water_leak, air_quality, or other")
    confidence_score: float = Field(description="Algorithmic confidence score (0.0 to 1.0)")
    summary: str = Field(description="A 1-sentence briefing for human responders")
    reasoning: str = Field(description="Reasoning for the classification")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/google-solutions")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.0-flash")
INPUT_QUEUE = "ai_evidence_queue"
OUTPUT_QUEUE = "ai_result_queue"

llm = None
raw_llm = None

if GOOGLE_API_KEY:
    try:
        raw_llm = ChatGoogleGenerativeAI(
            google_api_key=GOOGLE_API_KEY,
            model=GEMINI_MODEL,
            temperature=0.0,
        )
        llm = raw_llm.with_structured_output(CrisisClassification)
        print(f"[AI] Initialized Gemini: {GEMINI_MODEL}")
    except Exception as e:
        print(f"[AI ERROR] {e}")

def media_to_message(media_data: str, media_type: str = "image", mime_type: Optional[str] = None) -> HumanMessage:
    if media_type == "image":
        if not media_data.startswith("data:"):
            m_type = mime_type or "image/jpeg"
            media_data = f"data:{m_type};base64,{media_data}"
        return HumanMessage(content=[{"type": "image_url", "image_url": {"url": media_data}}])
    
    pure_b64 = media_data
    if "," in media_data:
        prefix, pure_b64 = media_data.split(",", 1)
        if not mime_type and ":" in prefix and ";" in prefix:
             mime_type = prefix.split(":")[1].split(";")[0]

    return HumanMessage(content=[{
        "type": "media", 
        "mime_type": mime_type or (f"{media_type}/mp3" if media_type == "audio" else "video/mp4"), 
        "data": pure_b64
    }])

def deterministic_classification(evidence: CrisisEvidencePayload):
    zone = evidence.location.get("zone", "unknown") if evidence.location else "unknown"
    sensors = evidence.sensors or {}
    temp = float(sensors.get("temperature_c", 0) or 0)
    smoke = float(sensors.get("smoke_ppm", 0) or 0)
    vib = float(sensors.get("vibration_g", 0) or 0)
    gas_lpg = float(sensors.get("gas_lpg_ppm", 0) or 0)
    gas_methane = float(sensors.get("gas_methane_ppm", 0) or 0)
    co = float(sensors.get("co_ppm", 0) or 0)
    co2 = float(sensors.get("co2_ppm", 0) or 0)
    air_quality = float(sensors.get("air_quality_index", 0) or 0)
    water_level = float(sensors.get("water_level_cm", 0) or 0)
    sound = float(sensors.get("sound_db", 0) or 0)
    flame_detected = bool(sensors.get("flame_detected", False))
    moisture_detected = bool(sensors.get("moisture_detected", False))
    motion_detected = bool(sensors.get("motion_detected", False))
    door_open = bool(sensors.get("door_open", False))

    if temp > 45 or smoke > 350 or flame_detected:
        reasons = []
        if temp > 45: reasons.append(f"temp={temp}C")
        if smoke > 350: reasons.append(f"smoke={smoke}")
        if flame_detected: reasons.append("flame=true")
        return {
            "crisis_detected": True, "crisis_type": "fire",
            "confidence_score": 0.99 if flame_detected or temp > 70 or smoke > 700 else 0.93,
            "summary": f"Fire in {zone}.", "reasoning": ", ".join(reasons), "is_hardware_trigger": True,
        }

    if gas_lpg > 120 or gas_methane > 120 or co > 80:
        return {
            "crisis_detected": True, "crisis_type": "gas_leak", "confidence_score": 0.91,
            "summary": f"Gas in {zone}.", "reasoning": "Gas thresholds", "is_hardware_trigger": True,
        }

    if vib > 0.4:
        return {
            "crisis_detected": True, "crisis_type": "earthquake", "confidence_score": 0.96,
            "summary": f"Seismic in {zone}.", "reasoning": f"vib={vib}", "is_hardware_trigger": True,
        }

    return {
        "crisis_detected": False, "crisis_type": "other", "confidence_score": 0.0,
        "summary": "Normal", "reasoning": "None", "is_hardware_trigger": False,
    }

async def classify_with_ai(evidence: CrisisEvidencePayload):
    if not llm or not raw_llm: return deterministic_classification(evidence)
    zone = evidence.location.get("zone", "unknown") if evidence.location else "unknown"
    sensors = evidence.sensors or {}
    temp = sensors.get("temperature_c", 0)
    smoke = sensors.get("smoke_ppm", 0)
    vib = sensors.get("vibration_g", 0)

    hard_check = False
    if temp > 45 or smoke > 351 or vib > 0.4: hard_check = True

    instructions = """You are 'Sentinel AI'. 
1. SENSOR MAPPING: 'temperature_c', 'smoke_ppm', 'vibration_g'.
2. THRESHOLDS: temperature_c > 45 OR smoke_ppm > 350 OR vibration_g > 0.4 => crisis_detected = true.
3. OUTPUT ONLY JSON:
{
  "crisis_detected": boolean,
  "crisis_type": "fire" | "gas_leak" | "earthquake" | "security" | "water_leak",
  "confidence_score": float,
  "summary": "string",
  "reasoning": "string"
}"""
    messages = [HumanMessage(content=f"{instructions}\n\nZone: {zone}\n\nTelemetry: {json.dumps(sensors)}")]

    for attempt in range(3):
        try:
            response_msg = await raw_llm.ainvoke(messages)
            raw_text = response_msg.content.strip()
            start, end = raw_text.find("{"), raw_text.rfind("}")
            if start == -1 or end == -1: raise ValueError("No JSON")
            data = json.loads(raw_text[start:end+1])
            if hard_check:
                data["crisis_detected"] = True
                data["confidence_score"] = max(data.get("confidence_score", 0.0), 0.95)
            result = CrisisClassification(**data).model_dump()
            result["is_hardware_trigger"] = hard_check
            return result
        except Exception as e:
            if "429" in str(e):
                await asyncio.sleep(2 ** attempt + 1)
                continue
            if hard_check:
                return {
                    "crisis_detected": True, "crisis_type": "fire" if temp > 45 else "other",
                    "confidence_score": 0.99, "summary": "Emergency", "reasoning": "Hardware trigger", "is_hardware_trigger": True
                }
            return deterministic_classification(evidence)
    return deterministic_classification(evidence)

def json_serializer(obj):
    if isinstance(obj, ObjectId): return str(obj)
    if isinstance(obj, datetime): return obj.isoformat()
    return str(obj)

async def get_venue_and_crisis_details(mongo_db, venue_id, crisis_type):
    venue, crisis = None, None
    try:
        if venue_id: venue = await mongo_db.venues.find_one({"_id": ObjectId(venue_id)})
    except: pass
    try:
        crisis = await mongo_db.crisis_types.find_one({"type": crisis_type})
    except: pass
    enriched = dict(venue) if venue else None
    if venue_id:
        try:
            vid = ObjectId(venue_id)
            guests = await mongo_db.guests.find({"venue_id": vid, "status": "active"}).to_list(100)
            staff = await mongo_db.staff.find({"venue_id": vid}).to_list(100)
            if not enriched: enriched = {"_id": venue_id}
            enriched["guest_details"] = guests
            enriched["staff_details"] = {f"staff_{i}": s for i, s in enumerate(staff)}
        except: pass
    return enriched, crisis

def format_doc(doc):
    if not doc: return None
    return json.loads(json.dumps(doc, default=json_serializer))

concurrency_limit = asyncio.Semaphore(3)

async def process_evidence(raw_json, redis_client, mongo_db):
    try:
        raw_dict = json.loads(raw_json)
        evidence = CrisisEvidencePayload(**raw_dict)
        vid, did, sensors = evidence.venue_id, evidence.device_id, evidence.sensors or {}
        
        if vid:
            is_active = await redis_client.exists(f"session:active:{vid}")
            if not is_active: return

        temp, smoke, vib = sensors.get("temperature_c", 0), sensors.get("smoke_ppm", 0), sensors.get("vibration_g", 0)
        is_critical = (temp > 45 or smoke > 351 or vib > 0.4)
        cd_key = f"ai:cooldown:{did}"
        if not is_critical and await redis_client.get(cd_key): return
        await redis_client.set(cd_key, "active", ex=5)

        async with concurrency_limit:
            classification = await classify_with_ai(evidence)
            if not classification.get("crisis_detected"): return

            ctype = classification.get("crisis_type", "other")
            venue, crisis = await get_venue_and_crisis_details(mongo_db, vid, ctype)
            if not crisis: _, crisis = await get_venue_and_crisis_details(mongo_db, vid, "other")

            mongo_insert = await mongo_db.ai_responses.insert_one({
                "venue": ObjectId(vid) if vid else None,
                "crisis": crisis["_id"] if crisis else None,
                "confidence_score": classification.get("confidence_score", 0.0),
                "summary": classification.get("summary", ""),
                "status": "active",
                "zones": [evidence.location.get("zone", "unknown")],
                "created_at": datetime.now(timezone.utc)
            })

            output = {
                "venue_id": vid, "zone": evidence.location.get("zone", "unknown"), "device_id": did,
                "crisis_detected": True, "crisis_type": ctype,
                "confidence_score": classification.get("confidence_score", 0.0),
                "summary": classification.get("summary", ""), "reasoning": classification.get("reasoning", ""),
                "is_hardware_trigger": classification.get("is_hardware_trigger", False),
                "mongo_response_id": str(mongo_insert.inserted_id),
                "trigger_sensors": sensors, "venue_details": format_doc(venue),
                "crisis_details": format_doc(crisis), "pushed_at": datetime.now(timezone.utc).isoformat()
            }
            await redis_client.lpush(OUTPUT_QUEUE, json.dumps(output))
    except Exception as e:
        print(f"[ERROR] {e}")

async def main():
    try:
        r = redis.from_url(REDIS_URL, decode_responses=True)
        mongo_client = AsyncIOMotorClient(MONGO_URI)
        db_name = MONGO_URI.rsplit("/", 1)[-1].split("?")[0]
        mongo_db = mongo_client[db_name]
    except Exception as e:
        print(f"[FATAL] {e}")
        return

    while True:
        try:
            result = await r.brpop(INPUT_QUEUE, timeout=1)
            if result: asyncio.create_task(process_evidence(result[1], r, mongo_db))
        except asyncio.CancelledError: break
        except: await asyncio.sleep(1)

if __name__ == "__main__":
    try: asyncio.run(main())
    except: pass
