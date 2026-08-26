#!/usr/bin/env python3
"""
City Vision — Master Database Seed Script (Visakhapatnam)
SIH26127 • Bharat Electronics Limited (BEL)

Populates:
1. 6 User Roles & Seed Users with bcrypt hashed passwords
2. 6 Visakhapatnam Operational Zones & Major Roads
3. 24+ Realistically Located Cameras across Visakhapatnam Corridor
4. Road Connectivity Graph
5. Synthetic Vehicles & Plate records
6. Pre-positioned Demo Vehicle AP39AB1234 with Rural -> Highway -> Toll -> Town -> City path
   including deliberately degraded read (AP39A?1234) at Toll Camera
7. 1,500+ Historical Vehicle Detections, Trajectory Events, & Camera Health Logs
8. Initial Watchlist, Cases, Alerts, Traffic Metrics, and Congestion Records
"""

import sys
import os
import random
from datetime import datetime, timedelta

# Ensure backend directory is in python path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.db.session import SessionLocal, engine, Base
from app.core.security import get_password_hash
from app.models.models import (
    Role, User, Zone, Road, Camera, CameraHealth, Vehicle, Plate,
    VehicleDetection, VehicleFeature, TrajectoryEvent, Alert, Watchlist,
    Case, CaseEvent, TrafficMetric, TrafficFlow, CongestionRecord, AuditLog
)

