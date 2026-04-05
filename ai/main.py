import redis
import json
import time
import os
import boto3
import base64
from datetime import datetime
from dotenv import load_dotenv
from bson import ObjectId
from pymongo import MongoClient

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/google-solutions")

# AWS Bedrock Config
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_MODEL_ID = os.getenv("AWS_MODEL_ID", "amazon.nova-lite-v1:0")

INPUT_QUEUE = "ai_evidence_queue"
OUTPUT_QUEUE = "ai_result_queue"

# Initialize Bedrock Client
bedrock_client = None
if AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY:
    try:
        bedrock_client = boto3.client(
            service_name='bedrock-runtime',
            region_name=AWS_REGION,
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY
        )
        print(f"[AI] Connected to AWS Bedrock ({AWS_REGION}) using Universal Converse API")
        print(f"[AI] Active Model: {AWS_MODEL_ID}")
    except Exception as e:
        print(f"[AI ERROR] Failed to initialize Bedrock client: {e}")
else:
    print("[AI WARNING] AWS credentials not found. Bedrock classification will fail.")

# Classifies crisis using the Bedrock Universal Converse API (Compatible with Nova and Claude)
def classify_with_ai(evidence):
    if not bedrock_client:
        return {"crisis_detected": False, "error": "AWS Bedrock client not initialized"}

    sensors = evidence.get("sensors", {})
    zone = evidence.get("location", {}).get("zone", "unknown")
    
    prompt_text = f"""
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

    content = [{"text": prompt_text}]

    # Process base64 image (DISABLED FOR NOW)
    # if "media" in evidence and evidence["media"].get("photo"):
    #     raw_photo = str(evidence["media"]["photo"]).strip()
    #     
    #     # Robustly strip prefix if present (e.g. data:image/png;base64,)
    #     if "," in raw_photo:
    #         photo_data = raw_photo.split(",")[1]
    #     else:
    #         photo_data = raw_photo
    #         
    #     try:
    #         # Bedrock Converse API wants raw bytes
    #         image_bytes = base64.b64decode(photo_data)
    #         
    #         # Detect format by sniffing headers
    #         if photo_data.startswith("iVBOR"):
    #             mime_format = "png"
    #         elif photo_data.startswith("/9j/"):
    #             mime_format = "jpeg"
    #         elif photo_data.startswith("UklGR"):
    #             mime_format = "webp"
    #         else:
    #             mime_format = "png" # Default fallback
    #         
    #         content.append({
    #             "image": {
    #                 "format": mime_format,
    #                 "source": {"bytes": image_bytes}
    #             }
    #         })
    #     except Exception as e:
    #         print(f"[AI ERROR] Base64 image decoding failed: {e}")

    try:
        response = bedrock_client.converse(
            modelId=AWS_MODEL_ID,
            messages=[{"role": "user", "content": content}],
            inferenceConfig={
                "maxTokens": 1000,
                "temperature": 0.1
            }
        )
        
        raw_text = response['output']['message']['content'][0]['text'].strip()
        
        # Clean Markdown
        if raw_text.startswith("```json"):
            raw_text = raw_text[7:-3].strip()
        elif raw_text.startswith("```"):
            raw_text = raw_text[3:-3].strip()
            
        return json.loads(raw_text)
    except Exception as e:
        print(f"[AI ERROR] Bedrock classification failed: {e}")
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

            print(f"[AI] Analyzing {device_id}@{zone} via {AWS_MODEL_ID}...")
            classification = classify_with_ai(evidence)

            if not classification.get("crisis_detected"):
                reason = classification.get('reasoning', 'Normal operation')
                print(f"[AI] No crisis: {reason}")
                continue

            crisis_type = classification["crisis_type"]
            confidence = classification["confidence_score"]
            print(f"[AI] ALERT: {crisis_type} detected ({confidence*100}%)")

            venue, crisis = get_venue_and_crisis_details(mongo_db, venue_id, crisis_type)
            if not crisis:
                print(f"[AI ERROR] Unknown crisis type '{crisis_type}'. Using 'other'.")
                _, crisis = get_venue_and_crisis_details(mongo_db, venue_id, "other")

            # Store in MongoDB
            mongo_db.ai_responses.insert_one({
                "venue": ObjectId(venue_id) if venue_id else None,
                "crisis": crisis["_id"] if crisis else None,
                "confidence_score": confidence,
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
                "venue_details": format_doc(venue),
                "crisis_details": format_doc(crisis),
                "status": "active"
            }

            r.lpush(OUTPUT_QUEUE, json.dumps(output))
            print(f"[AI] Crisis Pushed to Result Queue!")

        except KeyboardInterrupt:
            print("\nShutting down AI worker...")
            break
        except Exception as e:
            print(f"[AI ERROR] Loop error: {e}")
            time.sleep(1)

if __name__ == "__main__":
    main()
