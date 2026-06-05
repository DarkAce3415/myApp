'use client'

import Link from 'next/link'
import React, { useEffect, useState } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from './lib/ClientApp'
import { doc, getDoc } from 'firebase/firestore'

const MainPage = () =>{
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [isCreator, setIsCreator] = useState<boolean>(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setIsLoggedIn(true)
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid))
          const creatorDoc = await getDoc(doc(db, 'creators', user.uid))
          
          if (userDoc.exists() && creatorDoc.exists() && userDoc.data().isCreator === true) {
            setIsCreator(true)
          } else {
            setIsCreator(false)
          }
        } catch (error) {
          console.error("Error checking user role:", error)
          setIsCreator(false)
        }
      } else {
        setIsLoggedIn(false)
        setIsCreator(false)
      }
    })
    return () => unsubscribe()
  }, [])

  return<>
  <div className="min-h-screen bg-white text-black flex flex-col">

  <nav className="w-full flex justify-between items-center px-8 py-4 border-b border-black">
    <div className="text-2xl font-bold tracking-tight flex items-center gap-2">
      <img 
        src={process.env.NEXT_PUBLIC_LOGO_URL || '/logo.png'} 
        alt="AILink Logo" 
        className="w-8 h-8 rounded object-cover"
        onError={(e) => { e.currentTarget.style.display = 'none' }}
      />
      <span>AILink</span>
    </div>
    <div className="flex space-x-4">
    {isLoggedIn === null ? null : isLoggedIn ? (
      <Link href={isCreator ? "/creator-main-page" : "/user"} className="px-4 py-2 border border-black rounded bg-black text-white hover:opacity-90 transition">Dashboard</Link>
    ) : (
      <>
        <Link href="/user" className="px-4 py-2 border border-black rounded hover:bg-black hover:text-white transition">Browse Courses</Link>
        <Link href="/login-page" className="px-4 py-2 border border-black rounded hover:bg-black hover:text-white transition">Login</Link>
        <Link href="/register-page" className="px-4 py-2 border border-black rounded hover:bg-black hover:text-white transition">Register</Link>
      </>
    )}
    </div>
  </nav>



<main className="flex-1 flex flex-col items-center justify-center text-center px-6">
  <h1 className="text-4xl font-bold mb-4">Welcome to AILink</h1>
  <p className="max-w-md text-lg leading-relaxed">
    A clean and minimalistic homepage using only black and white colors. {isLoggedIn === null ? '' : isLoggedIn ? 'Head to your dashboard to continue.' : 'Login or register to get started.'}
  </p>
</main>



<footer className="py-4 text-center border-t border-black text-sm">
</footer>
</div>
  </>
}

export default MainPage;