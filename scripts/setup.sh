#!/usr/bin/env bash
set -e

echo "========================================================="
echo " City Vision — Environment & Dependencies Setup (Phase 1)"
echo "========================================================="

# 1. Check for .env file
if [ ! -f .env ]; then
  echo "[+] Creating .env from .env.example..."
  cp .env.example .env
fi

# 2. Setup Python virtualenv for backend if running locally
if command -v python3 &>/dev/null; then
  echo "[+] Setting up Backend Python environment..."
  cd backend
  if [ ! -d "venv" ]; then
    python3 -m venv venv
  fi
  source venv/bin/activate || source venv/Scripts/activate
  pip install --upgrade pip
  pip install -r requirements.txt
  cd ..
elif command -v python &>/dev/null; then
  echo "[+] Setting up Backend Python environment with python..."
  cd backend
  if [ ! -d "venv" ]; then
    python -m venv venv
  fi
  source venv/bin/activate || source venv/Scripts/activate
  pip install --upgrade pip
  pip install -r requirements.txt
  cd ..
fi

# 3. Setup Frontend dependencies if running locally
if command -v npm &>/dev/null; then
  echo "[+] Installing Frontend Node.js dependencies..."
  cd frontend
  npm install
  cd ..
fi

echo "========================================================="
echo " Setup complete! Use ./scripts/run.sh or docker compose up"
echo "========================================================="
