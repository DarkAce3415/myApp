'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { CldUploadWidget } from 'next-cloudinary'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { db } from '../../../lib/ClientApp'
import { deleteDoc } from 'firebase/firestore';

interface VideoData {
  url: string;
  title: string;
  thumbnailUrl?: string; 
}

export default function EditCoursePage() {
  const router = useRouter()
  const params = useParams()
  const courseId = Array.isArray(params?.courseId) ? params.courseId[0] : params?.courseId
  
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [videos, setVideos] = useState<VideoData[]>([])
  const [courseThumbnail, setCourseThumbnail] = useState<string | null>(null); 
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [category, setCategory] = useState('');

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return
      try {
        const docRef = doc(db, 'courses', courseId)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          const data = docSnap.data()
          setTitle(data.title || '')  
          
          setVideos(data.videoUrls?.map((url: string | VideoData) => 
            typeof url === 'string' ? { url, title: `Video ${videos.length + 1}` } : url
          ) || [])
          setDescription(data.description || '')
          setCategory(data.category || '');
          setCourseThumbnail(data.courseThumbnail || null);
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
    try {
      const docRef = doc(db, 'courses', courseId)
      await updateDoc(docRef, {
        title,
        description,
        videoUrls: videos, 
        courseThumbnail, 
 category,
      })
      alert('Course updated successfully')
      router.push('/creator-main-page')
    } catch (error) {
      console.error('Error updating course:', error)
      alert('Failed to update course')
    }
  }, [courseId, title, description, videos, router, category])

  const handleDeleteCourse = useCallback(async () => {
    if (!courseId) return;

    if (window.confirm('Are you sure you want to delete this course? This action cannot be undone.')) {
      try {
        
        // Delete course document from Firestore
        const docRef = doc(db, 'courses', courseId);
        await deleteDoc(docRef);

        // TODO: Implement Cloudinary deletion for videos and thumbnails
        // This would involve storing Cloudinary public_ids in Firestore and then using the Cloudinary Admin API to delete them.
        // For now, only the Firestore document is deleted.

        alert('Course deleted successfully!');
        router.push('/creator-main-page');
      } catch (error) {
        console.error('Error deleting course:', error);
        alert('Failed to delete course.');
      }

    }
  }, [courseId, title, description, videos, router])

  const handleVideoTitleChange = useCallback((index: number, newTitle: string) => {
    setVideos((prevVideos) => {
      const newVideos = [...prevVideos];
      newVideos[index] = { ...newVideos[index], title: newTitle };
      return newVideos;
    });
  }, []);

  const handleThumbnailUpload = useCallback((index: number, url: string) => {
    setVideos((prevVideos) => {
      const newVideos = [...prevVideos];
      newVideos[index] = { ...newVideos[index], thumbnailUrl: url };
      setMessage('Thumbnail uploaded. Remember to save changes.');
      return newVideos;
    });
  }, []);

  const handleDeleteVideo = useCallback((indexToDelete: number) => {
    if (window.confirm('Are you sure you want to delete this video?')) {
 setVideos((prevVideos) => prevVideos.filter((_, index) => index !== indexToDelete))
 setMessage('Video deleted. Remember to save changes.')
    }
  }, [])

  const handleMoveVideo = useCallback((index: number, direction: 'up' | 'down') => {
    setVideos((prevVideos) => {
      const newVideos = [...prevVideos];
      if (direction === 'up' && index > 0) {
        [newVideos[index - 1], newVideos[index]] = [newVideos[index], newVideos[index - 1]];
      } else if (direction === 'down' && index < newVideos.length - 1) {
        [newVideos[index + 1], newVideos[index]] = [newVideos[index], newVideos[index + 1]];
      }
      setMessage('Video order changed. Remember to save changes.');
      return newVideos;
    });
  }, [])
  
  const handleAddVideo = useCallback((url: string) => {
    setVideos((prevVideos) => [
      ...prevVideos,
      { url, title: `Video ${prevVideos.length + 1}` },
    ]);
    setMessage('New video added. Remember to save changes.');
  }, []);
  const handleCourseThumbnailUpload = useCallback((url: string) => {
    setCourseThumbnail(url);
    setMessage('Course thumbnail uploaded. Remember to save changes.');
  }, []);
  
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

        <div className="flex flex-col gap-2">
          <label className="font-semibold">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border border-black rounded p-2"
          >
            <option value="">Select a category</option>
            {['IoT', 'Deep Learning', 'Video Recognition', 'Machine Learning', 'Natural Language Processing', 'Robotics'].map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
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
                  className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
                >
                  {courseThumbnail ? 'Change Thumbnail' : 'Upload Thumbnail'}
                </button>
              )}
            </CldUploadWidget>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-semibold">Course Videos</label>
          {videos.length === 0 ? (
            <p className="text-gray-600">No videos uploaded for this course yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {videos.map((video, index) => (
                <div key={index} className="border border-gray-300 rounded p-3 flex flex-col sm:flex-row items-center gap-4">
                  <div className="flex-shrink-0 w-full sm:w-40 h-24 bg-gray-100 rounded overflow-hidden flex items-center justify-center relative">
                    {video.thumbnailUrl ? (
                      <img src={video.thumbnailUrl} alt={`Thumbnail for Video ${index + 1}`} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-400 text-sm">Video {index + 1}</span>
                    )}
                    <CldUploadWidget uploadPreset="next_js_cloudinary" onSuccess={(result: any) => handleThumbnailUpload(index, result.info.secure_url)}>
                      {({ open }) => (
                        <button type="button" onClick={() => open()} className="absolute bottom-1 right-1 bg-black text-white text-xs px-2 py-1 rounded opacity-80 hover:opacity-100">
                          {video.thumbnailUrl ? 'Change' : 'Add'} Thumbnail
                        </button>
                      )}
                    </CldUploadWidget>
                  </div>
                  <div className="flex-grow flex flex-col gap-2 w-full">
                    <input
                      type="text"
                      value={video.title}
                      onChange={(e) => handleVideoTitleChange(index, e.target.value)}
                      className="border border-gray-300 rounded p-1 text-sm font-medium"
                      placeholder={`Video ${index + 1} Title`}
                    />
                    <p className="text-xs text-gray-500 truncate">{video.url}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleMoveVideo(index, 'up')}
                        disabled={index === 0}
                        className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                      >
                        Move Up
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveVideo(index, 'down')}
                        disabled={index === videos.length - 1}
                        className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300 disabled:opacity-50"
                      >
                        Move Down
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteVideo(index)}
                        className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
          <CldUploadWidget
            uploadPreset="next_js_cloudinary"
            onSuccess={(result: any) => handleAddVideo(result.info.secure_url)}
          >
            {({ open }) => (
              <button
                type="button"
                onClick={() => open()}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 transition mt-4"
              >
                Add New Video
              </button>
            )}
          </CldUploadWidget>
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
          <button
            onClick={handleDeleteCourse}
            className="px-6 py-2 bg-red-500 text-white rounded font-semibold hover:bg-red-600 transition"
            type="button"
          >
            Delete Course
          </button>
        </div>

        {message && <p className="text-sm mt-4 text-blue-600">{message}</p>}
      </div>
    </div>
  )
}