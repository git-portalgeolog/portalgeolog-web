#!/bin/bash
# ================================================================
# EXECUTE NO VPS: ssh root@178.238.231.138
# Depois cole: bash /tmp/vps-setup-evolution.sh
# Ou copie e cole todo o conteúdo diretamente no terminal do VPS
# ================================================================
set -e

echo "=============================================="
echo "  🚀 Instalando Evolution API v2"
echo "=============================================="

# 1. Parar WPPConnect
echo ""
echo ">> [1/7] Parando WPPConnect..."
cd /opt/wppconnect 2>/dev/null && docker compose down 2>/dev/null || true
echo "   ✅ WPPConnect parado."

# 2. Criar diretório
echo ""
echo ">> [2/7] Criando /opt/evolution-api..."
mkdir -p /opt/evolution-api
cd /opt/evolution-api

# 3. Criar .env
echo ""
echo ">> [3/7] Criando .env..."
cat > .env << 'EOF'
AUTHENTICATION_API_KEY=0780221322130780aB2026
SERVER_URL=https://wppconnect.portalgeolog.com.br
SERVER_PORT=8080
DATABASE_PROVIDER=postgresql
DATABASE_CONNECTION_URI=postgresql://evolution:evolution@evolution-postgres:5432/evolution
DEL_INSTANCE=false
LOG_LEVEL=WARN
QRCODE_LIMIT=6
EOF
echo "   ✅ .env criado."

# 4. Criar docker-compose.yml
echo ""
echo ">> [4/7] Criando docker-compose.yml..."
cat > docker-compose.yml << 'EOF'
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
EOF
echo "   ✅ docker-compose.yml criado."

# 5. Atualizar Caddy
echo ""
echo ">> [5/7] Atualizando Caddy (porta 8080)..."
cat > /etc/caddy/Caddyfile << 'EOF'
wppconnect.portalgeolog.com.br {
    reverse_proxy localhost:8080
}
EOF
systemctl reload caddy
echo "   ✅ Caddy atualizado."

# 6. Subir Evolution
echo ""
echo ">> [6/7] Subindo Evolution API (pode demorar ~1 min no primeiro pull)..."
docker compose pull
docker compose up -d
echo "   Aguardando 30s para startup..."
sleep 30

# Verificar
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:8080/)
echo "   HTTP Status: ${HTTP_CODE}"
if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "401" ]; then
    echo "   ✅ Evolution API rodando!"
else
    echo "   ⚠️ Verificando logs..."
    docker logs evolution_api --tail 10
    echo "   Aguardando mais 30s..."
    sleep 30
fi

# 7. Criar instância
echo ""
echo ">> [7/7] Criando instância 'geolog'..."
CREATE_RESPONSE=$(curl -s -X POST 'http://localhost:8080/instance/create' \
  -H 'Content-Type: application/json' \
  -H 'apikey: 0780221322130780aB2026' \
  -d '{"instanceName":"geolog","integration":"WHATSAPP-BAILEYS","qrcode":true}')

echo "   Response: ${CREATE_RESPONSE}" | head -c 800
echo ""

# Verificar status
echo ""
echo ">> Verificando status da instância..."
sleep 5
STATUS=$(curl -s 'http://localhost:8080/instance/connectionState/geolog' \
  -H 'apikey: 0780221322130780aB2026')
echo "   Status: ${STATUS}"

# QR Code
echo ""
echo ">> Obtendo QR Code..."
QR_RESPONSE=$(curl -s 'http://localhost:8080/instance/connect/geolog' \
  -H 'apikey: 0780221322130780aB2026')
echo "   QR Response (primeiros 200 chars): ${QR_RESPONSE:0:200}"

echo ""
echo "=============================================="
echo "  ✅ Evolution API instalada!"
echo "=============================================="
echo ""
echo "  Agora escaneie o QR Code:"
echo "  1. Abra WhatsApp no celular"
echo "  2. Configurações → Dispositivos vinculados → Vincular dispositivo"
echo "  3. Escaneie o QR code que apareceu acima (base64)"
echo ""
echo "  Se precisar do QR code novamente:"
echo "  curl -s 'http://localhost:8080/instance/connect/geolog' -H 'apikey: 0780221322130780aB2026'"
echo ""
echo "  Verificar conexão:"
echo "  curl -s 'http://localhost:8080/instance/connectionState/geolog' -H 'apikey: 0780221322130780aB2026'"
echo ""
echo "  Teste de envio:"
echo "  curl -s -X POST 'http://localhost:8080/message/sendText/geolog' \\"
echo "    -H 'Content-Type: application/json' -H 'apikey: 0780221322130780aB2026' \\"
echo "    -d '{\"number\":\"5522992495653\",\"text\":\"Evolution API funcionando!\"}'"
echo ""
