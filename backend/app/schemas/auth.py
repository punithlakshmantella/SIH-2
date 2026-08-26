from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class LoginRequest(BaseModel):
    username_or_email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user_id: int
    username: str
    email: str
    full_name: str
    role: str
    badge_number: Optional[str] = None

class TokenPayload(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None
    exp: Optional[int] = None

class UserOut(BaseModel):
    id: int
    email: str
    username: str
    full_name: str
    role: str
    badge_number: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True
