'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { db, auth } from '../../lib/ClientApp'
import { collection, getDocs, query, where, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'

interface Forum {
  id: string
  title: string
  description: string
  topic?: string
  weeklyLikes?: number
  liked?: boolean
}

export default function UserForumsPage() {
  const router = useRouter()
  const [forums, setForums] = useState<Forum[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [topics, setTopics] = useState<string[]>([])
  const [selectedTopic, setSelectedTopic] = useState<string>('All')

  useEffect(() => {
    const fetchForums = async () => {
      try {
        const forumsCollection = collection(db, 'forums')
        const forumSnapshot = await getDocs(forumsCollection)

        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago

        const forumsList = await Promise.all(
          forumSnapshot.docs.map(async (d) => {
            const data = d.data() as any
            const id = d.id

            const likesQuery = query(collection(db, 'forums', id, 'likes'), where('timestamp', '>=', cutoff))
            const likesSnapshot = await getDocs(likesQuery)
            const weeklyLikes = likesSnapshot.size

            let liked = false
            const uid = auth.currentUser?.uid
            if (uid) {
              const likedDoc = await getDoc(doc(db, 'forums', id, 'likes', uid))
              liked = likedDoc.exists()
            }

            return {
              id,
              title: data.title,
              description: data.description,
              topic: data.topic || 'General',
              weeklyLikes,
              liked,
            } as Forum
          })
        )

        const uniqueTopics = Array.from(new Set(forumsList.map((f) => f.topic || 'General')))

        // sort by weekly likes descending
        forumsList.sort((a, b) => (b.weeklyLikes || 0) - (a.weeklyLikes || 0))

        setTopics(uniqueTopics)
        setForums(forumsList)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    fetchForums()
  }, [])

  const handleTopicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedTopic(e.target.value)
  }

  const handleToggleLike = async (forumId: string, liked: boolean) => {
    const uid = auth.currentUser?.uid
    if (!uid) {
      alert('Please sign in to like forums.')
      return
    }

    try {
      if (liked) {
        await deleteDoc(doc(db, 'forums', forumId, 'likes', uid))
      } else {
        await setDoc(doc(db, 'forums', forumId, 'likes', uid), {
          userId: uid,
          role: 'user',
          timestamp: serverTimestamp(),
        })
      }

      setForums((prev) =>
        prev.map((f) => {
          if (f.id !== forumId) return f
          return { ...f, liked: !liked, weeklyLikes: (f.weeklyLikes || 0) + (liked ? -1 : 1) }
        })
      )
    } catch (err: any) {
      console.error('Failed to toggle like', err)
      alert('Could not update like. Please try again.')
    }
  }

  if (loading) {
    return <div className="p-6 flex justify-center">Loading forums — please wait...</div>
  }

  if (error) {
    return <div className="p-6 flex justify-center text-red-600">Something went wrong while loading forums: {error}</div>
  }

  const filtered = forums.filter((f) => selectedTopic === 'All' || f.topic === selectedTopic)

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center p-6">
      <div className="w-full max-w-4xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Community Forums</h1>
          <div>
            <label className="mr-2">Filter by topic:</label>
            <select value={selectedTopic} onChange={handleTopicChange} className="border rounded p-1">
              <option value="All">All Topics</option>
              {topics.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No forums available for the selected topic.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map((forum) => (
              <div key={forum.id} className="border border-black rounded-lg p-6 shadow-sm hover:shadow-md transition cursor-pointer bg-white hover:bg-gray-50">
                <div className="flex justify-between items-start gap-4">
                  <Link
                    href={`/user/forums/view-forums/${forum.id}`}
                    className="flex-1"
                  >
                    <h2 className="text-2xl font-semibold mb-2 text-black hover:text-gray-700">{forum.title}</h2>
                    <div className="border-t border-gray-200 pt-3">
                      <p className="text-gray-700">{forum.description}</p>
                    </div>
                  </Link>

                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => handleToggleLike(forum.id, !!forum.liked)}
                      className={`px-3 py-1 rounded ${forum.liked ? 'bg-blue-600 text-white' : 'bg-gray-100 text-black'}`}>
                      {forum.liked ? 'Liked' : 'Like'}
                    </button>
                    <span className="text-sm text-gray-600">{forum.weeklyLikes || 0} likes (7d)</span>
                    <span className="text-xs text-gray-500">Topic: {forum.topic}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
