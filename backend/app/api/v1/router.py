from fastapi import APIRouter
from app.api.v1 import companies, monthly, import_, dashboard, export_

api_router = APIRouter()

api_router.include_router(companies.router, tags=["companies"])
api_router.include_router(monthly.router, tags=["monthly"])
api_router.include_router(import_.router, tags=["import"])
api_router.include_router(dashboard.router, tags=["dashboard"])
api_router.include_router(export_.router, tags=["export"])
