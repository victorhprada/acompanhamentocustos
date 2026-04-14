from behave import given, when, then
import requests
import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from environment import get_auth_headers

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000/api/v1")


@when('I retrieve the dashboard data')
def step_retrieve_dashboard(context):
    response = requests.get(f"{API_BASE_URL}/dashboard", headers=get_auth_headers(context))
    context.last_response = response
    context.last_response_status = response.status_code
    try:
        context.last_json = response.json()
    except:
        context.last_json = {}


@when('I retrieve the dashboard for month "{mes_ano}"')
def step_retrieve_dashboard_month(context, mes_ano):
    response = requests.get(f"{API_BASE_URL}/dashboard", params={"mes_ano": mes_ano}, headers=get_auth_headers(context))
    context.last_response = response
    context.last_response_status = response.status_code
    try:
        context.last_json = response.json()
    except:
        context.last_json = {}


@then('I see total elegíveis totalpass/gympass')
def step_see_total_elegiveis(context):
    kpis = context.last_json.get("kpis", {})
    assert "total_elegiveis_totalpass_gympass" in kpis, "Missing total_elegiveis_totalpass_gympass"


@then('I see total nº vidas')
def step_see_total_vidas(context):
    kpis = context.last_json.get("kpis", {})
    assert "total_nr_vidas" in kpis, "Missing total_nr_vidas"


@then('I see total valor vidas')
def step_see_total_valor_vidas(context):
    kpis = context.last_json.get("kpis", {})
    assert "total_valor_vidas" in kpis, "Missing total_valor_vidas"


@then('I see total custo por cliente')
def step_see_total_custo(context):
    kpis = context.last_json.get("kpis", {})
    assert "total_custo_por_cliente" in kpis, "Missing total_custo_por_cliente"


@then('I see total valor faturado')
def step_see_total_faturado(context):
    kpis = context.last_json.get("kpis", {})
    assert "total_valor_faturado" in kpis, "Missing total_valor_faturado"


@then('I see KPIs for January 2026 only')
def step_see_kpis_jan_2026(context):
    assert context.last_json.get("mes_ano") == "2026-01-01"


@when('I export records for month "{mes_ano}"')
def step_export_month_csv(context, mes_ano):
    response = requests.get(f"{API_BASE_URL}/export/monthly", params={"mes_ano": mes_ano}, headers=get_auth_headers(context))
    context.last_response = response
    context.last_response_status = response.status_code
    context.last_content = response.text


@when('I export all records')
def step_export_all_csv(context):
    response = requests.get(f"{API_BASE_URL}/export/monthly", headers=get_auth_headers(context))
    context.last_response = response
    context.last_response_status = response.status_code
    context.last_content = response.text


@then('I receive a CSV file')
def step_receive_csv(context):
    assert context.last_response_status == 200, f"Expected 200, got {context.last_response_status}"
    content_type = context.last_response.headers.get("Content-Type", "")
    assert "csv" in content_type or "text" in content_type, f"Expected CSV, got {content_type}"


@then('the CSV contains the records for that month')
def step_csv_has_month_records(context):
    content = context.last_content
    assert "2026-01" in content or "01/2026" in content, "CSV does not contain January records"


@then('the CSV contains all records')
def step_csv_has_all_records(context):
    content = context.last_content
    lines = content.strip().split("\n")
    assert len(lines) > 1, f"CSV should have header + data rows, got {len(lines)} lines"
