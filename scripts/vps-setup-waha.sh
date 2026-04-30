#!/bin/bash
# ==============================================================
# Executar no VPS para subir WAHA rapidamente
# ==============================================================
set -euo pipefail

bash /opt/waha/scripts/setup-waha.sh 2>/dev/null || bash ./setup-waha.sh
