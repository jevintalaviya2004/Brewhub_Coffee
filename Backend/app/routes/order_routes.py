from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from app.middleware.auth_middleware import verify_token
from app.schemas.order_schema import OrderCreate, OrderItemUpdate
from app.services.order_service import OrderService

router = APIRouter()


@router.post("/")
def create_order(order: OrderCreate):
    return OrderService.create_order(order)


@router.get("/", dependencies=[Depends(verify_token)])
def list_orders(from_date: Optional[date] = None, to_date: Optional[date] = None):
    return OrderService.get_all_orders(from_date, to_date)


# specific paths must come before /{order_id} to avoid route shadowing
@router.delete("/cleanup", dependencies=[Depends(verify_token)])
def cleanup_old_orders():
    return OrderService.cleanup_old_orders()


@router.delete("/items/{item_id}", dependencies=[Depends(verify_token)])
def delete_order_item(item_id: int):
    result = OrderService.delete_order_item(item_id)
    if not result:
        raise HTTPException(status_code=404, detail="Order item not found")
    return result


@router.put("/items/{item_id}", dependencies=[Depends(verify_token)])
def update_order_item(item_id: int, data: OrderItemUpdate):
    result = OrderService.update_order_item(item_id, data.quantity)
    if not result:
        raise HTTPException(status_code=404, detail="Order item not found")
    return result


@router.delete("/{order_id}", dependencies=[Depends(verify_token)])
def delete_order(order_id: int):
    return OrderService.delete_order(order_id)
