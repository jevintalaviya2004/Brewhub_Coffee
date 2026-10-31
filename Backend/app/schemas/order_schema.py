from pydantic import BaseModel
from typing import List

class OrderItem(BaseModel):
    product_id: int
    quantity: int

class OrderCreate(BaseModel):
    user_id: int
    items: List[OrderItem]

class OrderItemUpdate(BaseModel):
    quantity: int