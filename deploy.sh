#!/bin/bash
ROOT_DIR=$(pwd)
echo "Starting Sentinel AI Edge Deployment from $ROOT_DIR..."

deploy_service() {
    echo "-----------------------------------"
    echo "📦 Setting up and Deploying $1..."
    cd "$ROOT_DIR/$1"
    npm install && npx -y wrangler@3 deploy
    cd "$ROOT_DIR"
}

# 1. Auth API
deploy_service "auth-server"

# 2. Primary API
deploy_service "primary-server"

# 3. AI Hub
deploy_service "ai"

# 4. Messaging Worker
deploy_service "worker-server"

# 5. IoT Simulator
deploy_service "iot-server"

# 6. Frontend (Fixed for Static Export)
echo "-----------------------------------"
echo "📦 Building and Deploying Frontend..."
cd "$ROOT_DIR/client"
npm install
npm run build
# Deploy the 'out' folder created by Next.js static export
npx -y wrangler@3 pages deploy out --project-name sentinel-dashboard
cd "$ROOT_DIR"

echo "-----------------------------------"
echo "✅ All services deployed!"
