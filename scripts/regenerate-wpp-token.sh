#!/bin/bash
# Regenerar token WPPConnect quando expirar
# Uso: bash regenerate-wpp-token.sh [SECRET_KEY]
# Se não passar SECRET_KEY, usa o padrão do container (THISISMYSECURETOKEN)

SECRET="${1:-THISISMYSECURETOKEN}"
SESSION="bot_cnh"

echo "Gerando novo token para session '${SESSION}' com secret '${SECRET}'..."

RESPONSE=$(curl -s -X POST "http://localhost:21465/api/${SESSION}/${SECRET}/generate-token")
echo "Response: $RESPONSE"

TOKEN=$(echo "$RESPONSE" | grep -o '"full":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
    echo "❌ Falha ao gerar token"
    exit 1
fi

echo ""
echo "======================================"
echo "Novo token: ${TOKEN}"
echo "======================================"
echo ""
echo "Atualize no projeto:"
echo "  WPP_CONNECT_TOKEN=${TOKEN}"
echo ""
echo "Teste de envio:"
curl -s -X POST "http://localhost:21465/api/${SESSION}/send-message" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"phone":"5522992495653","message":"Token regenerado com sucesso!","isGroup":false}' | head -c 200

echo ""
