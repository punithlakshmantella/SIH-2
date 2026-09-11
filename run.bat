@echo off
echo =========================================================
echo  Starting City Vision Platform (BEL - SIH26127)
echo =========================================================

echo Starting FastAPI Backend on http://localhost:8000 ...
start "CityVision Backend" cmd /k "cd backend && python -m uvicorn app.main:app --reload --port 8000"

echo Starting React Vite Frontend on http://localhost:5173 ...
start "CityVision Frontend" cmd /k "cd frontend && npm run dev"

echo.
echo =========================================================
echo  Services launched!
echo  Frontend: http://localhost:5173
echo  Backend:  http://localhost:8000
echo  API Docs: http://localhost:8000/docs
echo =========================================================
