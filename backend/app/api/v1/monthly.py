from fastapi import APIRouter, Depends, HTTPException, Query, status
from supabase import create_client, Client
from app.config import settings
from app.deps import verify_token
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


DIAS_MES = 30


def _as_float(value) -> float | None:
    if value is None or value == "":
        return None
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def apply_computed_fields(data: dict) -> dict:
    """Compute derived fields when source inputs are present."""
    qtd = data.get("qtd_dependentes")
    valor = data.get("valor_por_dependente")
    if qtd is not None and valor is not None:
        try:
            data["faturamento_dependentes"] = float(qtd) * float(valor)
        except (TypeError, ValueError):
            pass

    # Wellhub PRO RATA: (custo × vidas / 30) × pro_rata
    valor_custo = _as_float(data.get("valor_elegivel"))
    vidas = _as_float(data.get("vidas_cobradas"))
    pro_rata = _as_float(data.get("valor_vidas"))
    if valor_custo is not None and vidas is not None and pro_rata is not None:
        data["valor_final"] = (valor_custo * vidas / DIAS_MES) * pro_rata

    qtd_gp = _as_float(data.get("qtd_dependentes_gympass"))
    custo = _as_float(data.get("custo_por_dependente"))
    pro_rata_dep = _as_float(data.get("pro_rata_dependente"))
    if qtd_gp is not None and custo is not None and pro_rata_dep is not None:
        data["total_custo_dependentes"] = round((custo * qtd_gp / DIAS_MES) * pro_rata_dep, 2)

    valor_final = _as_float(data.get("valor_final"))
    total_deps = _as_float(data.get("total_custo_dependentes"))
    if valor_final is not None or total_deps is not None:
        data["custo_por_cliente"] = (valor_final or 0) + (total_deps or 0)

    nr_vidas = _as_float(data.get("nr_vidas"))
    valor_vida_wiipo = _as_float(data.get("valor_elegivel_wiipo"))
    if nr_vidas is not None and valor_vida_wiipo is not None and pro_rata is not None:
        data["faturamento_wiipo"] = (nr_vidas * valor_vida_wiipo / DIAS_MES) * pro_rata

    if data.get("faturamento_wiipo") is not None:
        data["faturamento"] = data["faturamento_wiipo"]

    return data


def without_observacao(data: dict) -> dict:
    """Strip observacao so it is never propagated to other months."""
    cleaned = {**data}
    cleaned.pop("observacao", None)
    return cleaned


# Backwards-compatible alias
apply_computed_dependentes = apply_computed_fields


@router.get("/monthly", response_model=List[MonthlyRecord])
def list_monthly_records(
    company_id: Optional[str] = None,
    mes_ano: Optional[str] = None,
    _user=Depends(verify_token),
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
def get_monthly_record(
    record_id: str,
    _user=Depends(verify_token),
    supabase: Client = Depends(get_supabase),
):
    result = supabase.table("monthly_records").select("*").eq("id", record_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Monthly record not found")
    return result.data[0]


@router.get("/companies/{company_id}/monthly", response_model=List[MonthlyRecord])
def get_company_monthly(
    company_id: str,
    mes_ano: Optional[str] = None,
    _user=Depends(verify_token),
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
    _user=Depends(verify_token),
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

    payload = apply_computed_fields(record.model_dump(mode="json"))
    result = supabase.table("monthly_records").insert(payload).execute()
    if not result.data:
        raise HTTPException(status_code=400, detail="Falha ao criar registro")

    created = result.data[0]

    if propagate:
        inherited_base = without_observacao(payload)
        for future_month in get_future_months(record.mes_ano.isoformat()):
            check = (
                supabase.table("monthly_records")
                .select("id")
                .eq("company_id", record.company_id)
                .eq("mes_ano", future_month)
                .execute()
            )
            if not check.data:
                inherited = {**inherited_base, "mes_ano": future_month}
                supabase.table("monthly_records").insert(inherited).execute()

    return created


@router.put("/monthly/{record_id}", response_model=MonthlyRecord)
def update_monthly_record(
    record_id: str,
    record: MonthlyRecordUpdate,
    propagate: bool = Query(True),
    _user=Depends(verify_token),
    supabase: Client = Depends(get_supabase),
):
    existing = supabase.table("monthly_records").select("*").eq("id", record_id).execute()
    if not existing.data:
        raise HTTPException(status_code=404, detail="Monthly record not found")

    current = existing.data[0]
    raw_update = record.model_dump(mode="json", exclude_unset=True)
    # Merge with current so Wellhub formulas see all inputs even on partial updates
    merged = {**current, **raw_update}
    for key in ("id", "created_at", "updated_at", "created_by", "updated_by"):
        merged.pop(key, None)
    computed = apply_computed_fields(merged)
    update_data = {**raw_update}
    for key in (
        "valor_final",
        "total_custo_dependentes",
        "custo_por_cliente",
        "faturamento_wiipo",
        "faturamento",
        "faturamento_dependentes",
    ):
        if key in computed:
            update_data[key] = computed[key]

    result = supabase.table("monthly_records").update(update_data).eq("id", record_id).execute()
    if not result.data:
        raise HTTPException(status_code=404, detail="Monthly record not found")

    if propagate and update_data:
        propagate_data = without_observacao(update_data)
        for future_month in get_future_months(current["mes_ano"]):
            check = (
                supabase.table("monthly_records")
                .select("*")
                .eq("company_id", current["company_id"])
                .eq("mes_ano", future_month)
                .execute()
            )
            if check.data:
                supabase.table("monthly_records").update(propagate_data).eq("id", check.data[0]["id"]).execute()
            else:
                new_data = apply_computed_fields({**without_observacao(current), **propagate_data, "mes_ano": future_month})
                for key in ["id", "created_at", "updated_at", "created_by", "updated_by"]:
                    new_data.pop(key, None)
                supabase.table("monthly_records").insert(new_data).execute()

    return result.data[0]


@router.delete("/monthly/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_monthly_record(
    record_id: str,
    propagate: bool = Query(True),
    _user=Depends(verify_token),
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
