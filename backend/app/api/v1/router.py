from fastapi import APIRouter
from app.api.v1 import companies, monthly, import_

api_router = APIRouter()

api_router.include_router(companies.router, tags=["companies"])
api_router.include_router(monthly.router, tags=["monthly"])
api_router.include_router(import_.router, tags=["import"])
