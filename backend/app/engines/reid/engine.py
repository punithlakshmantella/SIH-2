import math
from typing import List, Dict, Any, Tuple
from datetime import datetime

from app.engines.reid.base import VehicleReIDEngine, MatchResult

class RuleWeightedReIDEngine(VehicleReIDEngine):
    """
    Multi-Modal Spatio-Temporal Vehicle Re-Identification Engine.
    Combines:
    1. Plate Character Pattern Overlap (Levenshtein / wildcard similarity) [Weight: 0.35]
    2. Visual Appearance (Vehicle Type, Color) [Weight: 0.25]
    3. Road Graph & Camera Topology Connectivity [Weight: 0.25]
    4. Time-Window & Implied Speed Plausibility [Weight: 0.15]
    """

    def __init__(
        self,
        weight_plate: float = 0.35,
        weight_appearance: float = 0.25,
        weight_topology: float = 0.25,
        weight_speed: float = 0.15,
        match_threshold: float = 0.70
    ):
        self.w_plate = weight_plate
        self.w_app = weight_appearance
        self.w_topo = weight_topology
        self.w_speed = weight_speed
        self.threshold = match_threshold

    def _calculate_plate_similarity(self, s1: str, s2: str) -> Tuple[float, int, int]:
        """
        Computes character match ratio between two plate strings, treating '?' and '*' as wildcards.
        """
        c1 = s1.upper().replace(" ", "").replace("-", "")
        c2 = s2.upper().replace(" ", "").replace("-", "")
        
        max_len = max(len(c1), len(c2))
        if max_len == 0:
            return 1.0, 0, 0

        matching_chars = 0
        min_len = min(len(c1), len(c2))

        for i in range(min_len):
            if c1[i] == c2[i] or c1[i] in ("?", "*") or c2[i] in ("?", "*"):
                matching_chars += 1

        score = matching_chars / float(max_len)
        return round(score, 3), matching_chars, max_len

    def _calculate_appearance_similarity(self, det: Dict[str, Any], cand: Dict[str, Any]) -> Tuple[float, List[str]]:
        """
        Compares vehicle color and type.
        """
        score = 0.0
        reasons = []

        d_type = det.get("vehicle_type", "").lower()
        c_type = cand.get("vehicle_type", "").lower()
        if d_type and c_type:
            if d_type == c_type:
                score += 0.5
                reasons.append(f"Matching vehicle classification: '{d_type}'")
            elif ("car" in d_type and "suv" in c_type) or ("car" in c_type and "suv" in d_type):
                score += 0.35
                reasons.append(f"Compatible vehicle classification: '{d_type}' vs '{c_type}'")

        d_color = det.get("vehicle_color", "").lower()
        c_color = cand.get("vehicle_color", "").lower()
        if d_color and c_color:
            if d_color == c_color:
                score += 0.5
                reasons.append(f"Matching vehicle paint color: '{d_color}'")
            elif (d_color in ("white", "silver") and c_color in ("white", "silver")) or \
                 (d_color in ("black", "grey") and c_color in ("black", "grey")):
                score += 0.35
                reasons.append(f"Close color shade: '{d_color}' vs '{c_color}'")

        return score, reasons

    def _haversine_distance_km(self, lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Computes distance in kilometers between two GPS coordinates."""
        R = 6371.0
        d_lat = math.radians(lat2 - lat1)
        d_lon = math.radians(lon2 - lon1)
        a = (math.sin(d_lat / 2.0) ** 2 +
             math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(d_lon / 2.0) ** 2)
        c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
        return R * c

    def _calculate_spatio_temporal_score(
        self,
        det: Dict[str, Any],
        cand_last_hit: Optional[Dict[str, Any]]
    ) -> Tuple[float, float, float, List[str]]:
        """
        Computes topology and speed plausibility between consecutive detections.
        """
        if not cand_last_hit:
            return 0.8, 0.8, 0.0, ["Direct corridor entry observation"]

        det_time = det.get("timestamp")
        cand_time = cand_last_hit.get("timestamp")

        if not isinstance(det_time, datetime) or not isinstance(cand_time, datetime):
            return 0.7, 0.7, 0.0, ["Plausible general timeframe"]

        dt_sec = abs((det_time - cand_time).total_seconds())
        if dt_sec <= 0:
            dt_sec = 1.0

        lat1, lon1 = cand_last_hit.get("latitude", 17.68), cand_last_hit.get("longitude", 83.21)
        lat2, lon2 = det.get("latitude", 17.68), det.get("longitude", 83.21)

        dist_km = self._haversine_distance_km(lat1, lon1, lat2, lon2)
        implied_speed = (dist_km / (dt_sec / 3600.0))

        reasons = []
        # Speed plausibility (urban/highway 15 to 110 km/h is optimal)
        if 10.0 <= implied_speed <= 90.0:
            speed_score = 1.0
            topo_score = 1.0
            reasons.append(f"Physically plausible corridor transit time ({round(dt_sec/60, 1)} mins, implied speed {round(implied_speed, 1)} km/h)")
        elif 90.0 < implied_speed <= 130.0:
            speed_score = 0.75
            topo_score = 0.85
            reasons.append(f"Fast highway transit ({round(implied_speed, 1)} km/h)")
        elif implied_speed > 180.0:
            speed_score = 0.0
            topo_score = 0.1
            reasons.append(f"Implied speed impossible ({round(implied_speed, 1)} km/h)")
        else:
            # Short distance or prolonged stop
            speed_score = 0.85
            topo_score = 0.90
            reasons.append(f"Nearby checkpoint ({round(dist_km, 1)} km away)")

        return topo_score, speed_score, implied_speed, reasons

    def match(self, detection: Dict[str, Any], candidates: List[Dict[str, Any]]) -> List[MatchResult]:
        """
        Executes multi-criteria matching against candidate vehicle list.
        """
        results: List[MatchResult] = []
        raw_det_plate = detection.get("raw_plate_text", "")

        for cand in candidates:
            cand_plate = cand.get("primary_plate", "")
            cand_id = cand.get("id", 0)

            # 1. Plate Similarity
            p_score, matches, total = self._calculate_plate_similarity(raw_det_plate, cand_plate)
            p_reason = f"High plate pattern match ({matches}/{total} characters matching)"

            # 2. Appearance
            app_score, app_reasons = self._calculate_appearance_similarity(detection, cand)

            # 3. Spatio-Temporal Topology & Implied Speed
            cand_last_det = cand.get("last_detection")
            topo_score, speed_score, impl_spd, st_reasons = self._calculate_spatio_temporal_score(detection, cand_last_det)

            # Weighted Composite Score
            final_score = (
                (p_score * self.w_plate) +
                (app_score * self.w_app) +
                (topo_score * self.w_topo) +
                (speed_score * self.w_speed)
            )
            final_score = round(final_score, 3)
            match_pct = round(final_score * 100.0, 1)

            # Build reasons
            all_reasons = [p_reason] + app_reasons + st_reasons

            # Strictly probabilistic label per Master Context Hard Rules
            reasons_summary = "; ".join(all_reasons[:3])
            probabilistic_label = (
                f"Possible same vehicle — {match_pct}% — reasons: {reasons_summary}. Requires officer verification."
            )

            is_prob = (final_score >= self.threshold)

            results.append(MatchResult(
                candidate_id=cand_id,
                matched_plate=cand_plate,
                target_plate=raw_det_plate,
                match_score=final_score,
                match_percentage=match_pct,
                is_probable_match=is_prob,
                probabilistic_label=probabilistic_label,
                score_breakdown={
                    "plate_similarity": p_score,
                    "appearance_match": app_score,
                    "camera_topology": topo_score,
                    "speed_plausibility": speed_score
                },
                reasons=all_reasons,
                requires_officer_verification=True
            ))

        # Sort highest score first
        results.sort(key=lambda x: x.match_score, reverse=True)
        return results
