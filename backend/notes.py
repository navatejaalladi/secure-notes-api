from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Query, Depends
from pydantic import BaseModel, Field, field_validator
from stores import NOTES, get_next_note_id
from auth import get_current_user_id
from rate_limit import check_rate_limit, get_rate_limit_status

router = APIRouter(prefix="/notes", tags=["notes"])

class NoteCreate(BaseModel):
    title: str = Field(..., min_length=1)
    content: str = Field(default="")
    
    @field_validator("title")
    @classmethod
    def validate_title(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("title must be non-empty after trimming")
        return v.strip()
    
    @field_validator("content")
    @classmethod
    def validate_content(cls, v: str) -> str:
        if len(v) > 1000:
            raise ValueError("content max length is 1000 characters")
        return v

class NoteUpdate(BaseModel):
    title: Optional[str] = None
    content: Optional[str] = None
    
    @field_validator("title")
    @classmethod
    def validate_title(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            if not v or not v.strip():
                raise ValueError("title must be non-empty after trimming")
            return v.strip()
        return v
    
    @field_validator("content")
    @classmethod
    def validate_content(cls, v: Optional[str]) -> Optional[str]:
        if v is not None and len(v) > 1000:
            raise ValueError("content max length is 1000 characters")
        return v

def find_note_by_id(note_id: int) -> Optional[dict]:
    """Find a note by ID."""
    for note in NOTES:
        if note["id"] == note_id:
            return note
    return None

@router.get("/rate-limit-status")
async def get_rate_limit_status_endpoint(
    user_id: str = Depends(get_current_user_id)
):
    """Get rate limit status (this endpoint is NOT rate limited)."""
    return get_rate_limit_status(user_id)

@router.get("")
async def get_notes(
    page: Optional[int] = Query(None, ge=1),
    size: Optional[int] = Query(None, ge=1),
    user_id: str = Depends(get_current_user_id)
):
    """Get all notes belonging to the logged-in user."""
    check_rate_limit(user_id)
    
    # Filter notes by user_id
    user_notes = [note for note in NOTES if note["user_id"] == user_id]
    
    # Apply pagination if provided
    if page is not None and size is not None:
        start = (page - 1) * size
        end = start + size
        user_notes = user_notes[start:end]
    
    return user_notes

@router.post("")
async def create_note(
    note_data: NoteCreate,
    user_id: str = Depends(get_current_user_id)
):
    """Create a new note."""
    check_rate_limit(user_id)
    
    try:
        note = {
            "id": get_next_note_id(),
            "title": note_data.title,
            "content": note_data.content,
            "user_id": user_id,
            "created_at": datetime.utcnow().isoformat() + "Z",
            "updated_at": datetime.utcnow().isoformat() + "Z"
        }
        NOTES.append(note)
        return note
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "VALIDATION_ERROR", "details": str(e)}
        )

@router.patch("/{note_id}")
async def update_note(
    note_id: int,
    note_data: NoteUpdate,
    user_id: str = Depends(get_current_user_id)
):
    """Update an existing note."""
    check_rate_limit(user_id)
    
    note = find_note_by_id(note_id)
    
    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "NOT_FOUND"}
        )
    
    if note["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "FORBIDDEN"}
        )
    
    try:
        # Update fields if provided
        if note_data.title is not None:
            note["title"] = note_data.title
        if note_data.content is not None:
            note["content"] = note_data.content
        
        note["updated_at"] = datetime.utcnow().isoformat() + "Z"
        
        return note
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"error": "VALIDATION_ERROR", "details": str(e)}
        )

@router.delete("/{note_id}")
async def delete_note(
    note_id: int,
    user_id: str = Depends(get_current_user_id)
):
    """Delete a note."""
    check_rate_limit(user_id)
    
    note = find_note_by_id(note_id)
    
    if note is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "NOT_FOUND"}
        )
    
    if note["user_id"] != user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"error": "FORBIDDEN"}
        )
    
    NOTES.remove(note)
    return {"deleted": True}

