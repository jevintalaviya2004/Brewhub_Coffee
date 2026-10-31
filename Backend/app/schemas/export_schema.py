from pydantic import BaseModel
from datetime import date

class ExportRequest(BaseModel):
    from_date: date
    to_date: date