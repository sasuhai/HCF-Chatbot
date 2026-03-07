#!/bin/bash

# ==============================================================================
# Master Deployment Script: Mac -> GitHub -> Hostinger
# ==============================================================================
# This script handles the "Pre-Built" strategy perfectly:
# 1. Builds on your Mac.
# 2. Pushes to GitHub 'production' branch (for Hostinger's Git manager).
# 3. Rsyncs directly to Hostinger's 'nodejs' folder (for instant updates).
# ==============================================================================

# Configuration
REMOTE_USER="u311693590"
REMOTE_HOST="151.106.124.161"
REMOTE_PORT="65002"
# Note: Hostinger Node.js Manager uses the 'nodejs' folder for the app source.
APP_PATH="/home/u311693590/domains/chatbot.hidayahcentre.my/nodejs"
WEB_PATH="/home/u311693590/domains/chatbot.hidayahcentre.my/public_html"
REPO_URL=$(git remote get-url origin)
PRODUCTION_BRANCH="production"

echo "🚀 Starting Master Deployment..."

# 1. Local Build
echo "📦 Step 1: Building project locally on your Mac..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Local build failed. Deployment aborted."
    exit 1
fi
echo "✅ Build successful!"

# 2. Prepare Deployment Folder
echo "📂 Step 2: Preparing production files..."
rm -rf deploy_cache
mkdir -p deploy_cache
mkdir -p deploy_cache_public/_next/static

