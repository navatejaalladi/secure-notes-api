from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from auth import create_token, validate_credentials, register_user, create_reset_token, reset_password
from notes import router as notes_router
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="Notes API", version="1.0.0")

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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

@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok"}

@app.post("/auth/token", response_model=TokenResponse)
async def get_token(request: TokenRequest):
    """Authenticate user and return token."""
    if not validate_credentials(request.username, request.password):
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail={"error": "UNAUTHORIZED"}
        )
    
    token, expires_at = create_token(request.username)
    return TokenResponse(token=token, expires_in=3600)

@app.post("/auth/signup", response_model=TokenResponse)
async def signup(request: TokenRequest):
    """Register a new user and return token."""
    token, expires_at, user_id = register_user(request.username, request.password)
    return TokenResponse(token=token, expires_in=3600, user_id=user_id)

@app.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Generate a reset token for a user."""
    token = create_reset_token(request.username)
    if not token:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "USER_NOT_FOUND"}
        )
    # In a real app, you'd send an email. For demo, we return the token.
    return {"message": "Reset token generated", "token": token}

@app.post("/auth/reset-password")
async def reset_password_endpoint(request: ResetPasswordRequest):
    """Reset user password using token."""
    if not reset_password(request.token, request.new_password):
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "INVALID_OR_EXPIRED_TOKEN"}
        )
    return {"message": "Password updated successfully"}



