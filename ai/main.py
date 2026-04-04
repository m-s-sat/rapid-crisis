import redis
import json
import time
import os
import google.generativeai as genai
from datetime import datetime
from dotenv import load_dotenv
from bson import ObjectId
from pymongo import MongoClient

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/google-solutions")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")

INPUT_QUEUE = "ai_evidence_queue"
OUTPUT_QUEUE = "ai_result_queue"

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    model = genai.GenerativeModel("gemini-2.5-flash") # Standard stable name
else:
    print("[AI WARNING] GOOGLE_API_KEY not found. Gemini classification will fail.")
    model = None

# Classifies crisis using Google Gemini AI based on sensors and media evidence
def classify_with_gemini(evidence):
    if not model:
        return {"crisis_detected": False, "error": "Model not initialized"}

    sensors = evidence.get("sensors", {})
    zone = evidence.get("location", {}).get("zone", "unknown")
    
    prompt = f"""
    Analyze these sensor readings and media from a hotel zone: '{zone}'.
    Sensors: {json.dumps(sensors)}
    
    Determine if there is a crisis (fire, gas_leak, earthquake, security, water_leak, air_quality).
    Respond ONLY with a JSON object:
    {{
        "crisis_detected": boolean,
        "crisis_type": string (one of the above or "other"),
        "confidence_score": float (0.0 to 1.0),
        "reasoning": string (brief explanation)
    }}
    """

    try:
        parts = [prompt]
        
        # Add photo if available
        if "media" in evidence and evidence["media"].get("photo"):
            photo_data = evidence["media"]["photo"]
            if "," in photo_data:
                photo_data = photo_data.split(",")[1]
            parts.append({
                "mime_type": "image/jpeg",
                "data": photo_data
            })

        response = model.generate_content(parts)
        
        # Clean up Markdown formatting from Gemini response
        text = response.text.strip()
        if text.startswith("```json"):
            text = text[7:-3].strip()
        elif text.startswith("```"):
            text = text[3:-3].strip()
            
        return json.loads(text)
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

            print(f"[AI] Processing evidence from {device_id}@{zone}...")
            classification = classify_with_gemini(evidence)

            if "429" in classification.get("error", ""):
                print(f"[AI QUOTA] Rate limit hit. Sleeping for 15s to reset quota...")
                time.sleep(15) # Backoff to stay within free tier limits
                continue

            if not classification.get("crisis_detected"):
                print(f"[AI] No crisis detected: {classification.get('reasoning', 'Normal operation')}")
                continue

            crisis_type = classification["crisis_type"]
            confidence = classification["confidence_score"]
            print(f"[AI] ALERT: {crisis_type} detected with {confidence} confidence")

            venue, crisis = get_venue_and_crisis_details(mongo_db, venue_id, crisis_type)
            if not crisis:
                print(f"[AI ERROR] Crisis type '{crisis_type}' not found in database. Using 'other'.")
                _, crisis = get_venue_and_crisis_details(mongo_db, venue_id, "other")

            # Store in MongoDB for record keeping
            mongo_db.ai_responses.insert_one({
                "venue": ObjectId(venue_id) if venue_id else None,
                "crisis": crisis["_id"] if crisis else None,
                "confidence_score": confidence,
                "status": "active",
                "zones": [zone],
                "created_at": datetime.utcnow()
            })

            # Send result directly to the Worker Server via Redis
            output = {
                "venue_id": venue_id,
                "zone": zone,
                "device_id": device_id,
                "timestamp": evidence.get("timestamp", ""),
                "crisis_detected": True,
                "crisis_type": crisis_type,
                "confidence_score": confidence,
                "venue_details": format_doc(venue),
                "crisis_details": format_doc(crisis),
                "status": "active"
            }

            r.lpush(OUTPUT_QUEUE, json.dumps(output))
            print(f"[AI] Successfully pushed result to {OUTPUT_QUEUE}")

        except KeyboardInterrupt:
            print("\nShutting down AI worker...")
            break
        except Exception as e:
            print(f"[AI ERROR] Unexpected error: {e}")
            time.sleep(1)

if __name__ == "__main__":
    main()
