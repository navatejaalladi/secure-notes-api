from datetime import datetime
from typing import List, Optional
from fastapi import APIRouter, HTTPException, status, Query, Depends
from pydantic import BaseModel, Field, field_validator
from database import db
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
    
    # Build query with pagination
    if page is not None and size is not None:
        offset = (page - 1) * size
        query = """
            SELECT id, title, content, user_id, 
                   DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%SZ') as created_at,
                   DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%SZ') as updated_at
            FROM notes 
            WHERE user_id = %s 
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """
        notes = db.fetch_all(query, (user_id, size, offset))
    else:
        query = """
            SELECT id, title, content, user_id,
                   DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%SZ') as created_at,
                   DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%SZ') as updated_at
            FROM notes 
            WHERE user_id = %s 
            ORDER BY created_at DESC
        """
        notes = db.fetch_all(query, (user_id,))
    
    return notes or []

@router.post("")
async def create_note(
    note_data: NoteCreate,
    user_id: str = Depends(get_current_user_id)
):
    """Create a new note."""
    check_rate_limit(user_id)
    
    try:
        # Insert note into database
        note_id = db.execute_query(
            "INSERT INTO notes (title, content, user_id) VALUES (%s, %s, %s)",
            (note_data.title, note_data.content, user_id)
        )
        
        # Fetch the created note
        note = db.fetch_one(
            """SELECT id, title, content, user_id,
                      DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%SZ') as created_at,
                      DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%SZ') as updated_at
               FROM notes WHERE id = %s""",
            (note_id,)
        )
        
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
    
    # Check if note exists and belongs to user
    note = db.fetch_one(
        "SELECT id, user_id FROM notes WHERE id = %s",
        (note_id,)
    )
    
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
        # Build update query dyndamically
        update_fields = []
        params = []
        
        if note_data.title is not None:
            update_fields.append("title = %s")
            params.append(note_data.title)
        
        if note_data.content is not None:
            update_fields.append("content = %s")
            params.append(note_data.content)
        
        if update_fields:
            params.append(note_id)
            query = f"UPDATE notes SET {', '.join(update_fields)} WHERE id = %s"
            db.execute_query(query, tuple(params))
        
        # Fetch updated note
        updated_note = db.fetch_one(
            """SELECT id, title, content, user_id,
                      DATE_FORMAT(created_at, '%Y-%m-%dT%H:%i:%SZ') as created_at,
                      DATE_FORMAT(updated_at, '%Y-%m-%dT%H:%i:%SZ') as updated_at
               FROM notes WHERE id = %s""",
            (note_id,)
        )
        
        return updated_note
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
    
    # Check if note exists and belongs to user
    note = db.fetch_one(
        "SELECT id, user_id FROM notes WHERE id = %s",
        (note_id,)
    )
    
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
    
    # Delete note
    db.execute_query("DELETE FROM notes WHERE id = %s", (note_id,))
    
    return {"deleted": True}