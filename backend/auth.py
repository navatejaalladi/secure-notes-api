import secrets
import uuid
from datetime import datetime, timedelta
from fastapi import HTTPException, Header, status
from typing import Optional, Tuple
from database import db

def create_token(username: str) -> Tuple[str, datetime]:
    """Create a new token for the user."""
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(seconds=3600)
    
    # Get user_id from database
    user = db.fetch_one("SELECT user_id FROM users WHERE username = %s", (username,))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "USER_NOT_FOUND"}
        )
    
    user_id = user['user_id']
    
    # Insert token into database
    db.execute_query(
        "INSERT INTO tokens (token, user_id, expires_at) VALUES (%s, %s, %s)",
        (token, user_id, expires_at)
    )
    
    return token, expires_at

def create_reset_token(username: str) -> str:
    """Create a reset token for the user."""
    # Check if user exists
    user = db.fetch_one("SELECT username FROM users WHERE username = %s", (username,))
    if not user:
        return None
    
    token = secrets.token_urlsafe(16)
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    
    # Insert reset token into database
    db.execute_query(
        "INSERT INTO reset_tokens (token, username, expires_at) VALUES (%s, %s, %s)",
        (token, username, expires_at)
    )
    
    return token

def reset_password(token: str, new_password: str) -> bool:
    """Reset user password using token."""
    # Get reset token data
    reset_data = db.fetch_one(
        "SELECT username, expires_at FROM reset_tokens WHERE token = %s",
        (token,)
    )
    
    if not reset_data:
        return False
    
    # Check if token expired
    if reset_data['expires_at'] < datetime.utcnow():
        db.execute_query("DELETE FROM reset_tokens WHERE token = %s", (token,))
        return False
    
    username = reset_data['username']
    
    # Update password
    db.execute_query(
        "UPDATE users SET password = %s WHERE username = %s",
        (new_password, username)
    )
    
    # Delete used reset token
    db.execute_query("DELETE FROM reset_tokens WHERE token = %s", (token,))
    
    return True

def validate_credentials(username: str, password: str) -> bool:
    """Validate username and password against database."""
    user = db.fetch_one(
        "SELECT password FROM users WHERE username = %s",
        (username,)
    )
    
    if not user:
        return False
    
    return user['password'] == password

def register_user(username: str, password: str) -> Tuple[str, datetime, str]:
    """Register a new user and return token and user_id."""
    # Check if username already exists
    existing_user = db.fetch_one(
        "SELECT username FROM users WHERE username = %s",
        (username,)
    )
    
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Username already exists"}
        )
    
    # Generate a unique user_id
    user_id = f"user{uuid.uuid4().hex[:8]}"
    
    # Insert new user into database
    db.execute_query(
        "INSERT INTO users (user_id, username, password) VALUES (%s, %s, %s)",
        (user_id, username, password)
    )
    
    # Create and return token
    token, expires_at = create_token(username)
    return token, expires_at, user_id

def get_user_id_from_token(token: str) -> Optional[str]:
    """Get user_id from token if token is valid and not expired."""
    token_data = db.fetch_one(
        "SELECT user_id, expires_at FROM tokens WHERE token = %s",
        (token,)
    )
    
    if not token_data:
        return None
    
    # Check if token expired
    if datetime.utcnow() > token_data['expires_at']:
        # Token expired, remove it
        db.execute_query("DELETE FROM tokens WHERE token = %s", (token,))
        return None
    
    return token_data['user_id']

async def get_current_user_id(
    authorization: Optional[str] = Header(None)
) -> str:
    """Dependency to extract and validate token from Authorization header."""
    if authorization is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "UNAUTHORIZED"}
        )
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "UNAUTHORIZED"}
        )
    
    token = authorization.replace("Bearer ", "").strip()
    user_id = get_user_id_from_token(token)
    
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "UNAUTHORIZED"}
        )
    
    return user_id


def cleanup_expired_tokens():
    """Remove expired tokens from database."""
    now = datetime.utcnow()
    db.execute_query("DELETE FROM tokens WHERE expires_at < %s", (now,))
    db.execute_query("DELETE FROM reset_tokens WHERE expires_at < %s", (now,))