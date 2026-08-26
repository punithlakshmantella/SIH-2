# 🏙️ CITY VISION — City-Wide Vehicle Intelligence Platform
### SIH26127 | Smart India Hackathon 2026 | Bharat Electronics Limited (BEL)
**Target Metropolitan City Deployment:** Visakhapatnam, Andhra Pradesh

---

## 📌 Problem Statement & Executive Overview

Modern municipal surveillance and traffic management face critical bottlenecks in tracking non-standard vehicles across wide-area camera sensor networks. In adverse environmental conditions (rain, low illumination, glare, motion blur, and dirty/tampered high-security registration plates), standard optical character recognition (OCR) models fail or produce ambiguous partial reads.

**City Vision** is a production-grade, city-scale vehicle intelligence and trajectory reconstruction platform engineered to:
1. Ingest multi-camera video streams and perform generic Indian ANPR/OCR with optical quality thresholding.
2. Resolve ambiguous/failed plate reads using a spatio-temporal, appearance-weighted **Probabilistic Vehicle Re-Identification (Re-ID)** engine.
3. Reconstruct single-vehicle trajectories validated against physical road topology and transit physics, flagging impossible transitions ($>140$ km/h).
4. Provide real-time surveillance alerts, RBAC-gated watchlist hotlists, and Origin-Destination (OD) mobility insights for smart city governance.

---

## 🏛️ System Architecture

```
                                  [ CCTV / ANPR Camera Network ]
                                                │
                                                ▼
                                   [ FastAPI Ingestion Core ]
                                                │
                ┌───────────────────────────────┼───────────────────────────────┐
                ▼                               ▼                               ▼
       [ ANPREngine (OpenCV) ]         [ VehicleReIDEngine ]        [ TrajectoryEngine ]
       • CLAHE Contrast Enhancement    • Multi-Modal Scoring        • Chronological Sorting
       • Bilateral Filter Denoising    • Plate + Color + Class      • Physics-Speed Validation
       • Deskew & Laplacian Variance   • Probabilistic Reasoning    • Impossible Flagging
                │                               │                               │
                └───────────────────────────────┼───────────────────────────────┘
                                                │
                                                ▼
                                    [ Alert Rule Engine ]
                                    • Watchlist / Blacklist
                                    • Excessive Speed Violations
                                    • Unexpected Stops / Wrong-Way
                                                │
                                                ▼
                                    [ PostgreSQL 16 + GIS ]
                                                │
                                    [ WebSocket Live Push ]
                                                │
                                                ▼
                          [ React 18 + TypeScript + Vite + Tailwind ]
                          • Leaflet OpenStreetMap (No Paid API)
                          • Recharts Analytics & Flow Vectors
                          • Role-Based Access Control (RBAC)
```

---

## 🔑 Key Features

- **🔍 Multi-Criteria Vehicle Search:** Instant search across license plates (full or wildcard `AP39`, `AP39AB1234`), vehicle types (`car`, `motorcycle`, `auto_rickshaw`, `truck`, `bus`), paint color, camera corridor, zone, and direction.
- **🛣️ Trajectory Reconstruction & Animated Playback:** Chronological corridor traversal with interactive Leaflet map, numbered waypoints, playback animation (`1x`, `2x`, `5x`, `10x`), and transit physics diagnostics.
- **🎯 Probabilistic Vehicle Re-Identification:** Multi-modal heuristic combining plate character similarity, classification, paint color, and road topology plausibility. Strictly formatted with non-certainty phrasing: `"Possible same vehicle — {percentage}% — reasons: ... Requires officer verification."`
- **🛑 Physics-Validated Transition Integrity:** Automatically flags physically impossible transit transitions ($>140$ km/h or impossible teleportation) rather than silently stitching erroneous data.
- **🚨 Real-Time Security Alert Engine:** Automatic WebSocket push for watchlist hits, excessive speed ($>25$ km/h over limit), and stopped vehicles in arterial lanes.
- **📊 Traffic Analytics & Congestion Heatmap:** Hourly ingestion volume curves, corridor velocity averages, Origin-Destination transit vectors, and a clearly-labeled prototype congestion risk simulator.
- **📁 Investigation Case Dossiers:** RBAC-gated case files with full trajectory evidence, audit logs, and neutral wording standards.
- **📄 Genuine Reports CSV Export:** One-click streaming CSV exports for traffic volumes, alerts, OD transit matrices, and camera sensor health logs.

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Backend Framework** | FastAPI (Python 3.11+), Uvicorn |
| **Database & ORM** | PostgreSQL 16, SQLAlchemy 2.0, Alembic Migrations |
| **Task Queue & Cache** | Celery, Redis |
| **Computer Vision / ANPR** | OpenCV (CLAHE, Bilateral Filter, Deskew, Laplacian Variance) |
| **Frontend Framework** | React 18, TypeScript, Vite, Tailwind CSS, Zustand, React Router 6 |
| **Mapping & GIS** | Leaflet, OpenStreetMap Tiles (100% Free / Open Source, Zero Paid APIs) |
| **Data Visualization** | Recharts (Area, Bar, Line Charts) |
| **Security & Auth** | JWT (JSON Web Tokens), PBKDF2/Bcrypt Password Hashing, RBAC Middleware |

