import os
import json
from typing import List, Union, Any
from pydantic_settings import BaseSettings
from pydantic import field_validator

class Settings(BaseSettings):
    PROJECT_NAME: str = "City Vision - City-Wide Vehicle Intelligence Platform"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database & Cache
    DATABASE_URL: str = os.getenv("DATABASE_URL", "postgresql://cityvision:cityvision@localhost:5432/cityvision_db")
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # Auth
    JWT_SECRET: str = os.getenv("JWT_SECRET", "supersecretjwtkey_sih2026_bel_cityvision_secret")
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 1 day
    
    # GIS / Map
    MAP_CONFIG_RAW: str = os.getenv("MAP_CONFIG", '{"center": [17.6868, 83.2185], "zoom": 12, "city": "Visakhapatnam"}')
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000"
    ]
    
    @property
    def map_config(self) -> dict:
        try:
            return json.loads(self.MAP_CONFIG_RAW)
        except Exception:
            return {"center": [17.6868, 83.2185], "zoom": 12, "city": "Visakhapatnam"}

    class Config:
        case_sensitive = True
        env_file = ".env"
        extra = "ignore"

settings = Settings()
