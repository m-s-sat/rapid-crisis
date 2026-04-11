import json
import time
import os
import base64
import asyncio
import redis.asyncio as redis
from datetime import datetime
from dotenv import load_dotenv
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient

# LangChain & Pydantic Imports
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import SystemMessage, HumanMessage
from pydantic import BaseModel, Field

load_dotenv()
from typing import Optional, Dict, Any
from pydantic import BaseModel, Field

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

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/google-solutions")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")

INPUT_QUEUE = "ai_evidence_queue"
OUTPUT_QUEUE = "ai_result_queue"

# 1. Define the Expected Structured Output using Pydantic
class CrisisClassification(BaseModel):
    crisis_detected: bool = Field(description="Whether a crisis is occurring")
    crisis_type: str = Field(description="Type of crisis: fire, gas_leak, earthquake, security, water_leak, air_quality, or other")
    confidence_score: float = Field(description="Algorithmic confidence score (0.0 to 1.0)")
    summary: str = Field(description="A 1-sentence briefing for human responders")
    reasoning: str = Field(description="Reasoning for the classification")

llm = None
if GOOGLE_API_KEY:
    try:
        raw_llm = ChatGoogleGenerativeAI(
            model="gemini-flash-lite-latest", # Or gemini-1.5-flash for broader multimodal support
            api_key=GOOGLE_API_KEY,
            temperature=0.0
        )
        llm = raw_llm.with_structured_output(CrisisClassification)
        print(f"[AI] Initialized LangChain Google Gemini (Model: gemini-flash-lite-latest)")
    except Exception as e:
        print(f"[AI ERROR] Failed to initialize LangChain Google GenAI: {e}")
else:
    print("[AI WARNING] GOOGLE_API_KEY not found. AI classification will fail.")


# --- Media Conversion Functions ---

def image_bytes_to_message(image_bytes: bytes, mime_type: str = "image/jpeg") -> HumanMessage:
    """Converts image bytes to a LangChain HumanMessage."""
    b64_data = base64.b64encode(image_bytes).decode("utf-8")
    return HumanMessage(content=[{
        "type": "image_url", 
        "image_url": {"url": f"data:{mime_type};base64,{b64_data}"}
    }])

def audio_bytes_to_message(audio_bytes: bytes, mime_type: str = "audio/mp3") -> HumanMessage:
    """Converts audio bytes to a LangChain HumanMessage."""
    b64_data = base64.b64encode(audio_bytes).decode("utf-8")
    return HumanMessage(content=[{
        "type": "media", 
        "mime_type": mime_type, 
        "data": b64_data
    }])

def video_bytes_to_message(video_bytes: bytes, mime_type: str = "video/mp4") -> HumanMessage:
    """Converts video bytes to a LangChain HumanMessage."""
    b64_data = base64.b64encode(video_bytes).decode("utf-8")
    return HumanMessage(content=[{
        "type": "media", 
        "mime_type": mime_type, 
        "data": b64_data
    }])

# ----------------------------------


async def classify_with_ai(evidence: CrisisEvidencePayload):
    if not llm:
        return {"crisis_detected": False, "error": "LangChain LLM client not initialized"}

    zone = evidence.location.get("zone", "unknown") if evidence.location else "unknown"
    sensors = evidence.sensors or {}
    
    messages = [
        SystemMessage(content="""You are the 'Sentinel AI' core for a high-security automated venue. 
Your tasks:
1. Determine if a crisis is occurring based on sensor telemetry and provided media.
2. Provide an algorithmic confidence score.
3. Generate a 1-sentence 'Situational Summary' for responders.
4. Provide reasoning for your classification."""),
        
        HumanMessage(content=f"Analyze the following real-time sensor telemetry from Zone: '{zone}'.\n\nTelemetry Data: {json.dumps(sensors)}")
    ]

    # Process media if present
    if evidence.media:
        # Decode base64 strings to bytes to feed into our byte-to-message functions
        if evidence.media.photo:
            try:
                photo_bytes = base64.b64decode(evidence.media.photo)
                messages.append(image_bytes_to_message(photo_bytes))
            except Exception as e:
                print(f"[AI WARN] Failed to process photo: {e}")
        
        if evidence.media.audio:
            try:
                audio_bytes = base64.b64decode(evidence.media.audio)
                messages.append(audio_bytes_to_message(audio_bytes))
            except Exception as e:
                print(f"[AI WARN] Failed to process audio: {e}")

        if evidence.media.video:
            try:
                video_bytes = base64.b64decode(evidence.media.video)
                messages.append(video_bytes_to_message(video_bytes))
            except Exception as e:
                print(f"[AI WARN] Failed to process video: {e}")

    try:
        # Await the async invocation of the Langchain LLM with attached media messages
        response: CrisisClassification = await llm.ainvoke(messages)
        return response.model_dump()
        
    except Exception as e:
        print(f"[AI ERROR] LangChain classification failed: {e}")
        return {"crisis_detected": False, "error": str(e)}
    
    
