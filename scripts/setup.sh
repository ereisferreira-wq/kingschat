#!/bin/bash
# Kmenu AI - Setup Script for Ubuntu/Debian VPS
# This script installs everything needed to run Kmenu AI

set -e

echo "🚀 Kmenu AI - Setup"
echo "===================="

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}Please run as root (sudo)${NC}"
  exit 1
fi

# Update system
echo -e "${GREEN}[1/7] Updating system...${NC}"
apt update && apt upgrade -y

# Install dependencies
echo -e "${GREEN}[2/7] Installing dependencies...${NC}"
apt install -y \
  apt-transport-https \
  ca-certificates \
  curl \
  software-properties-common \
  git \
  nginx \
  certbot \
  python3-certbot-nginx \
  postgresql \
  postgresql-contrib \
  redis-server

# Install Docker
echo -e "${GREEN}[3/7] Installing Docker...${NC}"
curl -fsSL https://get.docker.com | sh
systemctl enable docker
systemctl start docker

# Install Node.js 20
echo -e "${GREEN}[4/7] Installing Node.js 20...${NC}"
curl -fsSL https://deb.nodesource.com/setup_20.x | bash
apt install -y nodejs

# Configure PostgreSQL
echo -e "${GREEN}[5/7] Configuring PostgreSQL...${NC}"
sudo -u postgres psql -c "CREATE USER kmenu WITH PASSWORD 'kmenu_secret';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE kmenu_ai OWNER kmenu;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE kmenu_ai TO kmenu;" 2>/dev/null || true

# Configure Redis
echo -e "${GREEN}[6/7] Configuring Redis...${NC}"
sed -i 's/requirepass .*/requirepass kmenu_redis/' /etc/redis/redis.conf 2>/dev/null || true
systemctl restart redis

# Clone and setup project
echo -e "${GREEN}[7/7] Setting up Kmenu AI...${NC}"
cd /opt
if [ ! -d "kmenu-ai" ]; then
  git clone https://github.com/yourusername/kmenu-ai.git
fi
cd kmenu-ai/backend
npm install
cp .env.example .env
# Generate JWT secrets
sed -i "s/JWT_SECRET=.*/JWT_SECRET=$(openssl rand -base64 32)/" .env
sed -i "s/JWT_REFRESH_SECRET=.*/JWT_REFRESH_SECRET=$(openssl rand -base64 32)/" .env

# Build and start
npm run build

# Install PM2
npm install -g pm2
pm2 start dist/server.js --name kmenu-ai
pm2 save
pm2 startup

# Configure nginx
cat > /etc/nginx/sites-available/kmenu << 'EOF'
server {
    listen 80;
    server_name _;
    client_max_body_size 100M;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
EOF

ln -sf /etc/nginx/sites-available/kmenu /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl restart nginx

echo ""
echo -e "${GREEN}✅ Kmenu AI instalado com sucesso!${NC}"
echo ""
echo "Backend: http://$(curl -s ifconfig.me):3000"
echo ""
echo "📌 Próximos passos:"
echo "1. Configure seu domínio no nginx"
echo "2. Rode: certbot --nginx -d seu-dominio.com"
echo "3. Configure a OpenAI API key no .env"
echo "4. Acesse o frontend após build"
echo ""
