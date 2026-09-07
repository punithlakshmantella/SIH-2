#!/usr/bin/env python3
"""
City Vision — Automated ANPR Benchmark on Datacluster Indian Number Plates Dataset
SIH26127 • Bharat Electronics Limited (BEL)

Evaluates the ANPR Engine against ground-truth Pascal VOC annotations:
- Plate Character Accuracy (%)
- Character Error Rate (CER) via Levenshtein distance
- State RTO Code Recognition Accuracy
- Processing Latency per frame (ms)
- Saves benchmark report to docs/ANPR_BENCHMARK_REPORT.md
"""

import sys
import os
import time
import glob
import xml.etree.ElementTree as ET
from Levenshtein import distance as lev_distance

# Ensure backend directory is in python path
backend_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend"))
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.engines.anpr import anpr_engine

def run_benchmark():
    print("=" * 70)
    print(" CITY VISION — ANPR & INDIAN OCR BENCHMARK EVALUATION")
    print(" Datacluster Indian Number Plates Dataset")
    print("=" * 70)

    dataset_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "datasets", "indian_number_plates"))
    all_annos = glob.glob(os.path.join(dataset_dir, "all_annotations", "*.xml"))

    test_cases = []
    for a in all_annos:
        tree = ET.parse(a)
        root = tree.getroot()
        fn_tag = root.find("filename")
        fn = fn_tag.text.strip() if fn_tag is not None else os.path.splitext(os.path.basename(a))[0] + ".jpg"

        plate_text = None
        for attr in root.findall(".//attribute"):
            n = attr.find("name")
            v = attr.find("value")
            if n is not None and n.text == "number_plate_text" and v is not None and v.text and v.text != "0.0":
                plate_text = v.text.strip().upper().replace(" ", "")
                break

        img_path = os.path.join(dataset_dir, "all_images", fn)
        if plate_text and os.path.exists(img_path):
            test_cases.append({
                "filename": fn,
                "image_path": img_path,
                "ground_truth": plate_text
            })

    if not test_cases:
        print("[!] No ground-truth test cases found.")
        return

    print(f"[+] Running evaluation across {len(test_cases)} verified ground-truth test images...\n")

    results = []
    total_latency = 0.0
    exact_matches = 0
    state_matches = 0
    total_chars = 0
    total_edit_distance = 0

    print(f"{'Image Filename':<36} | {'Ground Truth':<12} | {'Predicted':<12} | {'Conf':<6} | {'Match':<6} | {'Latency'}")
    print("-" * 88)

    for tc in test_cases:
        with open(tc["image_path"], "rb") as f:
            img_bytes = f.read()

        t_start = time.perf_counter()
        res = anpr_engine.detect_and_read(
            img_bytes, 
            source_name=tc["filename"],
            enable_clahe=True,
            enable_denoise=True,
            enable_deskew=True,
            enable_contrast=True
        )
        latency_ms = (time.perf_counter() - t_start) * 1000.0
        total_latency += latency_ms

        gt = tc["ground_truth"]
        pred = res.normalized_plate.strip().upper().replace(" ", "")
        
        is_exact = (gt == pred)
        if is_exact:
            exact_matches += 1

        gt_state = gt[:2] if len(gt) >= 2 else ""
        pred_state = pred[:2] if len(pred) >= 2 else ""
        if gt_state and gt_state == pred_state:
            state_matches += 1

        ed = lev_distance(gt, pred)
        total_edit_distance += ed
        total_chars += max(len(gt), 1)

        results.append({
            "filename": tc["filename"],
            "ground_truth": gt,
            "predicted": pred,
            "confidence": res.ocr_confidence,
            "is_exact": is_exact,
            "edit_distance": ed,
            "latency_ms": round(latency_ms, 1)
        })

        match_badge = "EXACT" if is_exact else f"DIFF({ed})"
        print(f"{tc['filename']:<36} | {gt:<12} | {pred:<12} | {res.ocr_confidence:<6.2f} | {match_badge:<6} | {latency_ms:.1f}ms")

    # Metrics computation
    n = len(test_cases)
    exact_acc = (exact_matches / n) * 100.0
    state_acc = (state_matches / n) * 100.0
    cer = (total_edit_distance / total_chars) * 100.0
    avg_latency = total_latency / n

    print("-" * 88)
    print(" SUMMARY BENCHMARK METRICS:")
    print(f" • Total Evaluated Samples:      {n}")
    print(f" • Exact Plate Match Accuracy:   {exact_acc:.1f}% ({exact_matches}/{n})")
    print(f" • State RTO Code Accuracy:      {state_acc:.1f}% ({state_matches}/{n})")
    print(f" • Character Error Rate (CER):   {cer:.2f}%")
    print(f" • Average Inference Latency:   {avg_latency:.1f} ms / image")
    print("=" * 88)

    # Save Markdown report
    docs_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "docs"))
    os.makedirs(docs_dir, exist_ok=True)
    report_path = os.path.join(docs_dir, "ANPR_BENCHMARK_REPORT.md")

    with open(report_path, "w", encoding="utf-8") as f:
        f.write("# 🔬 City Vision — ANPR & Indian License Plate Benchmark Report\n\n")
        f.write(f"**Dataset:** Datacluster Indian Number Plates & OCR Annotations  \n")
        f.write(f"**Evaluation Date:** {time.strftime('%Y-%m-%d %H:%M:%S')}  \n")
        f.write(f"**Pipeline:** OpenCV CLAHE + Bilateral Filter + Deskew + Standard ANPR Engine  \n\n")
        f.write("## 📊 Executive Summary Performance\n\n")
        f.write(f"| Metric | Result | Benchmark Target |\n")
        f.write(f"|---|---|---|\n")
        f.write(f"| **Exact Plate Match Accuracy** | **{exact_acc:.1f}%** | > 90.0% |\n")
        f.write(f"| **State RTO Code Identification** | **{state_acc:.1f}%** | > 95.0% |\n")
        f.write(f"| **Character Error Rate (CER)** | **{cer:.2f}%** | < 5.0% |\n")
        f.write(f"| **Average Inference Latency** | **{avg_latency:.1f} ms** | < 100 ms |\n\n")
        f.write("## 📋 Per-Sample Verification Matrix\n\n")
        f.write("| Sample Image | Ground Truth Plate | Predicted Plate | OCR Confidence | Status | Latency |\n")
        f.write("|---|---|---|---|---|---|\n")
        for r in results:
            status_badge = "✅ EXACT MATCH" if r["is_exact"] else f"⚠️ Edit Dist: {r['edit_distance']}"
            f.write(f"| `{r['filename']}` | **{r['ground_truth']}** | `{r['predicted']}` | {round(r['confidence']*100, 1)}% | {status_badge} | {r['latency_ms']} ms |\n")
        f.write("\n---\n*Report auto-generated by `scripts/benchmark_anpr_dataset.py`*\n")

    print(f"[SUCCESS] Detailed benchmark report saved to: docs/ANPR_BENCHMARK_REPORT.md")

if __name__ == "__main__":
    run_benchmark()
