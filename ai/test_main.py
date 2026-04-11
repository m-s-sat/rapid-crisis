import pytest
import asyncio
import json
import base64
from datetime import datetime
from bson import ObjectId
from unittest.mock import AsyncMock, patch, MagicMock
import sys
import os


sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

# Import everything from your main script
# Replace 'main' with the actual filename of your script if different (e.g., app, sentinel)
from main import (
    MediaCapture,
    CrisisEvidencePayload,
    CrisisClassification,
    media_to_message,
    json_serializer,
    format_doc,
    get_venue_and_crisis_details,
    classify_with_ai,
    main as sentinel_main
)

# --- Test Data ---

# Tiny base64 strings simulating media
FAKE_IMAGE_B64 = base64.b64encode(b"fake_image_data").decode('utf-8')
FAKE_AUDIO_B64 = base64.b64encode(b"fake_audio_data").decode('utf-8')
FAKE_VIDEO_B64 = base64.b64encode(b"fake_video_data").decode('utf-8')

VALID_PAYLOAD = {
    "venue_id": "5f8f8c44b54764421b7156c3",
    "device_id": "sensor-001",
    "device_mac": "00:1B:44:11:3A:B7",
    "timestamp": "2026-04-11T18:18:22Z",
    "location": {"zone": "Lobby"},
    "sensors": {"temperature": 45, "smoke_level": 0.8},
    "media": {
        "photo": FAKE_IMAGE_B64,
        "audio": FAKE_AUDIO_B64,
        "video": FAKE_VIDEO_B64
    }
}

# --- 1. Payload & Pydantic Validation Tests ---

def test_payload_validation():
    """Test that the Pydantic models correctly parse and validate Redis JSON."""
    payload = CrisisEvidencePayload(**VALID_PAYLOAD)
    
    assert payload.venue_id == "5f8f8c44b54764421b7156c3"
    assert payload.device_id == "sensor-001"
    assert payload.location["zone"] == "Lobby"
    assert payload.media.photo == FAKE_IMAGE_B64

# --- 2. Media Conversion Logic Tests ---

def test_media_to_message_image_data_uri():
    data_uri = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
    msg = media_to_message(data_uri, "image")
    
    content = msg.content[0]
    assert content["type"] == "image_url"
    assert content["image_url"]["url"] == data_uri

def test_media_to_message_image_pure_b64():
    pure_b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg=="
    msg = media_to_message(pure_b64, "image", mime_type="image/png")
    
    content = msg.content[0]
    assert content["type"] == "image_url"
    assert content["image_url"]["url"] == f"data:image/png;base64,{pure_b64}"

def test_media_to_message_audio_data_uri():
    # Simulate a data URI for audio
    pure_b64 = "fake_audio_data"
    data_uri = f"data:audio/mp3;base64,{pure_b64}"
    msg = media_to_message(data_uri, "audio")
    
    content = msg.content[0]
    assert content["type"] == "media"
    assert content["mime_type"] == "audio/mp3"
    assert content["data"] == pure_b64

def test_media_to_message_audio_pure_b64():
    pure_b64 = "fake_audio_data"
    msg = media_to_message(pure_b64, "audio", mime_type="audio/wav")
    
    content = msg.content[0]
    assert content["type"] == "media"
    assert content["mime_type"] == "audio/wav"
    assert content["data"] == pure_b64

# --- 3. Serialization and Formatting Tests ---

def test_json_serializer():
    obj_id = ObjectId()
    dt = datetime(2026, 4, 11, 18, 18, 22)
    
    assert json_serializer(obj_id) == str(obj_id)
    assert json_serializer(dt) == "2026-04-11T18:18:22"
    assert json_serializer("test") == "test"

def test_format_doc():
    obj_id = ObjectId()
    doc = {"_id": obj_id, "name": "Test Venue"}
    
    formatted = format_doc(doc)
    assert formatted["_id"] == str(obj_id)
    assert formatted["name"] == "Test Venue"
    assert format_doc(None) is None

# --- 4. Database Fetching Logic Tests ---

@pytest.mark.asyncio
async def test_get_venue_and_crisis_details():
    mock_db = MagicMock()
    mock_db.venues.find_one = AsyncMock(return_value={"_id": ObjectId(), "name": "Test Venue"})
    mock_db.crisis_types.find_one = AsyncMock(return_value={"_id": ObjectId(), "type": "fire"})

    venue, crisis = await get_venue_and_crisis_details(mock_db, "5f8f8c44b54764421b7156c3", "fire")
    
    assert venue["name"] == "Test Venue"
    assert crisis["type"] == "fire"
    mock_db.venues.find_one.assert_called_once()
    mock_db.crisis_types.find_one.assert_called_once()

