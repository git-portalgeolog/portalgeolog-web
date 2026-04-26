#!/bin/bash
# VPS WPPConnect + Caddy Setup — Copie e cole inteiro no terminal do VPS
# Compatível com Ubuntu/Debian

set -e

echo "======================================"
echo "  VPS WPPConnect + Caddy Setup"
echo "======================================"

# 1. Atualizar sistema
echo "[1/6] Atualizando pacotes..."
sudo apt-get update -qq
sudo apt-get install -y -qq curl gnupg debian-keyring debian-archive-keyring apt-transport-https

# 2. Instalar Caddy
echo "[2/6] Instalando Caddy..."
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' 2>/dev/null | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' 2>/dev/null | sudo tee /etc/apt/sources.list.d/caddy-stable.list > /dev/null
sudo apt-get update -qq
sudo apt-get install -y -qq caddy

# 3. Backup do Caddyfile antigo
if [ -f /etc/caddy/Caddyfile ]; then
    sudo cp /etc/caddy/Caddyfile /etc/caddy/Caddyfile.backup.$(date +%s)
fi

# 4. Criar Caddyfile
echo "[3/6] Configurando Caddy..."
sudo tee /etc/caddy/Caddyfile > /dev/null <<'EOF'
{
    auto_https off
}

:80 {
    @wppconnect host wppconnect.portalgeolog.com.br
    handle @wppconnect {
        reverse_proxy localhost:21465
    }

    handle {
        respond "Forbidden" 403
    }

    header {
        -Server
        -X-Powered-By
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    log {
        output file /var/log/caddy/access.log
        format json
    }
}
EOF

# 5. Logs e permissões
echo "[4/6] Configurando logs..."
sudo mkdir -p /var/log/caddy
sudo chown -R caddy:caddy /var/log/caddy
sudo chmod 755 /var/log/caddy

# 6. Iniciar e validar
echo "[5/6] Iniciando Caddy..."
sudo systemctl daemon-reload
sudo systemctl enable --now caddy
sleep 2

echo "[6/6] Validando..."
if sudo caddy validate --config /etc/caddy/Caddyfile 2>/dev/null; then
    sudo systemctl restart caddy
    echo ""
    echo "======================================"
    echo "  ✅ Caddy instalado e rodando!"
    echo "======================================"
    echo ""
    echo "API acessível em:"
    echo "  http://wppconnect.portalgeolog.com.br/api/bot_cnh/send-message"
    echo "  (HTTPS via Cloudflare Proxy)"
    echo ""
    echo "Verifique status: sudo systemctl status caddy"
    echo "Logs: sudo tail -f /var/log/caddy/access.log"
    echo ""
else
    echo "❌ Erro na validação do Caddyfile. Verifique manualmente."
    exit 1
fi
