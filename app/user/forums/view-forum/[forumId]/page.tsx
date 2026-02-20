'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { db, auth } from '../../../../lib/ClientApp'
import { doc, getDoc, collection, getDocs, query, where, orderBy, addDoc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore'

interface ForumData {
  id: string
  title: string
  description: string
  topic: string
  isCreator: boolean
  creatorId: string
}

interface Comment {
  id: string
  userId: string
  text: string
  createdAt: Date
  likes: number
  liked: boolean
}

export default function UserViewForumPage() {
  const router = useRouter()
  const params = useParams()
  const forumId = Array.isArray(params?.forumId) ? params.forumId[0] : params?.forumId

  const [forum, setForum] = useState<ForumData | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortBy, setSortBy] = useState<'recent' | 'liked'>('recent')
  const [submitting, setSubmitting] = useState(false)
  const [liking, setLiking] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const fetchForumAndComments = async () => {
      if (!forumId) return

      try {
        // Fetch forum data
        const forumDoc = await getDoc(doc(db, 'forums', forumId))
        if (!forumDoc.exists()) {
          setError('Forum not found')
          setLoading(false)
          return
        }

        const forumData = forumDoc.data() as any
        setForum({
          id: forumId,
          title: forumData.title,
          description: forumData.description,
          topic: forumData.topic || 'General',
          isCreator: forumData.isCreator || false,
          creatorId: forumData.creatorId || '',
        })

        // Fetch comments
        const commentsCollection = collection(db, 'forums', forumId, 'comments')
        const commentsSnapshot = await getDocs(commentsCollection)

        const uid = auth.currentUser?.uid

        const commentsList = await Promise.all(
          commentsSnapshot.docs.map(async (d) => {
            const commentData = d.data() as any
            let liked = false
            if (uid) {
              const likeDoc = await getDoc(doc(db, 'forums', forumId, 'comments', d.id, 'likes', uid))
              liked = likeDoc.exists()
            }

            return {
              id: d.id,
              userId: commentData.userId,
              text: commentData.text,
              createdAt: commentData.createdAt?.toDate() || new Date(),
              likes: commentData.likes || 0,
              liked,
            } as Comment
          })
        )

        setComments(commentsList)
      } catch (err: any) {
        setError('Failed to load forum: ' + err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchForumAndComments()
  }, [forumId])

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim() || !forumId) return

    const uid = auth.currentUser?.uid
    if (!uid) {
      alert('Please sign in to comment')
      return
    }

    setSubmitting(true)
    try {
      const commentsCollection = collection(db, 'forums', forumId, 'comments')
      const docRef = await addDoc(commentsCollection, {
        userId: uid,
        text: newComment,
        createdAt: serverTimestamp(),
        likes: 0,
      })

      setComments((prev) => [
        ...prev,
        {
          id: docRef.id,
          userId: uid,
          text: newComment,
          createdAt: new Date(),
          likes: 0,
          liked: false,
        },
      ])

      setNewComment('')
    } catch (err: any) {
      alert('Failed to add comment: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleLikeComment = async (commentId: string, liked: boolean) => {
    if (!forumId) return
    const uid = auth.currentUser?.uid
    if (!uid) {
      alert('Please sign in to like comments')
      return
    }

    setLiking((p) => ({ ...p, [commentId]: true }))
    try {
      if (liked) {
        await deleteDoc(doc(db, 'forums', forumId, 'comments', commentId, 'likes', uid))
      } else {
        await setDoc(doc(db, 'forums', forumId, 'comments', commentId, 'likes', uid), {
          userId: uid,
          timestamp: serverTimestamp(),
        })
      }

      setComments((prev) =>
        prev.map((c) => {
          if (c.id !== commentId) return c
          return {
            ...c,
            liked: !liked,
            likes: (c.likes || 0) + (liked ? -1 : 1),
          }
        })
      )
    } catch (err: any) {
      alert('Failed to update like: ' + err.message)
    } finally {
      setLiking((p) => ({ ...p, [commentId]: false }))
    }
  }

  const getSortedComments = () => {
    const sorted = [...comments]
    if (sortBy === 'recent') {
      sorted.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    } else {
      sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0))
    }
    return sorted
  }

  if (loading) return <div className="p-6 flex justify-center">Loading forum...</div>
  if (error) return <div className="p-6 flex justify-center text-red-600">{error}</div>
  if (!forum) return <div className="p-6 flex justify-center">Forum not found</div>

  const sortedComments = getSortedComments()

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center p-6">
      <div className="w-full max-w-2xl">
        <button onClick={() => router.back()} className="mb-4 text-blue-600 hover:text-blue-800">
          ← Back
        </button>

        <div className="bg-white border border-black rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold">{forum.title}</h1>
            {forum.isCreator && <span className="px-2 py-1 bg-purple-600 text-white text-xs font-semibold rounded">Creator</span>}
          </div>
          <p className="text-gray-600 mb-2">Topic: {forum.topic}</p>
          <p className="text-gray-700">{forum.description}</p>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">Comments ({comments.length})</h2>

          <form onSubmit={handleAddComment} className="mb-6 bg-gray-50 p-4 rounded-lg border border-gray-200">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts on this forum..."
              className="w-full p-3 border border-gray-300 rounded mb-3"
              rows={3}
              required
            ></textarea>
            <button
              type="submit"
              disabled={submitting || !newComment.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-60"
            >
              {submitting ? 'Posting...' : 'Post Comment'}
            </button>
          </form>

          <div className="mb-4 flex gap-4">
            <button
              onClick={() => setSortBy('recent')}
              className={`px-4 py-2 rounded ${sortBy === 'recent' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-black'}`}
            >
              Most Recent
            </button>
            <button
              onClick={() => setSortBy('liked')}
              className={`px-4 py-2 rounded ${sortBy === 'liked' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-black'}`}
            >
              Most Liked
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {sortedComments.length === 0 ? (
              <p className="text-gray-500 text-center py-4">No comments yet. Be the first to comment!</p>
            ) : (
              sortedComments.map((comment) => (
                <div key={comment.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600 mb-2">User ID: {comment.userId.substring(0, 8)}...</p>
                  <p className="text-gray-800 mb-3">{comment.text}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">{comment.createdAt.toLocaleDateString()} {comment.createdAt.toLocaleTimeString()}</span>
                    <button
                      onClick={() => handleToggleLikeComment(comment.id, !!comment.liked)}
                      disabled={!!liking[comment.id]}
                      className={`px-3 py-1 rounded ${comment.liked ? 'bg-blue-600 text-white' : 'bg-gray-200 text-black'} ${liking[comment.id] ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      {liking[comment.id] ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        </span>
                      ) : (
                        `👍 ${comment.likes || 0}`
                      )}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
