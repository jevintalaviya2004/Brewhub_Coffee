from pydantic import BaseModel

class CompanyCreate(BaseModel):
    name: str
    logo_url: str