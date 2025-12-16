const API_BASE_URL = 'http://localhost:8000'

export interface ApiError {
  error: string
  details?: string
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('notes_app_token')
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  })

  const data = await response.json()

  if (!response.ok) {
    if (response.status === 401) {
      // Unauthorized - clear token and redirect
      localStorage.removeItem('notes_app_token')
      localStorage.removeItem('notes_app_user_id')
      window.location.href = '/login'
      throw new Error('UNAUTHORIZED')
    }
    throw new Error(data.error || 'Request failed')
  }

  return data
}

export interface TokenResponse {
  token: string
  expires_in: number
}

export interface Note {
  id: number
  title: string
  content: string
  user_id: string
  created_at: string
  updated_at: string
}

export interface RateLimitStatus {
  remaining: number
  limit: number
  reset_in_seconds: number
}

export const authApi = {
  login: async (username: string, password: string): Promise<TokenResponse> => {
    const response = await fetch(`${API_BASE_URL}/auth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.error || 'Login failed')
    }

    return data
  },
}

export const notesApi = {
  getAll: async (page?: number, size?: number): Promise<Note[]> => {
    const params = new URLSearchParams()
    if (page) params.append('page', page.toString())
    if (size) params.append('size', size.toString())
    const query = params.toString() ? `?${params.toString()}` : ''
    return apiRequest<Note[]>(`/notes${query}`)
  },

  create: async (title: string, content: string): Promise<Note> => {
    return apiRequest<Note>('/notes', {
      method: 'POST',
      body: JSON.stringify({ title, content }),
    })
  },

  update: async (id: number, title?: string, content?: string): Promise<Note> => {
    const body: any = {}
    if (title !== undefined) body.title = title
    if (content !== undefined) body.content = content
    return apiRequest<Note>(`/notes/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    })
  },

  delete: async (id: number): Promise<{ deleted: boolean }> => {
    return apiRequest<{ deleted: boolean }>(`/notes/${id}`, {
      method: 'DELETE',
    })
  },

  getRateLimitStatus: async (): Promise<RateLimitStatus> => {
    return apiRequest<RateLimitStatus>('/notes/rate-limit-status')
  },
}



