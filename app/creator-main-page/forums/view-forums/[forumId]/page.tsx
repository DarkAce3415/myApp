'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { db, auth } from '../../../../lib/ClientApp'
import { doc, getDoc, collection, getDocs, query, where, orderBy, addDoc, serverTimestamp, setDoc, deleteDoc } from 'firebase/firestore'

interface ForumData {
  id: string
  title: string
  description: string
  topic: string
  isCreator: boolean
  creatorId: string
  linkedCourseId?: string
  canManage?: boolean
}

interface Comment {
  id: string
  userId: string
  userName: string
  text: string
  createdAt: Date
  likes: number
  liked: boolean
}

export default function CreatorViewForumPage() {
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
        const uid = auth.currentUser?.uid

        // 1. Fetch forum and comments concurrently
        const forumDocPromise = getDoc(doc(db, 'forums', forumId))
        const commentsSnapshotPromise = getDocs(collection(db, 'forums', forumId, 'comments'))

        const [forumDoc, commentsSnapshot] = await Promise.all([forumDocPromise, commentsSnapshotPromise])

        if (!forumDoc.exists()) {
          setError('Forum not found')
          setLoading(false)
          return
        }

        const forumData = forumDoc.data() as any
        const linkedCourseId = forumData.linkedCourseId || null

        let canManage = false
        if (uid) {
          if (forumData.userId === uid || forumData.creatorId === uid) {
            canManage = true
          }
        }

        if (linkedCourseId && uid) {
          let hasAccess = false
          if (canManage) {
            hasAccess = true
          } else {
            const courseDocRef = doc(db, 'courses', linkedCourseId)
            const courseDocSnap = await getDoc(courseDocRef)
            if (courseDocSnap.exists()) {
              if (courseDocSnap.data().creatorId === uid) {
                hasAccess = true
                canManage = true
              }
            }
          }

          if (!hasAccess) {
            setError('access denied! You are not the creator of this course')
            setLoading(false)
            setTimeout(() => {
              router.push('/creator-main-page/forums')
            }, 1000)
            return
          }
        }

        setForum({
          id: forumId,
          title: forumData.title,
          description: forumData.description,
          topic: forumData.topic || 'General',
          isCreator: forumData.isCreator || false,
          creatorId: forumData.creatorId || '',
          linkedCourseId,
          canManage,
        })

        const commentsList = await Promise.all(
          commentsSnapshot.docs.map(async (d) => {
            const commentData = d.data() as any
            let liked = false
            if (uid) {
              const likeDoc = await getDoc(doc(db, 'forums', forumId, 'comments', d.id, 'likes', uid))
              liked = likeDoc.exists()
            }

            let userName = commentData.userName
            if (!userName && commentData.userId) {
              const userDoc = await getDoc(doc(db, 'users', commentData.userId))
              userName = userDoc.exists() ? (userDoc.data().username || 'Anonymous') : 'Anonymous'
            }

            return {
              id: d.id,
              userId: commentData.userId,
              userName: userName || 'Anonymous',
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
      const userDocRef = await getDoc(doc(db, 'users', uid))
      const userName = userDocRef.exists() ? (userDocRef.data().username || 'Anonymous') : 'Anonymous'

      const commentsCollection = collection(db, 'forums', forumId, 'comments')
      const docRef = await addDoc(commentsCollection, {
        userId: uid,
        userName,
        text: newComment,
        createdAt: serverTimestamp(),
        likes: 0,
      })

      setComments((prev) => [
        ...prev,
        {
          id: docRef.id,
          userId: uid,
          userName,
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

  const handleDeleteForum = async () => {
    if (!forumId) return
    if (!window.confirm('Are you sure you want to delete this forum? This action cannot be undone.')) {
      return
    }
    
    try {
      await deleteDoc(doc(db, 'forums', forumId as string))
      router.push('/creator-main-page/forums')
    } catch (err: any) {
      alert('Failed to delete forum: ' + err.message)
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    if (!forumId) return
    if (!window.confirm('Are you sure you want to delete this comment?')) {
      return
    }
    try {
      await deleteDoc(doc(db, 'forums', forumId as string, 'comments', commentId))
      setComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch (err: any) {
      alert('Failed to delete comment: ' + err.message)
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

  if (loading) return <div className="p-6 flex justify-center text-white bg-gray-900 min-h-screen">Loading forum...</div>
  if (error) return <div className="p-6 flex justify-center text-red-400 bg-gray-900 min-h-screen">{error}</div>
  if (!forum) return <div className="p-6 flex justify-center text-white bg-gray-900 min-h-screen">Forum not found</div>

  const sortedComments = getSortedComments()

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-6">
      <div className="w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => router.back()} className="text-blue-400 hover:text-blue-300">
            &larr; Back
          </button>
          {forum.canManage && (
            <div className="flex items-center gap-2">
              <Link href={`/creator-main-page/forums/view-forums/${forumId}/edit-forums`}>
                <button
                  className="bg-gray-600 hover:bg-gray-500 text-white px-3 py-1 rounded text-sm font-semibold transition"
                >
                  Edit Forum
                </button>
              </Link>
              <button
                onClick={handleDeleteForum}
                className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm font-semibold transition"
              >
                Delete Forum
              </button>
            </div>
          )}
        </div>

        <div className="bg-gray-800 border border-gray-600 rounded-lg p-6 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <h1 className="text-3xl font-bold">{forum.title}</h1>
            {forum.isCreator && <span className="px-2 py-1 bg-purple-600 text-white text-xs font-semibold rounded">Creator</span>}
            {forum.linkedCourseId && <span className="px-2 py-1 bg-blue-600 text-white text-xs font-semibold rounded">Course Linked</span>}
          </div>
          <p className="text-white mb-2">Topic: {forum.topic}</p>
          <p className="text-white">{forum.description}</p>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4">Comments ({comments.length})</h2>

          <form onSubmit={handleAddComment} className="mb-6 bg-gray-800 p-4 rounded-lg border border-gray-600">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share your thoughts on this forum..."
              className="w-full p-3 border border-gray-600 rounded mb-3 bg-gray-700 text-white"
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
              className={`px-4 py-2 rounded ${sortBy === 'recent' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'}`}
            >
              Most Recent
            </button>
            <button
              onClick={() => setSortBy('liked')}
              className={`px-4 py-2 rounded ${sortBy === 'liked' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'}`}
            >
              Most Liked
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {sortedComments.length === 0 ? (
              <p className="text-white text-center py-4">No comments yet. Be the first to comment!</p>
            ) : (
              sortedComments.map((comment) => (
                  <div key={comment.id} className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                  <p className="text-sm text-gray-300 mb-2 font-semibold">{comment.userName}</p>
                  <p className="text-white mb-3">{comment.text}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-300">{comment.createdAt.toLocaleDateString()} {comment.createdAt.toLocaleTimeString()}</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleDeleteComment(comment.id)}
                        className="text-red-400 hover:text-red-300 font-semibold transition"
                      >
                        Delete
                      </button>
                      <button
                        onClick={() => handleToggleLikeComment(comment.id, !!comment.liked)}
                        disabled={!!liking[comment.id]}
                        className={`px-3 py-1 rounded ${comment.liked ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'} ${liking[comment.id] ? 'opacity-60 cursor-not-allowed' : ''}`}
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
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
