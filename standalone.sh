#!/usr/bin/env bash
# ==============================================================================
# ElectroCad DIN - Script de Execução Standalone Local
# Norma EN 61439 - Software de Desenho e Modelação de Quadros Elétricos DIN
# ==============================================================================

set -e

echo ""
echo "=========================================================="
echo "⚡ ElectroCad DIN - Arranque em Modo Standalone Local"
echo "=========================================================="
echo ""

# Verificar instalação de Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "❌ Erro: O Node.js não foi encontrado no seu sistema."
  echo "Por favor instale o Node.js v18 ou superior a partir de: https://nodejs.org/"
  exit 1
fi

echo "✓ Node.js detetado: $(node -v)"

# Verificar dependências
if [ ! -d "node_modules" ]; then
  echo "📦 Instalando dependências do projeto (npm install)..."
  npm install
fi

echo "🚀 Iniciando servidor da aplicação..."
echo "Aceda no navegador em: http://localhost:3000"
echo "Pressione Ctrl+C para encerrar."
echo ""

# Tentar abrir automaticamente no navegador no modo aplicação (standalone/kiosk)
(
  sleep 2
  URL="http://localhost:3000"
  if command -v google-chrome >/dev/null 2>&1; then
    google-chrome --app="$URL" >/dev/null 2>&1 || xdg-open "$URL" >/dev/null 2>&1 || true
  elif command -v chromium-browser >/dev/null 2>&1; then
    chromium-browser --app="$URL" >/dev/null 2>&1 || xdg-open "$URL" >/dev/null 2>&1 || true
  elif command -v open >/dev/null 2>&1; then
    # macOS
    open "$URL" || true
  elif command -v xdg-open >/dev/null 2>&1; then
    # Linux geral
    xdg-open "$URL" || true
  fi
) &

# Iniciar servidor Vite na porta 3000
npm run dev -- --host 0.0.0.0 --port 3000
