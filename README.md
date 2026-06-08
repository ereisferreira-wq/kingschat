# KMenu AI - Sistema de IA para Vendas via WhatsApp

> Chatbot inteligente com integração WhatsApp, RAG e gerenciamento de contatos para vendas conversacionais.

## 🎯 Features

- ✅ **Chatbot com IA** - OpenAI/Ollama
- ✅ **WhatsApp Integration** - Conexão direta via Baileys
- ✅ **RAG** - Recuperação aumentada com documentos PDF
- ✅ **CRM** - Gerenciamento de contatos e clientes  
- ✅ **Agendador** - Tarefas agendadas automáticas
- ✅ **Tickets** - Sistema de suporte 
- ✅ **Admin Panel** - Dashboard completo
- ✅ **Multi-tenant** - Múltiplas empresas
- ✅ **Gerenciamento de Usuários** - Controle de acesso
- ✅ **Deleção de Dados** - Opção para liberar espaço na VPS

## 🏗️ Arquitetura

```
┌─────────────────────────────────────────────┐
│         Frontend (React + Vite)             │
│        Port: 80 (Docker), 5173 (Dev)        │
└────────────────┬────────────────────────────┘
                 │
        ┌────────┴────────┐
        │                 │
┌───────▼──────┐  ┌───────▼──────┐
│   Backend    │  │    Redis     │
│ Node/Express │  │   (Cache)    │
│ Port: 3000   │  │ Port: 6379   │
└───────┬──────┘  └──────────────┘
        │
┌───────▼──────┐
│  PostgreSQL  │
│ Port: 5432   │
└──────────────┘
```

## 🚀 Quick Start (Local)

### Pré-requisitos
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 15+ (ou usar Docker)

### Instalação

```bash
# 1. Clone ou copie arquivos
git clone https://seu-repo.git
cd kmenu-ai

# 2. Backend
cd backend
cp .env.example .env
npm install
npm run build
npm start

# 3. Frontend (outro terminal)
cd frontend
npm install
npm run dev
```

## 🐳 Deploy com Docker

### Desenvolvimento
```bash
docker-compose up
```

### Produção
```bash
# 1. Preparar .env
cp .env.production.example .env
# Editar com valores seguros

# 2. Deploy
bash deploy.sh

# Ou manual:
docker-compose build
docker-compose up -d
```

**Ver [DEPLOYMENT.md](DEPLOYMENT.md) para guia completo na VPS**

## 📁 Estrutura de Arquivos

```
.
├── backend/                    # API Node.js + Express
│   ├── src/
│   │   ├── app.ts             # Express app setup
│   │   ├── server.ts          # Entry point
│   │   ├── modules/           # Features (auth, chatbot, etc)
│   │   └── shared/            # Database, middleware, utils
│   ├── Dockerfile             # Multi-stage build
│   └── package.json
│
├── frontend/                   # React + Vite + TypeScript
│   ├── src/
│   │   ├── pages/             # Rotas (Dashboard, Admin, etc)
│   │   ├── components/        # Componentes UI
│   │   ├── stores/            # Zustand state
│   │   └── lib/               # Utils e API client
│   ├── Dockerfile
│   └── package.json
│
├── docker-compose.yml         # Produção
├── .env.production.example    # Template de env
├── deploy.sh                  # Script de deployment
└── DEPLOYMENT.md              # Guia completo
```

## 📊 Database Schema

**Principais tabelas:**
- `users` - Usuários do sistema
- `companies` - Empresas/clientes
- `contacts` - Contatos/clientes
- `messages` - Histórico de mensagens
- `documents` - PDFs para RAG
- `tickets` - Suporte/conversas
- `whatsapp_instances` - Conexões WhatsApp
- `schedules` - Tarefas agendadas

## 🔐 Segurança

- [x] HTTPS obrigatório em produção
- [x] JWT com refresh tokens
- [x] Bcrypt para senhas (8 rounds)
- [x] CORS configurado
- [x] Helmet para headers de segurança
- [x] SQL injection prevention (Sequelize ORM)
- [x] XSS protection
- [x] Rate limiting (opcional)

## 📖 API Endpoints Principais

### Auth
```
POST   /login
POST   /signup
POST   /refresh-token
GET    /me
POST   /change-password
POST   /admin/reset-password
```

### Chatbot
```
GET    /chatbot/config
PUT    /chatbot/config
POST   /chatbot/message
GET    /chatbot/history
```

### Contatos
```
GET    /contacts
POST   /contacts
PUT    /contacts/:id
DELETE /contacts/:id
```

### Admin
```
GET    /admin/companies
GET    /users
POST   /company/delete-data
```

## 🧪 Testes

```bash
# Backend
cd backend
npm run test

# Frontend  
cd frontend
npm run test
```

## 📝 Variáveis de Ambiente

Ver `.env.production.example` para referência completa.

**Essenciais:**
- `NODE_ENV` - production/development
- `DB_*` - Credenciais PostgreSQL
- `JWT_SECRET` - Token signing key
- `OPENAI_API_KEY` - Para IA
- `FRONTEND_URL` / `BACKEND_URL` - URLs de acesso

## 🐛 Troubleshooting

### Docker
```bash
# Logs em tempo real
docker-compose logs -f backend

# Reiniciar
docker-compose restart

# Remover tudo
docker-compose down -v
```

### Database
```bash
# Conectar ao PostgreSQL
docker-compose exec postgres psql -U kmenu -d kmenu_ai

# Ver logs
docker-compose logs postgres
```

### Performance
```bash
# Ver uso de recursos
docker stats

# Limpar cache/volumes antigos
docker system prune -a
```

## 📱 WhatsApp Setup

1. Ir ao painel → WhatsApp
2. Clicar em "Conectar Nova Instância"
3. Escanear QR code com seu celular
4. Aguardar conexão ser estabelecida
5. Testar enviando mensagem

## 🤖 Configurar IA

1. Ir ao painel → Chatbot Config
2. Escolher provider (OpenAI/Ollama)
3. Adicionar API key (se OpenAI)
4. Testar resposta

## 📞 Suporte

Para problemas:
1. Verificar logs: `docker-compose logs backend`
2. Checar `.env` e secrets
3. Validar conectividade do banco
4. Reiniciar serviços: `docker-compose restart`

## 📄 Licença

Propriedade do Kings Chat

---

**Pronto para produção! Deploy com segurança. 🚀**
