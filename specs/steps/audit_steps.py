from behave import given, when, then
import requests
import os

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000/api/v1")


@when('I retrieve the audit logs')
def step_retrieve_audit_logs(context):
    response = requests.get(f"{API_BASE_URL}/audit-logs")
    context.last_response = response
    context.last_response_status = response.status_code
    try:
        context.last_json = response.json()
    except:
        context.last_json = {}


@then('I see a list of audit log entries')
def step_see_audit_logs(context):
    assert context.last_response_status == 200, f"Expected 200, got {context.last_response_status}"
    assert "items" in context.last_json, "Response should contain 'items' key"
    assert isinstance(context.last_json["items"], list), "Items should be a list"


@then('each entry shows: table_name, action, changed_at')
def step_audit_log_fields(context):
    if context.last_json.get("items"):
        entry = context.last_json["items"][0]
        for field in ["table_name", "action", "changed_at"]:
            assert field in entry, f"Field '{field}' missing from audit log entry"


@given('audit logs exist for multiple tables')
def step_audit_logs_multiple_tables(context):
    # This is assumed from normal system usage
    context.audit_logs_exist = True


@when('I filter audit logs by table "{table_name}"')
def step_filter_audit_by_table(context, table_name):
    response = requests.get(f"{API_BASE_URL}/audit-logs", params={"table_name": table_name})
    context.last_response = response
    context.last_response_status = response.status_code
    try:
        context.last_json = response.json()
    except:
        context.last_json = {}
    context.filter_table = table_name


@then('I see only audit logs for the companies table')
def step_see_only_company_logs(context):
    assert context.last_response_status == 200
    for entry in context.last_json.get("items", []):
        assert entry.get("table_name") == context.filter_table, \
            f"Expected table {context.filter_table}, got {entry.get('table_name')}"


@when('I filter audit logs by action "{action}"')
def step_filter_audit_by_action(context, action):
    response = requests.get(f"{API_BASE_URL}/audit-logs", params={"action": action})
    context.last_response = response
    context.last_response_status = response.status_code
    try:
        context.last_json = response.json()
    except:
        context.last_json = {}


@then('I see only audit logs with INSERT action')
def step_see_only_insert_logs(context):
    assert context.last_response_status == 200
    for entry in context.last_json.get("items", []):
        assert entry.get("action") == "INSERT", \
            f"Expected action INSERT, got {entry.get('action')}"


@given('an audit log entry exists')
def step_audit_log_entry_exists(context):
    # Fetch any existing log entry
    response = requests.get(f"{API_BASE_URL}/audit-logs", params={"limit": 1})
    if response.status_code == 200 and response.json().get("items"):
        context.audit_log_id = response.json()["items"][0]["id"]
    else:
        context.audit_log_id = None


@when('I retrieve the audit log detail')
def step_retrieve_audit_log_detail(context):
    if context.audit_log_id:
        response = requests.get(f"{API_BASE_URL}/audit-logs/{context.audit_log_id}")
        context.last_response = response
        context.last_response_status = response.status_code
        try:
            context.last_json = response.json()
        except:
            context.last_json = {}
    else:
        context.last_response_status = 404


@then('I see the old and new values')
def step_see_old_new_values(context):
    assert context.last_response_status == 200
    assert "old_values" in context.last_json or "new_values" in context.last_json, \
        "Audit log should have old_values or new_values"


@then('the audit operation is denied')
def step_audit_operation_denied(context):
    status = context.last_response_status
    assert status >= 400, f"Expected 4xx/5xx, got {status}"


@when('I try to retrieve audit logs')
def step_try_retrieve_audit_logs(context):
    context.user_role = getattr(context, 'user_role', 'viewer')
    response = requests.get(f"{API_BASE_URL}/audit-logs")
    context.last_response = response
    context.last_response_status = response.status_code
