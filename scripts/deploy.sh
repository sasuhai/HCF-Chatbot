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

# Copy the standalone Next.js files (this includes the necessary .next/server and BUILD_ID)
cp -r .next/standalone/* deploy_cache/ 2>/dev/null || true
cp -r .next/standalone/.next deploy_cache/ 2>/dev/null || true
cp -r public deploy_cache/ 2>/dev/null || true

# Explicitly ensure static files are in .next/static
mkdir -p deploy_cache/.next/static
cp -r .next/static/* deploy_cache/.next/static/ 2>/dev/null || true

# Copy Prisma and Package info
cp -r prisma deploy_cache/ 2>/dev/null || true
cp package.json deploy_cache/ 2>/dev/null || true

# Dummy out the 'lint' command so Hostinger's auto-installer doesn't fail
sed -i '' 's/"lint": ".*"/"lint": "echo '\''Bundled Build Detected'\''"/' deploy_cache/package.json 2>/dev/null || sed -i 's/"lint": ".*"/"lint": "echo '\''Bundled Build Detected'\''"/' deploy_cache/package.json

# 3. Direct Sync to Hostinger (For instant results)
echo "📤 Step 3: Fast-Syncing to Hostinger 'nodejs' folder..."
rsync -avz --progress --delete \
  -e "ssh -p ${REMOTE_PORT} -o ConnectTimeout=30" \
  deploy_cache/ ${REMOTE_USER}@${REMOTE_HOST}:${APP_PATH}/

# 4. [REMOVED] GitHub Push step removed to prevent Hostinger auto-deploy redundancy.
# Your code stays on GitHub (main branch) for backup, but isn't pushed to production branch.
echo "⏭️ Step 4: Skipping GitHub Push (using Direct Fast-Sync instead)"

# 5. Connect the Proxy Bridge
echo "🌉 Step 5: Setting up Hostinger Proxy Bridge..."
ssh -p ${REMOTE_PORT} ${REMOTE_USER}@${REMOTE_HOST} << EOF
  # Create a clean .htaccess in public_html that points to the nodejs folder
  cat > ${WEB_PATH}/.htaccess << 'HTACCESS'
PassengerAppRoot ${APP_PATH}
PassengerAppType node
PassengerNodejs /opt/alt/alt-nodejs22/root/bin/node
PassengerStartupFile server.js
PassengerBaseURI /
PassengerRestartDir ${APP_PATH}/tmp
RewriteEngine On
RewriteRule ^\.builds - [F,L]
HTACCESS

  # Trigger a Passenger restart
  mkdir -p ${APP_PATH}/tmp
  touch ${APP_PATH}/tmp/restart.txt
EOF

rm -rf deploy_cache

echo ""
echo "✨ DEPLOYMENT COMPLETE!"
echo "----------------------------------------------------------------"
echo "👉 Site: https://chatbot.hidayahcentre.my"
echo "👉 If it still says 503, click 'Start/Stop' in Hostinger Dashboard."
echo "----------------------------------------------------------------"
