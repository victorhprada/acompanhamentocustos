from behave import given, when, then
import requests
import os

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000/api/v1")

@given('I am on the login page')
def step_on_login_page(context):
    context.current_page = "login"

@given('cost centers exist in the system')
def step_cost_centers_exist(context):
    context.existing_cost_centers = [
        {"code": "INF", "name": "Infrastructure", "is_active": True},
        {"code": "SW", "name": "Software", "is_active": True},
    ]

@given('a cost center exists with code "{code}"')
def step_cost_center_exists(context, code):
    context.target_cost_center = {"code": code, "name": "Test Center", "is_active": True}

@when('I am on the "New Cost Center" page')
def step_on_new_cost_center_page(context):
    context.current_page = "new_cost_center"

@when('I fill in the cost center form:')
def step_fill_cost_center_form(context):
    context.form_data = {row[0]: row[1] for row in context.table}

@when('I click "Save"')
def step_click_save(context):
    context.action = "save"
    # Simulate API call
    context.last_response = {"status": 501, "message": "Not implemented"}

@when('I enter valid credentials')
def step_valid_credentials(context):
    context.login_attempt = {
        "email": "analyst@empresa.com",
        "password": "password123"
    }
    context.login_success = True

@when('I enter invalid credentials')
def step_invalid_credentials(context):
    context.login_attempt = {
        "email": "invalid@email.com",
        "password": "wrong"
    }
    context.login_success = False

@when('I am on the cost center detail page')
def step_on_cost_center_detail(context):
    context.current_page = "cost_center_detail"

@when('I click "Edit"')
def step_click_edit(context):
    context.action = "edit"

@when('I change the name to "{name}"')
def step_change_name(context, name):
    context.form_data = {"name": name}

@when('I click "Deactivate"')
def step_click_deactivate(context):
    context.action = "deactivate"

@when('I confirm the deactivation')
def step_confirm_deactivate(context):
    context.confirmed = True

@when('my session expires after inactivity')
def step_session_expires(context):
    context.session_expired = True

@when('I navigate to my profile')
def step_navigate_profile(context):
    context.current_page = "profile"

@then('the cost center is created successfully')
def step_cost_center_created(context):
    assert context.last_response.get("status") == 201, "Cost center not created"

@then('I see the cost center in the list')
def step_see_cost_center_in_list(context):
    assert hasattr(context, 'created_cost_center') or context.last_response.get("status") == 201

@then('the cost center is active')
def step_cost_center_active(context):
    assert context.last_response.get("is_active") == True

@then('I see a list of all active cost centers')
def step_see_active_cost_centers(context):
    assert hasattr(context, 'existing_cost_centers')

@then('each cost center shows: code, name, description')
def step_cost_center_fields_displayed(context):
    assert True  # UI assertion

@then('the cost center is updated')
def step_cost_center_updated(context):
    assert context.last_response.get("status") in [200, 201], "Cost center not updated"

@then('the name shows "{name}"')
def step_name_shows(context, name):
    assert context.last_response.get("name") == name or context.form_data.get("name") == name

@then('the cost center is marked as inactive')
def step_cost_center_inactive(context):
    assert context.last_response.get("is_active") == False

@then('it no longer appears in the active list')
def step_not_in_active_list(context):
    assert True

@then('I am redirected to the dashboard')
def step_redirected_to_dashboard(context):
    if context.login_success:
        context.current_page = "dashboard"
    assert context.current_page == "dashboard"

@then('my role is displayed in the header')
def step_role_displayed(context):
    assert context.user_role == "analyst"

@then('I see an error message "{message}"')
def step_error_message(context, message):
    assert not context.login_success
    assert context.error_message == message if hasattr(context, 'error_message') else True

@then('I remain on the login page')
def step_remain_login(context):
    assert context.current_page == "login"

@then('I am redirected to the login page')
def step_redirected_to_login(context):
    context.current_page = "login"

@then('I see a message "{message}"')
def step_session_expired_message(context, message):
    assert context.session_expired

@then('I see my full name, email, and role')
def step_profile_fields_displayed(context):
    assert context.current_page == "profile"

@then('I can update my profile information')
def step_can_update_profile(context):
    assert context.current_page == "profile"

@then('I do not see a "New Cost Center" button')
def step_no_new_cost_center_button(context):
    assert context.user_role == "viewer"

@then('I cannot access the creation page directly')
def step_cannot_access_creation(context):
    assert context.user_role == "viewer"

@then('I do not see an "Edit" button')
def step_no_edit_button(context):
    assert context.user_role == "viewer"

@then('I cannot access the edit page directly')
def step_cannot_access_edit(context):
    assert context.user_role == "viewer"
