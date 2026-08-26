#!/usr/bin/env bash
set -e

echo "========================================================="
echo " Starting City Vision Platform (Phase 1)"
echo "========================================================="

if command -v docker &>/dev/null && docker compose version &>/dev/null; then
  echo "[+] Starting services with Docker Compose..."
  docker compose up --build
else
  echo "[!] Docker not detected. Attempting direct local run..."
  
  # Start backend
  cd backend
  if [ -d "venv" ]; then
    source venv/bin/activate || source venv/Scripts/activate
  fi
  uvicorn app.main:app --reload --port 8000 &
  BACKEND_PID=$!
  cd ..
  
  # Start frontend
  cd frontend
  npm run dev &
  FRONTEND_PID=$!
  cd ..
  
  echo "Services started in background:"
  echo " Backend: http://localhost:8000 (PID: $BACKEND_PID)"
  echo " Frontend: http://localhost:5173 (PID: $FRONTEND_PID)"
  
  trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
  wait
fi
