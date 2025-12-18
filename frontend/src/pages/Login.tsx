import { useState } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { authApi } from '../api/client'

export default function Login() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isSignup, setIsSignup] = useState(false)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [resetToken, setResetToken] = useState('')
  const [resetSuccess, setResetSuccess] = useState('')
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setResetSuccess('')
    setLoading(true)

    try {
      if (isForgotPassword) {
        if (!resetToken) {
          // Phase 1: Request reset token
          const response = await authApi.forgotPassword(username)
          // For demo purposes, we show the token to the user
          setResetToken(response.token)
          setResetSuccess('Reset token generated! Please enter your new password below.')
        } else {
          // Phase 2: Reset password
          await authApi.resetPassword(resetToken, password)
          setResetSuccess('Password reset successfully! You can now sign in.')
          setIsForgotPassword(false)
          setResetToken('')
          setPassword('')
        }
      } else if (isSignup) {
        // Handle signup
        const response = await authApi.signup(username, password)
        // Backend returns user_id in signup response
        const userId = response.user_id || `user${Date.now().toString().slice(-8)}`
        login(response.token, userId)
      } else {
        // Handle login
        const response = await authApi.login(username, password)
        // Extract user_id from username (matching backend logic)
        const userId = username === 'john' ? 'user123' : username === 'jane' ? 'user456' : 'unknown'
        
        // Login will update context, and PublicRoute will handle redirect
        login(response.token, userId)
      }
    } catch (err: any) {
      setError(err.message || (isForgotPassword ? 'Reset failed' : isSignup ? 'Signup failed' : 'Login failed'))
    } finally {
      setLoading(false)
    }
  }

  const handleSignupClick = () => {
    setIsSignup(true)
    setIsForgotPassword(false)
    setError('')
    setResetSuccess('')
    setUsername('')
    setPassword('')
  }

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Dark Header Bar */}
      {/* <header className="h-14 bg-gray-900 flex items-center justify-between px-6"> */}
        {/* <div className="flex items-center gap-2 text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-base font-semibold">Secure Notes</span>
        </div>
        <a href="#" className="text-sm text-white hover:text-gray-300">Home</a>
      </header> */}

      {/* Split Screen Container */}
      <div className="flex-1 flex relative overflow-hidden">
        {/* Left Side - Blue Background (Sign Up) */}
        <div className="hidden lg:flex flex-1 bg-blue-600 items-center justify-center relative">
          {/* S-curve divider using SVG */}
          <svg
            className="absolute right-0 top-0 bottom-0 w-32 h-full z-10"
            viewBox="0 0 128 100"
            preserveAspectRatio="none"
          >
            <path
              d="M0,0 Q64,20 64,50 T128,100 L128,0 Z"
              fill="white"
            />
          </svg>
          
          <div className="text-center text-white px-8 z-0">
            <h2 className="text-4xl font-bold mb-4">New here ?</h2>
            <p className="text-xl mb-8 text-blue-100">Then Sign Up and Start Creating Notes!</p>
            <button
              type="button"
              onClick={handleSignupClick}
              className="px-8 py-3 border-2 border-white rounded-lg text-white font-semibold uppercase hover:bg-white hover:text-blue-600 transition-colors"
            >
              SIGN UP
            </button>
          </div>
        </div>

        {/* Right Side - White Background (Sign In) */}
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">
            <h1 className="text-3xl font-bold text-gray-900 mb-8">
              {isForgotPassword ? 'Reset password' : isSignup ? 'Sign up' : 'Sign in'}
            </h1>
            
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email Field */}
              <div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    disabled={isForgotPassword && !!resetToken}
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent disabled:opacity-50"
                    placeholder="Email"
                  />
                </div>
              </div>

              {/* Password Field - Hide during initial forgot password phase */}
              {(!isForgotPassword || (isForgotPassword && !!resetToken)) && (
                <div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                    </div>
                    <input
                      id="password"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
                      placeholder={isForgotPassword ? "New Password" : "Password"}
                    />
                  </div>
                </div>
              )}

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {resetSuccess && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  {resetSuccess}
                </div>
              )}

              {/* Action Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white uppercase font-semibold py-3 px-4 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 disabled:opacity-60 transition-colors"
              >
                {loading 
                  ? (isForgotPassword ? 'Processing...' : isSignup ? 'Signing up...' : 'Signing in...') 
                  : (isForgotPassword 
                      ? (resetToken ? 'RESET PASSWORD' : 'SEND RESET TOKEN') 
                      : (isSignup ? 'SIGN UP' : 'LOGIN'))}
              </button>
              
              {(isSignup || isForgotPassword) && (
                <div className="mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignup(false)
                      setIsForgotPassword(false)
                      setError('')
                      setResetSuccess('')
                      setResetToken('')
                      setUsername('')
                      setPassword('')
                    }}
                    className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Back to sign in
                  </button>
                </div>
              )}
            </form>
            {!isSignup && !isForgotPassword && (
              <div className="mt-6 text-center">
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true)
                    setError('')
                    setResetSuccess('')
                  }}
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Forgot Password?
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}



