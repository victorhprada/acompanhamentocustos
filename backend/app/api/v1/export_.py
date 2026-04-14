import io
from fastapi import APIRouter, Depends, Query, Response
from supabase import create_client, Client
from app.config import settings
from app.deps import verify_token
from typing import Optional
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment

router = APIRouter()


def get_supabase():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


# Canonical column order — used to validate and sort requested columns
ALL_COLUMNS = [
    ("empresa", "Empresa"),
    ("mes_ano", "Mês/Ano"),
    ("elegiveis_contrato", "Elegíveis Contrato"),
    ("elegiveis", "Elegíveis"),
    ("valor_elegivel", "Valor Elegível"),
    ("valor_final", "Valor Final"),
    ("vidas_cobradas", "Vidas Cobradas"),
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
    ("faturamento", "Faturamento"),
]


@router.get("/export/monthly")
def export_monthly_xlsx(
    mes_ano: Optional[str] = Query(None, description="Filter by month (YYYY-MM-DD)"),
    columns: Optional[str] = Query(None, description="Comma-separated column keys to include"),
    _user=Depends(verify_token),
    supabase: Client = Depends(get_supabase),
):
    # Resolve active columns preserving canonical order
    if columns:
        requested = set(columns.split(","))
        active_columns = [(k, l) for k, l in ALL_COLUMNS if k in requested]
    else:
        active_columns = ALL_COLUMNS

    query = supabase.table("monthly_records").select("*")
    if mes_ano:
        query = query.eq("mes_ano", mes_ano)
    records = query.execute().data or []

    # Only fetch company names if the "empresa" column is active
    company_map: dict[str, str] = {}
    if any(k == "empresa" for k, _ in active_columns) and records:
        company_ids = list({r["company_id"] for r in records})
        res = (
            supabase.table("companies")
            .select("id, empresa")
            .in_("id", company_ids)
            .execute()
        )
        company_map = {c["id"]: c["empresa"] for c in res.data or []}

    wb = Workbook()
    ws = wb.active
    ws.title = "Registros Mensais"

    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill("solid", fgColor="2563EB")
    header_align = Alignment(horizontal="center", vertical="center", wrap_text=True)

    for col_idx, (_, label) in enumerate(active_columns, start=1):
        cell = ws.cell(row=1, column=col_idx, value=label)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_align

    for row_idx, rec in enumerate(records, start=2):
        for col_idx, (field, _) in enumerate(active_columns, start=1):
            if field == "empresa":
                value = company_map.get(rec.get("company_id", ""), "")
            elif field == "mes_ano":
                val = rec.get(field, "") or ""
                if len(val) >= 7:
                    parts = val.split("-")
                    value = f"{parts[1]}/{parts[0]}"
                else:
                    value = val
            else:
                value = rec.get(field)
            ws.cell(row=row_idx, column=col_idx, value=value)

    # Auto-fit column widths
    for col in ws.columns:
        max_len = max(
            (len(str(cell.value)) if cell.value is not None else 0) for cell in col
        )
        ws.column_dimensions[col[0].column_letter].width = min(max_len + 4, 40)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)

    filename = f"registros_mensais_{mes_ano or 'todos'}.xlsx"
    return Response(
        content=output.getvalue(),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
