import redis
import json
import time
import os
from datetime import datetime
from dotenv import load_dotenv
from bson import ObjectId
from pymongo import MongoClient

load_dotenv()

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379")
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/google-solutions")

INPUT_QUEUE = "ai_evidence_queue"
OUTPUT_QUEUE = "ai_result_queue"


def classify_crisis(sensors):
    if sensors.get("smoke_ppm", 0) > 200 or sensors.get("co_ppm", 0) > 50 or sensors.get("flame_detected", False):
        severity = max(
            sensors.get("smoke_ppm", 0) / 1000,
            sensors.get("co_ppm", 0) / 200,
            0.8 if sensors.get("flame_detected", False) else 0,
            (sensors.get("temperature_c", 0) - 30) / 100,
        )
        return {
            "crisis_detected": True,
            "crisis_type": "fire",
            "confidence_score": round(min(0.95, max(0.5, severity)), 3),
        }

    if sensors.get("gas_lpg_ppm", 0) > 200 or sensors.get("gas_methane_ppm", 0) > 100 or (
        sensors.get("co_ppm", 0) > 80 and not sensors.get("flame_detected", False)
    ):
        severity = max(
            sensors.get("gas_lpg_ppm", 0) / 500,
            sensors.get("gas_methane_ppm", 0) / 250,
            sensors.get("co_ppm", 0) / 200,
        )
        return {
            "crisis_detected": True,
            "crisis_type": "gas_leak",
            "confidence_score": round(min(0.95, max(0.45, severity)), 3),
        }

    if sensors.get("vibration_g", 0) > 0.3:
        severity = sensors.get("vibration_g", 0) / 1.5
        return {
            "crisis_detected": True,
            "crisis_type": "earthquake",
            "confidence_score": round(min(0.95, max(0.5, severity)), 3),
        }

    if sensors.get("motion_detected", False) and sensors.get("sound_db", 0) > 80 and sensors.get("door_open", False):
        severity = max(
            (sensors.get("sound_db", 0) - 60) / 50,
            sensors.get("vibration_g", 0) / 0.5,
        )
        return {
            "crisis_detected": True,
            "crisis_type": "security",
            "confidence_score": round(min(0.90, max(0.4, severity)), 3),
        }

    if sensors.get("water_level_cm", 0) > 2 or (
        sensors.get("moisture_detected", False) and sensors.get("humidity_pct", 0) > 85
    ):
        severity = max(
            sensors.get("water_level_cm", 0) / 15,
            sensors.get("humidity_pct", 0) / 100,
        )
        return {
            "crisis_detected": True,
            "crisis_type": "water_leak",
            "confidence_score": round(min(0.90, max(0.45, severity)), 3),
        }

    if sensors.get("air_quality_index", 0) > 150 or sensors.get("co2_ppm", 0) > 1500:
        severity = max(
            sensors.get("air_quality_index", 0) / 350,
            sensors.get("co2_ppm", 0) / 3000,
        )
        return {
            "crisis_detected": True,
            "crisis_type": "air_quality",
            "confidence_score": round(min(0.90, max(0.4, severity)), 3),
        }

    return {"crisis_detected": False}


def json_serializer(obj):
    if isinstance(obj, ObjectId):
        return str(obj)
    if isinstance(obj, datetime):
        return obj.isoformat()
    return str(obj)


def get_venue_and_crisis_details(mongo_db, venue_id, crisis_type):
    venue = None
    crisis = None
    try:
        venue = mongo_db.venues.find_one({"_id": ObjectId(venue_id)})
    except Exception as e:
        print(f"[AI WARN] Failed to lookup venue {venue_id}: {e}")
    try:
        crisis = mongo_db.crisis_types.find_one({"type": crisis_type})
    except Exception as e:
        print(f"[AI WARN] Failed to lookup crisis type {crisis_type}: {e}")
    return venue, crisis


def format_doc_for_redis(doc):
    if not doc:
        return None
    result = {}
    for k, v in doc.items():
        if isinstance(v, ObjectId):
            result[k] = str(v)
        elif isinstance(v, datetime):
            result[k] = v.isoformat()
        elif isinstance(v, dict):
            result[k] = {dk: str(dv) if isinstance(dv, (ObjectId, datetime)) else dv for dk, dv in v.items()}
        elif isinstance(v, list):
            formatted = []
            for item in v:
                if isinstance(item, dict):
                    formatted.append({dk: str(dv) if isinstance(dv, (ObjectId, datetime)) else dv for dk, dv in item.items()})
                else:
                    formatted.append(item)
            result[k] = formatted
        else:
            result[k] = v
    return result


def main():
    print(f"Connecting to Redis at {REDIS_URL}...")
    r = redis.from_url(REDIS_URL, decode_responses=True)
    r.ping()
    print("Redis connected")

    print(f"Connecting to MongoDB at {MONGO_URI}...")
    mongo_client = MongoClient(MONGO_URI)
    db_name = MONGO_URI.rsplit("/", 1)[-1].split("?")[0]
    mongo_db = mongo_client[db_name]
    print(f"MongoDB connected to database: {db_name}")

    venue_count = mongo_db.venues.count_documents({})
    crisis_count = mongo_db.crisis_types.count_documents({})
    print(f"Found {venue_count} venues, {crisis_count} crisis types in DB")

    if venue_count == 0 or crisis_count == 0:
        print("[AI ERROR] No venues or crisis types found. Run seed first!")

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
            sensors = evidence.get("sensors", {})

            classification = classify_crisis(sensors)

            if not classification["crisis_detected"]:
                print(f"[AI] {device_id}@{zone} -> no crisis")
                continue

            crisis_type = classification["crisis_type"]
            confidence = classification["confidence_score"]

            venue, crisis = get_venue_and_crisis_details(mongo_db, venue_id, crisis_type)

            if not venue:
                print(f"[AI WARN] Venue not found: {venue_id}")
            if not crisis:
                print(f"[AI WARN] Crisis type not found: {crisis_type}")

            crisis_oid = crisis["_id"] if crisis else None

            mongo_db.ai_responses.insert_one({
                "venue": ObjectId(venue_id) if venue_id else None,
                "crisis": crisis_oid,
                "confidence_score": confidence,
                "status": "active",
                "zones": [zone],
            })

            venue_formatted = format_doc_for_redis(venue)
            crisis_formatted = format_doc_for_redis(crisis)

            output = {
                "venue_id": venue_id,
                "zone": zone,
                "device_id": device_id,
                "timestamp": evidence.get("timestamp", ""),
                "crisis_detected": True,
                "crisis_type": crisis_type,
                "confidence_score": confidence,
                "venue_details": venue_formatted,
                "crisis_details": crisis_formatted,
            }

            serialized = json.dumps(output, default=json_serializer)
            r.lpush(OUTPUT_QUEUE, serialized)
            print(f"[AI] {device_id}@{zone} -> {crisis_type} (confidence={confidence}) -> queued")

        except KeyboardInterrupt:
            print("\nShutting down AI worker...")
            break
        except Exception as e:
            print(f"[AI ERROR] {type(e).__name__}: {e}")
            import traceback
            traceback.print_exc()
            time.sleep(1)


if __name__ == "__main__":
    main()
