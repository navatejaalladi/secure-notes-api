from datetime import datetime, timedelta
from typing import Dict, List, Optional

# Hardcoded users for fake authentication
USERS: Dict[str, Dict[str, str]] = {
    "john": {"password": "password123", "user_id": "user123"},
    "jane": {"password": "password456", "user_id": "user456"}
}

# Token store: token_string -> {user_id, expires_at}
TOKENS: Dict[str, Dict[str, any]] = {}

# Notes store: list of note dictionaries
NOTES: List[Dict] = []

# Rate counter: user_id -> list of request timestamps
rate_counter: Dict[str, List[datetime]] = {}

# Counter for generating unique note IDs
note_id_counter: int = 0

def get_next_note_id() -> int:
    """Generate the next unique note ID."""
    global note_id_counter
    note_id_counter += 1
    return note_id_counter

