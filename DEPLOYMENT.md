# 🚀 Guia de Deployment - KMenu AI na VPS

## 📋 Pré-requisitos

- VPS com Ubuntu 20.04+ ou Debian 11+
- Docker instalado: `docker --version`
- Docker Compose instalado: `docker-compose --version`
- Acesso root/sudo
- Domínio configurado (DNS apontando para VPS)
- Certificado SSL (Let's Encrypt gratuito recomendado)

---

## 1️⃣ Preparação da VPS

### 1.1 Atualizar o sistema
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git
```

### 1.2 Instalar Docker
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER
newgrp docker
```

### 1.3 Instalar Docker Compose
```bash
sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose
docker-compose --version
```

### 1.4 Criar diretório do projeto
```bash
mkdir -p ~/kmenu-ai
cd ~/kmenu-ai
```

---

## 2️⃣ Clonar e Preparar Projeto

### 2.1 Clonar repositório
```bash
git clone https://seu-repositorio.git .
# ou fazer upload dos arquivos via SFTP/SCP
```

### 2.2 Criar arquivo .env
```bash
cp .env.production.example .env
nano .env
# Editar valores de produção:
# - Alterar TODOS os "change-me-in-production"
# - Usar URLs HTTPS com seu domínio
# - Gerar JWT_SECRET e REDIS_PASSWORD seguros
```

### 2.3 Gerar Secrets Seguros
```bash
# Gerar 32 bytes aleatórios em hex
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Ou usar openssl
openssl rand -hex 32
```

**Exemplo de .env preenchido:**
```env
NODE_ENV=production
PORT=3000

DB_USER=kmenu_user
DB_PASS=abcd1234efgh5678ijkl9012mnop3456  # 32 hex chars
DB_NAME=kmenu_ai_prod

REDIS_PASSWORD=wxyz7890abcd1234efgh5678ijkl90  # 32 hex chars

JWT_SECRET=key1abcd1234efgh5678ijkl9012mnop3456  # 32 hex
JWT_REFRESH_SECRET=key2wxyz7890abcd1234efgh5678ijkl90  # 32 hex

ADMIN_EMAIL=admin@seudominio.com.br
ADMIN_PASSWORD=SuperSecure@Password2024#

OPENAI_API_KEY=sk-proj-abcd1234...

FRONTEND_URL=https://app.seudominio.com.br
BACKEND_URL=https://api.seudominio.com.br
```

---

## 3️⃣ Configurar Nginx (Reverse Proxy)

### 3.1 Instalar Nginx
```bash
sudo apt install -y nginx
sudo systemctl enable nginx
```

### 3.2 Criar configuração
```bash
sudo nano /etc/nginx/sites-available/kmenu-ai
```

**Conteúdo:**
```nginx
# Backend API
server {
    listen 80;
    server_name api.seudominio.com.br;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Frontend
server {
    listen 80;
    server_name app.seudominio.com.br;
    
    location / {
        proxy_pass http://localhost:80;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 3.3 Ativar site
```bash
sudo ln -s /etc/nginx/sites-available/kmenu-ai /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 3.4 Certificado SSL (Let's Encrypt)
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d api.seudominio.com.br -d app.seudominio.com.br
sudo systemctl restart nginx
```

---

## 4️⃣ Deploy com Docker Compose

### 4.1 Build das imagens
```bash
cd ~/kmenu-ai
docker-compose build
```

### 4.2 Iniciar containers
```bash
docker-compose up -d
```

### 4.3 Verificar status
```bash
docker-compose ps
docker-compose logs backend
docker-compose logs frontend
```

### 4.4 Aguardar inicialização
```bash
# Aguardar ~30 segundos para DB migrar
sleep 30

# Testar backend
curl https://api.seudominio.com.br/health

# Testar frontend (deve retornar HTML)
curl https://app.seudominio.com.br | head -20
```

---

## 5️⃣ Primeira Utilização

### 5.1 Admin Login
- **URL:** `https://app.seudominio.com.br`
- **Email:** (do .env ADMIN_EMAIL)
- **Password:** (do .env ADMIN_PASSWORD)

### 5.2 Alterar senha do admin
1. Fazer login com credenciais iniciais
2. Clicar no perfil (menu lateral)
3. Clicar "Alterar Senha"
4. Definir nova senha forte

### 5.3 Configurações importantes
1. **WhatsApp:** Menu → WhatsApp → Conectar nova instância (QR Code)
2. **OpenAI:** Adicionar API key e modelo no painel chatbot
3. **Documentos:** Fazer upload de PDFs para RAG
4. **Contatos:** Importar ou adicionar contatos manualmente

---

## 6️⃣ Monitoramento e Manutenção

### 6.1 Ver logs em tempo real
```bash
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### 6.2 Reiniciar serviço
```bash
docker-compose restart backend
# ou
docker-compose restart  # reinicia tudo
```

### 6.3 Backup do banco de dados
```bash
docker-compose exec postgres pg_dump -U kmenu_user kmenu_ai_prod > backup-$(date +%Y%m%d).sql
```

### 6.4 Restore do backup
```bash
docker-compose exec -T postgres psql -U kmenu_user kmenu_ai_prod < backup-20240607.sql
```

### 6.5 Limpeza de espaço
```bash
# Ver uso de disco
docker system df

# Remover containers parados
docker container prune -f

# Remover imagens não usadas
docker image prune -f

# Limpeza completa (CUIDADO)
docker system prune -a --volumes
```

---

## 7️⃣ Updates e Patches

### 7.1 Atualizar código
```bash
cd ~/kmenu-ai
git pull origin main
docker-compose build
docker-compose down
docker-compose up -d
```

### 7.2 Zero-downtime deployment (opcional)
```bash
# 1. Build nova imagem
docker-compose build backend

# 2. Atualizar com health checks
docker-compose up -d --no-deps backend
```

---

## 8️⃣ Troubleshooting

### ❌ "Port 80 already in use"
```bash
sudo lsof -i :80
# Matar processo conflitante ou usar porta diferente
```

### ❌ PostgreSQL não conecta
```bash
docker-compose logs postgres
docker-compose restart postgres
```

### ❌ Frontend não carrega
```bash
# Verificar proxy do Nginx
sudo nginx -t
sudo systemctl restart nginx

# Verificar CORS no backend
# Verificar FRONTEND_URL no .env
```

### ❌ Erro de permissão
```bash
sudo chown -R $USER:$USER ~/kmenu-ai
```

### ❌ Falta de espaço em disco
```bash
df -h
# Se < 20% livre, fazer limpeza:
docker system prune -a --volumes
```

---

## 9️⃣ Segurança

### ✅ Checklist
- [ ] Alterar ADMIN_PASSWORD do .env
- [ ] Gerar novos JWT_SECRET e REDIS_PASSWORD
- [ ] HTTPS habilitado (Let's Encrypt)
- [ ] Firewall configurado (ufw)
- [ ] Backup automático configurado
- [ ] Senhas fortes para DB
- [ ] SSH com chave pública
- [ ] Fail2ban instalado

### 🔐 Configurar Firewall
```bash
sudo ufw enable
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw status
```

---

## 🔟 Performance & Otimizações

### Recomendações para VPS
- **RAM mínima:** 2GB (4GB recomendado)
- **CPU:** 1 vCPU (2 vCPU recomendado)
- **Disco:** 20GB SSD (40GB para crescimento)
- **Bandwidth:** Ilimitado ou 1TB+

### Limites de container
Editar `docker-compose.yml`:
```yaml
backend:
  # ... outras configs
  deploy:
    resources:
      limits:
        cpus: '1'
        memory: 1G
```

---

## 📞 Suporte e Logs

Coletar informações para debug:
```bash
# Sistema
uname -a
docker --version
docker-compose --version

# Containers
docker-compose ps
docker-compose logs --tail 100 backend > debug.log
docker-compose exec postgres pg_version

# Performance
free -h
df -h
docker stats
```

---

## 📝 Checklist de Deploy Completo

- [ ] VPS preparada e segura
- [ ] Docker e Docker Compose instalados
- [ ] Código clonado/uploaded
- [ ] `.env` configurado com secrets seguros
- [ ] Nginx configurado como reverse proxy
- [ ] SSL com Let's Encrypt
- [ ] `docker-compose build`
- [ ] `docker-compose up -d`
- [ ] Verificar logs (sem erros)
- [ ] Teste de acesso: frontend e backend
- [ ] Admin consegue fazer login
- [ ] Backup automático configurado
- [ ] Monitoramento ativo

**Pronto para produção! 🎉**
