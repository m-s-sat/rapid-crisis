#!/bin/bash

echo " Starting Sentinel AI Edge Deployment..."

# 1. Auth API
echo " Deploying Auth API..."
cd auth-server && npx wrangler deploy && cd ..

# 2. Primary API
echo " Deploying Primary API..."
cd primary-server && npx wrangler deploy && cd ..

# 3. AI Hub
echo " Deploying AI Hub..."
cd ai && npx wrangler deploy && cd ..

# 4. Messaging Worker
echo " Deploying Messaging Worker..."
cd worker-server && npx wrangler deploy && cd ..

# 5. IoT Simulator
echo " Deploying IoT Simulator..."
cd iot-server && npx wrangler deploy && cd ..

# 6. Frontend
echo " Building and Deploying Frontend..."
cd client && npm run build && npx wrangler pages deploy .next && cd ..

echo " All services deployed!"
echo " Next Step: Run 'npx wrangler secret put [KEY]' in each folder for your MONGO_URI and API Keys."
