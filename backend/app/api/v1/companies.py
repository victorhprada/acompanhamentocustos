from fastapi import APIRouter, Depends, HTTPException, status
from supabase import create_client, Client
from app.config import settings
from app.deps import verify_token
from app.schemas.company import CompanyCreate, CompanyUpdate, Company
from typing import List, Optional

router = APIRouter()


def get_supabase():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def _db_code(exc: Exception) -> Optional[str]:
    """Extract PostgreSQL error code from a Supabase/postgrest exception."""
    try:
        return exc.code  # type: ignore[attr-defined]
    except AttributeError:
        pass
    try:
        return exc.args[0].get("code")  # type: ignore[index]
    except (AttributeError, IndexError, TypeError):
        return None


def _is_cnpj_unique_violation(exc: Exception) -> bool:
    if _db_code(exc) != "23505":
        return False
    raw = str(exc).lower()
    details = ""
    try:
        details = (exc.args[0].get("details", "") or "").lower()  # type: ignore[index]
    except (AttributeError, IndexError, TypeError):
        pass
    return "cnpj" in raw or "cnpj" in details


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
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    return result.data[0]


@router.post("/companies", response_model=Company, status_code=status.HTTP_201_CREATED)
def create_company(
    company: CompanyCreate,
    _user=Depends(verify_token),
    supabase: Client = Depends(get_supabase),
):
    # company_id may be shared across companies in the same group
    existing = supabase.table("companies").select("id").eq("cnpj", company.cnpj).execute()
    if existing.data:
        raise HTTPException(status_code=400, detail="CNPJ já cadastrado")

    try:
        result = supabase.table("companies").insert(company.model_dump(mode='json')).execute()
    except Exception as exc:
        if _is_cnpj_unique_violation(exc):
            raise HTTPException(status_code=400, detail="CNPJ já cadastrado") from exc
        raise

    if not result.data:
        raise HTTPException(status_code=400, detail="Falha ao criar empresa")
    return result.data[0]


@router.put("/companies/{company_id}", response_model=Company)
def update_company(
    company_id: str,
    company: CompanyUpdate,
    _user=Depends(verify_token),
    supabase: Client = Depends(get_supabase),
):
    existing = supabase.table("companies").select("id").eq("id", company_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    if company.cnpj:
        dup = supabase.table("companies").select("id").eq("cnpj", company.cnpj).neq("id", company_id).execute()
        if dup.data:
            raise HTTPException(status_code=400, detail="CNPJ já cadastrado")

    update_data = company.model_dump(mode='json', exclude_unset=True)
    try:
        result = supabase.table("companies").update(update_data).eq("id", company_id).execute()
    except Exception as exc:
        if _is_cnpj_unique_violation(exc):
            raise HTTPException(status_code=400, detail="CNPJ já cadastrado") from exc
        raise

    if not result.data:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    return result.data[0]


@router.post("/companies/{company_id}/deactivate", response_model=Company)
def deactivate_company(
    company_id: str,
    _user=Depends(verify_token),
    supabase: Client = Depends(get_supabase),
):
    existing = supabase.table("companies").select("*").eq("id", company_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    result = supabase.table("companies").update({"is_active": False}).eq("id", company_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")
    return result.data[0]


@router.delete("/companies/{company_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_company(
    company_id: str,
    _user=Depends(verify_token),
    supabase: Client = Depends(get_supabase),
):
    existing = supabase.table("companies").select("id").eq("id", company_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Empresa não encontrada")

    supabase.table("companies").delete().eq("id", company_id).execute()
