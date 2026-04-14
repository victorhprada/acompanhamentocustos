from behave import fixture, use_fixture
import requests
import os
from dotenv import load_dotenv

# Load .env from project root
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000/api/v1")


def _authenticate_test_users(context):
    """Pre-authenticate test users and cache their JWT tokens."""
    from supabase import create_client

    url = os.getenv("SUPABASE_URL", "")
    anon_key = os.getenv("SUPABASE_ANON_KEY", "")
    if not url or not anon_key:
        context.tokens = {}
        return

    client = create_client(url, anon_key)
    context.tokens = {}
    for role, creds in context.test_users.items():
        try:
            resp = client.auth.sign_in_with_password({
                "email": creds["email"],
                "password": creds["password"],
            })
            if resp.session:
                context.tokens[role] = resp.session.access_token
        except Exception:
            pass


def get_auth_headers(context, role="analyst"):
    """Return Authorization headers for a given role."""
    token = getattr(context, "tokens", {}).get(role, "")
    if token:
        return {"Authorization": f"Bearer {token}"}
    return {}


def before_all(context):
    """Run once before all scenarios"""
    context.api_base = API_BASE_URL
    context.supabase_url = os.getenv("SUPABASE_URL", "")
    context.supabase_anon_key = os.getenv("SUPABASE_ANON_KEY", "")
    context.test_users = {
        "admin": {"email": "admin@test.com", "password": "testpass123", "role": "admin"},
        "analyst": {"email": "analyst@test.com", "password": "testpass123", "role": "analyst"},
        "viewer": {"email": "viewer@test.com", "password": "testpass123", "role": "viewer"},
    }
    _authenticate_test_users(context)


def before_scenario(context, scenario):
    """Run before each scenario"""
    context.test_users = {
        "admin": {"email": "admin@test.com", "password": "testpass123", "role": "admin"},
        "analyst": {"email": "analyst@test.com", "password": "testpass123", "role": "analyst"},
        "viewer": {"email": "viewer@test.com", "password": "testpass123", "role": "viewer"},
    }
    context.created_resources = []


def after_scenario(context, scenario):
    """Cleanup after each scenario"""
    # Clean up test data if needed
    if hasattr(context, 'created_resources'):
        for resource in context.created_resources:
            # Cleanup logic based on resource type
            pass
