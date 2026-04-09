from fastapi import APIRouter
from app.api.v1 import companies, monthly

api_router = APIRouter()

api_router.include_router(companies.router, tags=["companies"])
api_router.include_router(monthly.router, tags=["monthly"])
