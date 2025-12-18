import secrets
import uuid
from datetime import datetime, timedelta
from fastapi import HTTPException, Header, status
from typing import Optional, Tuple
from stores import USERS, TOKENS, RESET_TOKENS

def create_token(username: str) -> Tuple[str, datetime]:
    """Create a new token for the user."""
    token = secrets.token_urlsafe(32)
    expires_at = datetime.utcnow() + timedelta(seconds=3600)
    user_id = USERS[username]["user_id"]
    TOKENS[token] = {
        "user_id": user_id,
        "expires_at": expires_at
    }
    return token, expires_at

def create_reset_token(username: str) -> str:
    """Create a reset token for the user."""
    if username not in USERS:
        return None
    token = secrets.token_urlsafe(16)
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    RESET_TOKENS[token] = {
        "username": username,
        "expires_at": expires_at
    }
    return token

def reset_password(token: str, new_password: str) -> bool:
    """Reset user password using token."""
    if token not in RESET_TOKENS:
        return False
    
    reset_data = RESET_TOKENS[token]
    if reset_data["expires_at"] < datetime.utcnow():
        del RESET_TOKENS[token]
        return False
    
    username = reset_data["username"]
    if username in USERS:
        USERS[username]["password"] = new_password
        del RESET_TOKENS[token]
        return True
    
    return False

def validate_credentials(username: str, password: str) -> bool:
    """Validate username and password against hardcoded users."""
    if username not in USERS:
        return False
    return USERS[username]["password"] == password

def register_user(username: str, password: str) -> Tuple[str, datetime, str]:
    """Register a new user and return token and user_id."""
    # Check if username already exists
    if username in USERS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "Username already exists"}
        )
    
    # Generate a unique user_id
    user_id = f"user{uuid.uuid4().hex[:8]}"
    
    # Add user to USERS dict
    USERS[username] = {
        "password": password,
        "user_id": user_id
    }
    
    # Create and return token and user_id
    token, expires_at = create_token(username)
    return token, expires_at, user_id

def get_user_id_from_token(token: str) -> Optional[str]:
    """Get user_id from token if token is valid and not expired."""
    if token not in TOKENS:
        return None
    
    token_data = TOKENS[token]
    expires_at = token_data["expires_at"]
    
    if datetime.utcnow() > expires_at:
        # Token expired, remove it
        del TOKENS[token]
        return None
    
    return token_data["user_id"]

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