# --- 5. AI Classification Tests (Mocking ChatOpenAI/OpenRouter) ---

@pytest.mark.asyncio
@patch("main.llm", create=True) # Patching the structured LLM instance
async def test_classify_with_ai(mock_llm):
    # Setup mock LLM response (simulating the Pydantic structured output from OpenRouter)
    mock_response = CrisisClassification(
        crisis_detected=True,
        crisis_type="fire",
        confidence_score=0.92,
        summary="Smoke and fire detected in the Lobby.",
        reasoning="Sensors indicate extreme heat and smoke; visual confirmation via media."
    )
    # The ChatOpenAI wrapper's ainvoke method returns our structured pydantic model
    mock_llm.ainvoke = AsyncMock(return_value=mock_response)
    
    # Python objects (like MagicMock) evaluate to True, so this will pass the 'if not llm:' check
    # inside your classify_with_ai function.

    # Execute
    payload = CrisisEvidencePayload(**VALID_PAYLOAD)
    result = await classify_with_ai(payload)

    # Verify
    assert result["crisis_detected"] is True
    assert result["crisis_type"] == "fire"
    assert result["confidence_score"] == 0.92
    
    # Ensure ainvoke was called with the assembled messages
    mock_llm.ainvoke.assert_called_once()
    args, kwargs = mock_llm.ainvoke.call_args
    messages = args[0]
    
    # 2 default messages (System, Human telemetry) + 3 media messages
    assert len(messages) == 5

# --- 6. Main Integration Loop Test ---

@pytest.mark.asyncio
@patch("main.redis.from_url")
@patch("main.AsyncIOMotorClient")
@patch("main.classify_with_ai")
@patch("main.get_venue_and_crisis_details")
async def test_main_loop(mock_get_details, mock_classify, mock_mongo_client, mock_redis_func):
    """
    Tests the main while True loop. 
    We inject a CancelledError after processing one message to gracefully stop the loop.
    """
    
    # 1. Setup Redis Mock
    mock_redis = AsyncMock()
    mock_redis_func.return_value = mock_redis
    
    # First call to brpop returns our payload. Second call raises CancelledError to break the loop.
    mock_redis.brpop.side_effect = [
        ("ai_evidence_queue", json.dumps(VALID_PAYLOAD)),
        asyncio.CancelledError()
    ]

    # 2. Setup Mongo Mock
    mock_db = MagicMock()
    mock_db.ai_responses.insert_one = AsyncMock()
    # Mocking client dictionary access (mongo_client[db_name])
    mock_mongo_client.return_value.__getitem__.return_value = mock_db
    
    # 3. Setup Classify Mock
    mock_classify.return_value = {
        "crisis_detected": True,
        "crisis_type": "fire",
        "confidence_score": 0.95,
        "summary": "Urgent fire in Lobby",
        "reasoning": "Tested reasoning"
    }

    # 4. Setup Database Details Mock
    mock_venue = {"_id": ObjectId(VALID_PAYLOAD["venue_id"]), "name": "Lobby A"}
    mock_crisis = {"_id": ObjectId(), "type": "fire"}
    mock_get_details.return_value = (mock_venue, mock_crisis)

    # Run the main loop
    try:
        await sentinel_main()
    except asyncio.CancelledError:
        pass

    # Allow background tasks (created via create_task) to finish
    await asyncio.sleep(0.1)

    # --- Assertions ---
    
    # Ensure classification was called
    mock_classify.assert_called_once()
    
    # Ensure we fetched venue info
    mock_get_details.assert_called_once()

    # Ensure we stored the result in MongoDB
    mock_db.ai_responses.insert_one.assert_called_once()
    insert_args = mock_db.ai_responses.insert_one.call_args[0][0]
    assert insert_args["confidence_score"] == 0.95
    assert insert_args["summary"] == "Urgent fire in Lobby"
    
    # Ensure we pushed the result back to Redis
    mock_redis.lpush.assert_called_once()
    lpush_args = mock_redis.lpush.call_args[0]
    assert lpush_args[0] == "ai_result_queue"
    pushed_payload = json.loads(lpush_args[1])
    assert pushed_payload["crisis_detected"] is True
    assert pushed_payload["venue_id"] == VALID_PAYLOAD["venue_id"]