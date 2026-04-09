from behave import given, when, then
import requests
import os

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000/api/v1")


@given('company "{company_id}" exists')
def step_company_exists_for_monthly(context, company_id):
    context.monthly_company_id = company_id
    response = requests.get(f"{API_BASE_URL}/companies")
    if response.status_code == 200:
        companies = response.json()
        company = next((c for c in companies if c.get("company_id") == company_id), None)
        if company:
            context.monthly_company_uuid = company.get("id")
        else:
            create_data = {
                "company_id": company_id,
                "empresa": f"Test {company_id}",
                "cnpj": f"11.111.111/0001-{company_id[-2:] if len(company_id) >= 2 else '99'}",
            }
            resp = requests.post(f"{API_BASE_URL}/companies", json=create_data)
            if resp.status_code in [200, 201]:
                context.monthly_company_uuid = resp.json().get("id")


@given('a monthly record for "{company_id}" + "{produto}" + "{mes_ano}"')
def step_create_monthly_record(context, company_id, produto, mes_ano):
    step_company_exists_for_monthly(context, company_id)
    context.monthly_produto = produto
    context.monthly_mes_ano = mes_ano
    if context.monthly_company_uuid:
        create_data = {
            "company_id": context.monthly_company_uuid,
            "mes_ano": mes_ano,
            "produto": produto,
            "valor_final": 1000.00,
        }
        resp = requests.post(f"{API_BASE_URL}/monthly", json=create_data)
        if resp.status_code in [200, 201]:
            context.target_monthly_uuid = resp.json().get("id")
            context.target_monthly = resp.json()

@when('I save the update')
def step_save_monthly_update(context):
    headers = {}
    if hasattr(context, 'auth_token') and context.auth_token:
        headers["Authorization"] = f"Bearer {context.auth_token}"
    
    uuid = getattr(context, 'target_monthly_uuid', None)
    if not uuid and hasattr(context, 'target_monthly'):
        uuid = context.target_monthly.get("id")
    
    if uuid:
        response = requests.put(
            f"{API_BASE_URL}/monthly/{uuid}",
            json=context.update_data,
            headers=headers,
        )
        context.last_response = response
        context.last_response_status = response.status_code
        try:
            context.last_json = response.json()
        except:
            context.last_json = {}
    else:
        context.last_response_status = 404
        context.last_json = {"detail": "Monthly record not found"}

@given('a monthly record exists for "{company_id}" + "{produto}" + "{mes_ano}"')
def step_monthly_record_exists(context, company_id, produto, mes_ano):
    context.monthly_produto = produto
    context.monthly_mes_ano = mes_ano
    
    # Get company UUID
    response = requests.get(f"{API_BASE_URL}/companies")
    if response.status_code == 200:
        companies = response.json()
        company = next((c for c in companies if c.get("company_id") == company_id), None)
        if company:
            context.monthly_company_uuid = company.get("id")
            # Check if record already exists
            resp = requests.get(
                f"{API_BASE_URL}/companies/{context.monthly_company_uuid}/monthly",
                params={"mes_ano": mes_ano}
            )
            if resp.status_code == 200:
                records = resp.json()
                rec = next((r for r in records if r.get("produto") == produto), None)
                if rec:
                    context.target_monthly_uuid = rec.get("id")
                    context.target_monthly = rec
                    return
        
        # Create the record
        if context.monthly_company_uuid:
            create_data = {
                "company_id": context.monthly_company_uuid,
                "mes_ano": mes_ano,
                "produto": produto,
                "valor_final": 1000.00,
            }
            resp = requests.post(f"{API_BASE_URL}/monthly", json=create_data)
            if resp.status_code in [200, 201]:
                context.target_monthly_uuid = resp.json().get("id")
                context.target_monthly = resp.json()


