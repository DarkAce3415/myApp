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
  duration?: number;
}

interface Student {
  id: string
  username: string
  email: string
  profilePicture?: string
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
  const [messageType, setMessageType] = useState<'success' | 'error' | null>(null)
  const [missingFields, setMissingFields] = useState<string[]>([])
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState<number | ''>('');
  const [status, setStatus] = useState<'Published' | 'Drafted'>('Drafted');
  const [students, setStudents] = useState<Student[]>([])
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)
  const [initialLessonCount, setInitialLessonCount] = useState(0)

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
              : { title: item.title || `Lesson ${index + 1}`, description: item.description || '', url: item.url, duration: item.duration }
          ) || []
          setLessons(fetchedLessons)
          setDescription(data.description || '')
          setCategory(data.category || '');
          setCourseThumbnail(data.courseThumbnail || null);
          setPrice(data.price || '');
          setStatus(data.status || 'Drafted');
          if (data.status === 'Published') {
            setInitialLessonCount(fetchedLessons.length);
          }

          const purchasedBy: string[] = data.purchasedBy || []
          if (purchasedBy.length > 0) {
            const studentsData = await Promise.all(
              purchasedBy.map(async (uid) => {
                const userRef = doc(db, 'users', uid)
                const userSnap = await getDoc(userRef)
                if (userSnap.exists()) {
                  const userData = userSnap.data()
                  return {
                    id: uid,
                    username: userData.username || 'Anonymous User',
                    email: userData.email || 'No email provided',
                    profilePicture: userData.profilePicture || ''
                  }
                }
                return { id: uid, username: 'Unknown User', email: 'N/A' }
              })
            )
            setStudents(studentsData)
          }
        }
      } catch (error) {
        console.error('Error fetching course:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchCourse()
  }, [courseId])

  const handleUpdate = useCallback(async (newStatus: 'Published' | 'Drafted', skipConfirm = false) => {
    if (!courseId) return
    
    setMessage(null)
    setMessageType(null)
    setMissingFields([])

    // Only validate complete data if the creator is trying to publish
    if (newStatus === 'Published') {
      const newMissingFields: string[] = []
      if (!title.trim()) newMissingFields.push('title')
      if (!category) newMissingFields.push('category')
      if (!price || Number(price) < 50000) newMissingFields.push('price')
      if (lessons.length === 0) newMissingFields.push('lessons')
      if (!description.trim()) newMissingFields.push('description')

      if (newMissingFields.length > 0) {
        setMessage('Please fill in all fields, add at least one lesson.')
        setMessageType('error')
        setMissingFields(newMissingFields)
        return
      }
      if (lessons.some(l => !l.title.trim() || !l.description.trim())) {
        setMessage('All lessons must have a valid title and description.');
        setMessageType('error')
        setMissingFields(['lessons'])
        return;
      }

      if (!skipConfirm && status !== 'Published') {
        setShowPublishConfirm(true);
        return;
      }
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
        status: newStatus,
      })
      setStatus(newStatus)
      if (newStatus === 'Published') {
        setInitialLessonCount(lessons.length)
      }
      setMessage(`Course ${newStatus === 'Published' ? 'published' : 'draft saved'} successfully! Redirecting...`)
      setMessageType('success')
      setTimeout(() => {
        router.push('/creator-main-page')
      }, 1500)
    } catch (error) {
      console.error('Error updating course:', error)
      setMessage('Failed to update course.')
      setMessageType('error')
    }
  }, [courseId, title, description, lessons, courseThumbnail, router, category, price, status])

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

  const handleLessonVideoUpload = useCallback((index: number, url: string, filename: string, duration?: number) => {
    setLessons((prevLessons) => {
      const newLessons = [...prevLessons];
      newLessons[index] = { ...newLessons[index], url, duration };
      return newLessons;
    });
    setMessage(`Uploaded: ${filename}. Remember to save changes.`);
    setMessageType('success');
  }, []);

  const handleDeleteLesson = useCallback((indexToDelete: number) => {
    if (window.confirm('Are you sure you want to delete this lesson?')) {
      setLessons((prevLessons) => prevLessons.filter((_, index) => index !== indexToDelete))
      setMessage('Lesson deleted. Remember to save changes.')
      setMessageType('success')
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
      setMessageType('success')
      return newLessons;
    });
  }, [])
  
  const handleAddLesson = useCallback(() => {
    if (lessons.length >= 15) {
      setMessage('Maximum of 15 lesson modules allowed.');
      setMessageType('error');
      return;
    }
    setLessons((prevLessons) => [
      ...prevLessons,
      { title: `Lesson ${prevLessons.length + 1}`, description: '' },
    ]);
    setMessage('New lesson added. Remember to save changes.');
    setMessageType('success');
    setMissingFields(prev => prev.filter(f => f !== 'lessons'));
  }, [lessons.length]);

  const handleCourseThumbnailUpload = useCallback((url: string, filename: string) => {
    setCourseThumbnail(url);
    setMessage(`Uploaded: ${filename}. Remember to save changes.`);
    setMessageType('success');
  }, []);
  
  const handleExportCSV = useCallback(() => {
    if (students.length === 0) {
      alert('No students to export.');
      return;
    }

    const headers = ['User ID', 'Username', 'Email', 'Payment Amount (IDR)'];
    const rows = students.map(student => [
      student.id,
      `"${student.username.replace(/"/g, '""')}"`,
      `"${student.email.replace(/"/g, '""')}"`,
      price || 0
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `students_course_${courseId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [students, price, courseId]);

  const formatDuration = (seconds: number) => {
    if (!seconds) return '0s';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) {
      return `${h}h ${m}m ${s}s`;
    }
    if (m > 0) {
      return `${m}m ${s}s`;
    }
    return `${s}s`;
  };
  const totalDuration = lessons.reduce((acc, lesson) => acc + (lesson.duration || 0), 0);

  if (loading) return <div className="p-6 flex justify-center text-white bg-gray-900 min-h-screen">Loading...</div>
  if (!courseId) return <div className="p-6 flex justify-center text-white bg-gray-900 min-h-screen">Invalid Course ID</div>

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-6">
      <div className="w-full max-w-2xl flex flex-col gap-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Edit Course</h1>
          <span className={`px-2 py-1 text-xs font-semibold rounded ${status === 'Published' ? 'bg-green-600' : 'bg-yellow-600'}`}>
            {status}
          </span>
        </div>
        
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="font-semibold">Title</label>
            <span className="text-xs text-gray-400">{title.length}/75</span>
          </div>
          <input 
            type="text" 
            maxLength={75}
            value={title} 
            onChange={(e) => {
              setTitle(e.target.value)
              if (missingFields.includes('title')) setMissingFields(prev => prev.filter(f => f !== 'title'))
            }}
          className={`border rounded p-2 focus:outline-none ${missingFields.includes('title') ? 'border-red-500 bg-red-50 text-red-900 placeholder-red-400' : 'border-gray-600 bg-gray-800 text-white focus:border-white'}`}
            placeholder="Course Title"
          />
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="font-semibold">Description</label>
            <span className="text-xs text-gray-400">{description.length}/300</span>
          </div>
          <textarea 
            value={description} 
            maxLength={300}
            onChange={(e) => {
              setDescription(e.target.value)
              if (missingFields.includes('description')) setMissingFields(prev => prev.filter(f => f !== 'description'))
            }}
          className={`border rounded p-2 h-32 focus:outline-none ${missingFields.includes('description') ? 'border-red-500 bg-red-50 text-red-900 placeholder-red-400' : 'border-gray-600 bg-gray-800 text-white focus:border-white'}`}
            placeholder="Course Description"
          />
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-semibold">Category</label>
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value)
              if (missingFields.includes('category')) setMissingFields(prev => prev.filter(f => f !== 'category'))
            }}
          className={`border rounded p-2 focus:outline-none ${missingFields.includes('category') ? 'border-red-500 bg-red-50 text-red-900' : 'border-gray-600 bg-gray-800 text-white focus:border-white'}`}
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
            onChange={(e) => {
              setPrice(e.target.value === '' ? '' : Number(e.target.value))
              if (missingFields.includes('price')) setMissingFields(prev => prev.filter(f => f !== 'price'))
            }}
          disabled={status === 'Published'}
          className={`border rounded p-2 focus:outline-none ${missingFields.includes('price') ? 'border-red-500 bg-red-50 text-red-900 placeholder-red-400' : 'border-gray-600 bg-gray-800 text-white focus:border-white'} ${status === 'Published' ? 'opacity-60 cursor-not-allowed' : ''}`}
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
            <CldUploadWidget uploadPreset="next_js_cloudinary" onSuccess={(result: any) => handleCourseThumbnailUpload(result.info.secure_url, result.info.original_filename)}>
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
          <div className="flex justify-between items-end mb-2">
            <div>
              <div className="flex items-center gap-2">
                <label className="font-semibold block">Course Lessons</label>
                <span className="text-xs text-gray-400">{lessons.length}/15</span>
              </div>
              {totalDuration > 0 && <span className="text-sm text-gray-400">Total Duration: {formatDuration(totalDuration)}</span>}
            </div>
            <button
              type="button"
              onClick={handleAddLesson}
              disabled={lessons.length >= 15}
              className={`px-3 py-1 text-sm border border-dashed rounded transition ${
                missingFields.includes('lessons') ? 'border-red-500 bg-red-50 text-red-900' : 'bg-gray-800 text-white border-gray-600 hover:bg-gray-700'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
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
                    {(status !== 'Published' || index >= initialLessonCount) && (
                      <button
                        type="button"
                        onClick={() => handleDeleteLesson(index)}
                        className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  <div className="flex-grow flex flex-col gap-2 w-full">
                    <input
                      type="text"
                      value={lesson.title}
                      onChange={(e) => handleLessonTitleChange(index, e.target.value)}
                    className={`border border-gray-600 rounded p-2 text-sm font-medium bg-gray-700 text-white focus:outline-none focus:border-white`}
                      placeholder={`Lesson ${index + 1} Title`}
                      required
                    />
                    <textarea
                      value={lesson.description}
                      onChange={(e) => handleLessonDescriptionChange(index, e.target.value)}
                    className={`border border-gray-600 rounded p-2 text-sm bg-gray-700 text-white focus:outline-none focus:border-white`}
                      placeholder={`Lesson ${index + 1} Description`}
                      rows={3}
                      required
                    />
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex gap-2">
                        {(status !== 'Published' || index >= initialLessonCount) && (
                          <>
                          <button
                            type="button"
                            onClick={() => handleMoveLesson(index, 'up')}
                              disabled={status === 'Published' ? index <= initialLessonCount : index === 0}
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
                          </>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {(status !== 'Published' || index >= initialLessonCount) && (
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
                        )}
                      </div>
                    </div>
                    {lesson.url && (
                      <div className="flex justify-between items-center mt-1">
                        <p className="text-xs text-green-400 truncate w-3/4">Video: {lesson.url}</p>
                        {lesson.duration && <p className="text-xs text-gray-400">{formatDuration(lesson.duration)}</p>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <label className="font-semibold">Enrolled Students ({students.length})</label>
            {status === 'Published' && students.length > 0 && (
              <button
                onClick={handleExportCSV}
                className="px-3 py-1 text-sm bg-green-600 text-white font-semibold rounded hover:bg-green-700 transition"
                type="button"
              >
                Export to CSV
              </button>
            )}
          </div>
          <div className="bg-gray-800 rounded p-4 border border-gray-600">
            {students.length === 0 ? (
               <p className="text-gray-400">No students are currently enrolled in this course.</p>
            ) : (
              <ul className="divide-y divide-gray-700 max-h-64 overflow-y-auto pr-2">
                {students.map((student) => (
                  <li key={student.id} className="py-3 flex items-center gap-4">
                    {student.profilePicture ? (
                      <img 
                        src={student.profilePicture} 
                        alt={student.username} 
                        className="w-10 h-10 rounded-full object-cover border border-gray-600 shrink-0"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center text-gray-300 font-bold shrink-0">
                        {student.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col">
                      <span className="font-semibold text-gray-100">{student.username}</span>
                      <span className="text-xs text-gray-400">{student.email}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-4">
          {status !== 'Published' ? (
            <>
              <button 
                onClick={() => handleUpdate('Published')}
                className="px-6 py-2 bg-white text-black rounded font-semibold hover:opacity-90 transition"
              >
                Publish
              </button>
              <button 
                onClick={() => handleUpdate('Drafted')}
                className="px-6 py-2 border border-gray-600 bg-gray-800 text-white rounded font-semibold hover:bg-gray-700 transition"
              >
                Save Draft
              </button>
            </>
          ) : (
            <button 
              onClick={() => handleUpdate('Published', true)}
              className="px-6 py-2 bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 transition"
            >
              Save Changes
            </button>
          )}

          <button 
            onClick={() => router.back()}
            className="px-6 py-2 border border-white text-white rounded font-semibold hover:bg-gray-800 transition"
          >
            {status === 'Published' ? 'Back' : 'Cancel'}
          </button>

          {status !== 'Published' && (
            <button
              onClick={handleDeleteCourse}
              className="px-6 py-2 bg-red-600 text-white rounded font-semibold hover:bg-red-700 transition"
              type="button"
            >
              Delete Course
            </button>
          )}
        </div>

        {message && (
          <div
            className={`text-sm mt-4 p-3 rounded text-center font-medium shadow-sm ${
              messageType === 'success' ? 'bg-green-900/50 border border-green-500 text-green-200' : 'bg-red-900/50 border border-red-500 text-red-200'
            }`}
          >
            {message}
          </div>
        )}
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
                onClick={() => { setShowPublishConfirm(false); handleUpdate('Published', true); }} 
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