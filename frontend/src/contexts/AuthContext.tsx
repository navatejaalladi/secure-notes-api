import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

const TOKEN_KEY = 'notes_app_token'
const USER_ID_KEY = 'notes_app_user_id'

interface AuthContextType {
  token: string | null
  userId: string | null
  login: (token: string, userId: string) => void
  logout: () => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  
  useEffect(() => {
    const storedToken = localStorage.getItem(TOKEN_KEY)
    const storedUserId = localStorage.getItem(USER_ID_KEY)
    
    if (storedToken && storedUserId) {
      setToken(storedToken)
      setUserId(storedUserId)
    }
    setIsInitialized(true)
  }, [])

  const login = (newToken: string, newUserId: string) => {
    localStorage.setItem(TOKEN_KEY, newToken)
    localStorage.setItem(USER_ID_KEY, newUserId)
    setToken(newToken)
    setUserId(newUserId)
  }

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_ID_KEY)
    setToken(null)
    setUserId(null)
  }

  const isAuthenticated = !!(token && userId)

  
  if (!isInitialized) {
    return null
  }

  return (
    <AuthContext.Provider value={{ token, userId, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

