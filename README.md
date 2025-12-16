# Notes Rate-Limited App

A full-stack notes application with token-based authentication and rate limiting.

## Project Structure

```
notes-rate-limited-app/
├── backend/          # FastAPI backend
├── frontend/         # React + Vite + Tailwind frontend
└── README.md
```

## Features

- **Token-based Authentication**: Secure token generation and validation
- **Rate Limiting**: 10 requests per minute per user for `/notes/*` endpoints
- **CRUD Operations**: Create, Read, Update, Delete notes
- **Pagination**: Optional pagination for notes list
- **Modern UI**: Professional React interface with Tailwind CSS

## Prerequisites

- Python 3.8+ (for backend)
- Node.js 18+ and npm (for frontend)

## Backend Setup

1. Navigate to the backend directory:
   ```bash
   cd backend
   ```

2. (Recommended) Create and activate a virtual environment:
   ```bash
   # Windows
   python -m venv venv
   venv\Scripts\activate

   # macOS/Linux
   python3 -m venv venv
   source venv/bin/activate
   ```
   > **Note**: Virtual environment is optional but recommended to avoid conflicts with system packages.

3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Run the server:
   ```bash
   uvicorn main:app --reload --port 8000
   ```

The backend will be available at `http://localhost:8000`

## Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the development server:
   ```bash
   npm run dev
   ```

The frontend will be available at `http://localhost:5173`

## Demo Credentials

The application includes two hardcoded users for testing:

- **Username**: `john` / **Password**: `password123` (user_id: `user123`)
- **Username**: `jane` / **Password**: `password456` (user_id: `user456`)

## API Endpoints

### Authentication

- `POST /auth/token` - Get authentication token
  - Request: `{ "username": "john", "password": "password123" }`
  - Response: `{ "token": "abc123", "expires_in": 3600 }`

### Notes (Requires Authentication)

- `GET /notes?page=1&size=10` - Get all notes (with optional pagination)
- `POST /notes` - Create a new note
  - Request: `{ "title": "New Note", "content": "Hello world" }`
- `PATCH /notes/{id}` - Update a note
  - Request: `{ "title": "Updated Title", "content": "Updated content" }`
- `DELETE /notes/{id}` - Delete a note

### Health Check

- `GET /health` - Returns `{ "status": "ok" }`

## Rate Limiting

- **Limit**: 10 requests per minute per user
- **Scope**: All `/notes/*` endpoints
- **Window**: Rolling 60-second window
- **Response**: HTTP 429 with `{ "error": "RATE_LIMIT_EXCEEDED" }`

## Demo Steps for Screen Recording

1. **Start Backend**:
   ```bash
   cd backend
   # (Optional) Activate virtual environment if you created one
   # Windows: venv\Scripts\activate
   # macOS/Linux: source venv/bin/activate
   uvicorn main:app --reload --port 8000
   ```

2. **Start Frontend** (in a new terminal):
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Login**:
   - Open `http://localhost:5173`
   - Enter username: `john`
   - Enter password: `password123`
   - Click "Get Token / Login"

4. **Create Note**:
   - Click "+ Create New Note"
   - Enter title: "Meeting Notes"
   - Enter content: "Discussion about Q4 planning"
   - Click "Create Note"

5. **Edit Note**:
   - Click "Edit" on any note
   - Modify title or content
   - Click "Save"

6. **Delete Note**:
   - Click "Delete" on any note
   - Confirm deletion

7. **Test Rate Limiting**:
   - Click "Trigger Rate Limit (11 requests)" button
   - Observe the rate limit error message after 10 requests

8. **Test Pagination**:
   - Create multiple notes
   - Adjust page and size parameters
   - Verify pagination works correctly

## Error Handling

The application handles the following error scenarios:

- **401 UNAUTHORIZED**: Invalid or missing token
- **403 FORBIDDEN**: Attempting to modify another user's note
- **404 NOT_FOUND**: Note ID doesn't exist
- **429 RATE_LIMIT_EXCEEDED**: Too many requests in a minute
- **400 VALIDATION_ERROR**: Invalid input data

## Technical Details

### Backend

- **Framework**: FastAPI
- **Storage**: In-memory (no database)
- **Authentication**: Bearer token in Authorization header
- **Rate Limiting**: Rolling window per user
- **Validation**: Pydantic models

### Frontend

- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS
- **Routing**: React Router
- **State Management**: React hooks + localStorage

## Notes

- All data is stored in-memory and will be lost on server restart
- Tokens expire after 3600 seconds (1 hour)
- Rate limiting uses a rolling 60-second window
- Each user can only see and modify their own notes



