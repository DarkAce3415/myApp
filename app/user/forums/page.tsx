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
  totalLikes?: number
  liked?: boolean
}

export default function UserForumsPage() {
  const router = useRouter()
  const [forums, setForums] = useState<Forum[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [topics, setTopics] = useState<string[]>([])
  const [selectedTopic, setSelectedTopic] = useState<string>('All')
  const [use7Day, setUse7Day] = useState<boolean>(true)
  const [searchQuery, setSearchQuery] = useState<string>('')
  const [liking, setLiking] = useState<Record<string, boolean>>({})

  // Load topics list from topics collection for faster reads
  useEffect(() => {
    const fetchTopicsOnly = async () => {
      try {
        const topicsSnap = await getDocs(collection(db, 'topics'))
        const topicNames = topicsSnap.docs.map((d) => (d.data() as any).name)
        if (topicNames.length) setTopics(topicNames)
      } catch (err) {
        // ignore
      }
    }

    fetchTopicsOnly()
  }, [])
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

            const likes7Query = query(collection(db, 'forums', id, 'likes'), where('timestamp', '>=', cutoff))
            const likes7Snapshot = await getDocs(likes7Query)
            const weeklyLikes = likes7Snapshot.size

            const likesAllSnapshot = await getDocs(collection(db, 'forums', id, 'likes'))
            const totalLikes = likesAllSnapshot.size

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
              totalLikes,
              liked,
            } as Forum
          })
        )

        const uniqueTopics = Array.from(new Set(forumsList.map((f) => f.topic || 'General')))

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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleToggle7Day = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUse7Day(e.target.checked)
  }

  const handleToggleLike = async (forumId: string, liked: boolean) => {
    const uid = auth.currentUser?.uid
    if (!uid) {
      alert('Please sign in to like forums.')
      return
    }

    setLiking((p) => ({ ...p, [forumId]: true }))
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
          return {
            ...f,
            liked: !liked,
            weeklyLikes: (f.weeklyLikes || 0) + (liked ? -1 : 1),
            totalLikes: (f.totalLikes || 0) + (liked ? -1 : 1),
          }
        })
      )
    } catch (err: any) {
      console.error('Failed to toggle like', err)
      alert('Could not update like. Please try again.')
    } finally {
      setLiking((p) => ({ ...p, [forumId]: false }))
    }
  }

  if (loading) {
    return <div className="p-6 flex justify-center">Loading forums — please wait...</div>
  }

  if (error) {
    return <div className="p-6 flex justify-center text-red-600">Something went wrong while loading forums: {error}</div>
  }

  const filtered = forums
    .filter((f) => (selectedTopic === 'All' || f.topic === selectedTopic) && f.title.toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => ((use7Day ? (b.weeklyLikes || 0) : (b.totalLikes || 0)) - (use7Day ? (a.weeklyLikes || 0) : (a.totalLikes || 0))))

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center p-6">
      <div className="w-full max-w-4xl flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Community Forums</h1>
          <div className="flex items-center gap-4">
            <input type="text" placeholder="Search by title..." value={searchQuery} onChange={handleSearchChange} className="border rounded p-1" />
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={use7Day} onChange={handleToggle7Day} />
              <span className="text-sm">Use 7-day ranking</span>
            </label>
            <div>
              <label className="mr-2">Filter by topic:</label>
              <select value={selectedTopic} onChange={handleTopicChange} className="border rounded p-1">
                <option value="All">All Topics</option>
                {topics.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <Link href="/user/forums/add-forum" className="inline-block">
                <button className="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded">Create Forum</button>
              </Link>
            </div>
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
                      disabled={!!liking[forum.id]}
                      className={`px-3 py-1 rounded ${forum.liked ? 'bg-blue-600 text-white' : 'bg-gray-100 text-black'} ${liking[forum.id] ? 'opacity-60 cursor-not-allowed' : ''}`}>
                      {liking[forum.id] ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm">Processing</span>
                        </span>
                      ) : forum.liked ? 'Liked' : 'Like'}
                    </button>
                    <span className="text-sm text-gray-600">{use7Day ? (forum.weeklyLikes || 0) + ' likes (7d)' : (forum.totalLikes || 0) + ' likes'}</span>
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
