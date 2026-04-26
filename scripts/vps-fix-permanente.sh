#!/bin/bash
# FIX PERMANENTE: WPPConnect config.ts + token estável
# Rode no VPS: cd /opt/wppconnect && bash vps-fix-permanente.sh

set -e

cd /opt/wppconnect 2>/dev/null || { echo "❌ Não está em /opt/wppconnect"; exit 1; }

echo "======================================"
echo "  FIX PERMANENTE WPPConnect"
echo "======================================"
echo ""

# 1. Backup
echo "[1/7] Backup do config.ts..."
cp config.ts config.ts.backup.$(date +%s) 2>/dev/null || true

# 2. Criar config.ts com secretKey ESTÁVEL (sem $, sem caracteres especiais)
# Isso evita problemas de escape no shell, Docker, curl, etc.
SECRET_KEY="Geolog2026SecureKey$(date +%s)"

cat > config.ts <<EOF
export default {
  port: 21465,
  host: 'http://localhost',
  secretKey: '${SECRET_KEY}',
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

echo "[2/7] Novo config.ts criado com secretKey: ${SECRET_KEY}"
echo ""

# 3. Verificar docker-compose.yml
if [ !f "docker-compose.yml" ]; then
    echo "❌ docker-compose.yml não encontrado!"
    exit 1
fi

# 4. REBUILDAR a imagem Docker (crucial! A imagem antiga tem o config.ts antigo embutido)
echo "[3/7] Rebuildando imagem Docker (sem cache)..."
docker compose down 2>/dev/null || docker-compose down 2>/dev/null || true
docker compose build --no-cache 2>/dev/null || docker-compose build --no-cache 2>/dev/null || {
    echo "⚠️ docker compose build falhou, tentando docker build..."
    docker build -t wppconnect-wppconnect:latest --no-cache .
}

# 5. Subir container
echo "[4/7] Subindo container..."
docker compose up -d 2>/dev/null || docker-compose up -d 2>/dev/null

# 6. Aguardar WPPConnect iniciar
echo "[5/7] Aguardando WPPConnect iniciar (30s)..."
sleep 5

# Verificar se porta está aberta
for i in {1..10}; do
    if curl -s http://localhost:21465 >/dev/null 2>&1; then
        echo "✅ WPPConnect respondendo na porta 21465"
        break
    fi
    echo "  Aguardando... (${i}/10)"
    sleep 3
done

# 7. Gerar token definitivo
echo "[6/7] Gerando token definitivo..."
TOKEN_RESPONSE=$(curl -s -X POST "http://localhost:21465/api/bot_cnh/${SECRET_KEY}/generate-token")
echo "Response: ${TOKEN_RESPONSE}"

# Extrair token
TOKEN_FULL=$(echo "${TOKEN_RESPONSE}" | grep -o '"full":"[^"]*"' | cut -d'"' -f4)
TOKEN_PURE=$(echo "${TOKEN_RESPONSE}" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "${TOKEN_FULL}" ] || [ -z "${TOKEN_PURE}" ]; then
    echo ""
    echo "❌ Falha ao gerar token. Logs do container:"
    docker logs wpp-server --tail 30
    echo ""
    echo "Possíveis causas:"
    echo "  - O container ainda está inicializando"
    echo "  - O config.ts não foi copiado para dentro do container"
    echo "  - A sessão bot_cnh precisa ser reconectada (QR code)"
    exit 1
fi

echo ""
echo "✅ Token gerado com sucesso!"
echo "  Token (full): ${TOKEN_FULL}"
echo "  Token (pure): ${TOKEN_PURE}"
echo ""

# 8. Testar envio
echo "[7/7] Testando envio de mensagem..."
TEST_RESPONSE=$(curl -s -X POST "http://localhost:21465/api/bot_cnh/send-message" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${TOKEN_FULL}" \
    -d '{"phone":"5522992495653","message":"🔒 Token fixo funcionando!","isGroup":false}')

if echo "${TEST_RESPONSE}" | grep -q "viewed"; then
    echo "✅ MENSAGEM ENVIADA COM SUCESSO!"
    echo ""
    echo "======================================"
    echo "  CONFIGURAÇÃO DEFINITIVA"
    echo "======================================"
    echo ""
    echo "SecretKey: ${SECRET_KEY}"
    echo "TokenFull: ${TOKEN_FULL}"
    echo ""
    echo "ATUALIZE NO PROJETO:"
    echo "  Arquivo: .env"
    echo "  WPP_CONNECT_TOKEN=${TOKEN_FULL}"
    echo ""
    echo "ATUALIZE NO CLOUDFLARE:"
    echo "  wrangler secret put WPP_CONNECT_TOKEN"
    echo "  (cole: ${TOKEN_FULL})"
    echo ""
    echo "Este token será PERMANENTE enquanto:"
    echo "  - O secretKey não mudar no config.ts"
    echo "  - O container não for rebuildado com outro secretKey"
    echo ""
    echo "Para regenerar no futuro (se necessário):"
    echo "  bash /opt/wppconnect/vps-fix-permanente.sh"
else
    echo "⚠️ Teste de envio retornou:"
    echo "${TEST_RESPONSE}"
    echo ""
    echo "Possivelmente a sessão do WhatsApp caiu."
    echo "Verifique se precisa escanear QR code novamente."
    echo "Logs: docker logs wpp-server --tail 50"
fi
