#!/bin/bash
# Script de instalação do Caddy para proteger WPPConnect com HTTPS
# Rode na VPS: 178.238.231.138
# Pré-requisito: A record wppconnect.portalgeolog.com.br → 178.238.231.138 (no Cloudflare)

set -e

echo "=== Instalando Caddy ==="
sudo apt-get update
sudo apt-get install -y debian-keyring debian-archive-keyring apt-transport-https

# Repositório oficial do Caddy
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list

sudo apt-get update
sudo apt-get install -y caddy

echo "=== Configurando Caddyfile ==="
sudo tee /etc/caddy/Caddyfile <<'EOF'
# Global options
{
    auto_https off
}

# Cloudflare faz SSL termination (HTTPS → HTTP)
# O Caddy escuta na porta 80, Cloudflare conecta via HTTP interno

:80 {
    # Só responde no host correto
    @wppconnect host wppconnect.portalgeolog.com.br
    handle @wppconnect {
        # Proxy reverso para WPPConnect API
        reverse_proxy localhost:21465
    }

    # Rejeita outros hosts
    handle {
        respond "Forbidden" 403
    }

    # Headers de segurança
    header {
        -Server
        -X-Powered-By
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        Referrer-Policy "strict-origin-when-cross-origin"
    }

    # Logs de acesso
    log {
        output file /var/log/caddy/wppconnect-access.log
        format json
    }
}
EOF

# Criar diretório de logs
sudo mkdir -p /var/log/caddy
sudo chown -R caddy:caddy /var/log/caddy

echo "=== Ajustando permissões ==="
sudo chown caddy:caddy /etc/caddy/Caddyfile
sudo chmod 644 /etc/caddy/Caddyfile

echo "=== Iniciando Caddy ==="
sudo systemctl enable caddy
sudo systemctl restart caddy
sudo systemctl status caddy --no-pager

echo "=== Verificando configuração ==="
sudo caddy validate --config /etc/caddy/Caddyfile

echo ""
echo "✅ Caddy instalado e configurado!"
echo "URL da API agora: https://wppconnect.portalgeolog.com.br/api/bot_cnh/send-message"
echo ""
echo "IMPORTANTE: Configure o DNS no Cloudflare:"
echo "  Type: A"
echo "  Name: wppconnect"
echo "  Content: 178.238.231.138"
echo "  Proxy status: Proxied (nuvem laranja)"
echo "  SSL/TLS: Full (strict)"
echo ""
echo "Depois atualize a WPP_CONNECT_URL no projeto:"
echo "  https://wppconnect.portalgeolog.com.br/api/bot_cnh/send-message"
