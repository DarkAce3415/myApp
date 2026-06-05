'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth'
import { auth, db } from '../lib/ClientApp'
import { getDoc, doc, setDoc } from 'firebase/firestore'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectUrl = searchParams.get('redirect')
    

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
        const userDoc = await getDoc(doc(db, 'users', userCred.user.uid))
        if (userDoc.exists() && userDoc.data().isCreator === true) {
          // Insert or update the creator data into the 'creators' collection
          await setDoc(doc(db, 'creators', userCred.user.uid), {
            ...userDoc.data(),
            email: userCred.user.email,
            updatedAt: new Date().toISOString()
          }, { merge: true })
          
          router.push('/creator-main-page')
        } else {
          router.push(redirectUrl || '/user')
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

  const handleForgotPassword = async () => {
    if (!email) {
      setMessage('Please enter your email address above to reset your password.')
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      await sendPasswordResetEmail(auth, email)
      setMessage('Password reset email sent! Please check your inbox.')
    } catch (err: any) {
      setMessage(err?.message || 'Failed to send password reset email.')
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

          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-sm text-gray-600 hover:text-black hover:underline"
            >
              Forgot password?
            </button>
          </div>

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