def seed_database():
    print("=" * 65)
    print(" CITY VISION — SEEDING DATABASE (VISAKHAPATNAM DATASET)")
    print("=" * 65)

    # 1. Initialize schema
    print("[+] Creating / verifying all database tables...")
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        # Check if already seeded
        if db.query(User).first():
            print("[!] Database already contains data. Cleaning existing records...")
            db.query(AuditLog).delete()
            db.query(CaseEvent).delete()
            db.query(Case).delete()
            db.query(Alert).delete()
            db.query(TrajectoryEvent).delete()
            db.query(VehicleFeature).delete()
            db.query(VehicleDetection).delete()
            db.query(Plate).delete()
            db.query(Watchlist).delete()
            db.query(Vehicle).delete()
            db.query(CameraHealth).delete()
            db.query(TrafficFlow).delete()
            db.query(TrafficMetric).delete()
            db.query(CongestionRecord).delete()
            db.query(Camera).delete()
            db.query(Road).delete()
            db.query(Zone).delete()
            db.query(User).delete()
            db.query(Role).delete()
            db.commit()

        # -------------------------------------------------------------
        # 1. ROLES & USERS
        # -------------------------------------------------------------
        print("[+] Seeding 6 User Roles & Seed Users...")
        roles_data = [
            ("System Administrator", "Full system access, audit logs, configuration and user management"),
            ("Traffic Police", "Field traffic control, ANPR surveillance, live violation alerts"),
            ("Control Room Operator", "Live camera wall monitoring, incident dispatch and alarm triage"),
            ("Authorized Investigator", "Deep vehicle search, trajectory reconstruction, case management"),
            ("Traffic Analyst", "OD matrices, congestion forecasting, mobility reports and metrics"),
            ("Municipal/Smart City Authority", "Executive dashboards, infrastructure health, road safety analytics")
        ]

        roles_map = {}
        for role_name, desc in roles_data:
            role = Role(name=role_name, description=desc)
            db.add(role)
            db.flush()
            roles_map[role_name] = role.id

        seed_users = [
            ("admin@cityvision.bel.in", "admin", "admin123", "System Administrator", "System Administrator", "BEL-ADM-01"),
            ("police@cityvision.bel.in", "police_vizag", "police123", "Traffic Police Officer", "Traffic Police", "VSP-TP-104"),
            ("operator@cityvision.bel.in", "operator_cctv", "operator123", "Command Operator", "Control Room Operator", "VSP-CR-02"),
            ("investigator@cityvision.bel.in", "investigator_cid", "investigator123", "Special Crime Investigator", "Authorized Investigator", "CID-AP-89"),
            ("analyst@cityvision.bel.in", "analyst_urban", "analyst123", "Urban Mobility Analyst", "Traffic Analyst", "VMRDA-AN-12"),
            ("authority@cityvision.bel.in", "gvmc_commissioner", "authority123", "GVMC Smart City Director", "Municipal/Smart City Authority", "GVMC-DIR-01")
        ]

        users_map = {}
        for email, username, pwd, fullname, role_name, badge in seed_users:
            user = User(
                email=email,
                username=username,
                hashed_password=get_password_hash(pwd),
                full_name=fullname,
                role_id=roles_map[role_name],
                badge_number=badge,
                is_active=True
            )
            db.add(user)
            db.flush()
            users_map[username] = user.id

        # -------------------------------------------------------------
        # 2. ZONES & ROADS (Visakhapatnam Geography)
        # -------------------------------------------------------------
        print("[+] Seeding Visakhapatnam Operational Zones & Roads...")
        zones_data = [
            ("Gajuwaka", "Z-GAJ", "South Industrial and Logistics Corridor", "low", {
                "type": "Polygon",
                "coordinates": [[[83.160, 17.670], [83.185, 17.670], [83.185, 17.700], [83.160, 17.700], [83.160, 17.670]]]
            }),
            ("Airport Road", "Z-AIR", "NH16 Airport Transit Link Corridor", "moderate", {
                "type": "Polygon",
                "coordinates": [[[83.210, 17.710], [83.235, 17.710], [83.235, 17.735], [83.210, 17.735], [83.210, 17.710]]]
            }),
            ("NAD Junction", "Z-NAD", "Major West-Central Multi-Level Flyover Hub", "high", {
                "type": "Polygon",
                "coordinates": [[[83.220, 17.735], [83.245, 17.735], [83.245, 17.755], [83.220, 17.755], [83.220, 17.735]]]
            }),
            ("Maddilapalem", "Z-MAD", "Commercial Corridor & University Junction Hub", "moderate", {
                "type": "Polygon",
                "coordinates": [[[83.310, 17.725], [83.335, 17.725], [83.335, 17.745], [83.310, 17.745], [83.310, 17.725]]]
            }),
            ("MVP Colony", "Z-MVP", "North-East Coastal Sector & Beach Corridor", "low", {
                "type": "Polygon",
                "coordinates": [[[83.330, 17.740], [83.360, 17.740], [83.360, 17.765], [83.330, 17.765], [83.330, 17.740]]]
            }),
            ("City Centre", "Z-CTR", "Jagadamba & Siripuram Central Business District", "high", {
                "type": "Polygon",
                "coordinates": [[[83.290, 17.705], [83.315, 17.705], [83.315, 17.725], [83.290, 17.725], [83.290, 17.705]]]
            })
        ]

        zones_map = {}
        for name, code, desc, risk, geo in zones_data:
            z = Zone(name=name, code=code, description=desc, risk_level=risk, polygon_geojson=geo)
            db.add(z)
            db.flush()
            zones_map[name] = z.id

        roads_data = [
            ("NH16 National Highway - South Arterial", "Gajuwaka", "highway", 80.0, 14.5, True),
            ("Aganampudi Toll Expressway", "Gajuwaka", "highway", 80.0, 6.2, False),
            ("Airport Flyover Corridor", "Airport Road", "arterial", 60.0, 5.8, False),
            ("NAD Multi-Level Junction Ring", "NAD Junction", "arterial", 50.0, 3.2, True),
            ("BRTS Expressway Corridor", "Maddilapalem", "arterial", 60.0, 7.1, True),
            ("Andhra University Main Road", "Maddilapalem", "collector", 45.0, 2.8, False),
            ("Beach Road Coastal Promenade", "MVP Colony", "collector", 50.0, 8.4, False),
            ("MVP Sector 4 Main Avenue", "MVP Colony", "local", 40.0, 2.1, False),
            ("Siripuram Circle Express", "City Centre", "arterial", 50.0, 3.5, True),
            ("Jagadamba Centre Hub Road", "City Centre", "arterial", 40.0, 2.4, True),
            ("Sabbavaram Rural Approach Link", "Gajuwaka", "rural", 60.0, 12.0, False)
        ]

        roads_map = {}
        for r_name, z_name, r_type, speed_lim, length, congested in roads_data:
            r = Road(
                name=r_name,
                zone_id=zones_map[z_name],
                road_type=r_type,
                speed_limit_kmh=speed_lim,
                length_km=length,
                is_congested=congested
            )
            db.add(r)
            db.flush()
            roads_map[r_name] = r.id

        # -------------------------------------------------------------
        # 3. CAMERAS (Structured for Demo Scenario & Real Topology)
        # -------------------------------------------------------------
        print("[+] Seeding 20 Visakhapatnam CCTV / ANPR Camera nodes...")
        cameras_data = [
            # Demo Scenario Specific Nodes (Rural -> Highway -> Toll -> Town -> City)
            ("CAM-RUR-001", "Sabbavaram Rural Outpost Camera", 17.6520, 83.1180, "Sabbavaram Rural Approach Link", "Gajuwaka", "EB", "online", 30.0, 42.0, 95.5, 8.0),
            ("CAM-HWY-002", "NH16 South Highway Corridor Cam", 17.6710, 83.1490, "NH16 National Highway - South Arterial", "Gajuwaka", "EB", "online", 30.0, 38.0, 96.2, 24.0),
            ("CAM-TOL-003", "Aganampudi Toll Plaza Gate 04", 17.6785, 83.1610, "Aganampudi Toll Expressway", "Gajuwaka", "EB", "online", 30.0, 48.0, 61.4, 18.0), # Degraded camera
            ("CAM-TWN-004", "Gajuwaka Town Center Junction", 17.6890, 83.1860, "NH16 National Highway - South Arterial", "Gajuwaka", "EB", "online", 30.0, 35.0, 94.8, 22.0),
            ("CAM-CTR-005", "Siripuram Circle North ANPR", 17.7180, 83.3080, "Siripuram Circle Express", "City Centre", "NB", "online", 30.0, 32.0, 97.1, 28.0),

            # Additional Visakhapatnam Nodes across zones
            ("CAM-AIR-006", "Visakhapatnam Airport Terminal Entry", 17.7220, 83.2210, "Airport Flyover Corridor", "Airport Road", "EB", "online", 30.0, 40.0, 96.0, 16.0),
            ("CAM-AIR-007", "Airport Road NH16 Merge Gate", 17.7310, 83.2280, "Airport Flyover Corridor", "Airport Road", "NB", "online", 30.0, 44.0, 93.5, 20.0),
            ("CAM-NAD-008", "NAD Junction Level-1 Flyover North", 17.7405, 83.2265, "NAD Multi-Level Junction Ring", "NAD Junction", "NB", "online", 30.0, 36.0, 95.0, 34.0),
            ("CAM-NAD-009", "NAD Junction Underpass Southbound", 17.7390, 83.2250, "NAD Multi-Level Junction Ring", "NAD Junction", "SB", "warning", 24.0, 110.0, 88.0, 30.0),
            ("CAM-NAD-010", "NAD West Entry - Gopalapatnam Road", 17.7420, 83.2210, "NAD Multi-Level Junction Ring", "NAD Junction", "WB", "online", 30.0, 39.0, 94.2, 26.0),
            ("CAM-MAD-011", "Maddilapalem RTC Complex Junction", 17.7320, 83.3210, "BRTS Expressway Corridor", "Maddilapalem", "EB", "online", 30.0, 41.0, 95.8, 38.0),
            ("CAM-MAD-012", "AU High School Gate ANPR", 17.7355, 83.3280, "Andhra University Main Road", "Maddilapalem", "NB", "online", 30.0, 33.0, 96.5, 14.0),
            ("CAM-MAD-013", "BRTS Maddilapalem Lane 1", 17.7380, 83.3320, "BRTS Expressway Corridor", "Maddilapalem", "WB", "online", 30.0, 37.0, 94.0, 25.0),
            ("CAM-MVP-014", "MVP Colony Sector-3 Main Arch", 17.7440, 83.3410, "MVP Sector 4 Main Avenue", "MVP Colony", "NB", "online", 30.0, 30.0, 98.0, 15.0),
            ("CAM-MVP-015", "Beach Road Tenneti Park Overlook", 17.7560, 83.3550, "Beach Road Coastal Promenade", "MVP Colony", "NB", "online", 30.0, 52.0, 92.5, 19.0),
            ("CAM-MVP-016", "RK Beach Promenade South Gate", 17.7150, 83.3250, "Beach Road Coastal Promenade", "MVP Colony", "SB", "online", 30.0, 46.0, 94.1, 21.0),
            ("CAM-CTR-017", "Jagadamba Junction Cinema Road", 17.7090, 83.2990, "Jagadamba Centre Hub Road", "City Centre", "EB", "warning", 20.0, 95.0, 89.0, 32.0),
            ("CAM-CTR-018", "GVMC Headquarters Gate CCTV", 17.7150, 83.3030, "Siripuram Circle Express", "City Centre", "WB", "online", 30.0, 31.0, 97.4, 23.0),
            ("CAM-GAJ-019", "Gajuwaka Industrial Estate North", 17.6940, 83.1930, "NH16 National Highway - South Arterial", "Gajuwaka", "NB", "offline", 0.0, 0.0, 0.0, 0.0),
            ("CAM-CTR-020", "Siripuram INOX Mall Junction", 17.7210, 83.3120, "Siripuram Circle Express", "City Centre", "EB", "online", 30.0, 34.0, 96.8, 29.0)
        ]

        cameras_map = {}
        for c_id, name, lat, lng, road_name, zone_name, direction, status, fps, latency, ocr_acc, vpm in cameras_data:
            cam = Camera(
                id=c_id,
                name=name,
                latitude=lat,
                longitude=lng,
                road_id=roads_map.get(road_name),
                zone_id=zones_map[zone_name],
                direction=direction,
                status=status,
                fps=fps,
                latency_ms=latency,
                ocr_accuracy=ocr_acc,
                vehicles_per_min=vpm,
                is_simulation=True,
                last_heartbeat=datetime.utcnow() - timedelta(minutes=1 if status == "online" else 45)
            )
            db.add(cam)
            cameras_map[c_id] = cam

            # Camera health log
            health = CameraHealth(
                camera_id=c_id,
                timestamp=datetime.utcnow() - timedelta(minutes=5),
                status=status,
                latency_ms=latency,
                packet_loss_pct=0.0 if status == "online" else (5.5 if status == "warning" else 100.0),
                fps_actual=fps,
                error_message=None if status == "online" else ("High network jitter detected" if status == "warning" else "RTSP stream disconnected")
            )
            db.add(health)

        db.flush()

        # -------------------------------------------------------------
        # 4. WATCHLIST
        # -------------------------------------------------------------
        print("[+] Seeding Watchlist records...")
        watchlist_seeds = [
            ("AP39AB1234", "active_investigation", "urgent", "Flagged vehicle linked to Case #BEL-2026-0914 (Cross-city surveillance test)"),
            ("AP31TX9901", "stolen", "high", "Stolen White Hyundai Creta reported from Siripuram Central on 2026-08-25"),
            ("TS09UB4432", "traffic_violator", "medium", "Repeat high-speed violation on Beach Road promenade"),
            ("KA01MN7712", "authorized_watchlist", "low", "State VIP Convoy Escort Protocol"),
            ("AP39ZZ0007", "stolen", "urgent", "Black Mahindra Scorpio with fake number plate alert")
        ]

        for plate_str, reason, priority, notes in watchlist_seeds:
            wl = Watchlist(
                plate_number=plate_str,
                reason_category=reason,
                priority=priority,
                notes=notes,
                created_by=users_map.get("investigator_cid"),
                is_active=True
            )
            db.add(wl)

        # -------------------------------------------------------------
        # 5. DEMO VEHICLE AP39AB1234 (Exact Demo Scenario)
        # -------------------------------------------------------------
        print("[+] Pre-positioning Flagship Demo Vehicle AP39AB1234...")
        demo_vehicle = Vehicle(
            primary_plate="AP39AB1234",
            vehicle_type="car",
            make="Tata",
            model="Nexon EV",
            color="white",
            first_seen_at=datetime.utcnow() - timedelta(minutes=45),
            last_seen_at=datetime.utcnow() - timedelta(minutes=5),
            last_camera_id="CAM-CTR-005",
            total_detections=5,
            is_flagged=True
        )
        db.add(demo_vehicle)
        db.flush()

        demo_plate = Plate(
            plate_number="AP39AB1234",
            vehicle_id=demo_vehicle.id,
            state_code="AP",
            rto_code="39",
            series="AB",
            num_part="1234",
            is_standard=True
        )
        db.add(demo_plate)
        db.flush()

        # Demo scenario chronological detections:
        # 1. Rural Camera (09:15)
        # 2. Highway Camera (09:25)
        # 3. Toll Camera (09:35) -> Deliberately degraded read (AP39A?1234, ocr_confidence 0.61)
        # 4. Town Camera (09:43)
        # 5. City Camera (09:55)
        demo_path_steps = [
            ("CAM-RUR-001", 45, "AP39AB1234", "AP39AB1234", 0.96, 62.0, "EB", False, 17.6520, 83.1180, 0.0, 0.0, 0.0),
            ("CAM-HWY-002", 35, "AP39AB1234", "AP39AB1234", 0.95, 78.0, "EB", False, 17.6710, 83.1490, 4.2, 600.0, 25.2),
            ("CAM-TOL-003", 25, "AP39A?1234", "AP39A?1234", 0.61, 35.0, "EB", True, 17.6785, 83.1610, 2.1, 600.0, 12.6), # Degraded at toll
            ("CAM-TWN-004", 17, "AP39AB1234", "AP39AB1234", 0.94, 52.0, "EB", False, 17.6890, 83.1860, 3.8, 480.0, 28.5),
            ("CAM-CTR-005", 5,  "AP39AB1234", "AP39AB1234", 0.97, 48.0, "NB", False, 17.7180, 83.3080, 13.5, 720.0, 67.5),
        ]

        for seq, (cam_id, min_ago, raw_p, norm_p, conf, spd, direct, is_low_c, lat, lng, dist, t_time, impl_spd) in enumerate(demo_path_steps):
            det_time = datetime.utcnow() - timedelta(minutes=min_ago)
            det = VehicleDetection(
                camera_id=cam_id,
                vehicle_id=demo_vehicle.id,
                raw_plate_text=raw_p,
                normalized_plate_text=norm_p,
                ocr_confidence=conf,
                vehicle_type="car",
                vehicle_color="white",
                speed_kmh=spd,
                direction=direct,
                timestamp=det_time,
                image_url=f"/data/sample_footage/demo_step_{seq+1}.jpg",
                is_simulated=True,
                is_low_confidence=is_low_c
            )
            db.add(det)
            db.flush()

            # Trajectory Event
            traj = TrajectoryEvent(
                vehicle_id=demo_vehicle.id,
                detection_id=det.id,
                camera_id=cam_id,
                timestamp=det_time,
                latitude=lat,
                longitude=lng,
                speed_kmh=spd,
                distance_from_prev_km=dist,
                travel_time_sec=t_time,
                implied_speed_kmh=impl_spd,
                direction=direct,
                is_impossible_transition=False,
                anomaly_flags={"ocr_degraded": is_low_c, "reid_reconstructed": (seq == 2)},
                sequence_index=seq
            )
            db.add(traj)

            # Re-ID Features embedding
            feat = VehicleFeature(
                vehicle_id=demo_vehicle.id,
                detection_id=det.id,
                color_histogram={"r": 0.88, "g": 0.89, "b": 0.91},
                embedding_vector=[0.12, -0.45, 0.88, 0.32, 0.05, 0.77],
                feature_type="osnet_clip_stub",
                confidence=conf
            )
            db.add(feat)

        # Trigger Demo Alert for AP39AB1234
        demo_alert = Alert(
            vehicle_id=demo_vehicle.id,
            detection_id=det.id,
            camera_id="CAM-CTR-005",
            alert_type="watchlist_match",
            severity="critical",
            title="Watchlist Match Detected — AP39AB1234",
            description="Vehicle AP39AB1234 matched active surveillance watchlist at Siripuram Circle North ANPR.",
            confidence=0.97,
            timestamp=datetime.utcnow() - timedelta(minutes=5),
            is_resolved=False
        )
        db.add(demo_alert)

        # Case for AP39AB1234
        demo_case = Case(
            case_number="CAS-VSP-2026-0914",
            title="Operation Coastal Vigilance: Subject AP39AB1234",
            case_type="surveillance",
            subject_vehicle_id=demo_vehicle.id,
            subject_plate="AP39AB1234",
            status="open",
            assigned_investigator_id=users_map.get("investigator_cid"),
            notes="Vehicle tracked entering from Sabbavaram Rural corridor, passed through Toll with degraded read, Re-ID confirmed route continuity to City Centre."
        )
        db.add(demo_case)
        db.flush()

        case_event = CaseEvent(
            case_id=demo_case.id,
            event_type="detection_tagged",
            description="Reconstructed trajectory confirmed 5 camera hits from Rural Outpost to Siripuram Circle.",
            evidence_data={"cameras": ["CAM-RUR-001", "CAM-HWY-002", "CAM-TOL-003", "CAM-TWN-004", "CAM-CTR-005"]},
            created_by=users_map.get("investigator_cid"),
            timestamp=datetime.utcnow() - timedelta(minutes=4)
        )
        db.add(case_event)

        # -------------------------------------------------------------
        # 6. SYNTHETIC FLEET (80+ Vehicles & 1,500+ Detections)
        # -------------------------------------------------------------
        print("[+] Generating 80+ synthetic vehicles and 1,500+ realistic detection events...")
        makes_models = {
            "car": [("Maruti", "Swift"), ("Hyundai", "Creta"), ("Tata", "Nexon"), ("Honda", "City"), ("Mahindra", "XUV700"), ("Toyota", "Innova")],
            "motorcycle": [("Hero", "Splendor"), ("Honda", "Activa"), ("Royal Enfield", "Classic 350"), ("Bajaj", "Pulsar")],
            "truck": [("Tata", "Prima"), ("Ashok Leyland", "Ecomet"), ("BharatBenz", "1617R")],
            "bus": [("APSRTC", "Super Luxury"), ("Volvo", "9600"), ("Tata", "Starbus")],
            "auto_rickshaw": [("Bajaj", "RE Compact"), ("Piaggio", "Ape"), ("Mahindra", "Treo")]
        }
        colors = ["white", "silver", "black", "grey", "blue", "red", "yellow", "green"]
        state_prefixes = [("AP", "39"), ("AP", "31"), ("AP", "35"), ("TS", "09"), ("TS", "07"), ("KA", "01"), ("OD", "02")]

        all_cams = list(cameras_map.keys())
        camera_objs = list(cameras_map.values())

        # Generate vehicles
        vehicles_pool = []
        for i in range(1, 85):
            v_type = random.choices(["car", "motorcycle", "auto_rickshaw", "truck", "bus"], weights=[50, 25, 12, 8, 5])[0]
            make, model = random.choice(makes_models[v_type])
            color = random.choice(colors)
            st, rto = random.choice(state_prefixes)
            series_ltrs = f"{chr(random.randint(65, 90))}{chr(random.randint(65, 90))}"
            num_code = f"{random.randint(1000, 9999)}"
            plate_code = f"{st}{rto}{series_ltrs}{num_code}"

            first_seen = datetime.utcnow() - timedelta(hours=random.randint(1, 48))
            last_seen = first_seen + timedelta(hours=random.randint(1, 24))

            veh = Vehicle(
                primary_plate=plate_code,
                vehicle_type=v_type,
                make=make,
                model=model,
                color=color,
                first_seen_at=first_seen,
                last_seen_at=last_seen,
                last_camera_id=random.choice(all_cams),
                total_detections=0,
                is_flagged=(plate_code == "AP31TX9901" or plate_code == "TS09UB4432")
            )
            db.add(veh)
            db.flush()

            plate_obj = Plate(
                plate_number=plate_code,
                vehicle_id=veh.id,
                state_code=st,
                rto_code=rto,
                series=series_ltrs,
                num_part=num_code,
                is_standard=True
            )
            db.add(plate_obj)
            vehicles_pool.append(veh)

        # Generate 1,500+ Detections distributed over last 24 hours
        print("[+] Distributing detections across Visakhapatnam camera nodes...")
        detections_count = 0
        now = datetime.utcnow()

        for veh in vehicles_pool:
            num_hits = random.randint(8, 30)
            base_time = now - timedelta(hours=random.randint(2, 36))

            # Pick a contiguous zone cluster
            start_cam = random.choice(camera_objs)
            curr_lat = start_cam.latitude
            curr_lng = start_cam.longitude

            for h in range(num_hits):
                t_stamp = base_time + timedelta(minutes=h * random.randint(3, 18))
                if t_stamp > now:
                    break

                target_cam = random.choice(camera_objs)
                speed = round(random.uniform(25.0, 75.0), 1)
                conf = round(random.uniform(0.85, 0.99), 2)
                is_low_conf = False

                # 4% chance of low confidence OCR
                raw_text = veh.primary_plate
                if random.random() < 0.04:
                    raw_text = veh.primary_plate[:-2] + "??"
                    conf = round(random.uniform(0.45, 0.68), 2)
                    is_low_conf = True

                detection = VehicleDetection(
                    camera_id=target_cam.id,
                    vehicle_id=veh.id,
                    raw_plate_text=raw_text,
                    normalized_plate_text=veh.primary_plate if not is_low_conf else raw_text,
                    ocr_confidence=conf,
                    vehicle_type=veh.vehicle_type,
                    vehicle_color=veh.color,
                    speed_kmh=speed,
                    direction=target_cam.direction,
                    timestamp=t_stamp,
                    is_simulated=True,
                    is_low_confidence=is_low_conf
                )
                db.add(detection)
                db.flush()

                # Trajectory event
                dist_km = round(random.uniform(1.2, 5.5), 2)
                t_sec = random.randint(120, 600)
                implied_speed = round((dist_km / (t_sec / 3600.0)), 1)
                is_impossible = (implied_speed > 180.0)

                traj_ev = TrajectoryEvent(
                    vehicle_id=veh.id,
                    detection_id=detection.id,
                    camera_id=target_cam.id,
                    timestamp=t_stamp,
                    latitude=target_cam.latitude,
                    longitude=target_cam.longitude,
                    speed_kmh=speed,
                    distance_from_prev_km=dist_km,
                    travel_time_sec=float(t_sec),
                    implied_speed_kmh=implied_speed,
                    direction=target_cam.direction,
                    is_impossible_transition=is_impossible,
                    sequence_index=h
                )
                db.add(traj_ev)
                detections_count += 1
                veh.total_detections += 1
                veh.last_seen_at = t_stamp
                veh.last_camera_id = target_cam.id

        # -------------------------------------------------------------
        # 7. TRAFFIC METRICS, CONGESTION RECORDS & OD FLOWS
        # -------------------------------------------------------------
        print("[+] Computing traffic density metrics & prototype congestion models...")
        for zone_name, z_id in zones_map.items():
            for hr in range(24):
                metric_time = now - timedelta(hours=23 - hr)
                is_peak = (8 <= metric_time.hour <= 11) or (17 <= metric_time.hour <= 20)
                vol = random.randint(120, 380) if is_peak else random.randint(30, 110)
                avg_spd = random.uniform(25.0, 40.0) if is_peak else random.uniform(45.0, 65.0)
                dens = "high" if is_peak else ("moderate" if vol > 80 else "low")

                metric = TrafficMetric(
                    zone_id=z_id,
                    road_id=None,
                    camera_id=None,
                    timestamp=metric_time,
                    vehicle_count=vol,
                    avg_speed_kmh=round(avg_spd, 1),
                    density_level=dens,
                    occupancy_rate=round(vol / 400.0, 2),
                    peak_hour_flag=is_peak
                )
                db.add(metric)

        # Prototype Congestion Records
        for road_name, r_id in list(roads_map.items())[:6]:
            road_obj = db.query(Road).filter(Road.id == r_id).first()
            cong_rec = CongestionRecord(
                road_id=r_id,
                zone_id=road_obj.zone_id,
                severity="high" if road_obj.is_congested else "moderate",
                current_density=0.78 if road_obj.is_congested else 0.42,
                predicted_density_15min=0.84 if road_obj.is_congested else 0.48,
                predicted_density_30min=0.89 if road_obj.is_congested else 0.52,
                risk_level="high" if road_obj.is_congested else "medium",
                duration_minutes=random.randint(15, 45),
                is_prototype_prediction=True, # Explicit prototype label
                timestamp=datetime.utcnow()
            )
            db.add(cong_rec)

        # Origin-Destination Flows
        od_pairs = [
            ("CAM-RUR-001", "CAM-HWY-002", "Gajuwaka", "Gajuwaka", 142, 620, 65.0),
            ("CAM-HWY-002", "CAM-TOL-003", "Gajuwaka", "Gajuwaka", 195, 340, 55.0),
            ("CAM-TOL-003", "CAM-TWN-004", "Gajuwaka", "Gajuwaka", 188, 480, 48.0),
            ("CAM-TWN-004", "CAM-CTR-005", "Gajuwaka", "City Centre", 112, 1100, 42.0),
            ("CAM-AIR-006", "CAM-NAD-008", "Airport Road", "NAD Junction", 168, 540, 52.0),
            ("CAM-NAD-008", "CAM-MAD-011", "NAD Junction", "Maddilapalem", 210, 890, 44.0),
            ("CAM-MAD-011", "CAM-MVP-014", "Maddilapalem", "MVP Colony", 134, 450, 46.0),
            ("CAM-CTR-005", "CAM-MVP-016", "City Centre", "MVP Colony", 156, 720, 38.0)
        ]

        for o_cam, d_cam, o_z, d_z, count, t_sec, avg_s in od_pairs:
            flow = TrafficFlow(
                origin_camera_id=o_cam,
                dest_camera_id=d_cam,
                origin_zone_id=zones_map[o_z],
                dest_zone_id=zones_map[d_z],
                vehicle_count=count,
                avg_travel_time_sec=float(t_sec),
                avg_speed_kmh=avg_s,
                timestamp_window_start=now - timedelta(hours=4),
                timestamp_window_end=now
            )
            db.add(flow)

        # Additional Alerts
        extra_alerts = [
            ("AP31TX9901", "CAM-CTR-017", "watchlist_match", "critical", "Stolen Vehicle Sighted", "Stolen Hyundai Creta passed Jagadamba Junction."),
            ("TS09UB4432", "CAM-MVP-015", "excessive_speed", "warning", "Excessive Speed Violation", "Vehicle recorded at 98 km/h on Beach Road (Speed limit 50 km/h)."),
            (None, "CAM-NAD-009", "traffic_spike", "info", "Traffic Volume Spike", "Vehicle density exceeded threshold by 140% during evening peak."),
            (None, "CAM-GAJ-019", "camera_failure", "warning", "Camera Stream Loss", "RTSP heartbeat lost on Gajuwaka Industrial Estate North.")
        ]

        for plt_num, cam_id, a_type, sev, title, desc in extra_alerts:
            veh_obj = db.query(Vehicle).filter(Vehicle.primary_plate == plt_num).first() if plt_num else None
            alert = Alert(
                vehicle_id=veh_obj.id if veh_obj else None,
                detection_id=None,
                camera_id=cam_id,
                alert_type=a_type,
                severity=sev,
                title=title,
                description=desc,
                confidence=0.94,
                timestamp=datetime.utcnow() - timedelta(minutes=random.randint(10, 180)),
                is_resolved=False
            )
            db.add(alert)

        db.commit()

        print("=" * 65)
        print(" [SUCCESS] DATABASE SEEDING COMPLETED SUCCESSFULLY!")
        print(f"  * User Roles:        {db.query(Role).count()}")
        print(f"  * Seed Users:        {db.query(User).count()}")
        print(f"  * Zones:             {db.query(Zone).count()} ({', '.join(zones_map.keys())})")
        print(f"  * Roads:             {db.query(Road).count()}")
        print(f"  * Cameras:           {db.query(Camera).count()}")
        print(f"  * Vehicles:          {db.query(Vehicle).count()}")
        print(f"  * Total Detections:  {db.query(VehicleDetection).count()}")
        print(f"  * Trajectory Events: {db.query(TrajectoryEvent).count()}")
        print(f"  * Watchlist Items:   {db.query(Watchlist).count()}")
        print(f"  * Active Alerts:     {db.query(Alert).count()}")
        print(f"  * Cases:             {db.query(Case).count()}")
        print(f"  * Demo Path:         AP39AB1234 (Rural -> Highway -> Toll [Degraded] -> Town -> City)")
        print("=" * 65)

    except Exception as e:
        db.rollback()
        print(f"[!] Error seeding database: {str(e)}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
