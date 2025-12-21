from datetime import datetime, timedelta
from fastapi import HTTPException, status
from database import db

def get_rate_limit_status(user_id: str) -> dict:
    """
    Get rate limit status without incrementing the counter.
    Returns: {
        "remaining": int,
        "limit": int,
        "reset_in_seconds": int (time until oldest request expires)
    }
    """
    now = datetime.utcnow()
    cutoff = now - timedelta(seconds=60)
    
    # Clean up old entries
    db.execute_query(
        "DELETE FROM rate_limits WHERE user_id = %s AND request_timestamp < %s",
        (user_id, cutoff)
    )
    
    # Count recent requests
    result = db.fetch_one(
        "SELECT COUNT(*) as count FROM rate_limits WHERE user_id = %s AND request_timestamp >= %s",
        (user_id, cutoff)
    )
    
    count = result['count'] if result else 0
    remaining = max(0, 10 - count)
    
    # Calculate time until reset 
    reset_in_seconds = 0
    if count > 0:
        oldest_result = db.fetch_one(
            "SELECT MIN(request_timestamp) as oldest FROM rate_limits WHERE user_id = %s",
            (user_id,)
        )
        if oldest_result and oldest_result['oldest']:
            oldest = oldest_result['oldest']
            reset_time = oldest + timedelta(seconds=60)
            reset_in_seconds = max(0, int((reset_time - now).total_seconds()))
    
    return {
        "remaining": remaining,
        "limit": 10,
        "reset_in_seconds": reset_in_seconds
    }

def check_rate_limit(user_id: str) -> None:
    """
    Check if user has exceeded rate limit (10 requests per minute).
    Uses rolling window: purge old timestamps, then check count.
    """
    now = datetime.utcnow()
    cutoff = now - timedelta(seconds=60)
    
    # Clean up old entries
    db.execute_query(
        "DELETE FROM rate_limits WHERE user_id = %s AND request_timestamp < %s",
        (user_id, cutoff)
    )
    
    # Count recent requests
    result = db.fetch_one(
        "SELECT COUNT(*) as count FROM rate_limits WHERE user_id = %s AND request_timestamp >= %s",
        (user_id, cutoff)
    )
    
    count = result['count'] if result else 0
    
    # Check if limit exceeded
    if count >= 10:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"error": "RATE_LIMIT_EXCEEDED"}
        )
    
    # Record this request
    db.execute_query(
        "INSERT INTO rate_limits (user_id, request_timestamp) VALUES (%s, %s)",
        (user_id, now)
    )