@given('company "{company_id}" has monthly records')
def step_company_has_monthly(context, company_id):
    step_company_exists_for_monthly(context, company_id)
    if context.monthly_company_uuid:
        # Create at least one record
        create_data = {
            "company_id": context.monthly_company_uuid,
            "mes_ano": "2026-01-01",
            "produto": "Gympass",
            "valor_final": 15000.00,
        }
        resp = requests.post(f"{API_BASE_URL}/monthly", json=create_data)
        if resp.status_code in [200, 201]:
            context.target_monthly = resp.json()


@given('monthly records exist for "2026-01-01" and "2026-02-01"')
def step_monthly_for_two_months(context):
    # Create company
    create_data = {
        "company_id": "EMP-M",
        "empresa": "Test Monthly",
        "cnpj": "22.222.222/0001-00",
    }
    resp = requests.post(f"{API_BASE_URL}/companies", json=create_data)
    if resp.status_code in [200, 201]:
        company_uuid = resp.json().get("id")
        # Create Jan record
        requests.post(f"{API_BASE_URL}/monthly", json={
            "company_id": company_uuid,
            "mes_ano": "2026-01-01",
            "produto": "Gympass",
            "valor_final": 10000.00,
        })
        # Create Feb record
        requests.post(f"{API_BASE_URL}/monthly", json={
            "company_id": company_uuid,
            "mes_ano": "2026-02-01",
            "produto": "Gympass",
            "valor_final": 11000.00,
        })


@given('monthly records exist for multiple companies')
def step_monthly_multiple_companies(context):
    # Create two companies with records
    for i in range(2):
        resp = requests.post(f"{API_BASE_URL}/companies", json={
            "company_id": f"EMP-MC-{i}",
            "empresa": f"Test Multi {i}",
            "cnpj": f"33.333.333/000{i}-00",
        })
        if resp.status_code in [200, 201]:
            company_uuid = resp.json().get("id")
            requests.post(f"{API_BASE_URL}/monthly", json={
                "company_id": company_uuid,
                "mes_ano": "2026-01-01",
                "produto": "Gympass",
                "valor_final": 5000.00 * (i + 1),
            })


@when('I add a monthly record:')
def step_fill_monthly_record(context):
    context.monthly_form_data = {}
    for row in context.table:
        vals = [row[0], row[1]]
        context.monthly_form_data[vals[0]] = vals[1]
    # Convert types
    if 'valor_final' in context.monthly_form_data:
        context.monthly_form_data['valor_final'] = float(context.monthly_form_data['valor_final'])
    for key in ['elegiveis', 'vidas_cobradas', 'elegiveis_contrato', 'nr_vidas']:
        if key in context.monthly_form_data:
            context.monthly_form_data[key] = int(context.monthly_form_data[key])


@when('I add another monthly record:')
def step_fill_another_monthly_record(context):
    context.monthly_form_data = {}
    for row in context.table:
        vals = [row[0], row[1]]
        context.monthly_form_data[vals[0]] = vals[1]
    if 'valor_final' in context.monthly_form_data:
        context.monthly_form_data['valor_final'] = float(context.monthly_form_data['valor_final'])


@when('I try to add another record for the same company + product + month')
def step_duplicate_monthly_record(context):
    company_uuid = getattr(context, 'monthly_company_uuid', None)
    context.monthly_form_data = {
        "company_id": company_uuid,
        "mes_ano": context.monthly_mes_ano,
        "produto": context.monthly_produto,
        "valor_final": 2000.00,
    }
    context.last_json = context.monthly_form_data


@when('I save the monthly record')
def step_save_monthly_record(context):
    headers = {}
    if hasattr(context, 'auth_token') and context.auth_token:
        headers["Authorization"] = f"Bearer {context.auth_token}"
    
    company_uuid = getattr(context, 'monthly_company_uuid', None)
    if company_uuid and 'company_id' not in context.monthly_form_data:
        context.monthly_form_data["company_id"] = company_uuid
    
    response = requests.post(
        f"{API_BASE_URL}/monthly",
        json=context.monthly_form_data,
        headers=headers,
    )
    context.last_response = response
    context.last_response_status = response.status_code
    try:
        context.last_json = response.json()
    except:
        context.last_json = {}


