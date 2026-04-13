from fastapi import APIRouter, Depends, Query
from supabase import create_client, Client
from app.config import settings
from typing import Optional

router = APIRouter()


def get_supabase():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


@router.get("/dashboard")
def get_dashboard(
    mes_ano: Optional[str] = Query(None, description="Filter by month (YYYY-MM-DD)"),
    supabase: Client = Depends(get_supabase),
):
    """Get dashboard KPIs aggregated by month."""
    query = supabase.table("monthly_records").select(
        "elegiveis_totalpass_gympass,"
        "nr_vidas,"
        "valor_vidas,"
        "custo_por_cliente,"
        "valor_faturado,"
        "mes_ano"
    )

    if mes_ano:
        query = query.eq("mes_ano", mes_ano)

    result = query.execute()

    records = result.data or []

    # Aggregate KPIs
    total_elegiveis_totalpass_gympass = 0
    total_nr_vidas = 0
    total_valor_vidas = 0.0
    total_custo_por_cliente = 0.0
    total_valor_faturado = 0.0

    for rec in records:
        total_elegiveis_totalpass_gympass += rec.get("elegiveis_totalpass_gympass") or 0
        total_nr_vidas += rec.get("nr_vidas") or 0
        total_valor_vidas += rec.get("valor_vidas") or 0
        total_custo_por_cliente += rec.get("custo_por_cliente") or 0
        total_valor_faturado += rec.get("valor_faturado") or 0

    # Get active companies count
    companies_query = supabase.table("companies").select("id").eq("is_active", True)
    companies_result = companies_query.execute()
    total_empresas_ativas = len(companies_result.data or [])

    # Get inactive companies count
    companies_inactive = supabase.table("companies").select("id").eq("is_active", False).execute()
    total_empresas_inativas = len(companies_inactive.data or [])

    return {
        "mes_ano": mes_ano,
        "total_empresas_ativas": total_empresas_ativas,
        "total_empresas_inativas": total_empresas_inativas,
        "total_registros": len(records),
        "kpis": {
            "total_elegiveis_totalpass_gympass": int(total_elegiveis_totalpass_gympass),
            "total_nr_vidas": int(total_nr_vidas),
            "total_valor_vidas": round(total_valor_vidas, 2),
            "total_custo_por_cliente": round(total_custo_por_cliente, 2),
            "total_valor_faturado": round(total_valor_faturado, 2),
        },
    }
