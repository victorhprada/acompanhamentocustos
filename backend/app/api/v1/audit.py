from fastapi import APIRouter, Depends, Query
from supabase import create_client, Client
from app.config import settings
from typing import Optional, List

router = APIRouter()


def get_supabase():
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)


@router.get("/audit-logs")
def list_audit_logs(
    table_name: Optional[str] = Query(None, description="Filter by table name"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    action: Optional[str] = Query(None, description="Filter by action (INSERT/UPDATE/DELETE)"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    supabase: Client = Depends(get_supabase),
):
    """List audit log entries with optional filters and pagination."""
    query = supabase.table("audit_logs").select(
        "id, table_name, record_id, action, old_values, new_values, changed_by, changed_at"
    ).order("changed_at", desc=True)

    if table_name:
        query = query.eq("table_name", table_name)
    if user_id:
        query = query.eq("changed_by", user_id)
    if action:
        query = query.eq("action", action)

    # Get total count for pagination
    count_query = supabase.table("audit_logs").select("id", count="exact")
    if table_name:
        count_query = count_query.eq("table_name", table_name)
    if user_id:
        count_query = count_query.eq("changed_by", user_id)
    if action:
        count_query = count_query.eq("action", action)
    count_result = count_query.execute()
    total = count_result.count or 0

    # Apply pagination
    result = query.range(offset, offset + limit - 1).execute()

    return {
        "items": result.data or [],
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.get("/audit-logs/{log_id}")
def get_audit_log(
    log_id: str,
    supabase: Client = Depends(get_supabase),
):
    """Get a single audit log entry."""
    result = supabase.table("audit_logs").select("*").eq("id", log_id).execute()
    if not result.data:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Audit log not found")
    return result.data[0]
