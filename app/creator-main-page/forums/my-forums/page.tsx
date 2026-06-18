'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { db, auth } from '../../../lib/ClientApp'
import { collection, getDocs, query, where, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'

interface Forum {
  id: string
  title: string
  description: string
  topic?: string
  totalLikes?: number
  liked?: boolean
  userId?: string
  linkedCourseId?: string
}

export default function CreatorMyForumsPage() {
  const router = useRouter()
  const [forums, setForums] = useState<Forum[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [liking, setLiking] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const fetchMyForums = async () => {
      try {
        const uid = auth.currentUser?.uid
        if (!uid) {
          setError('Please sign in to view your forums.')
          setLoading(false)
          return
        }

        const forumsCollection = collection(db, 'forums')
        const myForumsQuery = query(forumsCollection, where('userId', '==', uid), where('isCreator', '==', true))
        const forumSnapshot = await getDocs(myForumsQuery)

        const forumsList = await Promise.all(
          forumSnapshot.docs.map(async (d) => {
            const data = d.data() as any
            const id = d.id

            const likesAllSnapshot = await getDocs(collection(db, 'forums', id, 'likes'))
            const totalLikes = likesAllSnapshot.size

            let liked = false
            if (uid) {
              const likedDoc = await getDoc(doc(db, 'forums', id, 'likes', uid))
              liked = likedDoc.exists()
            }

            return {
              id,
              title: data.title,
              description: data.description,
              topic: data.topic || 'General',
              totalLikes,
              liked,
              userId: data.userId,
              linkedCourseId: data.linkedCourseId || null,
            } as Forum
          })
        )

        setForums(forumsList)
      } catch (e: any) {
        setError(e.message)
      } finally {
        setLoading(false)
      }
    }

    fetchMyForums()
  }, [])

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
          role: 'creator',
          timestamp: serverTimestamp(),
        })
      }

      setForums((prev) =>
        prev.map((f) => {
          if (f.id !== forumId) return f
          return {
            ...f,
            liked: !liked,
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
    return <div className="p-6 flex justify-center text-white bg-gray-900 min-h-screen">Loading your forums — please wait...</div>
  }

  if (error) {
    return <div className="p-6 flex justify-center text-red-400 bg-gray-900 min-h-screen">{error}</div>
  }

  const sorted = [...forums].sort((a, b) => ((b.totalLikes || 0) - (a.totalLikes || 0)))

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-6">
      <div className="w-full max-w-4xl flex flex-col gap-6">
        <div>
          <button onClick={() => router.push('/creator-main-page/forums')} className="text-blue-400 hover:text-blue-300">
            &larr; Back to Main Forums
          </button>
        </div>
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">My Forums</h1>
          <div className="flex items-center gap-4">
            <div>
              <Link href="/creator-main-page/forums/add-forums" className="inline-block">
                <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded">Create Forum</button>
              </Link>
            </div>
          </div>
        </div>

        {sorted.length === 0 ? (
          <p className="text-white text-center py-8">You haven't created any forums yet. Start by creating one!</p>
        ) : (
          <div className="flex flex-col gap-4">
            {sorted.map((forum) => (
              <div key={forum.id} className="border border-gray-600 bg-gray-800 rounded-lg p-6 shadow-sm hover:shadow-md transition cursor-pointer hover:bg-gray-750">
                <div className="flex justify-between items-start gap-4">
                  <Link
                    href={`/creator-main-page/forums/view-forums/${forum.id}`}
                    className="flex-1"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <h2 className="text-2xl font-semibold text-white hover:text-gray-300">{forum.title}</h2>
                      {forum.linkedCourseId && (
                        <span className="px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded">Course Linked</span>
                      )}
                    </div>
                    <div className="border-t border-gray-600 pt-3">
                      <p className="text-white">{forum.description}</p>
                    </div>
                  </Link>

                  <div className="flex flex-col items-end gap-2">
                    <button
                      onClick={() => handleToggleLike(forum.id, !!forum.liked)}
                      disabled={!!liking[forum.id]}
                      className={`px-3 py-1 rounded ${forum.liked ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'} ${liking[forum.id] ? 'opacity-60 cursor-not-allowed' : ''}`}>
                      {liking[forum.id] ? (
                        <span className="inline-flex items-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span className="text-sm">Processing</span>
                        </span>
                      ) : forum.liked ? 'Liked' : 'Like'}
                    </button>
                    <span className="text-sm text-white">{(forum.totalLikes || 0)} likes</span>
                    <span className="text-xs text-white">Topic: {forum.topic}</span>
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
