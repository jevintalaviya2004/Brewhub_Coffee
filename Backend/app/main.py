from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import ALLOWED_ORIGINS

from app.routes.company_routes import router as company_router
from app.routes.user_routes import router as user_router
from app.routes.product_routes import router as product_router
from app.routes.order_routes import router as order_router
from app.routes.admin_routes import router as admin_router
from app.routes.export_routes import router as export_router

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS or ["*"],
    allow_credentials=False,  # the API uses Bearer tokens, not cookies
    allow_methods=["*"],
    allow_headers=["*"]
)

@app.get("/")
def home():
    return {"message": "Coffee Management Backend Running"}

app.include_router(
    company_router,
    prefix="/api/companies",
    tags=["Companies"]
)

app.include_router(
    user_router,
    prefix="/api/users",
    tags=["Users"]
)

app.include_router(
    product_router,
    prefix="/api/products",
    tags=["Products"]
)

app.include_router(
    order_router,
    prefix="/api/orders",
    tags=["Orders"]
)

app.include_router(
    admin_router,
    prefix="/api/admin",
    tags=["Admin"]
)

app.include_router(
    export_router,
    prefix="/api/export",
    tags=["Export"]
)