'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const pathname = usePathname()

  // Hide navbar on landing, login, and register pages
  if (pathname === '/' || pathname === '/login-page' || pathname === '/register-page') {
    return null
  }

  // Determine if the user is in the creator or user section based on the URL
  const isCreator = pathname?.startsWith('/creator-main-page')
  const isUser = pathname?.startsWith('/user')

  // Default links
  let mainPageLink = '/login-page'
  let profileLink = '/login-page'
  let forumsLink = '/login-page'

  // Dynamic links based on role
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
    <nav className="w-full bg-black text-white p-4 flex items-center justify-between border-b border-gray-800">
      <div className="text-xl font-bold">
        <h1>Application Title</h1>
      </div>
      <div className="flex gap-6">
        <Link href={mainPageLink} className=" bg-white text-black px-4 py-2 rounded transition hover:bg-gray-500">Home</Link>
        <Link href={forumsLink} className="bg-white text-black px-4 py-2 rounded transition hover:bg-gray-500">Forums</Link>
        <Link href={profileLink} className="bg-white text-black px-4 py-2 rounded transition hover:bg-gray-500">Profile</Link>
      </div>
    </nav>
  )
}
