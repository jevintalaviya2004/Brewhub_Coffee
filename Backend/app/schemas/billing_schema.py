from datetime import date
from typing import Optional

from pydantic import BaseModel


class SendStatementsRequest(BaseModel):
    from_date: Optional[date] = None
    to_date: Optional[date] = None
    company_id: Optional[int] = None
    # If set, all e-mails go to this address (max. 3) instead of the employees.
    test_recipient: Optional[str] = None
