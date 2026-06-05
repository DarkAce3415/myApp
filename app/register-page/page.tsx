'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '../lib/ClientApp'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [username, setUsername] = useState('')
  const [isCreator, setIsCreator] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!email || !password || !confirm) {
      setError('Please fill in all required fields.')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password)
      const uid = userCred.user.uid

      await setDoc(doc(db, 'users', uid), {
        uid,
        email: userCred.user.email,
        username: username || null,
        isCreator,
        createdAt: serverTimestamp(),
      })
      setSuccess('Account created successfully. Redirecting to login…')
      setTimeout(() => {
        router.push('/login-page')
      }, 2000)
      return
    } catch (err: any) {
      setError(err?.message || 'Registration failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white text-black rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-4 text-center">Create account</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium">{isCreator ? 'Creator Username' : 'Username'} (optional)</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full px-3 py-2 rounded border border-black bg-white text-black focus:outline-none"
            placeholder="Jane Doe"
          />    

          <label className="block text-sm font-medium">{isCreator ? 'Creator Email' : 'Email'}</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded border border-black bg-white text-black focus:outline-none"
          />

          <label className="block text-sm font-medium">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded border border-black bg-white text-black focus:outline-none pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-600 hover:text-black"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              )}
            </button>
          </div>

          <label className="block text-sm font-medium">Confirm password</label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="w-full px-3 py-2 rounded border border-black bg-white text-black focus:outline-none pr-10"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-600 hover:text-black"
            >
              {showConfirmPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              )}
            </button>
          </div>

          <label className={`relative flex items-center justify-between p-4 border rounded-lg cursor-pointer transition-all mt-2 ${isCreator ? 'border-black bg-gray-50 shadow-sm' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}`}>
            <div className="flex flex-col pr-4">
              <span className="text-sm font-bold text-black">Register as a Creator</span>
              <span className="text-xs text-gray-600 mt-1">Create courses, manage students, and earn from your content.</span>
            </div>
            <div className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors shrink-0 ${isCreator ? 'bg-black' : 'bg-gray-300'}`}>
              <div className={`w-4 h-4 bg-white rounded-full shadow-md transform transition-transform ${isCreator ? 'translate-x-5' : 'translate-x-0'}`}></div>
            </div>
            <input
              type="checkbox"
              className="sr-only"
              checked={isCreator}
              onChange={(e) => {
                if (e.target.checked) {
                  if (window.confirm("Are you sure you want to register as a creator? This gives you access to the Creator Dashboard.")) {
                    setIsCreator(true)
                  }
                } else {
                  setIsCreator(false)
                }
              }}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2 rounded bg-black text-white font-semibold hover:opacity-90 transition"
          >
            {loading ? 'Creating…' : 'Create account'}
          </button>

          <div className="flex items-center justify-center mt-2">
            <button
              type="button"
              onClick={() => router.push('/login-page')}
              className="text-sm px-3 py-1 border border-black rounded bg-white text-black hover:bg-black hover:text-white transition"
            >
              Back to login
            </button>
          </div>

          {error && <p className="text-sm mt-2 text-red-700">{error}</p>}
          {success && <p className="text-sm mt-2">{success}</p>}
        </form>
      </div>
    </div>
  )
}
