from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import create_client, Client
from app.config import settings
from app.schemas.monthly_record import MonthlyRecordCreate, MonthlyRecordUpdate, MonthlyRecord
from typing import List, Optional
from datetime import date

router = APIRouter()

MONTHS_2026 = [f"2026-{m:02d}-01" for m in range(1, 13)]


def get_supabase():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def get_future_months(mes_ano: str) -> list[str]:
    try:
        current_date = date.fromisoformat(mes_ano)
    except ValueError:
        return []
    return [m for m in MONTHS_2026 if date.fromisoformat(m) > current_date]


@router.get("/monthly", response_model=List[MonthlyRecord])
def list_monthly_records(
    company_id: Optional[str] = None,
    mes_ano: Optional[str] = None,
    supabase: Client = Depends(get_supabase),
):
    query = supabase.table("monthly_records").select("*")
    if company_id:
        query = query.eq("company_id", company_id)
    if mes_ano:
        query = query.eq("mes_ano", mes_ano)
    result = query.order("mes_ano", desc=False).execute()
    return result.data or []


@router.get("/monthly/{record_id}", response_model=MonthlyRecord)
def get_monthly_record(record_id: str, supabase: Client = Depends(get_supabase)):
    result = supabase.table("monthly_records").select("*").eq("id", record_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Monthly record not found")
    return result.data[0]


@router.get("/companies/{company_id}/monthly", response_model=List[MonthlyRecord])
def get_company_monthly(
    company_id: str,
    mes_ano: Optional[str] = None,
    supabase: Client = Depends(get_supabase),
):
    query = supabase.table("monthly_records").select("*").eq("company_id", company_id)
    if mes_ano:
        query = query.eq("mes_ano", mes_ano)
    result = query.order("mes_ano", desc=False).execute()
    return result.data or []


@router.post("/monthly", response_model=MonthlyRecord, status_code=status.HTTP_201_CREATED)
def create_monthly_record(
    record: MonthlyRecordCreate,
    propagate: bool = Query(True),
    supabase: Client = Depends(get_supabase),
):
    existing = (
        supabase.table("monthly_records")
        .select("id")
        .eq("company_id", record.company_id)
        .eq("mes_ano", record.mes_ano.isoformat())
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=400, detail="Já existe um registro para este mês")

    result = supabase.table("monthly_records").insert(record.model_dump(mode="json")).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Falha ao criar registro")

    created = result.data[0]

    if propagate:
        for future_month in get_future_months(record.mes_ano.isoformat()):
            check = (
                supabase.table("monthly_records")
                .select("id")
                .eq("company_id", record.company_id)
                .eq("mes_ano", future_month)
                .execute()
            )
            if not check.data:
                inherited = record.model_dump(mode="json")
                inherited["mes_ano"] = future_month
                supabase.table("monthly_records").insert(inherited).execute()

    return created


@router.put("/monthly/{record_id}", response_model=MonthlyRecord)
def update_monthly_record(
    record_id: str,
    record: MonthlyRecordUpdate,
    propagate: bool = Query(True),
    supabase: Client = Depends(get_supabase),
):
    existing = supabase.table("monthly_records").select("*").eq("id", record_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Monthly record not found")

    current = existing.data[0]
    update_data = record.model_dump(mode="json", exclude_unset=True)

    result = supabase.table("monthly_records").update(update_data).eq("id", record_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Monthly record not found")

    if propagate and update_data:
        for future_month in get_future_months(current["mes_ano"]):
            check = (
                supabase.table("monthly_records")
                .select("*")
                .eq("company_id", current["company_id"])
                .eq("mes_ano", future_month)
                .execute()
            )
            if check.data:
                supabase.table("monthly_records").update(update_data).eq("id", check.data[0]["id"]).execute()
            else:
                new_data = {**current, **update_data, "mes_ano": future_month}
                for key in ["id", "created_at", "updated_at", "created_by", "updated_by"]:
                    new_data.pop(key, None)
                supabase.table("monthly_records").insert(new_data).execute()

    return result.data[0]


@router.delete("/monthly/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_monthly_record(
    record_id: str,
    propagate: bool = Query(True),
    supabase: Client = Depends(get_supabase),
):
    existing = supabase.table("monthly_records").select("*").eq("id", record_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Monthly record not found")

    current = existing.data[0]
    supabase.table("monthly_records").delete().eq("id", record_id).execute()

    if propagate:
        for future_month in get_future_months(current["mes_ano"]):
            supabase.table("monthly_records").delete().eq("company_id", current["company_id"]).eq("mes_ano", future_month).execute()
