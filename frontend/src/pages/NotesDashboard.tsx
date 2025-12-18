import { useState, useEffect, useRef, useCallback } from 'react'
// import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { notesApi, Note } from '../api/client'

export default function NotesDashboard() {
  const {  userId, logout } = useAuth()
  // const navigate = useNavigate()
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [rateLimitError, setRateLimitError] = useState('')
  const [rateLimitCountdown, setRateLimitCountdown] = useState<number | null>(null)
  const countdownIntervalRef = useRef<number | null>(null)
  
  
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newContent, setNewContent] = useState('')
  const [creating, setCreating] = useState(false)
  

  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [updating, setUpdating] = useState(false)
  
 
  const [page, setPage] = useState(1)
  const [size, setSize] = useState(10)
  const [activeTab, setActiveTab] = useState<'general' | 'notes' | 'rate-limiting'>('general')

  useEffect(() => {
    
    loadNotes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, size])

  
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

  
  useEffect(() => {
    if (rateLimitCountdown !== null && rateLimitCountdown > 0) {
      countdownIntervalRef.current = setInterval(() => {
        setRateLimitCountdown((prev) => {
          if (prev === null || prev <= 1) {
            if (countdownIntervalRef.current) {
              clearInterval(countdownIntervalRef.current)
            }
            
            checkRateLimitStatus()
            return null
          }
          return prev - 1
        })
      }, 1000)
    } else if (rateLimitCountdown === 0) {
      
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
      setRateLimitError('') 
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
   
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString()
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="h-14 bg-gray-900 flex items-center justify-between px-6">
        <div className="flex items-center gap-2 text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-base font-semibold">Secure Notes</span>
            </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-300">{userId}</span>
            <button
              onClick={handleLogout}
            className="text-sm text-white hover:text-gray-300"
            >
              Logout
            </button>
        </div>
      </header>

      <div className="flex-1 flex">
        {/* Sidebar */}
        <aside className="hidden md:flex w-64 flex-col bg-blue-600">
          <nav className="flex-1 px-2 py-4 space-y-1 text-sm">
            <button 
              onClick={() => setActiveTab('general')}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 font-medium transition-colors ${
                activeTab === 'general' ? 'bg-blue-700 text-white' : 'text-blue-100 hover:bg-blue-700 hover:text-white'
              }`}
            >
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-semibold ${
                activeTab === 'general' ? 'bg-white text-blue-600' : 'border border-blue-400 text-blue-200'
              }`}>
                G
              </span>
              <span>General</span>
            </button>
            <button 
              onClick={() => setActiveTab('notes')}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 font-medium transition-colors ${
                activeTab === 'notes' ? 'bg-blue-700 text-white' : 'text-blue-100 hover:bg-blue-700 hover:text-white'
              }`}
            >
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-semibold ${
                activeTab === 'notes' ? 'bg-white text-blue-600' : 'border border-blue-400 text-blue-200'
              }`}>
                N
              </span>
              <span>Notes</span>
            </button>
            <button 
              onClick={() => setActiveTab('rate-limiting')}
              className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 font-medium transition-colors ${
                activeTab === 'rate-limiting' ? 'bg-blue-700 text-white' : 'text-blue-100 hover:bg-blue-700 hover:text-white'
              }`}
            >
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded text-[11px] font-semibold ${
                activeTab === 'rate-limiting' ? 'bg-white text-blue-600' : 'border border-blue-400 text-blue-200'
              }`}>
                R
              </span>
              <span>Rate limiting</span>
            </button>
          </nav>
          {/* <div className="px-4 py-4 border-t border-blue-500 text-xs text-blue-200">
            Secured by Secure Notes
          </div> */}
        </aside>

        {/* Main column */}
        <div className="flex-1 flex flex-col">

        {/* Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 px-6 py-6">
          <div className="h-full rounded-2xl border border-gray-200 bg-white shadow-sm">
            {/* Card header */}
            <div className="border-b border-gray-200 px-8 py-6 bg-gradient-to-r from-blue-50 to-white">
              <h1 className="text-2xl font-bold text-gray-900">
                {activeTab === 'general' && 'General settings'}
                {activeTab === 'notes' && 'My Notes'}
                {activeTab === 'rate-limiting' && 'Rate Limiting'}
              </h1>
              <p className="mt-2 text-base text-gray-600">
                {activeTab === 'general' && 'Manage your notes workspace, pagination and rate limiting.'}
                {activeTab === 'notes' && 'View, create, edit and delete your secure notes.'}
                {activeTab === 'rate-limiting' && 'Test and monitor the API rate limiting features.'}
              </p>
            </div>

            <div className="grid gap-0 md:grid-cols-[280px,1fr]">
              {/* Left column inside card */}
              <div className="border-b border-gray-200 px-8 py-8 md:border-b-0 md:border-r">
                <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                  Overview
                </p>
                <dl className="mt-6 space-y-4 text-base text-gray-600">
                  <div className="flex justify-between">
                    <dt>Total notes</dt>
                    <dd className="font-semibold text-gray-900">{notes.length}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Current page</dt>
                    <dd className="font-semibold text-gray-900">{page}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Page size</dt>
                    <dd className="font-semibold text-gray-900">{size}</dd>
                  </div>
                </dl>
              </div>

             
              <div className="px-8 py-8 space-y-6">
                {/* Global Errors */}
                {error && (
                  <div className="rounded-lg border border-red-300 bg-red-50 px-5 py-4 text-base text-red-700 flex items-center gap-3">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{error}</span>
                  </div>
                )}

                {/* General Tab Content */}
                {activeTab === 'general' && (
                  <div className="space-y-6">
                    <div className="rounded-lg border border-blue-100 bg-blue-50/50 p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Welcome to Secure Notes</h3>
                      <p className="text-gray-600 mb-4">
                        This is your secure workspace for managing private notes. Use the sidebar to navigate between your notes and system settings.
                      </p>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <button 
                          onClick={() => setActiveTab('notes')}
                          className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm transition-all text-left"
                        >
                          <div>
                            <p className="font-semibold text-gray-900">Manage Notes</p>
                            <p className="text-sm text-gray-500">Create and edit notes</p>
                          </div>
                          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                        <button 
                          onClick={() => setActiveTab('rate-limiting')}
                          className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-4 hover:border-blue-300 hover:shadow-sm transition-all text-left"
                        >
                          <div>
                            <p className="font-semibold text-gray-900">Rate Limiting</p>
                            <p className="text-sm text-gray-500">Check API limits</p>
                          </div>
                          <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Rate Limiting Tab Content */}
                {(activeTab === 'rate-limiting' || activeTab === 'general') && rateLimitError && (
                  <div className="rounded-lg border border-yellow-300 bg-yellow-50 px-5 py-4 text-base text-yellow-800 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                      </svg>
                      <span>{rateLimitError}</span>
                    </div>
                    {rateLimitCountdown !== null && rateLimitCountdown > 0 && (
                      <span className="ml-4 rounded-full bg-yellow-100 px-4 py-1.5 text-sm font-semibold">
                        Retry in {rateLimitCountdown}s
                      </span>
                    )}
                    {rateLimitCountdown === 0 && (
                      <button
                        onClick={() => {
                          setRateLimitError('');
                          setRateLimitCountdown(null);
                          loadNotes();
                        }}
                        className="ml-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 transition-colors"
                      >
                        Retry now
                      </button>
                    )}
                  </div>
                )}

                {activeTab === 'rate-limiting' && (
                  <div className="space-y-6">
                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-6 py-5">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Rate Limiting </h3>
                      <p className="text-sm text-gray-600 mb-4">
                        Click the button below to send 11 simultaneous requests to the API. This will trigger the rate limit (10 requests per minute).
                      </p>
                      <button
                        onClick={handleRateLimitTest}
                        className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 transition-colors uppercase"
                      >
                        <span className="h-2 w-2 rounded-full bg-white" />
                        <span>Trigger rate limit</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Notes Tab Content */}
                {activeTab === 'notes' && (
                  <div className="space-y-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="inline-flex items-center gap-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-gray-700">
                        <label className="flex items-center gap-2">
                          <span className="font-medium">Page</span>
                          <input
                            type="number"
                            min="1"
                            value={page}
                            onChange={(e) =>
                              setPage(parseInt(e.target.value) || 1)
                            }
                            className="w-20 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />
                        </label>
                        <span className="h-6 w-px bg-blue-200" />
                        <label className="flex items-center gap-2">
                          <span className="font-medium">Size</span>
                          <input
                            type="number"
                            min="1"
                            value={size}
                            onChange={(e) =>
                              setSize(parseInt(e.target.value) || 10)
                            }
                            className="w-20 rounded-lg border border-blue-300 bg-white px-3 py-1.5 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="rounded-lg border border-blue-200 bg-blue-50 px-6 py-5">
                      {!showCreateForm ? (
                        <button
                          onClick={() => setShowCreateForm(true)}
                          className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-2"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Create a new note
                        </button>
                      ) : (
                        <form onSubmit={handleCreate} className="space-y-4">
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                              Title
                            </label>
                            <input
                              type="text"
                              value={newTitle}
                              onChange={(e) => setNewTitle(e.target.value)}
                              required
                              className="w-full rounded-lg border border-blue-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                              placeholder="Note title"
                            />
                          </div>
                          <div>
                            <label className="mb-2 block text-sm font-semibold text-gray-700">
                              Content
                            </label>
                            <textarea
                              value={newContent}
                              onChange={(e) => setNewContent(e.target.value)}
                              rows={5}
                              maxLength={1000}
                              className="w-full resize-none rounded-lg border border-blue-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                              placeholder="Optional description (max 1000 characters)"
                            />
                            <p className="mt-2 text-xs text-gray-500">
                              {newContent.length}/1000 characters
                            </p>
                          </div>
                          <div className="flex gap-3 pt-2">
                            <button
                              type="submit"
                              disabled={creating}
                              className="inline-flex flex-1 items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white uppercase hover:bg-blue-700 disabled:opacity-60 transition-colors"
                            >
                              {creating ? 'Saving…' : 'Save note'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setShowCreateForm(false);
                                setNewTitle('');
                                setNewContent('');
                              }}
                              className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </form>
                      )}
                    </div>

                    <div className="rounded-lg border border-gray-200 bg-white">
                      {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 text-base text-gray-500">
                          <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
                          <span>Loading notes…</span>
                        </div>
                      ) : notes.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-base text-gray-500">
                          <p>No notes yet. Create your first note above.</p>
                        </div>
                      ) : (
                        <ul className="divide-y divide-gray-200">
                          {notes.map((note) => (
                            <li key={note.id} className="px-6 py-4">
                              {editingId === note.id ? (
                                <div className="space-y-3">
                                  <input
                                    type="text"
                                    title="input"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="w-full rounded-lg border border-blue-300 bg-white px-4 py-2.5 text-sm font-semibold text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                  />
                                  <textarea
                                    title="Content"
                                    value={editContent}
                                    onChange={(e) => setEditContent(e.target.value)}
                                    rows={5}
                                    maxLength={1000}
                                    className="w-full resize-none rounded-lg border border-blue-300 bg-white px-4 py-2.5 text-sm text-gray-900 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                  />
                                  <p className="text-xs text-gray-500">
                                    {editContent.length}/1000 characters
                                  </p>
                                  <div className="flex gap-3 pt-2">
                                    <button
                                      onClick={() => handleUpdate(note.id)}
                                      disabled={updating}
                                      className="inline-flex flex-1 items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white uppercase hover:bg-blue-700 disabled:opacity-60 transition-colors"
                                    >
                                      {updating ? 'Saving…' : 'Save'}
                                    </button>
                                    <button
                                      onClick={() => setEditingId(null)}
                                      className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between gap-6">
                                  <div className="min-w-0 flex-1">
                                    <p className="truncate text-xs font-medium uppercase tracking-wide text-gray-400 mb-1">
                                      Note #{note.id}
                                    </p>
                                    <h3 className="mt-1 text-base font-bold text-gray-900">
                                      {note.title}
                                    </h3>
                                    <p className="mt-2 line-clamp-3 text-sm text-gray-600">
                                      {note.content || (
                                        <span className="italic text-gray-400">
                                          No content
                                        </span>
                                      )}
                                    </p>
                                    <p className="mt-2 text-xs text-gray-400">
                                      {formatDate(note.updated_at)}
                                    </p>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <button
                                      onClick={() => handleEdit(note)}
                                      className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-xs font-semibold text-blue-600 hover:bg-blue-100 transition-colors"
                                    >
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleDelete(note.id)}
                                      className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                </div>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  </div>
)
}



