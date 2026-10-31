from fastapi import APIRouter, HTTPException
from app.schemas.admin_schema import AdminLogin
from app.services.admin_service import AdminService
from app.auth.jwt_handler import create_access_token

router = APIRouter()

@router.post("/login")
def admin_login(admin: AdminLogin):

    db_admin = AdminService.login_admin(admin)

    if not db_admin:
        raise HTTPException(
            status_code=401,
            detail="Invalid credentials"
        )

    token = create_access_token({
        "admin_id": db_admin["id"],
        "email": db_admin["email"]
    })

    return {
        "access_token": token,
        "admin": db_admin
    }