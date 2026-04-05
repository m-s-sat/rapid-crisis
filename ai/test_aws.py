import boto3
import json
import os
from dotenv import load_dotenv

load_dotenv()

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "")
AWS_REGION = os.getenv("AWS_REGION", "us-east-1")
AWS_MODEL_ID = os.getenv("AWS_MODEL_ID", "anthropic.claude-3-haiku-20240307-v1:0")

def test_bedrock():
    print(f"Testing AWS Bedrock with model: {AWS_MODEL_ID}")
    
    if not AWS_ACCESS_KEY_ID or not AWS_SECRET_ACCESS_KEY:
        print("Error: AWS credentials missing in .env")
        return

    try:
        client = boto3.client(
            service_name='bedrock-runtime',
            region_name=AWS_REGION,
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY
        )
        
        body = json.dumps({
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 100,
            "messages": [
                {
                    "role": "user",
                    "content": [{"type": "text", "text": "Are you ready for crisis detection? Respond with YES or NO."}]
                }
            ]
        })

        response = client.invoke_model(
            body=body,
            modelId=AWS_MODEL_ID,
            accept="application/json",
            contentType="application/json"
        )
        
        response_body = json.loads(response.get('body').read())
        text = response_body.get('content', [{}])[0].get('text', '')
        print(f"Response from Claude: {text}")
        print("SUCCESS: Bedrock is configured correctly.")
        
    except Exception as e:
        print(f"FAILURE: {e}")

if __name__ == "__main__":
    test_bedrock()
