from fastapi import APIRouter, Depends
from app.middleware.auth_middleware import verify_token
from app.schemas.company_schema import CompanyCreate
from app.services.company_service import CompanyService

router = APIRouter()


@router.post("/", dependencies=[Depends(verify_token)])
def create_company(company: CompanyCreate):
    return CompanyService.create_company(company)


@router.get("/")
def get_companies():
    return CompanyService.get_all_companies()


@router.put("/{company_id}", dependencies=[Depends(verify_token)])
def update_company(company_id: int, company: CompanyCreate):
    return CompanyService.update_company(company_id, company)


@router.delete("/{company_id}", dependencies=[Depends(verify_token)])
def delete_company(company_id: int):
    return CompanyService.delete_company(company_id)
