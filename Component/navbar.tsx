'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const pathname = usePathname()
  const [isNavOpen, setIsNavOpen] = useState(true)

  if (pathname === '/' || pathname === '/login-page' || pathname === '/register-page') {
    return null
  }

  const isCreator = pathname?.startsWith('/creator-main-page')
  const isUser = pathname?.startsWith('/user')

  let mainPageLink = '/login-page'
  let profileLink = '/login-page'
  let forumsLink = '/login-page'

  if (isCreator) {
    mainPageLink = '/creator-main-page'
    profileLink = '/creator-main-page/account'
    forumsLink = '/creator-main-page/forums'
  } else if (isUser) {
    mainPageLink = '/user'
    profileLink = '/user/account'
    forumsLink = '/user/forums'
  }

  return (
    <>
      {/* Toggle Menu Button */}
      <button
        onClick={() => setIsNavOpen(!isNavOpen)}
        className="fixed top-4 left-6 z-50 p-2 border border-black rounded bg-white text-black hover:bg-black hover:text-white transition shadow-sm"
        aria-label="Toggle navigation"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {isNavOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Sliding Navbar */}
      <nav className={`fixed top-0 left-0 w-full bg-black flex justify-between items-center pl-24 pr-8 py-4 border-b border-gray-800 z-40 transition-transform duration-300 ease-in-out ${isNavOpen ? 'translate-y-0' : '-translate-y-full'}`}>
        <div className="text-2xl font-bold tracking-tight text-white">
          <Link href="/">MyWebsite</Link>
        </div>
        <div className="flex gap-4">
          <Link href={mainPageLink} className="px-4 py-2 border border-transparent rounded bg-white text-black font-semibold hover:bg-gray-300 transition shadow-sm">Home</Link>
          <Link href={forumsLink} className="px-4 py-2 border border-transparent rounded bg-white text-black font-semibold hover:bg-gray-300 transition shadow-sm">Forums</Link>
          <Link href={profileLink} className="px-4 py-2 border border-gray-700 rounded bg-gray-800 text-white font-semibold hover:bg-gray-900 transition shadow-sm">Profile</Link>
        </div>
      </nav>

      {/* Spacer to seamlessly push page content down when navbar opens */}
      <div className={`w-full transition-all duration-300 ease-in-out ${isNavOpen ? 'h-[75px]' : 'h-0'}`} aria-hidden="true" />
    </>
  )
}
