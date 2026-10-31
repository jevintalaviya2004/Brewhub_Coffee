from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth_middleware import verify_token
from app.schemas.user_schema import UserCreate, UserUpdate
from app.services.user_service import UserService

router = APIRouter()


@router.post("/")
def create_user(user: UserCreate):
    return UserService.create_user(user)


@router.get("/company/{company_id}")
def get_users(company_id: int):
    return UserService.get_users_by_company(company_id)


@router.put("/{user_id}", dependencies=[Depends(verify_token)])
def update_user(user_id: int, user: UserUpdate):
    result = UserService.update_user(user_id, user)
    if result is None:
        raise HTTPException(status_code=400, detail="No fields to update")
    return result


@router.delete("/{user_id}", dependencies=[Depends(verify_token)])
def delete_user(user_id: int):
    return UserService.delete_user(user_id)
