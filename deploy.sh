#!/bin/bash
set -e
cd /root/kingschat
echo "📥 Pulling latest code..."
git pull
echo "🔧 Rebuilding backend..."
docker compose build backend --no-cache
echo "🚀 Restarting all services..."
docker compose up -d
echo "📋 Logs:"
docker compose logs --tail=15 backend
