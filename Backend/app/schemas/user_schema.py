from typing import Optional
from pydantic import BaseModel


class UserCreate(BaseModel):
    company_id: int
    first_name: str
    last_name:  str
    email:      str
    pin:        str


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name:  Optional[str] = None
    email:      Optional[str] = None
    pin:        Optional[str] = None
