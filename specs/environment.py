from behave import fixture, use_fixture
import requests
import os
from dotenv import load_dotenv

# Load .env from project root
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

API_BASE_URL = os.getenv("API_BASE_URL", "http://localhost:8000/api/v1")

def before_all(context):
    """Run once before all scenarios"""
    context.api_base = API_BASE_URL
    context.supabase_url = os.getenv("SUPABASE_URL", "")
    context.supabase_anon_key = os.getenv("SUPABASE_ANON_KEY", "")

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
