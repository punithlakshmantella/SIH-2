import os
import shutil
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

def update_presentation():
    orig_path = r"C:\Users\Punit\OneDrive\Pictures\Route Riders.pptx"
    backup_path = r"C:\Users\Punit\OneDrive\Pictures\Route Riders_Original_Backup.pptx"
    
    # Ensure backup exists
    if not os.path.exists(backup_path):
        shutil.copy2(orig_path, backup_path)
        print(f"[+] Backup saved at: {backup_path}")
    
    prs = Presentation(backup_path)
    
    # -------------------------------------------------------------
    # SLIDE 1: Cover Slide
    # -------------------------------------------------------------
    s1 = prs.slides[0]
    # Shape 3: Subtitle
    if len(s1.shapes) > 3 and s1.shapes[3].has_text_frame:
        tf = s1.shapes[3].text_frame
        tf.text = "City Vision - City-Wide AI Engine for Vehicle Intelligence"
        for p in tf.paragraphs:
            p.alignment = PP_ALIGN.LEFT
            for r in p.runs:
                r.font.name = "Times New Roman"
                r.font.bold = True
                r.font.size = Pt(22)

    # Shape 5: Metadata box
    if len(s1.shapes) > 5 and s1.shapes[5].has_text_frame:
        tf = s1.shapes[5].text_frame
        tf.clear()
        
        lines = [
            ("Problem Statement ID", "SIH26127"),
            ("Problem Statement Title", "City-Wide AI Engine for Multi-Camera ANPR Trajectory Tracking and Urban Traffic Analytics"),
            ("Organization / Ministry", "Bharat Electronics Limited (BEL)"),
            ("Theme", "Smart Automation"),
            ("PS Category", "Software"),
            ("Team Name", "Route Riders"),
            ("Deployment Target", "Visakhapatnam Metropolitan City (GVMC / ICCC)")
        ]
        
        for i, (label, val) in enumerate(lines):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            p.space_after = Pt(4)
            p.space_before = Pt(2)
            
            r1 = p.add_run()
            r1.text = f"{label}: "
            r1.font.name = "Aptos"
            r1.font.bold = True
            r1.font.size = Pt(13)
            r1.font.color.rgb = RGBColor(30, 41, 59)
            
            r2 = p.add_run()
            r2.text = val
            r2.font.name = "Aptos"
            r2.font.bold = (label in ["Problem Statement ID", "Team Name"])
            r2.font.size = Pt(13)
            r2.font.color.rgb = RGBColor(14, 116, 144) if label in ["Problem Statement ID", "Team Name"] else RGBColor(51, 65, 85)

    print("[+] Slide 1 updated.")

    # -------------------------------------------------------------
    # SLIDE 2: Problem & Solution
    # -------------------------------------------------------------
    s2 = prs.slides[1]
    
    # Shape 1: Title
    if len(s2.shapes) > 1 and s2.shapes[1].has_text_frame:
        tf = s2.shapes[1].text_frame
        tf.text = "City Vision - AI Urban Traffic & Vehicle Intelligence"
        for p in tf.paragraphs:
            for r in p.runs:
                r.font.name = "Times New Roman"
                r.font.bold = True
                r.font.size = Pt(32)

    # Shape 6: Subtitle
    if len(s2.shapes) > 6 and s2.shapes[6].has_text_frame:
        tf = s2.shapes[6].text_frame
        tf.text = "From isolated CCTV streams to an integrated, physics-validated city-wide intelligence grid"
        for p in tf.paragraphs:
            for r in p.runs:
                r.font.name = "Aptos"
                r.font.size = Pt(12)
                r.font.color.rgb = RGBColor(71, 85, 105)

    # Shape 7: Problem
    if len(s2.shapes) > 7 and s2.shapes[7].has_text_frame:
        tf = s2.shapes[7].text_frame
        tf.clear()
        p_head = tf.paragraphs[0]
        p_head.text = "PROBLEM"
        p_head.space_after = Pt(6)
        for r in p_head.runs:
            r.font.name = "Aptos Display"
            r.font.bold = True
            r.font.size = Pt(15)
            r.font.color.rgb = RGBColor(185, 28, 28)
            
        prob_points = [
            "Traditional ANPR fails on degraded/tampered plates (rain, glare, blur, night-time).",
            "Lack of multi-camera correlation leaves vehicle journeys disjointed across city corridors.",
            "No transit physics checks cause false-positive trajectory stitching (>140 km/h errors).",
            "Siloed CCTV feeds fail to provide city-wide Origin-Destination (OD) congestion insights."
        ]
        for pt in prob_points:
            p = tf.add_paragraph()
            p.text = f"- {pt}"
            p.space_after = Pt(3)
            for r in p.runs:
                r.font.name = "Aptos"
                r.font.size = Pt(12.5)

    # Shape 8: Proposed Solution
    if len(s2.shapes) > 8 and s2.shapes[8].has_text_frame:
        tf = s2.shapes[8].text_frame
        tf.clear()
        p_head = tf.paragraphs[0]
        p_head.text = "PROPOSED SOLUTION"
        p_head.space_after = Pt(6)
        for r in p_head.runs:
            r.font.name = "Aptos Display"
            r.font.bold = True
            r.font.size = Pt(15)
            r.font.color.rgb = RGBColor(16, 185, 129)
            
        sol_points = [
            "Optical quality-gated Indian ANPR/OCR (CLAHE contrast + bilateral denoising + deskew).",
            "Multi-Modal Spatio-Temporal Re-ID (plate similarity, vehicle class, paint color & road graph).",
            "Physics-Validated Trajectory Reconstruction (automatic rejection of impossible transitions).",
            "Zero-Cost Open GIS (Leaflet + OpenStreetMap) with real-time WebSocket alert dispatch."
        ]
        for pt in sol_points:
            p = tf.add_paragraph()
            p.text = f"- {pt}"
            p.space_after = Pt(3)
            for r in p.runs:
                r.font.name = "Aptos"
                r.font.size = Pt(12.5)

    # Shape 9: Novelty
    if len(s2.shapes) > 9 and s2.shapes[9].has_text_frame:
        tf = s2.shapes[9].text_frame
        tf.clear()
        p_head = tf.paragraphs[0]
        p_head.text = "NOVELTY & KEY INNOVATIONS"
        p_head.space_after = Pt(6)
        for r in p_head.runs:
            r.font.name = "Aptos Display"
            r.font.bold = True
            r.font.size = Pt(15)
            r.font.color.rgb = RGBColor(14, 116, 144)
            
        nov_points = [
            "Multi-Modal Probabilistic Vehicle Re-ID with ethical non-certainty officer verification phrasing.",
            "Physics-Speed Gating: Automatically flags impossible teleportation (>140 km/h) on Leaflet map.",
            "Optical Variance Quality Score: Computes Laplacian sharpness before dispatching OCR.",
            "Zero Recurring Paid Map Licensing: Built 100% on OpenStreetMap tiles (no Google Maps API fees).",
            "Origin-Destination (OD) Transit Matrices & Corridor Velocity Analytics for Smart Governance."
        ]
        for pt in nov_points:
            p = tf.add_paragraph()
            p.text = f"- {pt}"
            p.space_after = Pt(2.5)
            for r in p.runs:
                r.font.name = "Aptos"
                r.font.size = Pt(12)

    print("[+] Slide 2 updated.")

    # -------------------------------------------------------------
    # SLIDE 3: Technical Approach
    # -------------------------------------------------------------
    s3 = prs.slides[2]
    
    # Shape 5: Technologies
    if len(s3.shapes) > 5 and s3.shapes[5].has_text_frame:
        tf = s3.shapes[5].text_frame
        tf.clear()
        p = tf.paragraphs[0]
        r1 = p.add_run()
        r1.text = "CORE STACK: "
        r1.font.name = "Aptos Display"
        r1.font.bold = True
        r1.font.size = Pt(12)
        r1.font.color.rgb = RGBColor(14, 116, 144)
        
        r2 = p.add_run()
        r2.text = "React 18 | TypeScript | Tailwind | Leaflet GIS | FastAPI (Python) | PostgreSQL | OpenCV | PaddleOCR | Celery/Redis"
        r2.font.name = "Aptos"
        r2.font.bold = False
        r2.font.size = Pt(11.5)
        r2.font.color.rgb = RGBColor(30, 41, 59)

    # Shape 6: DATA
    if len(s3.shapes) > 6 and s3.shapes[6].has_text_frame:
        tf = s3.shapes[6].text_frame
        tf.clear()
        p_head = tf.paragraphs[0]
        p_head.text = "DATA SOURCES"
        p_head.space_after = Pt(4)
        for r in p_head.runs:
            r.font.name = "Aptos Display"
            r.font.bold = True
            r.font.size = Pt(13)
            r.font.color.rgb = RGBColor(14, 116, 144)
            
        data_points = [
            "CCTV & ANPR RTSP Streams",
            "Indian HSRP License Plates",
            "Degraded Samples (Rain/Glare)",
            "Camera GPS & Road Topology",
            "Corridor Velocity & Timestamps"
        ]
        for pt in data_points:
            p = tf.add_paragraph()
            p.text = f"- {pt}"
            p.space_after = Pt(2)
            for r in p.runs:
                r.font.name = "Aptos"
                r.font.size = Pt(11)

    # Shape 7: DETECT & RECOGNIZE
    if len(s3.shapes) > 7 and s3.shapes[7].has_text_frame:
        tf = s3.shapes[7].text_frame
        tf.clear()
        p_head = tf.paragraphs[0]
        p_head.text = "DETECT & RECOGNIZE"
        p_head.space_after = Pt(4)
        for r in p_head.runs:
            r.font.name = "Aptos Display"
            r.font.bold = True
            r.font.size = Pt(13)
            r.font.color.rgb = RGBColor(14, 116, 144)
            
        det_points = [
            "YOLOv8: Fast vehicle localization & class cropping.",
            "HSRP Plate Extraction: Localizes Indian number plates.",
            "OpenCV CLAHE: Contrast boost & bilateral denoising.",
            "PaddleOCR: Dual-pass character read with confidence."
        ]
        for pt in det_points:
            p = tf.add_paragraph()
            p.text = f"- {pt}"
            p.space_after = Pt(2)
            for r in p.runs:
                r.font.name = "Aptos"
                r.font.size = Pt(11)

    # Shape 8: TRACK & MATCH
    if len(s3.shapes) > 8 and s3.shapes[8].has_text_frame:
        tf = s3.shapes[8].text_frame
        tf.clear()
        p_head = tf.paragraphs[0]
        p_head.text = "TRACK & RE-ID"
        p_head.space_after = Pt(4)
        for r in p_head.runs:
            r.font.name = "Aptos Display"
            r.font.bold = True
            r.font.size = Pt(13)
            r.font.color.rgb = RGBColor(14, 116, 144)
            
        trk_points = [
            "Intra-Camera Tracking: ByteTrack maintains object IDs.",
            "Multi-Modal Re-ID: Weighted score (Plate + Class + Color).",
            "Spatio-Temporal Graph: Validates transit travel delta.",
            "Trajectory Assembly: Chronological waypoint stitching."
        ]
        for pt in trk_points:
            p = tf.add_paragraph()
            p.text = f"- {pt}"
            p.space_after = Pt(2)
            for r in p.runs:
                r.font.name = "Aptos"
                r.font.size = Pt(11)

    # Shape 9: ANALYZE & ALERT
    if len(s3.shapes) > 9 and s3.shapes[9].has_text_frame:
        tf = s3.shapes[9].text_frame
        tf.clear()
        p_head = tf.paragraphs[0]
        p_head.text = "ANALYZE & ALERT"
        p_head.space_after = Pt(4)
        for r in p_head.runs:
            r.font.name = "Aptos Display"
            r.font.bold = True
            r.font.size = Pt(13)
            r.font.color.rgb = RGBColor(14, 116, 144)
            
        an_points = [
            "Physics Validation: Flags impossible speed hops (>140 km/h).",
            "OD Flow Analysis: Origin-Destination transit matrices.",
            "Automated Rules: WebSocket push for watchlists & speeders.",
            "Interactive GIS: Free Leaflet OSM route animation."
        ]
        for pt in an_points:
            p = tf.add_paragraph()
            p.text = f"- {pt}"
            p.space_after = Pt(2)
            for r in p.runs:
                r.font.name = "Aptos"
                r.font.size = Pt(11)

    print("[+] Slide 3 updated.")

    # -------------------------------------------------------------
    # SLIDE 4: Feasibility & Viability
    # -------------------------------------------------------------
    s4 = prs.slides[3]
    
    # Shape 5: Feasibility
    if len(s4.shapes) > 5 and s4.shapes[5].has_text_frame:
        tf = s4.shapes[5].text_frame
        tf.clear()
        p_head = tf.paragraphs[0]
        p_head.text = "FEASIBILITY & COST VIABILITY"
        p_head.space_after = Pt(6)
        for r in p_head.runs:
            r.font.name = "Aptos Display"
            r.font.bold = True
            r.font.size = Pt(15)
            r.font.color.rgb = RGBColor(16, 185, 129)
            
        f_points = [
            "Existing Camera Compatibility: Connects to standard RTSP/H.264 streams without requiring expensive new CCTV hardware.",
            "Zero Recurring Paid Map Licensing: Built completely on OpenStreetMap GIS, eliminating ongoing Google Maps API bills.",
            "Scalable Microservice Architecture: Asynchronous FastAPI core with Celery/Redis handles high-concurrency ingestion.",
            "Edge & Defense Ready: Containerized lightweight architecture deployable on BEL edge units or municipal ICCCs."
        ]
        for pt in f_points:
            p = tf.add_paragraph()
            p.text = f"- {pt}"
            p.space_after = Pt(3)
            for r in p.runs:
                r.font.name = "Aptos"
                r.font.size = Pt(12)

    # Shape 6: Challenges
    if len(s4.shapes) > 6 and s4.shapes[6].has_text_frame:
        tf = s4.shapes[6].text_frame
        tf.clear()
        p_head = tf.paragraphs[0]
        p_head.text = "TECHNICAL CHALLENGES"
        p_head.space_after = Pt(6)
        for r in p_head.runs:
            r.font.name = "Aptos Display"
            r.font.bold = True
            r.font.size = Pt(15)
            r.font.color.rgb = RGBColor(225, 29, 72)
            
        c_points = [
            "Severe optical degradation (night-time glare, heavy rain, motion blur).",
            "Ambiguous, non-standard, or tampered Indian vehicle registration plates.",
            "Multi-camera identity confusion and false trajectory stitching.",
            "High video stream processing latency across dense city sensor networks.",
            "Strict evidence integrity, data privacy & chain-of-custody compliance."
        ]
        for pt in c_points:
            p = tf.add_paragraph()
            p.text = f"- {pt}"
            p.space_after = Pt(2.5)
            for r in p.runs:
                r.font.name = "Aptos"
                r.font.size = Pt(12)

    # Shape 7: Strategies
    if len(s4.shapes) > 7 and s4.shapes[7].has_text_frame:
        tf = s4.shapes[7].text_frame
        tf.clear()
        p_head = tf.paragraphs[0]
        p_head.text = "MITIGATION STRATEGIES"
        p_head.space_after = Pt(6)
        for r in p_head.runs:
            r.font.name = "Aptos Display"
            r.font.bold = True
            r.font.size = Pt(15)
            r.font.color.rgb = RGBColor(14, 116, 144)
            
        s_points = [
            "Multi-stage OpenCV preprocessing (CLAHE contrast, bilateral smoothing, sharpness gating).",
            "Multi-modal probabilistic Re-ID weighting with neutral officer-verification phrasing.",
            "Haversine transit physics rules to automatically reject impossible corridor jumps (>140 km/h).",
            "Asynchronous streaming pipeline with Redis caching for ultra-low latency.",
            "Role-Based Access Control (RBAC), JWT encryption & immutable audit logging."
        ]
        for pt in s_points:
            p = tf.add_paragraph()
            p.text = f"- {pt}"
            p.space_after = Pt(2.5)
            for r in p.runs:
                r.font.name = "Aptos"
                r.font.size = Pt(12)

    print("[+] Slide 4 updated.")

    # -------------------------------------------------------------
    # SLIDE 5: Impact & Benefits
    # -------------------------------------------------------------
    s5 = prs.slides[4]
    
    # Shape 5: IMPACT label
    if len(s5.shapes) > 5 and s5.shapes[5].has_text_frame:
        tf = s5.shapes[5].text_frame
        tf.clear()
        p = tf.paragraphs[0]
        p.text = "IMPACT :"
        for r in p.runs:
            r.font.name = "Aptos Display"
            r.font.bold = True
            r.font.size = Pt(16)
            r.font.color.rgb = RGBColor(14, 116, 144)

    # Shape 8: Impact Box
    if len(s5.shapes) > 8 and s5.shapes[8].has_text_frame:
        tf = s5.shapes[8].text_frame
        tf.clear()
        p = tf.paragraphs[0]
        p.text = "Transforms passive CCTV feeds into an autonomous intelligence grid: enables sub-second trajectory assembly, proactive criminal alert dispatch, and evidence-based traffic governance with zero recurring paid map licensing costs."
        for r in p.runs:
            r.font.name = "Aptos"
            r.font.size = Pt(12.5)
            r.font.bold = True
            r.font.color.rgb = RGBColor(30, 41, 59)

    # Shape 6: BENEFITS label
    if len(s5.shapes) > 6 and s5.shapes[6].has_text_frame:
        tf = s5.shapes[6].text_frame
        tf.clear()
        p = tf.paragraphs[0]
        p.text = "BENEFITS :"
        for r in p.runs:
            r.font.name = "Aptos Display"
            r.font.bold = True
            r.font.size = Pt(16)
            r.font.color.rgb = RGBColor(16, 185, 129)

    # Shape 7: Benefits List
    if len(s5.shapes) > 7 and s5.shapes[7].has_text_frame:
        tf = s5.shapes[7].text_frame
        tf.clear()
        
        b_points = [
            "70%+ Exact OCR Match in unconstrained Indian road conditions; 100% State RTO Identification.",
            "Sub-Second Trajectory Reconstruction across 20+ metropolitan camera nodes with playback animation.",
            "Physics-Speed Validation rejects impossible hops (>140 km/h), eliminating false-positive tracking.",
            "Real-Time WebSocket Surveillance Alerts for hotlisted/stolen vehicles and dangerous speed violators.",
            "Origin-Destination (OD) Transit Heatmaps deliver actionable data for municipal infrastructure planning.",
            "Zero Recurring Licensing: 100% free OpenStreetMap GIS saves lakhs annually over Google Maps APIs.",
            "National Defense & Smart City Deployment Ready for Bharat Electronics Limited (BEL) command centers."
        ]
        for i, pt in enumerate(b_points):
            p = tf.paragraphs[0] if i == 0 else tf.add_paragraph()
            p.text = f"[+] {pt}"
            p.space_after = Pt(2.5)
            for r in p.runs:
                r.font.name = "Aptos"
                r.font.size = Pt(11.5)
                r.font.color.rgb = RGBColor(30, 41, 59)

    print("[+] Slide 5 updated.")

    # -------------------------------------------------------------
    # SLIDE 6: Research & References
    # -------------------------------------------------------------
    s6 = prs.slides[5]
    
    # Shape 5: YOLO
    if len(s6.shapes) > 5 and s6.shapes[5].has_text_frame:
        tf = s6.shapes[5].text_frame
        tf.clear()
        p_head = tf.paragraphs[0]
        p_head.text = "YOLOv8 & DeepSORT (Vehicle Detection & Tracking)"
        p_head.space_after = Pt(3)
        for r in p_head.runs:
            r.font.name = "Aptos Display"
            r.font.bold = True
            r.font.size = Pt(14)
            r.font.color.rgb = RGBColor(14, 116, 144)
            
        p = tf.add_paragraph()
        p.text = "Ultralytics YOLOv8 real-time bounding-box detection, multi-class vehicle identification (car, auto, bus, truck, motorcycle), and temporal object tracking within camera corridors."
        for r in p.runs:
            r.font.name = "Aptos"
            r.font.size = Pt(12)

    # Shape 6: PaddleOCR
    if len(s6.shapes) > 6 and s6.shapes[6].has_text_frame:
        tf = s6.shapes[6].text_frame
        tf.clear()
        p_head = tf.paragraphs[0]
        p_head.text = "PaddleOCR & Dual-Pass Text Extraction (Du et al.)"
        p_head.space_after = Pt(3)
        for r in p_head.runs:
            r.font.name = "Aptos Display"
            r.font.bold = True
            r.font.size = Pt(14)
            r.font.color.rgb = RGBColor(14, 116, 144)
            
        p = tf.add_paragraph()
        p.text = "High-speed OCR engine optimized for alphanumeric plate characters, non-standard Indian fonts, and degraded plate text with per-character confidence metrics."
        for r in p.runs:
            r.font.name = "Aptos"
            r.font.size = Pt(12)

    # Shape 7: OpenCV
    if len(s6.shapes) > 7 and s6.shapes[7].has_text_frame:
        tf = s6.shapes[7].text_frame
        tf.clear()
        p_head = tf.paragraphs[0]
        p_head.text = "OpenCV Optical Preprocessing & Restoration (Bradski, G.)"
        p_head.space_after = Pt(3)
        for r in p_head.runs:
            r.font.name = "Aptos Display"
            r.font.bold = True
            r.font.size = Pt(14)
            r.font.color.rgb = RGBColor(14, 116, 144)
            
        p = tf.add_paragraph()
        p.text = "Contrast Limited Adaptive Histogram Equalization (CLAHE), bilateral denoising, affine deskewing, and Laplacian variance optical sharpness thresholding for degraded video frames."
        for r in p.runs:
            r.font.name = "Aptos"
            r.font.size = Pt(12)

    # Shape 8: Citations (REPLACING THE BOGUS MARITIME UNCTAD TEXT!)
    if len(s6.shapes) > 8 and s6.shapes[8].has_text_frame:
        tf = s6.shapes[8].text_frame
        tf.clear()
        p = tf.paragraphs[0]
        p.text = "References: (1) Tang et al., 'CityFlow: Multi-Target Multi-Camera Vehicle Tracking & Re-ID', IEEE CVPR; (2) MoRTH, Govt. of India: High Security Registration Plates (HSRP) Standards; (3) OpenStreetMap & Leaflet Open Geospatial Consortium Standards."
        for r in p.runs:
            r.font.name = "Aptos"
            r.font.size = Pt(10)
            r.font.color.rgb = RGBColor(71, 85, 105)

    print("[+] Slide 6 updated.")

    # Save to both the original location and a convenient desktop copy
    prs.save(orig_path)
    desktop_copy = r"C:\Users\Punit\OneDrive\Desktop\SIH-2\Route_Riders_SIH26127_Optimized.pptx"
    prs.save(desktop_copy)
    print(f"[SUCCESS] Updated original at: {orig_path}")
    print(f"[SUCCESS] Created copy at: {desktop_copy}")

if __name__ == "__main__":
    update_presentation()
