import smtplib

from fastapi import APIRouter, Depends, HTTPException

from app.middleware.auth_middleware import verify_token
from app.schemas.billing_schema import SendStatementsRequest
from app.services import billing_service

router = APIRouter()


@router.post("/send-statements", dependencies=[Depends(verify_token)])
def send_statements(request: SendStatementsRequest):
    """E-mails every employee a PDF statement of their orders in the period."""
    if request.from_date and request.to_date and request.from_date > request.to_date:
        raise HTTPException(status_code=400, detail="'from_date' must be before 'to_date'.")
    try:
        return billing_service.send_statements(
            from_date=request.from_date,
            to_date=request.to_date,
            company_id=request.company_id,
            test_recipient=request.test_recipient,
        )
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error))
    except RuntimeError as error:
        raise HTTPException(status_code=500, detail=str(error))
    except smtplib.SMTPAuthenticationError:
        raise HTTPException(
            status_code=502,
            detail="SMTP login failed. Check SMTP_USER and SMTP_PASSWORD (for Gmail: use an App Password).",
        )
    except (smtplib.SMTPException, OSError) as error:
        raise HTTPException(status_code=502, detail=f"Could not connect to the SMTP server: {error}")
