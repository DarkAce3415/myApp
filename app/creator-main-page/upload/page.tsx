'use client'

import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '../../lib/ClientApp'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { CldUploadWidget } from 'next-cloudinary'
 
interface VideoData {
  url: string;
  title: string;
  description?: string;
}

export default function CreatorUploadPage() {
  const router = useRouter()
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videos, setVideos] = useState<VideoData[]>([])
  const [description, setDescription] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
  const [courseThumbnail, setCourseThumbnail] = useState<string | null>(null)
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
    if (videos.length === 0 || !description.trim() || !title.trim() || !category) {
      setMessage('Please fill in all fields and upload at least one video.')
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
        videoUrls: videos,
        courseThumbnail: courseThumbnail,
        createdAt: serverTimestamp(),
      })

      setMessage('Course uploaded successfully!')
      setVideoUrl(null)
      setDescription('')
      setTitle('')
      setCategory('')
      setCourseThumbnail(null)
      router.push('/creator-main-page') 
      setVideos([]);
    } catch (err: any) {
      setMessage(err?.message || 'Upload failed.')
    } finally {
      setLoading(false)
    }
    
  }

  const handleVideoTitleChange = (index: number, newTitle: string) => {
    setVideos((prevVideos) => {
      const newVideos = [...prevVideos];
      newVideos[index] = { ...newVideos[index], title: newTitle };
      return newVideos;
    });
  };

  const handleVideoDescriptionChange = (index: number, newDescription: string) => {
    setVideos((prevVideos) => {
      const newVideos = [...prevVideos];
      newVideos[index] = { ...newVideos[index], description: newDescription };
      return newVideos;
    });
  };

  const handleDeleteVideo = (indexToDelete: number) => {
    if (window.confirm('Are you sure you want to delete this video?')) {
      setVideos((prevVideos) => prevVideos.filter((_, index) => index !== indexToDelete));
    }
  }

  const handleMoveVideo = (index: number, direction: 'up' | 'down') => {
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
          <CldUploadWidget uploadPreset="next_js_cloudinary"
            onSuccess={(result: any) => {
              setVideos((prevVideos) => [
                ...prevVideos,
                { url: result.info.secure_url, title: `Video ${prevVideos.length + 1}` },
              ]);
              setMessage('Video uploaded successfully!');
            }}
          >
            {({ open }) => {
              return (
                <button
                  type="button"
                  onClick={() => open()}
                  className="w-full px-3 py-2 rounded border border-gray-600 bg-gray-700 text-white hover:bg-gray-600 transition"
                >
                  Upload Video
                </button>
              )
            }}
          </CldUploadWidget>
          {videos.length > 0 && (
            <div className="mt-4 space-y-4">
              {videos.map((video, index) => (
                <div key={index} className="border border-gray-600 bg-gray-700 rounded p-3 flex flex-col gap-2">
                  <div className="flex-grow flex flex-col gap-2 w-full">
                    <input
                      type="text"
                      value={video.title}
                      onChange={(e) => handleVideoTitleChange(index, e.target.value)}
                      className="border border-gray-600 rounded p-1 text-sm font-medium bg-gray-600 text-white"
                      placeholder={`Video ${index + 1} Title`}
                    />
                    <textarea
                      value={video.description || ''}
                      onChange={(e) => handleVideoDescriptionChange(index, e.target.value)}
                      className="border border-gray-600 rounded p-1 text-sm bg-gray-600 text-white"
                      placeholder={`Video ${index + 1} Description (optional)`}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleMoveVideo(index, 'up')}
                        disabled={index === 0}
                        className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-50"
                      >
                        Move Up
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveVideo(index, 'down')}
                        disabled={index === videos.length - 1}
                        className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-500 disabled:opacity-50"
                      >
                        Move Down
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteVideo(index)}
                      className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 self-start"
                    >
                      Delete Video
                    </button>
                  </div>
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
            disabled={loading || videos.length === 0}
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