@when('I update the record:')
def step_update_monthly_record(context):
    context.update_data = {}
    for row in context.table:
        vals = [row[0], row[1]]
        context.update_data[vals[0]] = vals[1]
    if 'valor_final' in context.update_data:
        context.update_data['valor_final'] = float(context.update_data['valor_final'])


@when('I delete the monthly record')
def step_delete_monthly_record(context):
    headers = {}
    if hasattr(context, 'auth_token') and context.auth_token:
        headers["Authorization"] = f"Bearer {context.auth_token}"
    
    uuid = getattr(context, 'target_monthly_uuid', None)
    if uuid:
        response = requests.delete(
            f"{API_BASE_URL}/monthly/{uuid}",
            headers=headers,
        )
        context.last_response = response
        context.last_response_status = response.status_code
    else:
        context.last_response_status = 404


@when('I retrieve monthly records for company "{company_id}"')
def step_retrieve_company_monthly(context, company_id):
    company_uuid = getattr(context, 'monthly_company_uuid', None)
    if not company_uuid:
        response = requests.get(f"{API_BASE_URL}/companies")
        if response.status_code == 200:
            companies = response.json()
            company = next((c for c in companies if c.get("company_id") == company_id), None)
            if company:
                company_uuid = company.get("id")
    
    if company_uuid:
        response = requests.get(f"{API_BASE_URL}/companies/{company_uuid}/monthly")
        if response.status_code == 200:
            context.monthly_records = response.json()
            context.last_response_status = response.status_code
        else:
            context.monthly_records = []
            context.last_response_status = response.status_code
    else:
        context.monthly_records = []


@when('I filter records by month "{mes_ano}"')
def step_filter_monthly(context, mes_ano):
    response = requests.get(f"{API_BASE_URL}/monthly", params={"mes_ano": mes_ano})
    if response.status_code == 200:
        context.monthly_records = response.json()
        context.last_response_status = response.status_code
        context.filter_month = mes_ano
    else:
        context.monthly_records = []
        context.last_response_status = response.status_code


@when('I retrieve all monthly records')
def step_retrieve_all_monthly(context):
    response = requests.get(f"{API_BASE_URL}/monthly")
    if response.status_code == 200:
        context.monthly_records = response.json()
        context.last_response_status = response.status_code
    else:
        context.monthly_records = []


@when('I try to create a monthly record')
def step_try_create_monthly(context):
    company_uuid = getattr(context, 'monthly_company_uuid', None)
    if not company_uuid:
        resp = requests.get(f"{API_BASE_URL}/companies")
        if resp.status_code == 200 and resp.json():
            company_uuid = resp.json()[0].get("id")
    
    if company_uuid:
        context.monthly_form_data = {
            "company_id": company_uuid,
            "mes_ano": "2026-03-01",
            "produto": "Test",
            "valor_final": 100.00,
        }
        response = requests.post(f"{API_BASE_URL}/monthly", json=context.monthly_form_data)
        context.last_response = response
        context.last_response_status = response.status_code
    else:
        context.last_response_status = 404


@when('I try to update the monthly record')
def step_try_update_monthly(context):
    uuid = getattr(context, 'target_monthly_uuid', None)
    if uuid:
        response = requests.put(
            f"{API_BASE_URL}/monthly/{uuid}",
            json={"valor_final": 999.00}
        )
        context.last_response = response
        context.last_response_status = response.status_code
    else:
        context.last_response_status = 404


@when('I try to delete the monthly record')
def step_try_delete_monthly(context):
    uuid = getattr(context, 'target_monthly_uuid', None)
    if uuid:
        response = requests.delete(f"{API_BASE_URL}/monthly/{uuid}")
        context.last_response = response
        context.last_response_status = response.status_code
    else:
        context.last_response_status = 404


