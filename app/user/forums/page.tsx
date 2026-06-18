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
  isCreator?: boolean
  linkedCourseId?: string
  hasAccess?: boolean
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
  const [showSplash, setShowSplash] = useState(false)
  const [deniedCourseId, setDeniedCourseId] = useState<string | null>(null)

  useEffect(() => {
    const fetchTopicsOnly = async () => {
      try {
        const topicsSnap = await getDocs(collection(db, 'topics'))
        const topicNames = topicsSnap.docs.map((d) => (d.data() as any).name)
        if (topicNames.length) setTopics(topicNames)
      } catch (err) {
      }
    }

    fetchTopicsOnly()
  }, [])
  useEffect(() => {
    const fetchForums = async () => {
      try {
        const forumsCollection = collection(db, 'forums')
        const forumSnapshot = await getDocs(forumsCollection)

        const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

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
            let hasAccess = true
            const uid = auth.currentUser?.uid

            if (data.linkedCourseId && uid) {
              hasAccess = false
              if (data.userId === uid || data.creatorId === uid) {
                hasAccess = true
              } else {
                const userDoc = await getDoc(doc(db, 'users', uid))
                if (userDoc.exists()) {
                  const userData = userDoc.data()
                  const purchasedCourses = userData.purchasedCourses || []
                  if (purchasedCourses.includes(data.linkedCourseId)) {
                    hasAccess = true
                  }
                }
              }
            }

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
              isCreator: data.isCreator || false,
              linkedCourseId: data.linkedCourseId || null,
              hasAccess,
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

    const forumTarget = forums.find(f => f.id === forumId);
    if (forumTarget && forumTarget.hasAccess === false) {
      setShowSplash(true);
      setDeniedCourseId(forumTarget.linkedCourseId || null);
      return;
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
            <label className="flex items-center gap-2 cursor-pointer">
              <div className="relative">
                <input type="checkbox" className="sr-only" checked={use7Day} onChange={handleToggle7Day} />
                <div className={`block w-10 h-6 rounded-full transition ${use7Day ? 'bg-blue-600' : 'bg-gray-300'}`}></div>
                <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition transform ${use7Day ? 'translate-x-4' : ''}`}></div>
              </div>
              <span className="text-sm text-black">Use 7-day ranking</span>
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
            <button
              onClick={() => router.push('/user/my-forums')}
              className="px-4 py-2 border border-black rounded bg-white text-black font-semibold hover:bg-gray-100 transition"
              aria-label="View my created forums"
            > My Forums </button>
            <Link href="/user/forums/add-forum" className="inline-block">
              <button className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-semibold rounded">Create Forum</button>
            </Link>
          </div>
        </div>

        {filtered.length === 0 ? (
          <p className="text-black text-center py-8">No forums available for the selected topic.</p>
        ) : (
          <div className="flex flex-col gap-4">
            {filtered.map((forum) => (
              <div key={forum.id} className={`border border-black rounded-lg p-6 shadow-sm hover:shadow-md transition cursor-pointer bg-white hover:bg-gray-50 ${forum.hasAccess === false ? 'opacity-50 grayscale' : ''}`}>
                <div className="flex justify-between items-start gap-4">
                  <Link
                    href={`/user/forums/view-forum/${forum.id}`}
                    className="flex-1"
                    onClick={(e) => {
                      if (forum.hasAccess === false) {
                        e.preventDefault();
                        setShowSplash(true);
                        setDeniedCourseId(forum.linkedCourseId || null);
                      }
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-2xl font-semibold text-black hover:text-black">{forum.title}</h2>
                      {forum.isCreator && (
                          <span className="px-2 py-1 bg-purple-600 text-white text-xs font-semibold rounded">Creator</span>
                      )}
                      {forum.linkedCourseId && (
                          <span className="px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded">Course Linked</span>
                      )}
                    </div>
                    <div className="border-t border-gray-200 pt-3">
                      <p className="text-black">{forum.hasAccess === false ? <span className="italic text-gray-500">Description hidden. You do not have access to the linked course.</span> : forum.description}</p>
                    </div>
                  </Link>

                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => handleToggleLike(forum.id, !!forum.liked)}
                      disabled={!!liking[forum.id] || forum.hasAccess === false}
                      className={`px-3 py-1 rounded ${forum.liked ? 'bg-blue-600 text-white' : 'bg-gray-100 text-black'} ${(liking[forum.id] || forum.hasAccess === false) ? 'opacity-60 cursor-not-allowed' : ''}`}>
                      {liking[forum.id] ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm">Processing</span>
                        </span>
                      ) : forum.liked ? 'Liked' : 'Like'}
                    </button>
                    <span className="text-sm text-black">{use7Day ? (forum.weeklyLikes || 0) + ' likes (7d)' : (forum.totalLikes || 0) + ' likes'}</span>
                    <span className="text-xs text-black">Topic: {forum.topic}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showSplash && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg max-w-sm w-full text-center border border-black shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-black">Access Denied</h2>
            <p className="italic text-gray-500 mb-6">You do not have access to the linked course.</p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => { setShowSplash(false); setDeniedCourseId(null); }}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition"
              >
                Close
              </button>
              {deniedCourseId && (
                <button
                  onClick={() => router.push(`/user/view-course/${deniedCourseId}`)}
                  className="px-4 py-2 bg-black text-white font-semibold rounded hover:opacity-90 transition"
                >
                  View Course
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
