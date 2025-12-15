from datetime import datetime, timedelta
from fastapi import HTTPException, status
from stores import rate_counter

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
    
    # Initialize if needed
    if user_id not in rate_counter:
        rate_counter[user_id] = []
    
    # Purge timestamps older than 60 seconds (rolling window)
    cutoff = now - timedelta(seconds=60)
    rate_counter[user_id] = [
        ts for ts in rate_counter[user_id] if ts > cutoff
    ]
    
    count = len(rate_counter[user_id])
    remaining = max(0, 10 - count)
    
    # Calculate time until reset (when oldest request expires)
    reset_in_seconds = 0
    if count > 0:
        oldest = min(rate_counter[user_id])
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
    
    # Initialize if needed
    if user_id not in rate_counter:
        rate_counter[user_id] = []
    
    # Purge timestamps older than 60 seconds (rolling window)
    cutoff = now - timedelta(seconds=60)
    rate_counter[user_id] = [
        ts for ts in rate_counter[user_id] if ts > cutoff
    ]
    
    # Check if limit exceeded
    if len(rate_counter[user_id]) >= 10:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail={"error": "RATE_LIMIT_EXCEEDED"}
        )
    
    # Record this request
    rate_counter[user_id].append(now)