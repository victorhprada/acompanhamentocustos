#!/usr/bin/env python3
"""
Create test users in Supabase for the Acompanhamento de Custos system.

Usage:
    python scripts/create_test_users.py

Requirements:
    - Supabase URL and Service Role Key in backend/.env
    - psycopg2 installed: pip install psycopg2-binary
    - requests installed: pip install requests
"""

import os
import sys
import requests
import psycopg2
from dotenv import load_dotenv

# Load environment variables
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))

SUPABASE_URL = os.getenv('SUPABASE_URL', '')
SERVICE_ROLE_KEY = os.getenv('SUPABASE_SERVICE_ROLE_KEY', '')
DATABASE_URL = os.getenv('DATABASE_URL', '')

# Test users to create
TEST_USERS = [
    {
        'email': 'admin@test.com',
        'password': 'testpassword123',
        'full_name': 'Admin User',
        'role': 'admin',
    },
    {
        'email': 'analyst@test.com',
        'password': 'testpassword123',
        'full_name': 'Analyst User',
        'role': 'analyst',
    },
    {
        'email': 'viewer@test.com',
        'password': 'testpassword123',
        'full_name': 'Viewer User',
        'role': 'viewer',
    },
]


def check_prerequisites():
    """Verify all required environment variables are set."""
    missing = []
    if not SUPABASE_URL:
        missing.append('SUPABASE_URL')
    if not SERVICE_ROLE_KEY:
        missing.append('SUPABASE_SERVICE_ROLE_KEY')
    if not DATABASE_URL:
        missing.append('DATABASE_URL')

    if missing:
        print(f"❌ Missing environment variables: {', '.join(missing)}")
        print(f"   Please set them in backend/.env")
        return False
    return True


def get_existing_user_ids() -> dict[str, str]:
    """Fetch all existing users from Supabase Auth."""
    url = f"{SUPABASE_URL}/admin/users"
    headers = {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
    }

    response = requests.get(url, headers=headers)
    if response.status_code != 200:
        print(f"⚠️  Failed to fetch existing users: {response.status_code}")
        return {}

    users = response.json().get('users', [])
    return {user['email']: user['id'] for user in users}


def create_auth_user(email: str, password: str) -> str | None:
    """Create a user in Supabase Auth. Returns user ID or None if exists."""
    # Check if already exists
    existing = get_existing_user_ids()
    if email in existing:
        print(f"   ℹ️  User {email} already exists (ID: {existing[email]})")
        return existing[email]

    url = f"{SUPABASE_URL}/admin/users"
    headers = {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': f'Bearer {SERVICE_ROLE_KEY}',
        'Content-Type': 'application/json',
    }
    payload = {
        'email': email,
        'password': password,
        'email_confirm': True,  # Skip email verification
        'user_metadata': {},
    }

    response = requests.post(url, headers=headers, json=payload)
    if response.status_code in [200, 201]:
        user_id = response.json().get('id')
        print(f"   ✅ Created auth user: {email}")
        return user_id
    else:
        print(f"   ❌ Failed to create {email}: {response.status_code} - {response.text}")
        return None


def create_profile(user_id: str, email: str, full_name: str, role: str) -> bool:
    """Create a profile entry in the profiles table."""
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cur = conn.cursor()

        # Check if profile already exists
        cur.execute("SELECT id FROM profiles WHERE id = %s", (user_id,))
        if cur.fetchone():
            print(f"   ℹ️  Profile already exists for {email}")
            cur.close()
            conn.close()
            return True

        # Insert profile
        cur.execute(
            """
            INSERT INTO profiles (id, email, full_name, role)
            VALUES (%s, %s, %s, %s)
            """,
            (user_id, email, full_name, role),
        )
        conn.commit()
        cur.close()
        conn.close()
        print(f"   ✅ Created profile: {full_name} ({role})")
        return True

    except Exception as e:
        print(f"   ❌ Failed to create profile for {email}: {e}")
        return False


def main():
    print("=" * 60)
    print("  Supabase Test Users Setup")
    print("=" * 60)
    print()

    if not check_prerequisites():
        sys.exit(1)

    print(f"📍 Supabase URL: {SUPABASE_URL}")
    print()

    created = 0
    skipped = 0
    failed = 0

    for user in TEST_USERS:
        print(f"👤 Setting up: {user['email']}")

        # Step 1: Create auth user
        user_id = create_auth_user(user['email'], user['password'])
        if not user_id:
            failed += 1
            print()
            continue

        # Step 2: Create profile
        if create_profile(user_id, user['email'], user['full_name'], user['role']):
            created += 1
        else:
            failed += 1

        print()

    # Summary
    print("=" * 60)
    print(f"  Summary")
    print("=" * 60)
    print(f"  ✅ Created/Verified: {created}")
    print(f"  ❌ Failed: {failed}")
    print()

    if failed == 0:
        print("  🎉 All users set up successfully!")
        print()
        print("  Login credentials:")
        print(f"  {'Email':<25} {'Password':<20} {'Role':<10}")
        print(f"  {'-'*25} {'-'*20} {'-'*10}")
        for user in TEST_USERS:
            print(f"  {user['email']:<25} {user['password']:<20} {user['role']:<10}")
    else:
        print(f"  ⚠️  {failed} user(s) failed. Check errors above.")

    print()


if __name__ == '__main__':
    main()
