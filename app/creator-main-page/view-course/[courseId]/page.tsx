'use client'

import React, { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../../lib/ClientApp'

export default function EditCoursePage() {
  const router = useRouter()
  const params = useParams()
  // Handle potential array or undefined params
  const courseId = Array.isArray(params?.courseId) ? params.courseId[0] : params?.courseId
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return
      try {
        const docRef = doc(db, 'courses', courseId)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          const data = docSnap.data()
          setTitle(data.title || '')
          setDescription(data.description || '')
        }
      } catch (error) {
        console.error('Error fetching course:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchCourse()
  }, [courseId])

  const handleUpdate = async () => {
    if (!courseId) return
    try {
      const docRef = doc(db, 'courses', courseId)
      await updateDoc(docRef, {
        title,
        description
      })
      alert('Course updated successfully')
      router.push('/creator-main-page')
    } catch (error) {
      console.error('Error updating course:', error)
      alert('Failed to update course')
    }
  }

  if (loading) return <div className="p-6 flex justify-center">Loading...</div>
  if (!courseId) return <div className="p-6 flex justify-center">Invalid Course ID</div>

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center p-6">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        <h1 className="text-2xl font-bold">Edit Course</h1>
        
        <div className="flex flex-col gap-2">
          <label className="font-semibold">Title</label>
          <input 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            className="border border-black rounded p-2"
            placeholder="Course Title"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-semibold">Description</label>
          <textarea 
            value={description} 
            onChange={(e) => setDescription(e.target.value)}
            className="border border-black rounded p-2 h-32"
            placeholder="Course Description"
          />
        </div>

        <div className="flex gap-4">
          <button 
            onClick={handleUpdate}
            className="px-6 py-2 bg-black text-white rounded font-semibold hover:opacity-90 transition"
          >
            Save Changes
          </button>
          <button 
            onClick={() => router.back()}
            className="px-6 py-2 border border-black rounded font-semibold hover:bg-gray-100 transition"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}