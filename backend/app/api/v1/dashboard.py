from fastapi import APIRouter, Depends, Query
from supabase import create_client, Client
from app.config import settings
from app.deps import verify_token
from typing import Optional

router = APIRouter()


def get_supabase():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


@router.get("/dashboard")
def get_dashboard(
    mes_ano: Optional[str] = Query(None, description="Filter by month (YYYY-MM-DD)"),
    _user=Depends(verify_token),
    supabase: Client = Depends(get_supabase),
):
    """Get dashboard KPIs aggregated by month. Only includes records from active companies."""
    # Active companies (matriz + filial) — financial KPIs include both
    active_companies = (
        supabase.table("companies")
        .select("id, tipo_empresa")
        .eq("is_active", True)
        .execute()
    )
    active_rows = active_companies.data or []
    active_company_ids = [c["id"] for c in active_rows]

    total_empresas_matriz_ativas = sum(
        1 for c in active_rows if (c.get("tipo_empresa") or "matriz") == "matriz"
    )
    total_empresas_filiais_ativas = sum(
        1 for c in active_rows if c.get("tipo_empresa") == "filial"
    )

    # Query monthly_records only for active companies
    records = []
    if active_company_ids:
        query = supabase.table("monthly_records").select(
            "vidas_cobradas,"
            "valor_vidas,"
            "custo_por_cliente,"
            "faturamento,"
            "mes_ano"
        ).in_("company_id", active_company_ids)

        if mes_ano:
            query = query.eq("mes_ano", mes_ano)

        result = query.execute()
        records = result.data or []

    # Aggregate KPIs
    total_vidas_cobradas = 0
    total_valor_vidas = 0.0
    total_custo_por_cliente = 0.0
    total_faturamento = 0.0

    for rec in records:
        total_vidas_cobradas += rec.get("vidas_cobradas") or 0
        total_valor_vidas += rec.get("valor_vidas") or 0
        total_custo_por_cliente += rec.get("custo_por_cliente") or 0
        total_faturamento += rec.get("faturamento") or 0

    # Get inactive companies count
    companies_inactive = supabase.table("companies").select("id").eq("is_active", False).execute()
    total_empresas_inativas = len(companies_inactive.data or [])

    return {
        "mes_ano": mes_ano,
        "total_empresas_ativas": total_empresas_matriz_ativas,
        "total_empresas_matriz_ativas": total_empresas_matriz_ativas,
        "total_empresas_filiais_ativas": total_empresas_filiais_ativas,
        "total_empresas_inativas": total_empresas_inativas,
        "total_registros": len(records),
        "kpis": {
            "total_vidas_cobradas": int(total_vidas_cobradas),
            "total_valor_vidas": round(total_valor_vidas, 2),
            "total_custo_por_cliente": round(total_custo_por_cliente, 2),
            "total_faturamento": round(total_faturamento, 2),
        },
    }
