from app.engines.anpr.base import ANPREngine, ANPRResult
from app.engines.anpr.engine import StandardANPREngine

# Default singleton instance
anpr_engine = StandardANPREngine()

__all__ = ["ANPREngine", "ANPRResult", "StandardANPREngine", "anpr_engine"]
