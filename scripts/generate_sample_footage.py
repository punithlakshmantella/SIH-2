#!/usr/bin/env python3
"""
Generates bundled sample footage images for City Vision ANPR demo.
Includes clean reference images (crisp contrast) and deliberately degraded ones
(low light, glare, motion blur, mud splatter, angled perspective).
"""

import os
import random
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageEnhance

SAMPLE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "data", "sample_footage"))
os.makedirs(SAMPLE_DIR, exist_ok=True)

def create_plate_image(
    plate_text: str,
    vehicle_color: str = "white",
    is_degraded: bool = False,
    degradation_type: str = "clean"
) -> Image.Image:
    # 1. Base vehicle background
    img_w, img_h = 640, 360
    color_map = {
        "white": (230, 235, 240),
        "silver": (180, 185, 190),
        "black": (30, 32, 35),
        "red": (170, 30, 35),
        "blue": (30, 75, 150)
    }
    bg_color = color_map.get(vehicle_color, (220, 225, 230))
    
    img = Image.new("RGB", (img_w, img_h), color=bg_color)
    draw = ImageDraw.Draw(img)

    # Draw vehicle bumper / grill lines
    draw.rectangle([0, int(img_h * 0.7), img_w, img_h], fill=(40, 42, 45))
    draw.rectangle([int(img_w * 0.1), int(img_h * 0.4), int(img_w * 0.9), int(img_h * 0.65)], fill=(20, 22, 25))

    # Draw Indian standard HSRP License Plate (White background with blue IND strip on left)
    plate_w, plate_h = 320, 80
    plate_x = (img_w - plate_w) // 2
    plate_y = int(img_h * 0.52)

    # Plate border & background
    draw.rounded_rectangle([plate_x, plate_y, plate_x + plate_w, plate_y + plate_h], radius=6, fill=(255, 255, 255), outline=(0, 0, 0), width=3)
    
    # Blue IND strip
    draw.rectangle([plate_x + 3, plate_y + 3, plate_x + 32, plate_y + plate_h - 3], fill=(0, 51, 153))
    # IND text
    draw.text((plate_x + 7, plate_y + 30), "IND", fill=(255, 255, 255))

    # License plate alphanumeric characters
    # Use built-in default font with scaling or spacing
    text_x = plate_x + 45
    text_y = plate_y + 24
    draw.text((text_x, text_y), plate_text, fill=(10, 10, 10))

    # Apply degradations if requested
    if is_degraded:
        if degradation_type == "toll_glare_angled":
            # Dark night background
            night_overlay = Image.new("RGB", (img_w, img_h), (10, 15, 25))
            img = Image.blend(img, night_overlay, 0.65)
            draw = ImageDraw.Draw(img)
            # Add glaring toll floodlight
            draw.ellipse([plate_x + 100, plate_y - 20, plate_x + 220, plate_y + 90], fill=(255, 250, 220))
            img = img.filter(ImageFilter.GaussianBlur(radius=2.5))
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(0.7)

        elif degradation_type == "low_light":
            enhancer = ImageEnhance.Brightness(img)
            img = enhancer.enhance(0.28)
            img = img.filter(ImageFilter.GaussianBlur(radius=1.8))

        elif degradation_type == "motion_blur":
            img = img.filter(ImageFilter.GaussianBlur(radius=3.5))
            enhancer = ImageEnhance.Contrast(img)
            img = enhancer.enhance(0.85)

        elif degradation_type == "dirty_plate":
            draw = ImageDraw.Draw(img)
            for _ in range(120):
                x = random.randint(plate_x, plate_x + plate_w)
                y = random.randint(plate_y, plate_y + plate_h)
                r = random.randint(3, 10)
                draw.ellipse([x - r, y - r, x + r, y + r], fill=(80, 50, 20))
            img = img.filter(ImageFilter.GaussianBlur(radius=1.2))

    return img

def generate_all_samples():
    print("[+] Generating bundled sample footage dataset in data/sample_footage/...")
    
    samples = [
        # Clean Reference Set
        ("clean_ap39ab1234.jpg", "AP 39 AB 1234", "white", False, "clean"),
        ("clean_ts09ef5678.jpg", "TS 09 EF 5678", "silver", False, "clean"),
        ("clean_ka01mn9012.jpg", "KA 01 MN 9012", "black", False, "clean"),

        # Deliberately Degraded Set
        ("degraded_toll_ap39ab1234.jpg", "AP 39 AB 1234", "white", True, "toll_glare_angled"),
        ("degraded_lowlight_ts09ub4432.jpg", "TS 09 UB 4432", "red", True, "low_light"),
        ("degraded_motionblur_ka01mn7712.jpg", "KA 01 MN 7712", "blue", True, "motion_blur"),
        ("degraded_dirtyplate_ap31tx9901.jpg", "AP 31 TX 9901", "silver", True, "dirty_plate")
    ]

    for fname, p_text, v_col, is_deg, deg_type in samples:
        img = create_plate_image(p_text, v_col, is_deg, deg_type)
        fpath = os.path.join(SAMPLE_DIR, fname)
        img.save(fpath, quality=90)
        status_tag = "DEGRADED" if is_deg else "CLEAN"
        print(f"  * Generated [{status_tag:8s}] -> {fname}")

    print("[SUCCESS] All 7 sample footage images generated successfully.")

if __name__ == "__main__":
    generate_all_samples()
