import csv
import io
from fastapi import APIRouter, Depends, Query, Response
from supabase import create_client, Client
from app.config import settings
from app.deps import verify_token
from typing import Optional

router = APIRouter()


def get_supabase():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


@router.get("/export/monthly")
def export_monthly_csv(
    mes_ano: Optional[str] = Query(None, description="Filter by month (YYYY-MM-DD)"),
    _user=Depends(verify_token),
    supabase: Client = Depends(get_supabase),
):
    """Export monthly records as CSV."""
    query = supabase.table("monthly_records").select("*")

    if mes_ano:
        query = query.eq("mes_ano", mes_ano)

    result = query.execute()
    records = result.data or []

    if not records:
        return Response(content="No records found", media_type="text/csv")

    # Get company names
    company_ids = list(set(r["company_id"] for r in records))
    companies_result = (
        supabase.table("companies")
        .select("id, empresa")
        .in_("id", company_ids)
        .execute()
    )
    company_map = {c["id"]: c["empresa"] for c in companies_result.data or []}

    # Define CSV columns (user-friendly names)
    columns = [
        ("empresa", "Empresa"),
        ("mes_ano", "Mês/Ano"),
        ("elegiveis_contrato", "Elegíveis Contrato"),
        ("elegiveis", "Elegíveis"),
        ("valor_elegivel", "Valor Elegível"),
        ("valor_final", "Valor Final"),
        ("elegiveis_totalpass_gympass", "Elegíveis Totalpass/Gympass"),
        ("vidas_cobradas", "Vidas Cobradas"),
        ("nr_vidas", "Nº Vidas"),
        ("valor_vidas", "Valor Vidas"),
        ("nr_cartao_contrato_flex", "Nº Cartão Contrato Flex"),
        ("nr_cartao_carga_flex", "Nº Cartão Carga Flex"),
        ("rs_carregado", "R$ Carregado"),
        ("media_cartao_realizado", "Média Cartão Realizado"),
        ("media_contratada", "Média Contratada"),
        ("valor_elegivel_wiipo", "Valor Elegível Wiipo"),
        ("faturamento_wiipo", "Faturamento Wiipo"),
        ("mensal_x_rentabilidade", "Mensal x Rentabilidade"),
        ("custo_por_cliente", "Custo por Cliente"),
        ("valor_faturado", "Valor Faturado"),
        ("faturamento", "Faturamento"),
    ]

    # Build CSV
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([label for _, label in columns])

    for rec in records:
        row = []
        for field, _ in columns:
            if field == "empresa":
                row.append(company_map.get(rec.get("company_id", ""), ""))
            elif field == "mes_ano":
                val = rec.get(field, "")
                if val and len(val) >= 7:
                    parts = val.split("-")
                    row.append(f"{parts[1]}/{parts[0]}")
                else:
                    row.append(val)
            else:
                val = rec.get(field)
                row.append(val if val is not None else "")
        writer.writerow(row)

    output.seek(0)
    content = output.getvalue()

    filename = f"monthly_records_{mes_ano or 'all'}.csv"

    return Response(
        content=content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
