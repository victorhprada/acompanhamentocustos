from fastapi import APIRouter, Depends, HTTPException, status
from supabase import create_client, Client
from app.config import settings
from app.deps import verify_token
from app.schemas.company import CompanyCreate, CompanyUpdate, Company
from typing import List

router = APIRouter()


def get_supabase():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


@router.get("/companies", response_model=List[Company])
def list_companies(
    active_only: bool = True,
    _user=Depends(verify_token),
    supabase: Client = Depends(get_supabase),
):
    query = supabase.table("companies").select("*")
    if active_only:
        query = query.eq("is_active", True)
    result = query.execute()
    return result.data or []


@router.get("/companies/{company_id}", response_model=Company)
def get_company(
    company_id: str,
    _user=Depends(verify_token),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("companies").select("*").eq("id", company_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Company not found")
    return result.data[0]


@router.post("/companies", response_model=Company, status_code=status.HTTP_201_CREATED)
def create_company(
    company: CompanyCreate,
    _user=Depends(verify_token),
    supabase: Client = Depends(get_supabase),
):
    # Check for duplicate company_id
    existing = supabase.table("companies").select("id").eq("company_id", company.company_id).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="Company ID already exists")

    # Check for duplicate CNPJ
    existing = supabase.table("companies").select("id").eq("cnpj", company.cnpj).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="CNPJ already exists")

    result = supabase.table("companies").insert(company.model_dump(mode='json')).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create company")
    return result.data[0]


@router.put("/companies/{company_id}", response_model=Company)
def update_company(
    company_id: str,
    company: CompanyUpdate,
    _user=Depends(verify_token),
    supabase: Client = Depends(get_supabase),
):
    # Check if company exists
    existing = supabase.table("companies").select("id").eq("id", company_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Company not found")

    # Check for duplicate CNPJ if changing
    if company.cnpj:
        dup = supabase.table("companies").select("id").eq("cnpj", company.cnpj).neq("id", company_id).execute()
        if dup.data:
            raise HTTPException(status_code=400, detail="CNPJ already exists")

    update_data = company.model_dump(mode='json', exclude_unset=True)
    result = supabase.table("companies").update(update_data).eq("id", company_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Company not found")
    return result.data[0]


@router.post("/companies/{company_id}/deactivate", response_model=Company)
def deactivate_company(
    company_id: str,
    _user=Depends(verify_token),
    supabase: Client = Depends(get_supabase),
):
    existing = supabase.table("companies").select("*").eq("id", company_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Company not found")

    result = supabase.table("companies").update({"is_active": False}).eq("id", company_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Company not found")
    return result.data[0]


@router.delete("/companies/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(
    company_id: str,
    _user=Depends(verify_token),
    supabase: Client = Depends(get_supabase),
):
    existing = supabase.table("companies").select("id").eq("id", company_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Company not found")

    supabase.table("companies").delete().eq("id", company_id).execute()
