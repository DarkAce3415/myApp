'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from '../lib/ClientApp'
import { getDoc, doc } from 'firebase/firestore'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const router = useRouter()
    

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)
    if (!email || !password) {
      setMessage('Please enter both email and password.')
      setLoading(false)
      return  
    }

    try {
      const userCred = await signInWithEmailAndPassword(auth, email, password)
      if (userCred?.user) {
        const creatorDoc = await getDoc(doc(db, 'creators', userCred.user.uid))
        if (creatorDoc.exists()) {
          router.push('/creator-main-page')
        } else {
          router.push('/user')
        }
        return
      }
      setMessage('Could not sign in.')
    } catch (err: any) {
      setMessage(err?.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white text-black rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-4 text-center">Sign in</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
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

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2 rounded bg-black text-white font-semibold hover:opacity-90 transition"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <div className="flex items-center justify-between mt-2">
            <span className="text-sm">New here?</span>
            <Link
              href="/register-page"
              className="text-sm px-3 py-1 border border-black rounded bg-white text-black hover:bg-black hover:text-white transition"
            >
              Create account
            </Link>
          </div>

          {message && <p className="text-sm mt-2">{message}</p>}
        </form>
      </div>
    </div>
  )
}