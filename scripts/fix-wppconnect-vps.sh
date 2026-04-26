#!/bin/bash
# Fix WPPConnect config.ts + generate new token
# Rode no VPS: bash fix-wppconnect-vps.sh

set -e

cd /opt/wppconnect

# 1. Gerar novo secretKey seguro (sem caracteres especiais que quebram shell)
NEW_SECRET="GeologWPP$(openssl rand -hex 16)"
echo "Novo secretKey: $NEW_SECRET"

# 2. Criar config.ts atualizado
cat > config.ts <<EOF
export default {
  port: 21465,
  host: 'http://localhost',
  secretKey: '${NEW_SECRET}',
  startAllSession: true,
  reconnectAllSession: true,
  createOptions: {
    autoClose: 0,
    disableSpins: true,
    browserArgs: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--single-process',
      '--disable-gpu'
    ],
  },
};
EOF

echo "config.ts atualizado."

# 3. Garantir que o volume do docker-compose está correto
# O config.ts deve estar na raiz do projeto (onde docker-compose.yml está)
cp config.ts config.ts.bak.$(date +%s) 2>/dev/null || true

# 4. Reiniciar container para carregar novo config
docker compose down
docker compose up -d --build

echo "Container reiniciando..."
sleep 10

# 5. Gerar novo token
echo "Gerando token..."
TOKEN_RESPONSE=$(curl -s -X POST "http://localhost:21465/api/bot_cnh/${NEW_SECRET}/generate-token")
echo "Token response: $TOKEN_RESPONSE"

NEW_TOKEN=$(echo "$TOKEN_RESPONSE" | grep -o '"full":"[^"]*"' | cut -d'"' -f4)

if [ -z "$NEW_TOKEN" ]; then
    echo "❌ Erro ao gerar token. Verifique se o container está rodando:"
    docker ps
    echo "Logs:"
    docker logs wpp-server --tail 20
    exit 1
fi

echo ""
echo "======================================"
echo "  ✅ WPPConnect fixado!"
echo "======================================"
echo ""
echo "Novo secretKey: ${NEW_SECRET}"
echo "Novo token (WPP_CONNECT_TOKEN): ${NEW_TOKEN}"
echo ""
echo "Atualize no projeto:"
echo "  WPP_CONNECT_TOKEN=${NEW_TOKEN}"
echo ""
echo "Teste:"
echo "  curl -X POST 'http://localhost:21465/api/bot_cnh/send-message' \\"
echo "    -H 'Content-Type: application/json' \\"
echo "    -H 'Authorization: Bearer ${NEW_TOKEN}' \\"
echo "    -d '{\"phone\":\"5522992495653\",\"message\":\"Teste\",\"isGroup\":false}'"
