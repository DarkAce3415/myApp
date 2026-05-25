'use client'

import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '../../lib/ClientApp'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { CldUploadWidget } from 'next-cloudinary'
 
interface LessonData {
  title: string;
  description: string;
  url?: string;
}

export default function CreatorUploadPage() {
  const router = useRouter()
  const [lessons, setLessons] = useState<LessonData[]>([])
  const [description, setDescription] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [courseThumbnail, setCourseThumbnail] = useState<string | null>(null)
  const [price, setPrice] = useState<number | ''>(50000)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    'IoT',
    'Deep Learning',
    'Video Recognition',
    'Machine Learning',
    'Natural Language Processing',
    'Robotics',
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lessons.length === 0 || !description.trim() || !title.trim() || !category || !price || price < 50000) {
      setMessage('Please fill in all fields, add at least one lesson, and set a price of at least 50,000.')
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
        lessons: lessons,
        courseThumbnail: courseThumbnail,
        price: Number(price),
        createdAt: serverTimestamp(),
      })

      setMessage('Course uploaded successfully!')
      setDescription('')
      setTitle('')
      setCategory('')
      setCourseThumbnail(null)
      setPrice(50000)
      router.push('/creator-main-page') 
      setLessons([]);
    } catch (err: any) {
      setMessage(err?.message || 'Upload failed.')
    } finally {
      setLoading(false)
    }
    
  }

  const handleAddLesson = () => {
    setLessons((prevLessons) => [
      ...prevLessons,
      { title: `Lesson ${prevLessons.length + 1}`, description: '' },
    ]);
  };

  const handleLessonTitleChange = (index: number, newTitle: string) => {
    setLessons((prevLessons) => {
      const newLessons = [...prevLessons];
      newLessons[index] = { ...newLessons[index], title: newTitle };
      return newLessons;
    });
  };

  const handleLessonDescriptionChange = (index: number, newDescription: string) => {
    setLessons((prevLessons) => {
      const newLessons = [...prevLessons];
      newLessons[index] = { ...newLessons[index], description: newDescription };
      return newLessons;
    });
  };

  const handleLessonVideoUpload = (index: number, url: string) => {
    setLessons(prevLessons => {
      const newLessons = [...prevLessons];
      newLessons[index] = { ...newLessons[index], url };
      return newLessons;
    });
    setMessage('Video uploaded for lesson.');
  };

  const handleDeleteLesson = (indexToDelete: number) => {
    if (window.confirm('Are you sure you want to delete this lesson?')) {
      setLessons((prevLessons) => prevLessons.filter((_, index) => index !== indexToDelete));
    }
  }

  const handleMoveLesson = (index: number, direction: 'up' | 'down') => {
    setLessons((prevLessons) => {
      const newLessons = [...prevLessons];
      if (direction === 'up' && index > 0) {
        [newLessons[index - 1], newLessons[index]] = [newLessons[index], newLessons[index - 1]];
      } else if (direction === 'down' && index < newLessons.length - 1) {
        [newLessons[index + 1], newLessons[index]] = [newLessons[index], newLessons[index + 1]];
      }
      setMessage('Lesson order changed. Remember to save the course to make it permanent.');
      return newLessons;
    });
  }


  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-gray-800 text-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-4 text-center">Upload Course</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block text-sm font-medium">Course Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded border border-gray-600 bg-gray-700 text-white focus:outline-none focus:border-white"
            placeholder="Enter course title"
            required
          />

          <label className="block text-sm font-medium">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 rounded border border-gray-600 bg-gray-700 text-white focus:outline-none focus:border-white"
            required
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <label className="block text-sm font-medium">Price (IDR)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full px-3 py-2 rounded border border-gray-600 bg-gray-700 text-white focus:outline-none focus:border-white"
            placeholder="Enter course price (min. 50000)"
            min="50000"
            required
          />

          <label className="block text-sm font-medium">Course Thumbnail</label>
          <div className="flex items-center gap-4 mb-4">
            {courseThumbnail && (
              <img src={courseThumbnail} alt="Course Thumbnail" className="w-24 h-16 object-cover rounded" />
            )}
            <CldUploadWidget uploadPreset="next_js_cloudinary" onSuccess={(result: any) => setCourseThumbnail(result.info.secure_url)}>
              {({ open }) => (
                <button
                  type="button"
                  onClick={() => open()}
                  className="px-3 py-2 rounded border border-gray-600 bg-gray-700 text-white hover:bg-gray-600 transition"
                >
                  {courseThumbnail ? 'Change Thumbnail' : 'Upload Thumbnail'}
                </button>
              )}
            </CldUploadWidget>
          </div>

          <div className="space-y-2">
            <label className="block text-sm font-medium">Course Lessons</label>
            <button
              type="button"
              onClick={handleAddLesson}
              className="w-full px-3 py-2 rounded border border-dashed border-gray-600 bg-gray-700 text-white hover:bg-gray-600 transition"
            >
              + Add Lesson Module
            </button>
          </div>

          {lessons.length > 0 && (
            <div className="mt-4 space-y-4">
              <h3 className="text-lg font-semibold">Lesson Modules</h3>
              {lessons.map((lesson, index) => (
                <div key={index} className="border border-gray-600 bg-gray-700 rounded p-3 flex flex-col gap-2">
                  <div className="flex justify-between items-center">
                    <p className="font-bold">Lesson {index + 1}</p>
                    <button
                      type="button"
                      onClick={() => handleDeleteLesson(index)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                  <input
                    type="text"
                    value={lesson.title}
                    onChange={(e) => handleLessonTitleChange(index, e.target.value)}
                    className="w-full border border-gray-600 rounded p-2 text-sm font-medium bg-gray-600 text-white"
                    placeholder={`Lesson ${index + 1} Title`}
                  />
                  <textarea
                    value={lesson.description}
                    onChange={(e) => handleLessonDescriptionChange(index, e.target.value)}
                    className="w-full border border-gray-600 rounded p-2 text-sm bg-gray-600 text-white"
                    placeholder={`Lesson ${index + 1} Description`}
                    rows={3}
                    required
                  />
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleMoveLesson(index, 'up')}
                        disabled={index === 0}
                        className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-50"
                      >
                        Up
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveLesson(index, 'down')}
                        disabled={index === lessons.length - 1}
                        className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-50"
                      >
                        Down
                      </button>
                    </div>
                    <CldUploadWidget
                      uploadPreset="next_js_cloudinary"
                      onSuccess={(result: any) => handleLessonVideoUpload(index, result.info.secure_url)}
                    >
                      {({ open }) => (
                        <button type="button" onClick={() => open()} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition">
                          {lesson.url ? 'Change Video' : 'Upload Video'}
                        </button>
                      )}
                    </CldUploadWidget>
                  </div>
                  {lesson.url && <p className="text-xs text-green-400 truncate mt-1">Video Uploaded</p>}
                </div>
              ))}
            </div>
          )}

          <label className="block text-sm font-medium">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 rounded border border-gray-600 bg-gray-700 text-white focus:outline-none focus:border-white"
            rows={4}
            placeholder="Enter detailed description for the course..."
            required
          />

          <button
            type="submit"
            disabled={loading || lessons.length === 0}
            className="w-full mt-2 py-2 rounded bg-white text-black font-semibold hover:opacity-90 transition disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Course'}
          </button>

          {message && <p className="text-sm mt-2">{message}</p>}
        </form>
      </div>
    </div>
  )
}
