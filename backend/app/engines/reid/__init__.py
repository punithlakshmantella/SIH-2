from app.engines.reid.base import VehicleReIDEngine, MatchResult
from app.engines.reid.engine import RuleWeightedReIDEngine

reid_engine = RuleWeightedReIDEngine()

__all__ = ["VehicleReIDEngine", "MatchResult", "RuleWeightedReIDEngine", "reid_engine"]
