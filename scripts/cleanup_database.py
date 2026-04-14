"""
Cleanup Database Script — via Supabase REST API
================================================
Discovers existing tables and truncates ALL data except profiles (users).
"""
import os, sys
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "backend"))

from supabase import create_client
from app.config import settings

# Tables we WANT to clean (will skip ones that don't exist)
TARGET_TABLES = [
    "audit_logs",
    "cost_attachments",
    "operational_costs",
    "monthly_records",
    "cost_centers",
    "companies",
]

def main():
    supabase = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)

    # Check connection
    users = supabase.table("profiles").select("id").limit(1).execute()
    print(f"✅ Connected to {settings.SUPABASE_URL}")
    user_count = len(users.data) if users.data else 0
    print(f"   Users in database: {user_count}")

    # Discover which target tables actually exist
    existing = []
    for table in TARGET_TABLES:
        try:
            result = supabase.table(table).select("id", count="exact").execute()
            c = result.count or 0
            existing.append((table, c))
        except Exception:
            pass  # table doesn't exist

    print(f"\n📊 Tables found ({len(existing)}):")
    total = 0
    for table, c in existing:
        total += c
        icon = "🗑️ " if c > 0 else "   "
        print(f"   {icon}{table}: {c} rows")

    if total == 0:
        print("\n✅ Database is already clean!")
        return

    print(f"\n   Total rows to delete: {total}")
    print(f"   Users preserved: {user_count}")

    response = input("\n⚠️  Type 'YES' to confirm deletion: ")
    if response.strip() != "YES":
        print("Aborted.")
        return

    print("\nCleaning up...")
    for table, count in existing:
        if count == 0:
            print(f"   ✅ {table}: already empty")
            continue
        try:
            supabase.table(table).delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
            print(f"   ✅ {table}: {count} rows deleted")
        except Exception as e:
            print(f"   ❌ {table}: {e}")

    print("\n" + "=" * 50)
    print("✅ Database cleanup complete!")
    print(f"   Users preserved: {user_count}")
    print("=" * 50)

if __name__ == "__main__":
    main()