---

## 👥 Seeded Demo Credentials (RBAC)

All accounts are pre-seeded in the database with instant one-click login buttons on `/login`:

| Role | Username / Email | Password | Badge Number | Permissions |
|---|---|---|---|---|
| **Traffic Police** | `police@cityvision.bel.in` | `police123` | `VSP-TP-104` | Surveillance, Live Map, Watchlist Writes, Alerts |
| **Authorized Investigator** | `investigator@cityvision.bel.in` | `investigator123` | `CID-AP-89` | Full Trajectory, Cases/Dossiers CRUD, Re-ID Inspection |
| **Control Room Operator** | `operator@cityvision.bel.in` | `operator123` | `VSP-CR-02` | Live Stream, Camera Telemetry, Alerts Acknowledgment |
| **Traffic Analyst** | `analyst@cityvision.bel.in` | `analyst123` | `VMRDA-AN-12` | Traffic Analytics, OD Matrix, Heatmaps, Reports Export |
| **Smart City Authority** | `authority@cityvision.bel.in` | `authority123` | `GVMC-DIR-01` | Executive Overview Dashboard, City Analytics, Governance |
| **System Administrator** | `admin@cityvision.bel.in` | `admin123` | `BEL-ADM-01` | Full Superuser Access, User Management, Node Config |

---

## 🚀 Quickstart & Installation

### Option 1: One-Command Docker Setup (Recommended)

```bash
# Clone the repository
git clone https://github.com/bel-city-vision/city-vision.git
cd city-vision

# Start the entire platform (Postgres, Redis, Backend, Celery, Frontend)
docker-compose up -d --build
```
- **Frontend Dashboard:** `http://localhost:5173`
- **Backend API & Swagger Docs:** `http://localhost:8000/docs`

---

### Option 2: Local Non-Docker Startup

#### 1. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt

# Run initial migrations and seed database
python ../scripts/seed.py

# Start FastAPI server
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

---

## 🎯 Flagship Demo Scenario (Target: Under 2 Minutes)

1. **Sign In (`/login`):** Click **"Traffic Police"** or **"Authorized Investigator"** quick-login button.
2. **Executive Overview (`/dashboard`):** Inspect live camera health (20 nodes in Visakhapatnam), real-time detection ingestion feed, and live alerts counter.
3. **Target Vehicle Search (`/vehicles`):** Click **"🎯 Load Demo Vehicle (AP39AB1234)"** or search `AP39AB1234`.
4. **Vehicle Profile (`/vehicles/AP39AB1234`):** Inspect the chronological camera checkpoint timeline (Rural $\rightarrow$ Highway $\rightarrow$ Toll $\rightarrow$ Town $\rightarrow$ City).
5. **Flagship Trajectory Map (`/trajectory?plate=AP39AB1234`):**
   - Click **"Play Route"** to watch the animated vehicle traverse Visakhapatnam.
   - Click **Step 03 (CAM-TOL-003)**: Notice the dashed amber leg and verify that the degraded optical read (`AP39A?1234` at 61% conf) is recovered via Vehicle Re-ID with 91.7% probability and strict non-certainty reasoning.
6. **Corridor Congestion & Prediction (`/congestion`):** View the live occupancy heatmap and test the prototype N-minute forecasting simulator.
7. **Active Alerts (`/alerts`):** Inspect real-time watchlist match alarms and click through to the evidence modal.
8. **Reports (`/reports`):** Download genuine live CSV datasets for traffic volume and OD flow matrices.

---

## ⚖️ Scientific & Ethical Integrity Principles

- **No Invented Accuracy Claims:** Model confidence scores are live outputs of optical variance and character similarity heuristics, never hardcoded marketing numbers.
- **Probabilistic Re-ID Neutrality:** Ambiguous detections are always framed probabilistically: `"Possible same vehicle — {percentage}% — reasons: ... Requires officer verification"`.
- **Honest Continuity:** When a vehicle exits camera sensor coverage, the platform displays `"No subsequent camera detection found — trajectory terminates at last verified node"` rather than inventing continuous tracking across blind spots.
- **100% Free & Open-Source GIS:** Leaflet + OpenStreetMap tiles ensure uninterrupted operation in secure, air-gapped defense and municipal environments without paid API dependencies.