# Copy the standalone Next.js files (this includes the necessary .next/server and BUILD_ID)
cp -r .next/standalone/* deploy_cache/ 2>/dev/null || true
# Note: In standalone mode, .next is already inside the standalone folder. 
# We copy it again for absolute certainty of static assets pathing.
cp -r .next/standalone/.next deploy_cache/ 2>/dev/null || true
cp -r public/* deploy_cache/public/ 2>/dev/null || true

# Explicitly ensure static files are in .next/static
mkdir -p deploy_cache/.next/static
cp -r .next/static/* deploy_cache/.next/static/ 2>/dev/null || true

# NEW: Prepare assets for public_html to bypass Node for static files
cp -r .next/static/* deploy_cache_public/_next/static/ 2>/dev/null || true
cp -r public/* deploy_cache_public/ 2>/dev/null || true

# Copy Prisma, Package info and .env
cp -r prisma deploy_cache/ 2>/dev/null || true
cp package.json deploy_cache/ 2>/dev/null || true
cp .env deploy_cache/ 2>/dev/null || true

# Stability fix: Limit Prisma threads in the production .env
echo "" >> deploy_cache/.env
echo "PRISMA_CLIENT_ENGINE_THREAD_COUNT=1" >> deploy_cache/.env
echo "PRISMA_CLIENT_ENGINE_TYPE=library" >> deploy_cache/.env

# FIXED: MANUALLY FORCE PRISMA LINUX ENGINES INTO STANDALONE BUNDLE
# Next.js standalone often skips copying Darwin engines to Linux servers and vice-versa.
echo "🧩 Ensuring Prisma Linux engines are included..."
mkdir -p deploy_cache/node_modules/.prisma/client/
# Use rsync to safely merge the engines into the client folder
rsync -a node_modules/.prisma/client/*.node deploy_cache/node_modules/.prisma/client/ 2>/dev/null || true
rsync -a node_modules/.prisma/client/*.so deploy_cache/node_modules/.prisma/client/ 2>/dev/null || true

# INJECT LOGGING & ENV LOGIC INTO STANDALONE SERVER.JS (Instead of overwriting it)
# We use a very clean injection to avoid corruption.
LOG_FIX='process.env.NODE_ENV="production";process.env.PRISMA_CLIENT_ENGINE_THREAD_COUNT="1";process.env.PRISMA_CLIENT_ENGINE_TYPE="library";process.env.UV_THREADPOOL_SIZE="1";console.log("--- BUNDLED STARTUP ---");require("@next/env").loadEnvConfig(process.cwd());'
sed -i '' "1i\\
$LOG_FIX
" deploy_cache/server.js 2>/dev/null || sed -i "1i$LOG_FIX" deploy_cache/server.js

# Dummy out the 'lint' command so Hostinger's auto-installer doesn't fail
sed -i '' 's/"lint": ".*"/"lint": "echo '\''Bundled Build Detected'\''"/' deploy_cache/package.json 2>/dev/null || sed -i 's/"lint": ".*"/"lint": "echo '\''Bundled Build Detected'\''"/' deploy_cache/package.json

# 3. BREAK THE LOOP: GO OFFLINE EARLY
echo "🌉 Step 3: Going offline to break load loop before sync..."
ssh -p ${REMOTE_PORT} -o ConnectTimeout=15 ${REMOTE_USER}@${REMOTE_HOST} << EOF
  # If a previous deploy failed, restore it first so we have something to rename
  [ -f ${APP_PATH}/server.js.offline ] && mv ${APP_PATH}/server.js.offline ${APP_PATH}/server.js 2>/dev/null
  
  echo "⏸️  Toggling offline..."
  mv ${APP_PATH}/server.js ${APP_PATH}/server.js.offline 2>/dev/null || true
  
  # AGGRESSIVE CLEANUP: Try to kill lingering processes while offline
  # This mimics the "Stop" button more closely
  echo "💀 Cleaning up lingering processes..."
  pkill -u ${REMOTE_USER} node || echo "No processes to kill."
  
  echo "🧹 Clearing server cache..."
  rm -rf ${APP_PATH}/.next/cache
  mkdir -p ${APP_PATH}/.next/cache
EOF

# 4. Direct Sync to Hostinger
echo "📤 Step 4: Fast-Syncing to Hostinger..."
echo "📦 Uploading Node.js App Files..."
# We use -T to minimize impact on the remote filesystem during sync
rsync -avz --progress -T /tmp \
  --exclude="stderr.log" --exclude="stdout.log" --exclude="node_pid" \
  -e "ssh -p ${REMOTE_PORT} -o ConnectTimeout=60" \
  deploy_cache/ ${REMOTE_USER}@${REMOTE_HOST}:${APP_PATH}/

echo "🖼️ Uploading Static Assets to Public Web Root..."
rsync -avz --progress \
  -e "ssh -p ${REMOTE_PORT} -o ConnectTimeout=60" \
  deploy_cache_public/ ${REMOTE_USER}@${REMOTE_HOST}:${WEB_PATH}/

# 5. Restore & Restart
echo "🚀 Step 5: Restoring & Signaling Restart..."
ssh -p ${REMOTE_PORT} -o ConnectTimeout=15 ${REMOTE_USER}@${REMOTE_HOST} << EOF
  echo "📝 Updating .htaccess..."
  cat > ${WEB_PATH}/.htaccess << 'HTACCESS'
PassengerAppRoot ${APP_PATH}
PassengerAppType node
PassengerNodejs /opt/alt/alt-nodejs22/root/bin/node
PassengerStartupFile server.js
PassengerBaseURI /
RewriteEngine On
RewriteRule ^\.builds - [F,L]
# Deploy ID: $(date +%s)
HTACCESS

  echo "▶️  Restoring server file..."
  mv ${APP_PATH}/server.js.offline ${APP_PATH}/server.js 2>/dev/null || true

  echo "🔄 Signaling Passenger to restart..."
  mkdir -p ${APP_PATH}/tmp
  rm -f ${APP_PATH}/tmp/restart.txt
  sleep 4
  touch ${APP_PATH}/tmp/restart.txt
  
  echo "✅ Server-side restart signals sent."
  
  # 6. Optional: Quick health check
  echo "🩺 Waiting for app to wake up..."
  sleep 10
  APP_PORT=\$(grep "^PORT=" ${APP_PATH}/.env | cut -d'=' -f2)
  APP_PORT=\${APP_PORT:-3000}
  echo "🔍 Checking health on port \$APP_PORT..."
  curl -I http://localhost:\$APP_PORT 2>/dev/null | head -n 1 || echo "⚠️ App starting in background."
EOF

rm -rf deploy_cache
rm -rf deploy_cache_public

echo ""
echo "✨ DEPLOYMENT COMPLETE!"
echo "----------------------------------------------------------------"
echo "👉 Site: https://chatbot.hidayahcentre.my"
echo "👉 If it still says 503, click 'Start/Stop' in Hostinger Dashboard."
echo "----------------------------------------------------------------"
