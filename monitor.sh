#!/bin/bash
# ============================================================================
# KMenu AI - Monitoring & Health Check Script
# Run periodically via cron: */5 * * * * /home/user/kmenu-ai/monitor.sh
# ============================================================================

LOG_FILE="/home/kmenu/kmenu-ai/monitor.log"
EMAIL_TO="admin@kingschat.com.br"
ALERT_THRESHOLD_CPU=80
ALERT_THRESHOLD_MEMORY=85
ALERT_THRESHOLD_DISK=90

log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" >> "$LOG_FILE"
}

send_alert() {
    local subject="$1"
    local message="$2"
    echo "$message" | mail -s "$subject" "$EMAIL_TO" 2>/dev/null || log_message "⚠️ Falha ao enviar alerta: $subject"
}

# Check if containers are running
check_containers() {
    log_message "Verificando containers..."
    
    local backend=$(docker ps --filter "name=backend" --format "{{.State}}" 2>/dev/null | head -1)
    local frontend=$(docker ps --filter "name=frontend" --format "{{.State}}" 2>/dev/null | head -1)
    local postgres=$(docker ps --filter "name=postgres" --format "{{.State}}" 2>/dev/null | head -1)
    local redis=$(docker ps --filter "name=redis" --format "{{.State}}" 2>/dev/null | head -1)
    
    if [ "$backend" != "running" ]; then
        log_message "❌ Backend não está rodando!"
        send_alert "Backend Down" "Container backend não está rodando. Estado: $backend"
        docker-compose -f /home/kmenu/kmenu-ai/docker-compose.yml up -d backend
    else
        log_message "✅ Backend OK"
    fi
    
    if [ "$frontend" != "running" ]; then
        log_message "❌ Frontend não está rodando!"
        send_alert "Frontend Down" "Container frontend não está rodando. Estado: $frontend"
        docker-compose -f /home/kmenu/kmenu-ai/docker-compose.yml up -d frontend
    else
        log_message "✅ Frontend OK"
    fi
    
    if [ "$postgres" != "running" ]; then
        log_message "❌ PostgreSQL não está rodando!"
        send_alert "Database Down" "Container postgres não está rodando. Estado: $postgres"
        docker-compose -f /home/kmenu/kmenu-ai/docker-compose.yml up -d postgres
    else
        log_message "✅ PostgreSQL OK"
    fi
    
    if [ "$redis" != "running" ]; then
        log_message "❌ Redis não está rodando!"
        send_alert "Redis Down" "Container redis não está rodando. Estado: $redis"
        docker-compose -f /home/kmenu/kmenu-ai/docker-compose.yml up -d redis
    else
        log_message "✅ Redis OK"
    fi
}

# Check API health
check_api_health() {
    log_message "Verificando saúde da API..."
    
    local response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/health 2>/dev/null)
    
    if [ "$response" = "200" ]; then
        log_message "✅ API respondendo corretamente"
    else
        log_message "❌ API não respondendo (HTTP $response)"
        send_alert "API Health Check Failed" "Backend não respondendo. Status HTTP: $response"
    fi
}

# Check disk space
check_disk_space() {
    log_message "Verificando espaço em disco..."
    
    local usage=$(df / | tail -1 | awk '{print $5}' | sed 's/%//')
    
    if [ "$usage" -gt "$ALERT_THRESHOLD_DISK" ]; then
        log_message "⚠️  Espaço em disco baixo: ${usage}%"
        send_alert "Disk Space Low" "Espaço em disco abaixo de $(( 100 - ALERT_THRESHOLD_DISK ))%: ${usage}% usado"
    else
        log_message "✅ Espaço em disco OK: ${usage}%"
    fi
}

# Check Docker resources
check_docker_resources() {
    log_message "Verificando recursos de container..."
    
    # Get memory usage
    local memory=$(docker stats --no-stream --format "{{.MemPerc}}" 2>/dev/null | grep -v "MEMPERC" | head -1 | sed 's/%//' | cut -d'.' -f1)
    
    if [ -n "$memory" ] && [ "$memory" -gt "$ALERT_THRESHOLD_MEMORY" ]; then
        log_message "⚠️  Uso de memória alto: ${memory}%"
        send_alert "High Memory Usage" "Containers usando ${memory}% de memória (limite: $ALERT_THRESHOLD_MEMORY%)"
    else
        log_message "✅ Uso de memória OK: ${memory}%"
    fi
}

# Database backup
backup_database() {
    log_message "Executando backup do banco de dados..."
    
    local backup_dir="/home/kmenu/kmenu-ai/backups"
    local backup_file="$backup_dir/backup-$(date +%Y%m%d-%H%M%S).sql.gz"
    
    mkdir -p "$backup_dir"
    
    docker-compose -f /home/kmenu/kmenu-ai/docker-compose.yml exec -T postgres pg_dump -U kmenu kmenu_ai_prod | gzip > "$backup_file"
    
    if [ -f "$backup_file" ]; then
        log_message "✅ Backup criado: $backup_file"
        
        # Manter apenas últimos 7 backups
        find "$backup_dir" -name "backup-*.sql.gz" -mtime +7 -delete
    else
        log_message "❌ Falha ao criar backup"
        send_alert "Backup Failed" "Falha ao criar backup do banco de dados"
    fi
}

# Clean old logs
cleanup_old_logs() {
    log_message "Limpando logs antigos..."
    
    # Manter apenas últimos 30 dias
    find "$LOG_FILE" -mtime +30 -delete 2>/dev/null || true
    
    # Rotacionar log se muito grande (> 100MB)
    if [ -f "$LOG_FILE" ] && [ $(stat -f%z "$LOG_FILE" 2>/dev/null || stat -c%s "$LOG_FILE") -gt 104857600 ]; then
        mv "$LOG_FILE" "$LOG_FILE.$(date +%Y%m%d)"
        gzip "$LOG_FILE.$(date +%Y%m%d)" &
        log_message "✅ Log rotacionado"
    fi
}

# Main execution
log_message "========================================="
log_message "Iniciando verificações de saúde..."

check_containers
check_api_health
check_disk_space
check_docker_resources

# Run less frequently (weekly)
if [ $(date +%w) -eq 0 ]; then
    backup_database
    cleanup_old_logs
fi

log_message "Verificações concluídas"
log_message "========================================="
