#!/bin/bash
# ============================================================================
# KMenu AI - Deployment Script
# Usage: bash deploy.sh
# ============================================================================

set -e

echo "🚀 KMenu AI - Deployment Script"
echo "================================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if .env exists
if [ ! -f ".env" ]; then
    echo -e "${RED}❌ Erro: .env não encontrado${NC}"
    echo "Execute: cp .env.production.example .env"
    exit 1
fi

echo -e "${YELLOW}1️⃣  Verificando pré-requisitos...${NC}"
command -v docker >/dev/null 2>&1 || { echo -e "${RED}❌ Docker não instalado${NC}"; exit 1; }
command -v docker-compose >/dev/null 2>&1 || { echo -e "${RED}❌ Docker Compose não instalado${NC}"; exit 1; }
echo -e "${GREEN}✅ Docker instalado${NC}"

echo -e "${YELLOW}2️⃣  Parando containers antigos...${NC}"
docker-compose down 2>/dev/null || true
echo -e "${GREEN}✅ Containers parados${NC}"

echo -e "${YELLOW}3️⃣  Removendo imagens antigas...${NC}"
docker image prune -f --filter \"dangling=true\" 2>/dev/null || true
echo -e "${GREEN}✅ Imagens limpas${NC}"

echo -e "${YELLOW}4️⃣  Building images...${NC}"
docker-compose build --no-cache
echo -e "${GREEN}✅ Build completo${NC}"

echo -e "${YELLOW}5️⃣  Iniciando containers...${NC}"
docker-compose up -d
echo -e "${GREEN}✅ Containers iniciados${NC}"

echo -e "${YELLOW}6️⃣  Aguardando inicialização (30s)...${NC}"
sleep 30

echo -e "${YELLOW}7️⃣  Executando migrations...${NC}"
docker-compose exec -T backend npm run migrate:latest 2>/dev/null || echo \"Migrations já atualizadas\"
echo -e "${GREEN}✅ Migrations completas${NC}"

echo -e \"${YELLOW}8️⃣  Verificando saúde dos serviços...${NC}\"
backend_health=$(curl -s -o /dev/null -w \"%{http_code}\" http://localhost:3000/health || echo \"000\")
frontend_health=$(curl -s -o /dev/null -w \"%{http_code}\" http://localhost/index.html || echo \"000\")

if [ \"$backend_health\" = \"200\" ]; then
    echo -e \"${GREEN}✅ Backend respondendo${NC}\"
else
    echo -e \"${RED}❌ Backend com problema (HTTP $backend_health)${NC}\"
    docker-compose logs backend | tail -20
fi

if [ \"$frontend_health\" = \"200\" ] || [ \"$frontend_health\" = \"304\" ]; then
    echo -e \"${GREEN}✅ Frontend respondendo${NC}\"
else
    echo -e \"${RED}❌ Frontend com problema (HTTP $frontend_health)${NC}\"
    docker-compose logs frontend | tail -20
fi

echo \"\"
echo \"=====================================\"
echo -e \"${GREEN}🎉 Deployment completo!${NC}\"
echo \"=====================================\"
echo \"\"
echo \"URLs de acesso:\"
echo \"  Frontend:  http://localhost\"
echo \"  Backend:   http://localhost:3000\"
echo \"  API:       http://localhost:3000/api\"
echo \"\"
echo \"Logs em tempo real:\"
echo \"  docker-compose logs -f backend\"
echo \"  docker-compose logs -f frontend\"
echo \"\"
echo \"Para parar:\"
echo \"  docker-compose down\"
echo \"\"
