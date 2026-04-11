import redis
import json
import time
import os
import base64
from datetime import datetime
from dotenv import load_dotenv
from bson import ObjectId
from pymongo import MongoClient
from google import genai
from google.genai import types

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/google-solutions")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")

INPUT_QUEUE = "ai_evidence_queue"
OUTPUT_QUEUE = "ai_result_queue"

# Initialize Google GenAI Client
client = None
if GOOGLE_API_KEY:
    try:
        client = genai.Client(api_key=GOOGLE_API_KEY)
        print(f"[AI] Initialized Google Gemini Console (Model: gemini-flash-lite-latest)")
    except Exception as e:
        print(f"[AI ERROR] Failed to initialize Google GenAI: {e}")
else:
    print("[AI WARNING] GOOGLE_API_KEY not found. AI classification will fail.")

# Classifies crisis using Google Gemini Flash-Lite
def classify_with_ai(evidence):
    if not client:
        return {"crisis_detected": False, "error": "Google GenAI client not initialized"}

    sensors = evidence.get("sensors", {})
    zone = evidence.get("location", {}).get("zone", "unknown")
    
    # Building a sophisticated prompt for Gemini
    prompt_text = f"""
    You are the 'Sentinel AI' core for a high-security automated venue. 
    Analyze the following real-time sensor telemetry from Zone: '{zone}'.
    
    Telemetry Data: {json.dumps(sensors)}
    
    TASKS:
    1. Determine if a crisis is occurring (fire, gas_leak, earthquake, security, water_leak, air_quality).
    2. Provide an algorithmic confidence score (0.0 to 1.0).
    3. Generate a 'Situational Summary' - a 1-sentence briefing for human responders.
    4. Provide reasoning for your classification.

    Respond ONLY with a valid JSON object:
    {{
        "crisis_detected": boolean,
        "crisis_type": "fire" | "gas_leak" | "earthquake" | "security" | "water_leak" | "air_quality" | "other",
        "confidence_score": float,
        "summary": "string",
        "reasoning": "string"
    }}
    """

    try:
        # Use Gemini Flash-Lite for cost-efficient, high-speed classification
        response = client.models.generate_content(
            model="gemini-flash-lite-latest",
            contents=prompt_text,
            config=types.GenerateContentConfig(
                response_mime_type="application/json"
            )
        )
        
        # The SDK handles JSON parsing if response_mime_type is set, but we'll be safe
        raw_text = response.text.strip()
        return json.loads(raw_text)
        
    except Exception as e:
        print(f"[AI ERROR] Gemini classification failed: {e}")
        return {"crisis_detected": False, "error": str(e)}

# Serializes MongoDB BSON types to JSON-friendly formats
def json_serializer(obj):
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    return str(obj)

# Retrieves venue and crisis type documents from MongoDB
def get_venue_and_crisis_details(mongo_db, venue_id, crisis_type):
    venue = None
    crisis = None
    try:
        if venue_id:
            venue = mongo_db.venues.find_one({"_id": ObjectId(venue_id)})
    except Exception as e:
        print(f"[AI WARN] Failed to lookup venue {venue_id}: {e}")
    try:
        crisis = mongo_db.crisis_types.find_one({"type": crisis_type})
    except Exception as e:
        print(f"[AI WARN] Failed to lookup crisis type {crisis_type}: {e}")
    return venue, crisis

# Formats a MongoDB document for JSON serialization
def format_doc(doc):
    if not doc:
        return None
    return json.loads(json.dumps(doc, default=json_serializer))

# Main entry point for the AI worker loop
def main():
    print(f"Connecting to Redis at {REDIS_URL}...")
    try:
        r = redis.from_url(REDIS_URL, decode_responses=True)
        r.ping()
        print("Redis connected")
    except Exception as e:
        print(f"[AI ERROR] Redis failed: {e}")
        return

    print(f"Connecting to MongoDB at {MONGO_URI}...")
    try:
        mongo_client = MongoClient(MONGO_URI)
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
            result = r.brpop(INPUT_QUEUE, timeout=0)
            if not result:
                continue

            _, raw = result
            evidence = json.loads(raw)

            venue_id = evidence.get("venue_id", "")
            device_id = evidence.get("device_id", "unknown")
            zone = evidence.get("location", {}).get("zone", "unknown")

            print(f"[AI] Analyzing {device_id}@{zone} via Google Gemini Flash-Lite...")
            classification = classify_with_ai(evidence)

            if not classification.get("crisis_detected"):
                reason = classification.get('reasoning', 'Normal operation')
                print(f"[AI] No crisis: {reason}")
                continue

            # Native confidence and summary from Gemini
            crisis_type = classification.get("crisis_type", "other")
            confidence = classification.get("confidence_score", 0.0)
            summary = classification.get("summary", "Manual intervention suggested.")
            
            print(f"[AI] ALERT: {crisis_type} detected (Confidence: {confidence})")
            print(f"[AI] Summary: {summary}")

            venue, crisis = get_venue_and_crisis_details(mongo_db, venue_id, crisis_type)
            if not crisis:
                print(f"[AI ERROR] Unknown crisis type '{crisis_type}'. Using 'other'.")
                _, crisis = get_venue_and_crisis_details(mongo_db, venue_id, "other")

            # Store in MongoDB
            mongo_db.ai_responses.insert_one({
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
                "timestamp": evidence.get("timestamp", ""),
                "crisis_detected": True,
                "crisis_type": crisis_type,
                "confidence_score": confidence,
                "summary": summary,
                "venue_details": format_doc(venue),
                "crisis_details": format_doc(crisis),
                "status": "active"
            }

            r.lpush(OUTPUT_QUEUE, json.dumps(output))
            print(f"[AI] Crisis Pushed to Result Queue!")

        except KeyboardInterrupt:
            print("\nShutting down Sentinel AI...")
            break
        except Exception as e:
            print(f"[AI ERROR] Loop error: {e}")
            time.sleep(1)

if __name__ == "__main__":
    main()
