from pydantic import BaseModel

class AdminLogin(BaseModel):
    email: str
    password: str