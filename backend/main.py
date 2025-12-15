from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from auth import create_token, validate_credentials
from notes import router as notes_router
from pydantic import BaseModel

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