# 📘 Technical Architecture & Engineering Writeup
### SIH26127 — City Vision (City-Wide Vehicle Intelligence & Trajectory Platform)
**Author Organization:** Bharat Electronics Limited (BEL) & Smart India Hackathon 2026 Core Team

---

## 1. System Architecture & High-Level Design

City Vision is architected as an asynchronous, event-driven intelligence system capable of handling multi-sensor video telemetry, spatial-temporal graph queries, and probabilistic reasoning.

```
       [ Real CCTV / ANPR Ingestion ]       [ Synthetic City Simulation (Celery) ]
                     │                                         │
                     └────────────────────┬────────────────────┘
                                          ▼
                             [ REST API & Ingestion Hub ]
                                          │
        ┌─────────────────────────────────┼─────────────────────────────────┐
        ▼                                 ▼                                 ▼
[ ANPR Vision Engine ]          [ Vehicle Re-ID Engine ]       [ Trajectory Engine ]
• OpenCV Preprocessing          • Multi-Modal Scoring          • Graph Physics Verification
• CLAHE & Bilateral Filters     • Appearance Heuristics        • Implied Transit Velocity
• Optical Variance Metrics      • Probabilistic Labeling       • Impossible Transition Rejection
        │                                 │                                 │
        └─────────────────────────────────┼─────────────────────────────────┘
                                          ▼
                               [ Alert Rule Engine ]
                               • Real-Time Watchlist Matching
                               • Excessive Speed (>25 km/h over limit)
                               • Stationary Fast-Lane Hazards
                                          │
                    ┌─────────────────────┴─────────────────────┐
                    ▼                                           ▼
         [ PostgreSQL Database ]                      [ WebSocket Server ]
         • 19 Relational Tables                       • Event Broadcast (/ws/live)
         • Composite Spatio-Temporal Indexes          • Real-Time Client Push
                    │                                           │
                    └─────────────────────┬─────────────────────┘
                                          ▼
                             [ React 18 SPA Frontend ]
                             • Leaflet OpenStreetMap GIS
                             • Recharts Mobility Analytics
                             • RBAC-Enforced Route Guards
```

---

## 2. Real ANPR Pipeline & Indian Plate OCR Rationale

### 2.1 Technical Constraints of Generic Indian License Plates
Indian registration plates under the High-Security Registration Plate (HSRP) standard present diverse optical challenges:
- **Format Variations:** Standard format `AA00AA0000` (e.g. `AP39AB1234`), 2-wheeler vertical stacked plates, BH-series (`22BH0000AA`), electric vehicle green plates, commercial yellow plates.
- **Adverse Environmental Degradation:** Direct sun glare at toll plazas, motion blur at highway speeds, rain droplet occlusion, low-light illumination drops.

### 2.2 OpenCV Preprocessing Pipeline
Rather than relying on single-pass OCR, `StandardANPREngine` executes a multi-stage image enhancement pipeline prior to character extraction:
1. **Grayscale & Bilateral Filtering:** Smooths optical sensor noise while preserving high-frequency plate edges.
2. **Contrast Limited Adaptive Histogram Equalization (CLAHE):** Enhances local contrast in high-glare or low-light regions (clip limit: 3.0, grid tile size: $8 \times 8$).
3. **Adaptive Thresholding (Otsu & Gaussian):** Binarizes plate characters under uneven illumination.
4. **Laplacian Optical Variance:** Measures image sharpness $\sigma^2_{\text{Laplacian}}$. Low values trigger a `LOW_CONFIDENCE` warning tag.

---

## 3. Vehicle Re-Identification (Re-ID) Engine

### 3.1 Multi-Modal Heuristic Weighting
When a license plate read is degraded (e.g. `AP39A?1234` with 61% confidence), the `VehicleReIDEngine` resolves candidate identities by computing a weighted spatio-temporal score:

$$S_{\text{ReID}} = w_p S_{\text{plate}} + w_a S_{\text{appearance}} + w_t S_{\text{topology}} + w_v S_{\text{velocity}}$$

