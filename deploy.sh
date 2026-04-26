#!/bin/bash
ROOT_DIR=$(pwd)
echo "Starting Sentinel AI Production Deployment..."

deploy_service() {
    echo "-----------------------------------"
    echo "📦 Setting up and Deploying $1..."
    cd "$ROOT_DIR/$1"
    npm install && npx -y wrangler@3 deploy
    cd "$ROOT_DIR"
}

# Backend Services
deploy_service "auth-server"
deploy_service "primary-server"
deploy_service "ai"
deploy_service "worker-server"
deploy_service "iot-server"

# Frontend (Production Scrub Build)
echo "-----------------------------------"
echo "📦 Building Frontend (Deep Clean)..."
cd "$ROOT_DIR/client"

# 1. Clear ALL caches to prevent URL ghosting
rm -rf .next
rm -rf out
rm -rf node_modules/.cache

# 2. Verify ENV variables
echo "🔍 Verifying Build Environment..."
# Use a trick to read .env without exporting it globally
if [ -f .env ]; then
  echo "Found client/.env"
  grep NEXT_PUBLIC_ "$ROOT_DIR/client/.env"
else
  echo "❌ Error: client/.env not found!"
  exit 1
fi

# 3. Build & Deploy
npm install
npm run build
npx -y wrangler@3 pages deploy out --project-name sentinel-dashboard
cd "$ROOT_DIR"

echo "-----------------------------------"
echo "✅ Production Deployment Complete!"
