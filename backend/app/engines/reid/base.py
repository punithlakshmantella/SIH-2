from abc import ABC, abstractmethod
from typing import List, Dict, Any, Optional
from pydantic import BaseModel

class MatchResult(BaseModel):
    candidate_id: int
    matched_plate: str
    target_plate: str
    match_score: float  # 0.0 to 1.0 (e.g., 0.917)
    match_percentage: float  # (e.g., 91.7)
    is_probable_match: bool
    probabilistic_label: str  # e.g. "Possible same vehicle — 91.7% — reasons: ..."
    score_breakdown: Dict[str, float]
    reasons: List[str]
    requires_officer_verification: bool = True

class VehicleReIDEngine(ABC):
    """
    Abstract Base Class for Vehicle Re-Identification Engine.
    Allows swapping heuristic/spatio-temporal rule engine with deep embedding models
    (OSNet, CLIP, ByteTrack, YOLO-ReID) without touching REST API or Frontend callers.
    """

    @abstractmethod
    def match(self, detection: Dict[str, Any], candidates: List[Dict[str, Any]]) -> List[MatchResult]:
        """
        Calculates multi-criteria probabilistic match score between a degraded/ambiguous
        detection and potential candidate vehicles.
        """
        pass
