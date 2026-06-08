# ✅ KMenu AI - Production Deployment Checklist

## 📋 Pré-Deploy

### Segurança
- [ ] `.env` configurado com senhas SEGURAS
- [ ] JWT_SECRET alterado (mínimo 32 caracteres)
- [ ] REDIS_PASSWORD alterado
- [ ] DB_PASS alterado (mínimo 16 caracteres)
- [ ] ADMIN_PASSWORD alterado
- [ ] Nenhum arquivo `.env` commitado no Git
- [ ] HTTPS habilitado com certificado válido

### Infraestrutura
- [ ] VPS com Ubuntu 20.04+ ou Debian 11+
- [ ] Mínimo 2GB RAM, 1 vCPU, 20GB SSD
- [ ] Docker instalado e testado
- [ ] Docker Compose v2+ instalado
- [ ] Domínio apontando para VPS (DNS)
- [ ] Ports 80, 443 abertos no firewall
- [ ] SSH key-based authentication configurado

### Aplicação
- [ ] Backend compila sem erros: `npm run build`
- [ ] Frontend compila sem erros: `npm run build`
- [ ] Todas as migrations atualizadas
- [ ] Tests passam localmente
- [ ] .env.production.example completo e documentado

---

## 🚀 Deploy

### 1. Preparação
```bash
# 1.1 SSH na VPS
ssh root@seu-ip-vps

# 1.2 Criar diretório
mkdir -p ~/kmenu-ai
cd ~/kmenu-ai

# 1.3 Fazer upload dos arquivos
scp -r ~/projeto-local/* root@seu-ip-vps:~/kmenu-ai/
```

### 2. Configuração
- [ ] `.env` criado com valores de produção
- [ ] URLs HTTPS (FRONTEND_URL, BACKEND_URL)
- [ ] ADMIN_EMAIL e ADMIN_PASSWORD definidos
- [ ] OPENAI_API_KEY configurada
- [ ] Todos os "change-me-in-production" alterados

### 3. Nginx + SSL
- [ ] Nginx instalado e configurado
- [ ] Let's Encrypt certificado instalado
- [ ] Nginx redirecionando HTTP para HTTPS
- [ ] Reverse proxy funcionando para backend/frontend

### 4. Deploy
```bash
# 4.1 Executar script
bash deploy.sh

# 4.2 Verificar logs
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres

# 4.3 Testar acesso
curl -I https://api.seu-dominio.com/health
curl -I https://app.seu-dominio.com
```

### 5. Validação Pós-Deploy
- [ ] Frontend carrega (HTTPS)
- [ ] Login funciona com admin
- [ ] Dashboard mostra dados
- [ ] Pode criar contatos
- [ ] Pode configurar WhatsApp
- [ ] Pode fazer upload de documentos
- [ ] Admin pode gerenciar usuários

---

## 🔒 Segurança Pós-Deploy

### Firewall
- [ ] SSH limitado (chave pública)
- [ ] Ports 22 (SSH), 80 (HTTP), 443 (HTTPS) abertos
- [ ] Rate limiting configurado (opcional)
- [ ] DDoS protection (Cloudflare, AWS Shield)

### Acesso
- [ ] Alterar senha SSH padrão
- [ ] Desabilitar SSH por password
- [ ] Root SSH desabilitado
- [ ] sudo apenas para usuário específico

### Banco de Dados
- [ ] PostgreSQL em container isolado
- [ ] Senha forte configurada
- [ ] Backup automático agendado
- [ ] Replicação ou WAL backups configurados

### Aplicação
- [ ] Admin password alterada após primeiro login
- [ ] 2FA habilitado (opcional)
- [ ] CORS restrito a domínio específico
- [ ] API rate limiting configurado

---

## 📊 Monitoramento

### Verificações Regulares
- [ ] Script monitor.sh agendado em cron (a cada 5 min)
- [ ] Alertas de CPU/Memory/Disk configurados
- [ ] Logs centralizados (opcional: ELK, Grafana)
- [ ] Health checks ativos

### Backup
- [ ] Backup diário do banco de dados
- [ ] Backup semanal de volumes Docker
- [ ] Backup armazenado em local seguro
- [ ] Teste de restore executado

### Performance
- [ ] Cache Redis configurado
- [ ] CDN para assets estáticos (opcional)
- [ ] Compressão Gzip habilitada
- [ ] Lazy loading de imagens configurado

---

## 📝 Documentação

- [ ] `.env.production.example` completo
- [ ] DEPLOYMENT.md atualizado
- [ ] README.md com instruções
- [ ] Runbook de troubleshooting criado
- [ ] Plano de disaster recovery documentado

---

## 🧪 Teste de Failover

- [ ] Simular falha do backend → auto-restart funciona
- [ ] Simular falha do banco → alertas disparam
- [ ] Simular disk full → cleanup automático
- [ ] Simular reboot VPS → containers iniciam automaticamente

---

## 📞 Handover

Se for terceiro executar deploy:

- [ ] Credenciais SSH compartilhadas seguramente
- [ ] `.env.production` fornecido com valores reais
- [ ] Acesso ao painel admin confirmado
- [ ] Contato de emergência listado
- [ ] Plano de rollback documentado

---

## ✨ Pós-Deploy (Primeiras 24h)

- [ ] Monitorar logs continuamente
- [ ] Verificar alertas/emails
- [ ] Testar backup restauração
- [ ] Confirmar HTTPS certificado válido
- [ ] Validar performance/latência
- [ ] Testar acesso mobile
- [ ] Comunicar aos usuários que está live

---

## 🎉 Sucesso!

Se tudo está ✅, você tem:
- ✅ Aplicação em produção segura
- ✅ SSL/HTTPS ativo
- ✅ Backup automático
- ✅ Monitoramento ativo
- ✅ Documentação completa
- ✅ Pronto para crescer!

**Parabéns! 🚀**

---

## 📞 Suporte

Em caso de problema:
1. Verificar logs: `docker-compose logs backend`
2. Testar health: `curl https://api.seu-dominio.com/health`
3. Consultar DEPLOYMENT.md
4. Contatar suporte técnico

---

**Última atualização:** 2024-06-07
**Versão:** 1.0.0
