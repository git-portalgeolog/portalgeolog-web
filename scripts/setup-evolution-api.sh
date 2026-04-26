#!/bin/bash
# =============================================================
# Setup Evolution API no VPS (substitui WPPConnect)
# Rode no VPS: bash setup-evolution-api.sh
# =============================================================
set -e

INSTALL_DIR="/opt/evolution-api"
EVOLUTION_API_KEY="0780221322130780aB2026"
INSTANCE_NAME="geolog"

echo "=============================================="
echo "  🚀 Setup Evolution API v2"
echo "=============================================="
echo ""

# 1. Parar WPPConnect
echo ">> Parando WPPConnect..."
cd /opt/wppconnect 2>/dev/null && docker compose down 2>/dev/null || true
echo "   WPPConnect parado."

# 2. Criar diretório
echo ">> Criando diretório ${INSTALL_DIR}..."
mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

# 3. Criar .env
echo ">> Criando .env..."
cat > .env <<EOF
# Evolution API Configuration
AUTHENTICATION_API_KEY=${EVOLUTION_API_KEY}

# Server
SERVER_URL=https://wppconnect.portalgeolog.com.br
SERVER_PORT=8080

# Database (SQLite - simples, sem Postgres extra)
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://evolution:evolution@evolution-postgres:5432/evolution

# Instance defaults
DEL_INSTANCE=false
PROVIDER_ENABLED=false

# Log
LOG_LEVEL=WARN

# QR Code
QRCODE_LIMIT=6

# Webhook global (opcional)
# WEBHOOK_GLOBAL_URL=
# WEBHOOK_GLOBAL_ENABLED=false
EOF

# 4. Criar docker-compose.yml
echo ">> Criando docker-compose.yml..."
cat > docker-compose.yml <<'COMPOSE'
services:
  evolution-api:
    container_name: evolution_api
    image: atendai/evolution-api:v2.2.3
    restart: unless-stopped
    depends_on:
      - evolution-postgres
    ports:
      - "127.0.0.1:8080:8080"
    env_file:
      - .env
    volumes:
      - evolution_instances:/evolution/instances
    networks:
      - evolution-net

  evolution-postgres:
    container_name: evolution_postgres
    image: postgres:15-alpine
    restart: unless-stopped
    environment:
      - POSTGRES_DB=evolution
      - POSTGRES_USER=evolution
      - POSTGRES_PASSWORD=evolution
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - evolution-net

volumes:
  evolution_instances:
  postgres_data:

networks:
  evolution-net:
    driver: bridge
COMPOSE

# 5. Atualizar Caddy para apontar para porta 8080
echo ">> Atualizando Caddy (reverse proxy)..."
cat > /etc/caddy/Caddyfile <<'CADDY'
wppconnect.portalgeolog.com.br {
    reverse_proxy localhost:8080
}
CADDY
systemctl reload caddy

# 6. Subir Evolution API
echo ">> Subindo Evolution API..."
docker compose pull
docker compose up -d

echo ">> Aguardando startup (30s)..."
sleep 30

# 7. Verificar se está rodando
echo ">> Verificando status..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/)
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
    echo "   ✅ Evolution API respondendo (HTTP ${HTTP_CODE})"
else
    echo "   ⚠️  HTTP ${HTTP_CODE} - verificando logs..."
    docker logs evolution_api --tail 20
fi

# 8. Criar instância
echo ""
echo ">> Criando instância '${INSTANCE_NAME}'..."
CREATE_RESPONSE=$(curl -s -X POST "http://localhost:8080/instance/create" \
  -H "Content-Type: application/json" \
  -H "apikey: ${EVOLUTION_API_KEY}" \
  -d "{\"instanceName\":\"${INSTANCE_NAME}\",\"integration\":\"WHATSAPP-BAILEYS\",\"qrcode\":true}")

echo "   Response: ${CREATE_RESPONSE}" | head -c 500

INSTANCE_TOKEN=$(echo "$CREATE_RESPONSE" | grep -o '"hash":"[^"]*"' | cut -d'"' -f4)

echo ""
echo ""
echo "=============================================="
echo "  ✅ Evolution API instalada com sucesso!"
echo "=============================================="
echo ""
echo "  API Key (global):     ${EVOLUTION_API_KEY}"
echo "  Instance Name:        ${INSTANCE_NAME}"
echo "  Instance Token:       ${INSTANCE_TOKEN}"
echo "  URL:                  https://wppconnect.portalgeolog.com.br"
echo ""
echo "  Atualize no projeto (.env):"
echo "    EVOLUTION_API_URL=https://wppconnect.portalgeolog.com.br"
echo "    EVOLUTION_API_KEY=${EVOLUTION_API_KEY}"
echo "    EVOLUTION_INSTANCE=${INSTANCE_NAME}"
echo ""
echo "  Para escanear QR Code:"
echo "    curl -s 'http://localhost:8080/instance/connect/${INSTANCE_NAME}' \\"
echo "      -H 'apikey: ${EVOLUTION_API_KEY}'"
echo ""
echo "  Para verificar status:"
echo "    curl -s 'http://localhost:8080/instance/connectionState/${INSTANCE_NAME}' \\"
echo "      -H 'apikey: ${EVOLUTION_API_KEY}'"
echo ""