# Serializes MongoDB BSON types to JSON-friendly formats
def json_serializer(obj):
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    return str(obj)

# Retrieves venue and crisis type documents from MongoDB asynchronously
async def get_venue_and_crisis_details(mongo_db, venue_id, crisis_type):
    venue = None
    crisis = None
    try:
        if venue_id:
            venue = await mongo_db.venues.find_one({"_id": ObjectId(venue_id)})
    except Exception as e:
        print(f"[AI WARN] Failed to lookup venue {venue_id}: {e}")
    try:
        crisis = await mongo_db.crisis_types.find_one({"type": crisis_type})
    except Exception as e:
        print(f"[AI WARN] Failed to lookup crisis type {crisis_type}: {e}")
    return venue, crisis

# Formats a MongoDB document for JSON serialization
def format_doc(doc):
    if not doc:
        return None
    return json.loads(json.dumps(doc, default=json_serializer))

# Async main entry point for the AI worker loop
async def main():
    print(f"Connecting to Redis at {REDIS_URL}...")
    try:
        # Async Redis connection
        r = redis.from_url(REDIS_URL, decode_responses=True)
        await r.ping()
        print("Redis connected")
    except Exception as e:
        print(f"[AI ERROR] Redis failed: {e}")
        return

    print(f"Connecting to MongoDB at {MONGO_URI}...")
    try:
        # Async MongoDB connection via Motor
        mongo_client = AsyncIOMotorClient(MONGO_URI)
        db_name = MONGO_URI.rsplit("/", 1)[-1].split("?")[0]
        mongo_db = mongo_client[db_name]
        print(f"MongoDB connected to database: {db_name}")
    except Exception as e:
        print(f"[AI ERROR] MongoDB failed: {e}")
        return

    print(f"Listening on queue: {INPUT_QUEUE}")
    print("=" * 50)

    while True:
        try:
            # Async blocking pop
            result = await r.brpop(INPUT_QUEUE, timeout=1)
            if not result:
                continue

            _, raw = result
            raw_dict = json.loads(raw)

            # 1. Validate payload with Pydantic
            try:
                evidence = CrisisEvidencePayload(**raw_dict)
            except Exception as ve:
                print(f"[AI ERROR] Payload validation failed: {ve}")
                continue

            venue_id = evidence.venue_id
            device_id = evidence.device_id
            zone = evidence.location.get("zone", "unknown") if evidence.location else "unknown"

            print(f"[AI] Analyzing {device_id}@{zone} via LangChain...")
            
            # Pass the validated Pydantic model to the AI
            classification = await classify_with_ai(evidence)

            if not classification.get("crisis_detected"):
                reason = classification.get('reasoning', 'Normal operation')
                print(f"[AI] No crisis: {reason}")
                continue

            # Native confidence and summary from Pydantic model response
            crisis_type = classification.get("crisis_type", "other")
            confidence = classification.get("confidence_score", 0.0)
            summary = classification.get("summary", "Manual intervention suggested.")
            
            print(f"[AI] ALERT: {crisis_type} detected (Confidence: {confidence})")
            print(f"[AI] Summary: {summary}")

            venue, crisis = await get_venue_and_crisis_details(mongo_db, venue_id, crisis_type)
            if not crisis:
                print(f"[AI ERROR] Unknown crisis type '{crisis_type}'. Using 'other'.")
                _, crisis = await get_venue_and_crisis_details(mongo_db, venue_id, "other")

            # Store in MongoDB asynchronously
            await mongo_db.ai_responses.insert_one({
                "venue": ObjectId(venue_id) if venue_id else None,
                "crisis": crisis["_id"] if crisis else None,
                "confidence_score": confidence,
                "summary": summary,
                "status": "active",
                "zones": [zone],
                "created_at": datetime.utcnow()
            })

            output = {
                "venue_id": venue_id,
                "zone": zone,
                "device_id": device_id,
                "timestamp": evidence.timestamp,
                "crisis_detected": True,
                "crisis_type": crisis_type,
                "confidence_score": confidence,
                "summary": summary,
                "venue_details": format_doc(venue),
                "crisis_details": format_doc(crisis),
                "status": "active"
            }

            # Push to queue asynchronously
            await r.lpush(OUTPUT_QUEUE, json.dumps(output))
            print(f"[AI] Crisis Pushed to Result Queue!")

        except asyncio.CancelledError:
            print("\nShutting down Sentinel AI...")
            break
        except Exception as e:
            print(f"[AI ERROR] Loop error: {e}")
            await asyncio.sleep(1)
            
            
if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\nProcess manually terminated.")