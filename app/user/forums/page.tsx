'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { db } from '../../lib/ClientApp'
import { collection, getDocs } from 'firebase/firestore'

interface Forum {
  id: string
  title: string
  description: string
}

export default function UserForumsPage() {
  const router = useRouter()
  const [forums, setForums] = useState<Forum[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchForums = async () => {
      try {
        const forumsCollection = collection(db, 'forums')
        const forumSnapshot = await getDocs(forumsCollection)
        const forumsList = forumSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<Forum, 'id'>),
        })) as Forum[]
        setForums(forumsList)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    fetchForums()
  }, [])

  if (loading) {
    return <div className="p-6 flex justify-center">Loading forums...</div>
  }

  if (error) {
    return <div className="p-6 flex justify-center text-red-600">Error: {error}</div>
  }

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center p-6">
      <div className="w-full max-w-4xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Community Forums</h1>
          <button
            onClick={() => router.back()}
            className="px-4 py-2 border border-black rounded hover:bg-gray-100 transition"
          >
            Back
          </button>
        </div>

        {forums.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No forums available yet.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {forums.map((forum) => (
              <Link
                key={forum.id}
                href={`/user/forums/view-forums/${forum.id}`}
                className="border border-black rounded-lg p-6 shadow-sm hover:shadow-md transition cursor-pointer bg-white hover:bg-gray-50"
              >
                <h2 className="text-2xl font-semibold mb-2 text-black hover:text-gray-700">
                  {forum.title}
                </h2>
                <div className="border-t border-gray-200 pt-3">
                  <p className="text-gray-700">{forum.description}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
