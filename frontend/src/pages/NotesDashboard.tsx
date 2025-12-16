import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { notesApi, Note } from '../api/client'

export default function NotesDashboard() {
  const { token, userId, logout } = useAuth()
  const navigate = useNavigate()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rateLimitError, setRateLimitError] = useState('')
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(null)
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null)
  
  // Create note form state
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [creating, setCreating] = useState(false)
  
  // Edit state
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [updating, setUpdating] = useState(false)
  
  // Pagination
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)

  useEffect(() => {
    // ProtectedRoute ensures we're authenticated, so we can safely load notes
    loadNotes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size])

  // Check rate limit status and start countdown
  const checkRateLimitStatus = useCallback(async () => {
    try {
      const status = await notesApi.getRateLimitStatus()
      if (status.remaining === 0 && status.reset_in_seconds > 0) {
        setRateLimitCountdown(status.reset_in_seconds)
        setRateLimitError(`Rate limit exceeded! Please wait ${status.reset_in_seconds} seconds.`)
      } else if (status.remaining > 0) {
        setRateLimitCountdown(null)
        setRateLimitError('')
      }
    } catch (err) {
      // Ignore errors when checking status
    }
  }, [])

  // Countdown timer effect
  useEffect(() => {
    if (rateLimitCountdown !== null && rateLimitCountdown > 0) {
      countdownIntervalRef.current = setInterval(() => {
        setRateLimitCountdown((prev) => {
          if (prev === null || prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current)
            }
            // Auto-retry when countdown reaches 0
            checkRateLimitStatus()
            return null
          }
          return prev - 1
        })
      }, 1000)
    } else if (rateLimitCountdown === 0) {
      // Countdown finished, check status and clear error
      checkRateLimitStatus()
    }

    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current)
      }
    }
  }, [rateLimitCountdown, checkRateLimitStatus])

  const handleRateLimitError = async (err: any) => {
    if (err.message === 'RATE_LIMIT_EXCEEDED') {
      await checkRateLimitStatus()
    } else {
      setError(err.message || 'Request failed')
    }
  }

  const loadNotes = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await notesApi.getAll(page, size)
      setNotes(data)
      setRateLimitError('') // Clear rate limit error on success
      setRateLimitCountdown(null)
    } catch (err: any) {
      await handleRateLimitError(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) {
      setError('Title is required')
      return
    }
    if (newContent.length > 1000) {
      setError('Content must be 1000 characters or less')
      return
    }

    setCreating(true)
    setError('')
    try {
      const newNote = await notesApi.create(newTitle.trim(), newContent)
      setNotes([newNote, ...notes])
      setNewTitle('')
      setNewContent('')
      setShowCreateForm(false)
    } catch (err: any) {
      await handleRateLimitError(err)
    } finally {
      setCreating(false)
    }
  }

  const handleEdit = (note: Note) => {
    setEditingId(note.id)
    setEditTitle(note.title)
    setEditContent(note.content)
  }

  const handleUpdate = async (id: number) => {
    if (editTitle.trim() && editContent.length <= 1000) {
      setUpdating(true)
      setError('')
      try {
        const updated = await notesApi.update(id, editTitle.trim(), editContent)
        setNotes(notes.map(n => n.id === id ? updated : n))
        setEditingId(null)
      } catch (err: any) {
        await handleRateLimitError(err)
      } finally {
        setUpdating(false)
      }
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this note?')) return

    try {
      await notesApi.delete(id)
      setNotes(notes.filter(n => n.id !== id))
    } catch (err: any) {
      await handleRateLimitError(err)
    }
  }

  const handleRateLimitTest = async () => {
    setRateLimitError('')
    setError('')
    try {
      // Fire 11 quick requests
      const promises = Array.from({ length: 11 }, () => notesApi.getAll())
      await Promise.all(promises)
    } catch (err: any) {
      await handleRateLimitError(err)
      if (err.message === 'RATE_LIMIT_EXCEEDED') {
        setRateLimitError('Rate limit exceeded! (This is expected after 10 requests)')
      }
    }
  }

  const handleLogout = () => {
    logout()
    // ProtectedRoute will automatically redirect to /login when isAuthenticated becomes false
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notes App</h1>
              <p className="text-sm text-gray-600">Logged in as: {userId}</p>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Error Messages */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}
        {rateLimitError && (
          <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg font-semibold">
            <div className="flex items-center justify-between">
              <span>⚠️ {rateLimitError}</span>
              {rateLimitCountdown !== null && rateLimitCountdown > 0 && (
                <span className="text-lg font-bold">
                  Retry in: {rateLimitCountdown}s
                </span>
              )}
              {rateLimitCountdown === 0 && (
                <button
                  onClick={() => {
                    setRateLimitError('')
                    setRateLimitCountdown(null)
                    loadNotes()
                  }}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                >
                  Retry Now
                </button>
              )}
            </div>
          </div>
        )}

        {/* Create Note Form */}
        <div className="mb-6">
          {!showCreateForm ? (
            <button
              onClick={() => setShowCreateForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              + Create New Note
            </button>
          ) : (
            <div className="bg-white p-6 rounded-lg shadow-md border">
              <h2 className="text-xl font-semibold mb-4">Create New Note</h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title *
                  </label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    required
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter note title"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Content
                  </label>
                  <textarea
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    rows={4}
                    maxLength={1000}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter note content (max 1000 characters)"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    {newContent.length}/1000 characters
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Create Note'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateForm(false)
                      setNewTitle('')
                      setNewContent('')
                    }}
                    className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Rate Limit Test Button */}
        <div className="mb-6">
          <button
            onClick={handleRateLimitTest}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
          >
            Trigger Rate Limit (11 requests)
          </button>
        </div>

        {/* Pagination Controls */}
        <div className="mb-4 flex items-center gap-4">
          <label className="text-sm font-medium text-gray-700">
            Page:
            <input
              type="number"
              min="1"
              value={page}
              onChange={(e) => setPage(parseInt(e.target.value) || 1)}
              className="ml-2 w-20 px-2 py-1 border border-gray-300 rounded"
            />
          </label>
          <label className="text-sm font-medium text-gray-700">
            Size:
            <input
              type="number"
              min="1"
              value={size}
              onChange={(e) => setSize(parseInt(e.target.value) || 10)}
              className="ml-2 w-20 px-2 py-1 border border-gray-300 rounded"
            />
          </label>
        </div>

        {/* Notes List */}
        {loading ? (
          <div className="text-center py-8">
            <p className="text-gray-600">Loading notes...</p>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No notes found. Create your first note!</p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {notes.map((note) => (
              <div key={note.id} className="bg-white p-6 rounded-lg shadow-md border">
                {editingId === note.id ? (
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      rows={4}
                      maxLength={1000}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                    <p className="text-xs text-gray-500">{editContent.length}/1000</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleUpdate(note.id)}
                        disabled={updating}
                        className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 text-sm"
                      >
                        {updating ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="text-xl font-semibold mb-2 text-gray-900">
                      {note.title}
                    </h3>
                    <p className="text-gray-700 mb-4 whitespace-pre-wrap">
                      {note.content || <span className="text-gray-400 italic">No content</span>}
                    </p>
                    <div className="text-xs text-gray-500 mb-4 space-y-1">
                      <p>Created: {formatDate(note.created_at)}</p>
                      <p>Updated: {formatDate(note.updated_at)}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(note)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(note.id)}
                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}



