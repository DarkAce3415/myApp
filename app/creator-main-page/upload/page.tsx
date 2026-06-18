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
  duration?: number;
}

export default function CreatorUploadPage() {
  const router = useRouter()
  const [lessons, setLessons] = useState<LessonData[]>([
    { title: 'Lesson 1', description: '' },
    { title: 'Lesson 2', description: '' }
  ])
  const [description, setDescription] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [courseThumbnail, setCourseThumbnail] = useState<string | null>(null)
  const [price, setPrice] = useState<number | ''>(50000)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null)
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [submitStatus, setSubmitStatus] = useState<'Published' | 'Drafted'>('Published')
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    'IoT',
    'Deep Learning',
    'Video Recognition',
    'Machine Learning',
    'Natural Language Processing',
    'Robotics',
  ]

  const handleSubmit = async (e?: React.FormEvent, skipConfirm = false) => {
    if (e) e.preventDefault();
    setMessage(null)
    setMessageType(null)
    setMissingFields([])

    const newMissingFields: string[] = []
    if (!title.trim()) newMissingFields.push('title')
    if (!category) newMissingFields.push('category')
    if (!price || price < 50000) newMissingFields.push('price')
    if (lessons.length === 0) newMissingFields.push('lessons')
    if (!description.trim()) newMissingFields.push('description')

    if (newMissingFields.length > 0) {
      setMessage('Please fill in all fields, add at least one lesson.')
      setMessageType('error')
      setMissingFields(newMissingFields)
      return
    }
    if (!auth.currentUser) {
      setMessage('You must be logged in to upload.')
      setMessageType('error')
      return
    }

    if (submitStatus === 'Published' && !skipConfirm) {
      setShowPublishConfirm(true);
      return;
    }

    setLoading(true)

    try {
      await addDoc(collection(db, 'courses'), {
        creatorId: auth.currentUser.uid, 
        title: title.trim(),
        category,
        description: description.trim(),
        lessons: lessons,
        courseThumbnail: courseThumbnail,
        price: Number(price),
        status: submitStatus,
        createdAt: serverTimestamp(),
      })

      setMessage('Course uploaded successfully!')
      setMessageType('success')
      setDescription('')
      setTitle('')
      setCategory('')
      setCourseThumbnail(null)
      setPrice(50000)
      router.push('/creator-main-page') 
      setLessons([
        { title: 'Lesson 1', description: '' },
        { title: 'Lesson 2', description: '' }
      ]);
    } catch (err: any) {
      setMessage(err?.message || 'Upload failed.')
      setMessageType('error')
    } finally {
      setLoading(false)
    }
    
  }

  const handleAddLesson = () => {
    if (lessons.length >= 15) {
      setMessage('Maximum of 15 lesson modules allowed.')
      setMessageType('error')
      return
    }
    setLessons((prevLessons) => [
      ...prevLessons,
      { title: `Lesson ${prevLessons.length + 1}`, description: '' },
    ]);
    if (missingFields.includes('lessons')) {
      setMissingFields(prev => prev.filter(f => f !== 'lessons'))
    }
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

  const handleLessonVideoUpload = (index: number, url: string, filename: string, duration: number) => {
    setLessons(prevLessons => {
      const newLessons = [...prevLessons];
      newLessons[index] = { ...newLessons[index], url, duration };
      return newLessons;
    });
    setMessage(`Uploaded: ${filename}`);
    setMessageType('success');
  };

  const handleDeleteLesson = (indexToDelete: number) => {
    if (indexToDelete < 2) return; // The first two modules cannot be deleted
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
      return newLessons;
    });
  }


  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-gray-800 text-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-4 text-center">Upload Course</h1>
        <p className="text-sm text-gray-400 text-center mb-4">Fields marked with <span className="text-red-500">*</span> are required.</p>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium">Course Title <span className="text-red-500">*</span></label>
            <span className="text-xs text-gray-400">{title.length}/75</span>
          </div>
          <input
            type="text"
            maxLength={75}
            value={title}
            onChange={(e) => {
              setTitle(e.target.value)
              if (missingFields.includes('title')) {
                setMissingFields(prev => prev.filter(f => f !== 'title'))
              }
            }}
            className={`w-full px-3 py-2 rounded border focus:outline-none ${
              missingFields.includes('title') ? 'border-red-500 bg-red-50 text-red-900 placeholder-red-400' : 'border-gray-600 bg-gray-700 text-white focus:border-white'
            }`}
            placeholder="Enter course title"
          />

          <label className="block text-sm font-medium">Category <span className="text-red-500">*</span></label>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              if (missingFields.includes('category')) {
                setMissingFields(prev => prev.filter(f => f !== 'category'))
              }
            }}
            className={`w-full px-3 py-2 rounded border focus:outline-none ${
              missingFields.includes('category') ? 'border-red-500 bg-red-50 text-red-900' : 'border-gray-600 bg-gray-700 text-white focus:border-white'
            }`}
          >
            <option value="">Select a category</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          <label className="block text-sm font-medium">Price (IDR) <span className="text-red-500">*</span></label>
          <input
            type="number"
            value={price}
            onChange={(e) => {
              setPrice(e.target.value === '' ? '' : Number(e.target.value))
              if (missingFields.includes('price')) {
                setMissingFields(prev => prev.filter(f => f !== 'price'))
              }
            }}
            className={`w-full px-3 py-2 rounded border focus:outline-none ${
              missingFields.includes('price') ? 'border-red-500 bg-red-50 text-red-900 placeholder-red-400' : 'border-gray-600 bg-gray-700 text-white focus:border-white'
            }`}
            placeholder="Enter course price (min. 50000)"
            min="50000"
          />

          <label className="block text-sm font-medium">Course Thumbnail</label>
          <div className="flex items-center gap-4 mb-4">
            {courseThumbnail && (
              <img src={courseThumbnail} alt="Course Thumbnail" className="w-24 h-16 object-cover rounded" />
            )}
            <CldUploadWidget uploadPreset="next_js_cloudinary" onSuccess={(result: any) => {
              setCourseThumbnail(result.info.secure_url);
              setMessage(`Uploaded: ${result.info.original_filename}`);
              setMessageType('success');
            }}>
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
            <div className="flex justify-between items-center">
              <label className="block text-sm font-medium">Course Lessons <span className="text-red-500">*</span></label>
              <span className="text-xs text-gray-400">{lessons.length}/15</span>
            </div>
            <button
              type="button"
              onClick={handleAddLesson}
              disabled={lessons.length >= 15}
              className={`w-full px-3 py-2 rounded border border-dashed transition ${
                missingFields.includes('lessons') ? 'border-red-500 bg-red-50 text-red-900' : 'border-gray-600 bg-gray-700 text-white hover:bg-gray-600'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
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
                    {index >= 2 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteLesson(index)}
                        className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    )}
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
                      options={{ resourceType: 'video' }}
                      uploadPreset="next_js_cloudinary"
                      onSuccess={(result: any) => handleLessonVideoUpload(index, result.info.secure_url, result.info.original_filename, result.info.duration)}
                    >
                      {({ open }) => (
                        <button type="button" onClick={() => open()} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition">
                          {lesson.url ? 'Change Video' : 'Upload Video'}
                        </button>
                      )}
                    </CldUploadWidget>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium">Description <span className="text-red-500">*</span></label>
            <span className="text-xs text-gray-400">{description.length}/300</span>
          </div>
          <textarea
            value={description}
            maxLength={300}
            onChange={(e) => {
              setDescription(e.target.value)
              if (missingFields.includes('description')) {
                setMissingFields(prev => prev.filter(f => f !== 'description'))
              }
            }}
            className={`w-full px-3 py-2 rounded border focus:outline-none ${
              missingFields.includes('description') ? 'border-red-500 bg-red-50 text-red-900 placeholder-red-400' : 'border-gray-600 bg-gray-700 text-white focus:border-white'
            }`}
            rows={4}
            placeholder="Enter detailed description for the course..."
          />

          <div className="flex gap-4 mt-2">
            <button
              type="submit"
              onClick={() => setSubmitStatus('Published')}
              disabled={loading || lessons.length === 0}
              className="flex-1 py-2 rounded bg-white text-black font-semibold hover:opacity-90 transition disabled:opacity-50"
            >
              {loading && submitStatus === 'Published' ? 'Publishing...' : 'Publish'}
            </button>
            <button
              type="submit"
              onClick={() => setSubmitStatus('Drafted')}
              disabled={loading || lessons.length === 0}
              className="flex-1 py-2 rounded border border-gray-600 bg-gray-700 text-white font-semibold hover:bg-gray-600 transition disabled:opacity-50"
            >
              {loading && submitStatus === 'Drafted' ? 'Saving...' : 'Save Draft'}
            </button>
          </div>

          {message && (
            <div
              className={`text-sm mt-4 p-3 rounded text-center font-medium ${
                messageType === 'success' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'
              }`}
            >
              {message}
            </div>
          )}
        </form>
      </div>

      {showPublishConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg max-w-sm w-full text-center border border-gray-600 shadow-xl">
            <h2 className="text-xl font-bold mb-4 text-white">Publish Course?</h2>
            <p className="mb-6 text-gray-300">Are you sure you want to publish this course? Published courses cannot be edited further.</p>
            <div className="flex gap-4 justify-center">
              <button 
                type="button"
                onClick={() => setShowPublishConfirm(false)} 
                className="px-4 py-2 border border-gray-500 rounded text-white hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={() => { setShowPublishConfirm(false); handleSubmit(undefined, true); }} 
                className="px-4 py-2 bg-white text-black font-semibold rounded hover:opacity-90 transition"
              >
                Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
