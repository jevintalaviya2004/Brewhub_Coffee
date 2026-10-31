from fastapi import APIRouter, Depends
from app.middleware.auth_middleware import verify_token
from app.schemas.product_schema import ProductCreate
from app.services.product_service import ProductService

router = APIRouter()

@router.post("/", dependencies=[Depends(verify_token)])
def create_product(product: ProductCreate):
    return ProductService.create_product(product)

@router.get("/")
def get_products():
    return ProductService.get_products()

@router.put("/{product_id}", dependencies=[Depends(verify_token)])
def update_product(product_id: int, product: ProductCreate):
    return ProductService.update_product(product_id, product)

@router.delete("/{product_id}", dependencies=[Depends(verify_token)])
def delete_product(product_id: int):
    return ProductService.delete_product(product_id)