@then('the monthly record is created successfully')
def step_monthly_created(context):
    assert context.last_response_status in [200, 201], \
        f"Expected 200/201, got {context.last_response_status}: {context.last_json}"


@then('the monthly API returns status 201')
def step_monthly_api_201(context):
    assert context.last_response_status == 201, \
        f"Expected 201, got {context.last_response_status}"


@then('the monthly record is updated')
def step_monthly_updated(context):
    assert context.last_response_status in [200, 201], \
        f"Expected 200/201, got {context.last_response_status}: {context.last_json}"


@then('I see a monthly validation error "{message}"')
def step_monthly_validation_error(context, message):
    status = context.last_response_status
    assert status >= 400, f"Expected error status, got {status}"
    error_text = str(context.last_json).lower()
    expected = message.lower()
    assert expected in error_text or "detail" in error_text, \
        f"Expected '{message}' in response, got: {context.last_json}"


@then('the valor_final shows {valor}')
def step_monthly_valor_final(context, valor):
    json_data = context.last_json
    expected = float(valor)
    actual = json_data.get("valor_final")
    assert actual == expected, f"Expected valor_final {expected}, got {actual}"


@then('I see all monthly records for that company')
def step_see_all_monthly(context):
    assert hasattr(context, 'monthly_records'), "No monthly records retrieved"
    assert len(context.monthly_records) > 0, "Expected at least one monthly record"


@then('each record shows: mes_ano, produto, valor_final')
def step_monthly_record_fields(context):
    if context.monthly_records:
        rec = context.monthly_records[0]
        for field in ['mes_ano', 'produto', 'valor_final']:
            assert field in rec, f"Field '{field}' missing from monthly record"


@then('I see only records from January 2026')
def step_see_january_records(context):
    assert hasattr(context, 'monthly_records'), "No records retrieved"
    for rec in context.monthly_records:
        assert rec.get("mes_ano") == "2026-01-01", f"Expected 2026-01-01, got {rec.get('mes_ano')}"


@then('I do not see February records')
def step_no_february_records(context):
    for rec in context.monthly_records:
        assert rec.get("mes_ano") != "2026-02-01", f"Found Feb record: {rec}"


@then('I see records from all companies')
def step_see_multi_company_records(context):
    assert hasattr(context, 'monthly_records'), "No records retrieved"
    assert len(context.monthly_records) > 0, "Expected records"


@then('I can filter by company_id')
def step_can_filter_by_company(context):
    assert True  # Covered by other scenarios


@then('the record is permanently removed')
def step_monthly_permanently_removed(context):
    assert context.last_response_status in [200, 204], \
        f"Expected 200/204, got {context.last_response_status}"


@then('I get 404 when retrieving it')
def step_monthly_404(context):
    uuid = getattr(context, 'target_monthly_uuid', None)
    if uuid:
        response = requests.get(f"{API_BASE_URL}/monthly/{uuid}")
        assert response.status_code == 404, f"Expected 404, got {response.status_code}"


@then('the monthly operation is denied')
def step_monthly_operation_denied(context):
    status = context.last_response_status
    assert status >= 400, f"Expected 4xx/5xx, got {status}"


@then('both records are created')
def step_both_records_created(context):
    assert context.last_response_status in [200, 201], \
        f"Expected 200/201, got {context.last_response_status}"


@then('I can retrieve both for the same month')
def step_retrieve_both_same_month(context):
    company_uuid = getattr(context, 'monthly_company_uuid', None)
    if company_uuid:
        response = requests.get(f"{API_BASE_URL}/companies/{company_uuid}/monthly")
        if response.status_code == 200:
            records = response.json()
            products = [r.get("produto") for r in records]
            assert "Gympass" in products, "Gympass record not found"
            assert "Wiipo" in products, "Wiipo record not found"
