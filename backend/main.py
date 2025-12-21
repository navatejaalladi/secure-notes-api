from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from auth import create_token, validate_credentials, register_user, create_reset_token, reset_password, cleanup_expired_tokens
from notes import router as notes_router
from pydantic import BaseModel
from typing import Optional
from contextlib import asynccontextmanager
from database import db
import atexit

@asynccontextmanager
async def lifespan(app: FastAPI):
    # nitialize database connection
    print("Starting up application...")
    print("Database connection established")
    
    
    try:
        cleanup_expired_tokens()
        print("Cleaned up expired tokens")
    except Exception as e:
        print(f"Error cleaning up tokens: {e}")
    
    yield
    
    # Close database connection
    print("Shutting down application...")
    db.close()

app = FastAPI(
    title="Notes API", 
    version="1.0.0",
    lifespan=lifespan
)

atexit.register(db.close)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(notes_router)

class TokenRequest(BaseModel):
    username: str
    password: str

class TokenResponse(BaseModel):
    token: str
    expires_in: int
    user_id: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    username: str

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class MessageResponse(BaseModel):
    message: str
    token: Optional[str] = None

@app.get("/health")
async def health():
    """Health check endpoint."""
    try:
        # Test database connection
        test_query = db.fetch_one("SELECT 1 as test")
        if test_query:
            return {
                "status": "ok",
                "database": "connected"
            }
    except Exception as e:
        return {
            "status": "degraded",
            "database": "disconnected",
            "error": str(e)
        }

@app.post("/auth/token", response_model=TokenResponse)
async def get_token(request: TokenRequest):
    """Authenticate user and return token."""
    if not validate_credentials(request.username, request.password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "UNAUTHORIZED"}
        )
    
    try:
        token, expires_at = create_token(request.username)
        return TokenResponse(token=token, expires_in=3600)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "TOKEN_CREATION_FAILED", "message": str(e)}
        )

@app.post("/auth/signup", response_model=TokenResponse)
async def signup(request: TokenRequest):
    """Register a new user and return token."""
    try:
        token, expires_at, user_id = register_user(request.username, request.password)
        return TokenResponse(token=token, expires_in=3600, user_id=user_id)
    except HTTPException:
        # Re-raise HTTPException as-is
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "SIGNUP_FAILED", "message": str(e)}
        )

@app.post("/auth/forgot-password", response_model=MessageResponse)
async def forgot_password(request: ForgotPasswordRequest):
    """Generate a reset token for a user."""
    try:
        token = create_reset_token(request.username)
        if not token:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail={"error": "USER_NOT_FOUND"}
            )
      
        return MessageResponse(
            message="Reset token generated. Check your email.",
            token=token  
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "RESET_TOKEN_FAILED", "message": str(e)}
        )

@app.post("/auth/reset-password", response_model=MessageResponse)
async def reset_password_endpoint(request: ResetPasswordRequest):
    """Reset user password using token."""
    try:
        if not reset_password(request.token, request.new_password):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={"error": "INVALID_OR_EXPIRED_TOKEN"}
            )
        return MessageResponse(message="Password updated successfully")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "PASSWORD_RESET_FAILED", "message": str(e)}
        )


@app.post("/admin/cleanup-tokens")
async def cleanup_tokens_endpoint():
    """Manually trigger cleanup of expired tokens (admin only)."""
    try:
        cleanup_expired_tokens()
        return {"message": "Expired tokens cleaned up successfully"}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "CLEANUP_FAILED", "message": str(e)}
        )


@app.get("/admin/stats")
async def get_stats():
    """Get database statistics (admin only)."""
    try:
        users_count = db.fetch_one("SELECT COUNT(*) as count FROM users")
        notes_count = db.fetch_one("SELECT COUNT(*) as count FROM notes")
        tokens_count = db.fetch_one("SELECT COUNT(*) as count FROM tokens")
        
        return {
            "users": users_count['count'] if users_count else 0,
            "notes": notes_count['count'] if notes_count else 0,
            "active_tokens": tokens_count['count'] if tokens_count else 0
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"error": "STATS_FETCH_FAILED", "message": str(e)}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)