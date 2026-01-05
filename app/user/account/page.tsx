'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth } from '../../lib/ClientApp'
import { onAuthStateChanged } from 'firebase/auth'


export default function AccountPageUser() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (!user) {
                router.push('/login-page')
            } else {
                setLoading(false)
            }
        })

        return () => unsubscribe()
    }, [router])

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
                <span className="text-xl">Loading...</span>
            </div>
        )
    }
    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
            <div className="w-full max-w-md bg-white text-black rounded-lg shadow-lg p-8">
                <h1 className="text-2xl font-bold mb-4 text-center">Account Page</h1>
                <p className="text-center">Welcome to your account page!</p>
            </div>
        </div>
    )
}

