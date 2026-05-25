'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { CldUploadWidget } from 'next-cloudinary'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../../lib/ClientApp'
import { deleteDoc } from 'firebase/firestore';

interface LessonData {
  title: string;
  description: string;
  url?: string;
}

export default function EditCoursePage() {
  const router = useRouter()
  const params = useParams()
  const courseId = Array.isArray(params?.courseId) ? params.courseId[0] : params?.courseId
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [lessons, setLessons] = useState<LessonData[]>([])
  const [courseThumbnail, setCourseThumbnail] = useState<string | null>(null); 
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState<number | ''>('');

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return
      try {
        const docRef = doc(db, 'courses', courseId)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          const data = docSnap.data()
          setTitle(data.title || '')  
          
          const fetchedLessons = data.lessons || data.videoUrls?.map((item: string | any, index: number) => 
            typeof item === 'string' 
              ? { title: `Lesson ${index + 1}`, description: '', url: item } 
              : { title: item.title || `Lesson ${index + 1}`, description: item.description || '', url: item.url }
          ) || []
          setLessons(fetchedLessons)
          setDescription(data.description || '')
          setCategory(data.category || '');
          setCourseThumbnail(data.courseThumbnail || null);
          setPrice(data.price || '');
        }
      } catch (error) {
        console.error('Error fetching course:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchCourse()
  }, [courseId])

  const handleUpdate = useCallback(async () => {
    if (!courseId) return
    if (!price || Number(price) < 50000) {
      alert('Price must be at least 50,000.');
      return;
    }
    if (lessons.some(l => !l.title.trim() || !l.description.trim())) {
      alert('All lessons must have a valid title and description.');
      return;
    }
    try {
      const docRef = doc(db, 'courses', courseId)
      await updateDoc(docRef, {
        title,
        description,
        lessons: lessons, 
        courseThumbnail: courseThumbnail || null, 
        category,
        price: Number(price),
      })
      alert('Course updated successfully')
      router.push('/creator-main-page')
    } catch (error) {
      console.error('Error updating course:', error)
      alert('Failed to update course')
    }
  }, [courseId, title, description, lessons, courseThumbnail, router, category, price])

  const handleDeleteCourse = useCallback(async () => {
    if (!courseId) return;

    if (window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      try {
        const docRef = doc(db, 'courses', courseId);
        await deleteDoc(docRef);

        alert('Course deleted successfully!');
        router.push('/creator-main-page');
      } catch (error) {
        console.error('Error deleting course:', error);
        alert('Failed to delete course.');
      }

    }
  }, [courseId, router])

  const handleLessonTitleChange = useCallback((index: number, newTitle: string) => {
    setLessons((prevLessons) => {
      const newLessons = [...prevLessons];
      newLessons[index] = { ...newLessons[index], title: newTitle };
      return newLessons;
    });
  }, []);

  const handleLessonDescriptionChange = useCallback((index: number, newDescription: string) => {
    setLessons((prevLessons) => {
      const newLessons = [...prevLessons];
      newLessons[index] = { ...newLessons[index], description: newDescription };
      return newLessons;
    });
  }, []);

  const handleLessonVideoUpload = useCallback((index: number, url: string) => {
    setLessons((prevLessons) => {
      const newLessons = [...prevLessons];
      newLessons[index] = { ...newLessons[index], url };
      return newLessons;
    });
    setMessage('Video uploaded for lesson. Remember to save changes.');
  }, []);

  const handleDeleteLesson = useCallback((indexToDelete: number) => {
    if (window.confirm('Are you sure you want to delete this lesson?')) {
      setLessons((prevLessons) => prevLessons.filter((_, index) => index !== indexToDelete))
      setMessage('Lesson deleted. Remember to save changes.')
    }
  }, [])

  const handleMoveLesson = useCallback((index: number, direction: 'up' | 'down') => {
    setLessons((prevLessons) => {
      const newLessons = [...prevLessons];
      if (direction === 'up' && index > 0) {
        [newLessons[index - 1], newLessons[index]] = [newLessons[index], newLessons[index - 1]];
      } else if (direction === 'down' && index < newLessons.length - 1) {
        [newLessons[index + 1], newLessons[index]] = [newLessons[index], newLessons[index + 1]];
      }
      setMessage('Lesson order changed. Remember to save changes.');
      return newLessons;
    });
  }, [])
  
  const handleAddLesson = useCallback(() => {
    setLessons((prevLessons) => [
      ...prevLessons,
      { title: `Lesson ${prevLessons.length + 1}`, description: '' },
    ]);
    setMessage('New lesson added. Remember to save changes.');
  }, []);

  const handleCourseThumbnailUpload = useCallback((url: string) => {
    setCourseThumbnail(url);
    setMessage('Course thumbnail uploaded. Remember to save changes.');
  }, []);
  
  if (loading) return <div className="p-6 flex justify-center text-white bg-gray-900 min-h-screen">Loading...</div>
  if (!courseId) return <div className="p-6 flex justify-center text-white bg-gray-900 min-h-screen">Invalid Course ID</div>

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-6">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        <h1 className="text-2xl font-bold">Edit Course</h1>
        
        <div className="flex flex-col gap-2">
          <label className="font-semibold">Title</label>
          <input 
            type="text" 
            value={title} 
            onChange={(e) => setTitle(e.target.value)}
            className="border border-gray-600 rounded p-2 bg-gray-800 text-white focus:outline-none focus:border-white"
            placeholder="Course Title"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-semibold">Description</label>
          <textarea 
            value={description} 
            onChange={(e) => setDescription(e.target.value)}
            className="border border-gray-600 rounded p-2 h-32 bg-gray-800 text-white focus:outline-none focus:border-white"
            placeholder="Course Description"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-semibold">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border border-gray-600 rounded p-2 bg-gray-800 text-white focus:outline-none focus:border-white"
          >
            <option value="">Select a category</option>
            {['IoT', 'Deep Learning', 'Video Recognition', 'Machine Learning', 'Natural Language Processing', 'Robotics'].map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label className="font-semibold">Price (IDR)</label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))}
            className="border border-gray-600 rounded p-2 bg-gray-800 text-white focus:outline-none focus:border-white"
            placeholder="Course Price (min. 50000)"
            min="50000"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-semibold">Course Thumbnail</label>
          <div className="flex items-center gap-4">
            {courseThumbnail && (
              <img src={courseThumbnail} alt="Course Thumbnail" className="w-32 h-20 object-cover rounded" />
            )}
            <CldUploadWidget uploadPreset="next_js_cloudinary" onSuccess={(result: any) => handleCourseThumbnailUpload(result.info.secure_url)}>
              {({ open }) => (
                <button
                  type="button"
                  onClick={() => open()}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  {courseThumbnail ? 'Change Thumbnail' : 'Upload Thumbnail'}
                </button>
              )}
            </CldUploadWidget>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center mb-2">
            <label className="font-semibold">Course Lessons</label>
            <button
              type="button"
              onClick={handleAddLesson}
              className="px-3 py-1 text-sm bg-gray-800 text-white border border-gray-600 border-dashed rounded hover:bg-gray-700 transition"
            >
              + Add Lesson Module
            </button>
          </div>
          
          {lessons.length === 0 ? (
            <p className="text-gray-400">No lessons added for this course yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {lessons.map((lesson, index) => (
                <div key={index} className="border border-gray-600 bg-gray-800 rounded p-3 flex flex-col gap-2">
                  <div className="flex justify-between items-center mb-1">
                    <p className="font-bold text-sm">Lesson {index + 1}</p>
                    <button
                      type="button"
                      onClick={() => handleDeleteLesson(index)}
                      className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                    >
                      Delete
                    </button>
                  </div>
                  <div className="flex-grow flex flex-col gap-2 w-full">
                    <input
                      type="text"
                      value={lesson.title}
                      onChange={(e) => handleLessonTitleChange(index, e.target.value)}
                      className="border border-gray-600 rounded p-2 text-sm font-medium bg-gray-700 text-white focus:outline-none focus:border-white"
                      placeholder={`Lesson ${index + 1} Title`}
                      required
                    />
                    <textarea
                      value={lesson.description}
                      onChange={(e) => handleLessonDescriptionChange(index, e.target.value)}
                      className="border border-gray-600 rounded p-2 text-sm bg-gray-700 text-white focus:outline-none focus:border-white"
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
                      <div className="flex flex-col items-end gap-1">
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
                    </div>
                    {lesson.url && <p className="text-xs text-green-400 truncate mt-1">Video: {lesson.url}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-4">
          <button 
            onClick={handleUpdate}
            className="px-6 py-2 bg-white text-black rounded font-semibold hover:opacity-90 transition"
          >
            Save Changes
          </button>
          <button 
            onClick={() => router.back()}
            className="px-6 py-2 border border-white text-white rounded font-semibold hover:bg-gray-800 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleDeleteCourse}
            className="px-6 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-700 transition"
            type="button"
          >
            Delete Course
          </button>
        </div>

        {message && <p className="text-sm mt-4 text-green-400">{message}</p>}
      </div>
    </div>
  )
}