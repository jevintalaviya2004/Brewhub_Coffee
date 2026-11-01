from pydantic import BaseModel

class CompanyCreate(BaseModel):
    name: str
    logo_url: str = ""
    email_domains: str = ""  # e.g. "th-deg.de, stud.th-deg.de"
