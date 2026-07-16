from fastapi import APIRouter, Depends, Query
from supabase import create_client, Client
from app.config import settings
from app.deps import verify_token
from typing import Optional

router = APIRouter()


def get_supabase():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


def fetch_active_company_tipos(supabase: Client) -> dict[str, str]:
    """Map active company id → tipo_empresa (default matriz)."""
    result = (
        supabase.table("companies")
        .select("id, tipo_empresa")
        .eq("is_active", True)
        .execute()
    )
    return {
        c["id"]: (c.get("tipo_empresa") or "matriz")
        for c in (result.data or [])
    }


def empty_kpi_bucket() -> dict:
    return {
        "empresas_ativas": 0,
        "empresas_filiais": 0,
        "total_empresas": 0,
        "total_vidas_cobradas": 0,
        "total_valor_vidas": 0.0,
        "total_custo_por_cliente": 0.0,
        "total_faturamento": 0.0,
        "_company_ids": set(),
    }


def accumulate_kpi_record(bucket: dict, rec: dict) -> None:
    cid = rec.get("company_id")
    if cid:
        bucket["_company_ids"].add(cid)
    bucket["total_vidas_cobradas"] += rec.get("vidas_cobradas") or 0
    bucket["total_valor_vidas"] += rec.get("valor_elegivel") or 0
    # custo_por_cliente already includes valor_final + total_custo_dependentes
    bucket["total_custo_por_cliente"] += rec.get("custo_por_cliente") or 0
    bucket["total_faturamento"] += (
        (rec.get("faturamento") or 0) + (rec.get("faturamento_dependentes") or 0)
    )


def finalize_kpi_bucket(bucket: dict, company_tipos: dict[str, str]) -> dict:
    matriz = 0
    filial = 0
    for cid in bucket["_company_ids"]:
        if company_tipos.get(cid) == "filial":
            filial += 1
        else:
            matriz += 1
    return {
        "empresas_ativas": matriz,
        "empresas_filiais": filial,
        "total_empresas": matriz + filial,
        "total_vidas_cobradas": int(bucket["total_vidas_cobradas"]),
        "total_valor_vidas": round(bucket["total_valor_vidas"], 2),
        "total_custo_por_cliente": round(bucket["total_custo_por_cliente"], 2),
        "total_faturamento": round(bucket["total_faturamento"], 2),
    }


RECORD_SELECT = (
    "company_id,"
    "vidas_cobradas,"
    "valor_elegivel,"
    "custo_por_cliente,"
    "total_custo_dependentes,"
    "faturamento,"
    "faturamento_dependentes,"
    "mes_ano"
)


@router.get("/dashboard")
def get_dashboard(
    mes_ano: Optional[str] = Query(None, description="Filter by month (YYYY-MM-DD)"),
    _user=Depends(verify_token),
    supabase: Client = Depends(get_supabase),
):
    """
    KPIs for the selected month.
    Universe: active companies that have a monthly record in that month.
    Matriz/filial counts and financial totals all come from the same set of records.
    """
    company_tipos = fetch_active_company_tipos(supabase)
    active_company_ids = list(company_tipos.keys())

    bucket = empty_kpi_bucket()
    records = []
    if active_company_ids:
        query = (
            supabase.table("monthly_records")
            .select(RECORD_SELECT)
            .in_("company_id", active_company_ids)
        )
        if mes_ano:
            query = query.eq("mes_ano", mes_ano)
        result = query.execute()
        records = result.data or []
        for rec in records:
            accumulate_kpi_record(bucket, rec)

    totals = finalize_kpi_bucket(bucket, company_tipos)

    companies_inactive = (
        supabase.table("companies").select("id").eq("is_active", False).execute()
    )
    total_empresas_inativas = len(companies_inactive.data or [])

    return {
        "mes_ano": mes_ano,
        "total_empresas_ativas": totals["empresas_ativas"],
        "total_empresas_matriz_ativas": totals["empresas_ativas"],
        "total_empresas_filiais_ativas": totals["empresas_filiais"],
        "total_empresas_faturadas": totals["total_empresas"],
        "total_empresas_inativas": total_empresas_inativas,
        "total_registros": len(records),
        "kpis": {
            "total_vidas_cobradas": totals["total_vidas_cobradas"],
            "total_valor_vidas": totals["total_valor_vidas"],
            "total_custo_por_cliente": totals["total_custo_por_cliente"],
            "total_faturamento": totals["total_faturamento"],
        },
    }


@router.get("/dashboard/history")
def get_dashboard_history(
    year: int = Query(..., description="Year to aggregate (YYYY)", ge=2020, le=2099),
    _user=Depends(verify_token),
    supabase: Client = Depends(get_supabase),
):
    """Monthly KPI series for the selected year (same universe as /dashboard)."""
    company_tipos = fetch_active_company_tipos(supabase)
    active_company_ids = list(company_tipos.keys())

    start = f"{year}-01-01"
    end = f"{year}-12-01"

    by_month: dict[str, dict] = {
        f"{year}-{str(m).zfill(2)}-01": empty_kpi_bucket()
        for m in range(1, 13)
    }

    if active_company_ids:
        result = (
            supabase.table("monthly_records")
            .select(RECORD_SELECT)
            .in_("company_id", active_company_ids)
            .gte("mes_ano", start)
            .lte("mes_ano", end)
            .execute()
        )
        for rec in result.data or []:
            raw = rec.get("mes_ano") or ""
            key = raw[:10] if len(raw) >= 10 else raw
            if key not in by_month:
                continue
            accumulate_kpi_record(by_month[key], rec)

    series = []
    for m in range(1, 13):
        key = f"{year}-{str(m).zfill(2)}-01"
        totals = finalize_kpi_bucket(by_month[key], company_tipos)
        series.append({"mes_ano": key, **{
            k: totals[k]
            for k in (
                "total_vidas_cobradas",
                "total_valor_vidas",
                "total_custo_por_cliente",
                "total_faturamento",
            )
        }})

    return {"year": year, "series": series}
