'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db, rtdb } from '../lib/ClientApp'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, serverTimestamp } from 'firebase/firestore'

export default function RegisterPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [loading, setLoading] = useState(false)
  const [isCreator, setIsCreator] = useState(false) 
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

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
      console.log('userCeed success')

      await setDoc(doc(db, 'users', uid), {
        uid,
        email: userCred.user.email,
        displayName: displayName || null,
        createdAt: serverTimestamp(),
      })

      if (isCreator) {
        await setDoc(doc(db, 'creators', uid), {
          uid,
          email: userCred.user.email,
          displayName: displayName || null,
          createdAt: serverTimestamp(),
        })
      }
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
          <label className="block text-sm font-medium">Display name (optional)</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-3 py-2 rounded border border-black bg-white text-black focus:outline-none"
            placeholder="Jane Doe"
          />    

          <label className="block text-sm font-medium">Email</label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded border border-black bg-white text-black focus:outline-none"
          />

          <label className="block text-sm font-medium">Password</label>
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded border border-black bg-white text-black focus:outline-none"
          />

          <label className="block text-sm font-medium">Confirm password</label>
          <input
            type="password"
            required
            minLength={6}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="w-full px-3 py-2 rounded border border-black bg-white text-black focus:outline-none"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2 rounded bg-black text-white font-semibold hover:opacity-90 transition"
          >
            {loading ? 'Creating…' : 'Create account'}
          </button>
          <div className="flex items-center space-x-2">
            <input
              id="creator"
              type="checkbox"
              checked={isCreator}
              onChange={(e) => setIsCreator(e.target.checked)}
              disabled={loading}
              className="w-4 h-4"
            />
            <label htmlFor="creator" className="text-sm">
              Create creator account (Realtime Database)
            </label>
          </div>

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
