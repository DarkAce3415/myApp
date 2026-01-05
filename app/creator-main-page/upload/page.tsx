'use client'

import React, { useState } from 'react'
import { auth, db } from '../../lib/ClientApp'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { CldUploadWidget } from 'next-cloudinary'


export default function CreatorUploadPage() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [description, setDescription] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const categories = [
    'IoT',
    'Deep Learning',
    'Video Recognition',
    'Machine Learning',
    'Natural Language Processing',
    'Robotics',
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!videoUrl || !description.trim() || !title.trim() || !category) {
      setMessage('Please fill in all fields and upload a video.')
      return
    }
    if (!auth.currentUser) {
      setMessage('You must be logged in to upload.')
      return
    }

    setLoading(true)
    setMessage(null)

    try {
      await addDoc(collection(db, 'courses'), {
        creatorId: auth.currentUser.uid, 
        title: title.trim(),
        category,
        description: description.trim(),
        videoUrl,
        createdAt: serverTimestamp(),
      })

      setMessage('Course uploaded successfully!')
      setVideoUrl(null)
      setDescription('')
      setTitle('')
      setCategory('')
    } catch (err: any) {
      setMessage(err?.message || 'Upload failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white text-black rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-4 text-center">Upload Course</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium">Course Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded border border-black bg-white text-black focus:outline-none"
            placeholder="Enter course title"
            required
          />

          <label className="block text-sm font-medium">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 rounded border border-black bg-white text-black focus:outline-none"
            required
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <label className="block text-sm font-medium">Video File</label>
            <CldUploadWidget uploadPreset="next_js_cloudinary"
              onSuccess={(result: any) => {
                setVideoUrl(result.info.secure_url)
                setMessage('Video uploaded successfully!')
            }}
          >
            {({ open }) => {
              return (
                <button
                  type="button"
                  onClick={() => open()}
                  className="w-full px-3 py-2 rounded border border-black bg-white text-black hover:bg-gray-100 transition"
                >
                  {videoUrl ? 'Video Uploaded' : 'Upload Video'}
                </button>
              )
            }}
          </CldUploadWidget>

          <label className="block text-sm font-medium">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 rounded border border-black bg-white text-black focus:outline-none"
            rows={4}
            placeholder="Enter detailed description for the course..."
            required
          />

          <button
            type="submit"
            disabled={loading || !videoUrl}
            className="w-full mt-2 py-2 rounded bg-black text-white font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Course'}
          </button>

          {message && <p className="text-sm mt-2">{message}</p>}
        </form>
      </div>
    </div>
  )
}