Where:
- **$w_p = 0.35$ (Plate Pattern Match):** Levenshtein distance with wildcard tolerance (`?`, `*`).
- **$w_a = 0.25$ (Appearance Match):** Compares vehicle classification (`car`, `truck`, `bus`) and paint color vectors.
- **$w_t = 0.25$ (Camera Graph Topology):** Graph distance between camera nodes along the connected road network.
- **$w_v = 0.15$ (Transit Velocity Plausibility):** Implied transit velocity within realistic corridor bounds (30–100 km/h).

### 3.2 Strict Probabilistic Integrity
In accordance with ethical AI standards for law enforcement, Re-ID outputs never assert definitive guilt or certainty. Matches exceeding the 85% threshold are formatted as:
> *"Possible same vehicle — 91.7% — reasons: High plate pattern match (9/10 characters matching); Matching vehicle classification: 'car'; Matching vehicle paint color: 'white'; Physically plausible corridor transit time. Requires officer verification."*

---

## 4. Trajectory Reconstruction & Impossible-Transition Physics Rejection

### 4.1 Chronological Route Assembly
1. Trajectory events are gathered across direct ANPR hits and Re-ID candidate matches.
2. Detections are sorted chronologically: $T = \{d_1, d_2, \dots, d_n\}$.

### 4.2 Haversine Distance & Implied Velocity Calculation
For each consecutive camera pair $(d_{i-1}, d_i)$, the engine calculates:
- Great-circle distance $\Delta d_{i-1, i}$ via the Haversine formula.
- Travel time $\Delta t_{i-1, i} = t_i - t_{i-1}$.
- Implied transit speed $v_{\text{implied}} = \frac{\Delta d_{i-1, i}}{\Delta t_{i-1, i}}$.

### 4.3 Impossible Transition Rejection Rule
If $v_{\text{implied}} > 140.0\text{ km/h}$ or the transition violates road graph connectivity, the transition is flagged as:
- `is_impossible_transition = True`
- Rendered on the Leaflet map as a **flashing dashed red line** rather than silently stitching false continuity.
- Status summary annotated with: `"[WARNING] Impossible transit speed of {speed} km/h detected between nodes."`

---

## 5. Traffic Analytics, OD Flow & Congestion Modeling

### 5.1 Origin-Destination (OD) Commuter Vectors
Traffic flows are aggregated across entry and exit camera checkpoints. OD vectors are rendered on the map with stroke weight proportional to commuter vehicle volume, enabling municipal authorities to identify primary transit bottlenecks.

### 5.2 Prototype Congestion Risk Estimator
The platform provides a pluggable interface for corridor occupancy forecasting:
- **Input:** Current density $\rho_0$, corridor speed limit $v_{\text{max}}$, time horizon $H \in \{15, 30, 60\}\text{ min}$.
- **Output:** Predicted occupancy trajectory $\rho(t)$, risk classification (`low`, `medium`, `high`, `critical`), and automated tactical dispatch guidance.
- **Compliance Label:** Explicitly tagged as `PROTOTYPE / DEMO MODEL — Not validated for mission-critical dispatch`, architected for future replacement with production XGBoost/LSTM neural models without breaking API contracts.

---

## 6. Real-World Scalability & Dataset Honesty Note

### 6.1 Defense & Municipal Feasibility
Because no public, city-wide 1000-camera live CCTV dataset with ground-truth vehicle tracking exists in open benchmarks, City Vision is deployed with a calibrated 20-camera Visakhapatnam sensor grid, 1,582 seeded trajectory events, and an asynchronous simulation worker (`CameraSimulationEngine`).

### 6.2 Production Transition Roadmap
- **Hardware Acceleration:** Native TensorRT / ONNX Runtime execution for YOLOv8 plate detectors and DeepSORT / ByteTrack feature extractors.
- **Edge Deployment:** Containerized inference nodes deployed directly on BEL smart camera edge units.
- **Air-Gapped Operation:** Complete independence from external paid APIs (OSM tiles, local SQLite/PostgreSQL, local OpenCV engine) guarantees secure deployment in sovereign defense environments.
