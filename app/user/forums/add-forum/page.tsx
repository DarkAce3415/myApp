'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { db, auth } from '../../../lib/ClientApp'
import { collection, addDoc, serverTimestamp, setDoc, doc, increment, getDoc, getDocs } from 'firebase/firestore' 

interface ForumFormData {
  title: string
  description: string
  topic?: string
  userId?: string
  isCreator?: boolean
  linkedCourseId?: string
}

export default function UserCreateForumPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<ForumFormData>({
    title: '',
    description: '',
    topic: 'Machine Learning',
    userId: auth.currentUser?.uid || '',
    isCreator: false,
    linkedCourseId: '',
  })
  // AI-related topics only
  const [topics] = useState<string[]>([
    'Machine Learning',
    'Deep Learning',
    'Natural Language Processing',
    'Computer Vision',
    'Robotics',
    'AI Ethics',
    'Generative AI',
    'Neural Networks',
  ])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([])

  useEffect(() => {
    const fetchCourses = async () => {
      const uid = auth.currentUser?.uid
      if (!uid) return
      
      try {
        // Fetch user's purchased courses so they can link forums to courses they own
        const userDocRef = doc(db, 'users', uid)
        const userDocSnap = await getDoc(userDocRef)
        const purchasedCourses = userDocSnap.exists() ? (userDocSnap.data().purchasedCourses || []) : []
        
        if (purchasedCourses.length > 0) {
          const coursesSnapshot = await getDocs(collection(db, 'courses'))
          const coursesList = coursesSnapshot.docs
            .filter(doc => purchasedCourses.includes(doc.id))
            .map(doc => ({
              id: doc.id,
              title: doc.data().title || `Course ${doc.id}`
            }))
          setCourses(coursesList)
        }
      } catch (err) {
        console.error('Failed to fetch courses:', err)
      }
    }
    
    fetchCourses()
  }, [])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target as HTMLInputElement
    setFormData((prevData) => ({ ...prevData, [name]: value }))
    if (missingFields.includes(name)) {
      setMissingFields((prev) => prev.filter((field) => field !== name))
    }
  }

  const slugify = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(null)
    setMissingFields([])

    const newMissingFields: string[] = []
    if (!formData.title.trim()) newMissingFields.push('title')
    if (!formData.topic) newMissingFields.push('topic')
    if (!formData.description.trim()) newMissingFields.push('description')

    if (newMissingFields.length > 0) {
      setError('Please fill in all required fields.')
      setMissingFields(newMissingFields)
      setLoading(false)
      return
    }

    try {
      const forumPayload = {
        ...formData,
        createdAt: serverTimestamp(),
      }
      
      if (!forumPayload.linkedCourseId?.trim()) {
        delete forumPayload.linkedCourseId
      }

      await addDoc(collection(db, 'forums'), forumPayload)

      const topicId = slugify(formData.topic || 'general') || 'general'
      await setDoc(doc(db, 'topics', topicId), {
        name: formData.topic,
        updatedAt: serverTimestamp(),
        count: increment(1),
      }, { merge: true })

      setSuccess('Forum created successfully! Redirecting...')
      setTimeout(() => {
        router.push('/user/forums')
      }, 1000)
    } catch (err: any) {
      setError('Failed to create forum: ' + err.message)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 text-black flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-lg p-8">
        <button onClick={() => router.back()} className="mb-4 text-blue-600 hover:text-blue-500">
          &larr; Back
        </button>
        <h1 className="text-2xl font-bold mb-4 text-center">Create New Forum</h1>
        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="title" className="block text-black text-sm font-bold">Forum Title:</label>
              <span className="text-xs text-gray-500">{formData.title.length}/75</span>
            </div>
            <input id="title" name="title" maxLength={75} value={formData.title} onChange={handleChange} className={`w-full border rounded py-2 px-3 focus:outline-none focus:border-black ${missingFields.includes('title') ? 'border-red-500 bg-red-50 text-red-900 placeholder-red-400' : 'border-gray-300 bg-white text-black'}`} />
          </div>

          <div>
            <label htmlFor="topic" className="block text-black text-sm font-bold mb-2">Topic:</label>
            <select id="topic" name="topic" value={formData.topic} onChange={handleChange} className={`w-full border rounded py-2 px-3 focus:outline-none focus:border-black ${missingFields.includes('topic') ? 'border-red-500 bg-red-50 text-red-900' : 'border-gray-300 bg-white text-black'}`}>
              {topics.map((t) => (
                <option value={t} key={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="linkedCourseId" className="block text-black text-sm font-bold mb-2">Linked Course (Optional):</label>
            <select id="linkedCourseId" name="linkedCourseId" value={formData.linkedCourseId} onChange={handleChange} className="w-full border rounded py-2 px-3 focus:outline-none focus:border-black bg-white text-black">
              <option value="">None (Public Forum)</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="description" className="block text-black text-sm font-bold">Description:</label>
              <span className="text-xs text-gray-500">{formData.description.length}/300</span>
            </div>
            <textarea id="description" name="description" maxLength={300} value={formData.description} onChange={handleChange} className={`w-full border rounded py-2 px-3 focus:outline-none focus:border-black h-32 ${missingFields.includes('description') ? 'border-red-500 bg-red-50 text-red-900 placeholder-red-400' : 'border-gray-300 bg-white text-black'}`}></textarea>
          </div>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 text-sm p-3 rounded text-center font-medium shadow-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-100 border border-green-400 text-green-700 text-sm p-3 rounded text-center font-medium shadow-sm">
              {success}
            </div>
          )}
          <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none disabled:opacity-60">
            {loading ? 'Creating...' : 'Create Forum'}
          </button>
        </form>
      </div>
    </div>
  )
}
