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


# ─── Shared helpers ───────────────────────────────────────────────────────────

def resolve_columns(
    requested: Optional[str], catalogue: list[tuple[str, str]]
) -> list[tuple[str, str]]:
    """Return catalogue entries matching the requested comma-separated keys, in canonical order."""
    if not requested:
        return catalogue
    keys = set(requested.split(","))
    return [(k, l) for k, l in catalogue if k in keys]


def format_mes_ano(val: str | None) -> str:
    if val and len(val) >= 7:
        parts = val.split("-")
        return f"{parts[1]}/{parts[0]}"
    return val or ""


def build_xlsx(title: str, active_columns: list[tuple[str, str]], rows: list[list]) -> bytes:
    wb = Workbook()
    ws = wb.active
    ws.title = title

    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill("solid", fgColor="2563EB")
    header_align = Alignment(horizontal="center", vertical="center", wrap_text=True)

    for col_idx, (_, label) in enumerate(active_columns, start=1):
        cell = ws.cell(row=1, column=col_idx, value=label)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = header_align

    for row_idx, row in enumerate(rows, start=2):
        for col_idx, value in enumerate(row, start=1):
            ws.cell(row=row_idx, column=col_idx, value=value)

    for col in ws.columns:
        max_len = max(
            (len(str(cell.value)) if cell.value is not None else 0) for cell in col
        )
        ws.column_dimensions[col[0].column_letter].width = min(max_len + 4, 40)

    output = io.BytesIO()
    wb.save(output)
    output.seek(0)
    return output.getvalue()


def xlsx_response(content: bytes, filename: str) -> Response:
    return Response(
        content=content,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


# ─── Column catalogues ────────────────────────────────────────────────────────

MONTHLY_COLUMNS: list[tuple[str, str]] = [
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

# Company fields available in the rentabilidade export
COMPANY_COLUMNS: list[tuple[str, str]] = [
    ("company_id", "Company ID"),
    ("empresa", "Empresa"),
    ("cnpj", "CNPJ"),
    ("razao_social", "Razão Social"),
    ("data_assinatura_contrato", "Data Assinatura Contrato"),
    ("email_envio", "E-mail para Envio"),
    ("inicio_cobranca", "Início Cobrança"),
    ("vencimento", "Dia de Vencimento"),
]

COMPANY_FIELD_KEYS = {k for k, _ in COMPANY_COLUMNS}

RENTABILIDADE_COLUMNS: list[tuple[str, str]] = COMPANY_COLUMNS + [
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


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.get("/export/monthly")
def export_monthly_xlsx(
    mes_ano: Optional[str] = Query(None),
    columns: Optional[str] = Query(None, description="Comma-separated column keys"),
    _user=Depends(verify_token),
    supabase: Client = Depends(get_supabase),
):
    active_columns = resolve_columns(columns, MONTHLY_COLUMNS)

    records = (
        supabase.table("monthly_records").select("*")
        .eq("mes_ano", mes_ano) if mes_ano
        else supabase.table("monthly_records").select("*")
    ).execute().data or []

    company_map: dict[str, str] = {}
    if any(k == "empresa" for k, _ in active_columns) and records:
        ids = list({r["company_id"] for r in records})
        res = supabase.table("companies").select("id, empresa").in_("id", ids).execute()
        company_map = {c["id"]: c["empresa"] for c in res.data or []}

    rows = []
    for rec in records:
        row = []
        for field, _ in active_columns:
            if field == "empresa":
                row.append(company_map.get(rec.get("company_id", ""), ""))
            elif field == "mes_ano":
                row.append(format_mes_ano(rec.get(field)))
            else:
                row.append(rec.get(field))
        rows.append(row)

    content = build_xlsx("Registros Mensais", active_columns, rows)
    return xlsx_response(content, f"registros_mensais_{mes_ano or 'todos'}.xlsx")


@router.get("/export/rentabilidade")
def export_rentabilidade_xlsx(
    mes_ano: str = Query(..., description="Month to export (YYYY-MM-DD)"),
    columns: Optional[str] = Query(None, description="Comma-separated column keys"),
    _user=Depends(verify_token),
    supabase: Client = Depends(get_supabase),
):
    active_columns = resolve_columns(columns, RENTABILIDADE_COLUMNS)

    records = (
        supabase.table("monthly_records")
        .select("*")
        .eq("mes_ano", mes_ano)
        .eq("mensal_x_rentabilidade", "Faturamento mensal")
        .execute()
        .data or []
    )

    if not records:
        content = build_xlsx("Faturamento Mensal", active_columns, [])
        return xlsx_response(content, f"faturamento_mensal_{mes_ano}.xlsx")

    # Fetch full company data for all companies in the result set
    company_ids = list({r["company_id"] for r in records})
    companies_res = (
        supabase.table("companies")
        .select("id, company_id, empresa, cnpj, razao_social, data_assinatura_contrato, email_envio, inicio_cobranca, vencimento")
        .in_("id", company_ids)
        .execute()
    )
    company_map: dict[str, dict] = {c["id"]: c for c in companies_res.data or []}

    rows = []
    for rec in records:
        company = company_map.get(rec.get("company_id", ""), {})
        row = []
        for field, _ in active_columns:
            if field in COMPANY_FIELD_KEYS:
                value = company.get(field)
                # Format date fields for readability
                if field in ("data_assinatura_contrato", "inicio_cobranca") and value:
                    value = str(value)[:10].replace("-", "/")
                    parts = value.split("/")
                    if len(parts) == 3:
                        value = f"{parts[2]}/{parts[1]}/{parts[0]}"
            elif field == "mes_ano":
                value = format_mes_ano(rec.get(field))
            else:
                value = rec.get(field)
            row.append(value)
        rows.append(row)

    content = build_xlsx("Faturamento Mensal", active_columns, rows)
    return xlsx_response(content, f"faturamento_mensal_{mes_ano}.xlsx")
