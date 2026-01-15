'use client'

import React, { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '../../lib/ClientApp'
import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { CldUploadWidget } from 'next-cloudinary'
 
interface VideoData {
  url: string;
  title: string;
  thumbnailUrl?: string;
}

export default function CreatorUploadPage() {
  const router = useRouter()
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const [videos, setVideos] = useState<VideoData[]>([])
  const [description, setDescription] = useState('')
  const [title, setTitle] = useState('')
  const [category, setCategory] = useState('')
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
        createdAt: serverTimestamp(),
      })

      setMessage('Course uploaded successfully!')
      setVideoUrl(null)
      setDescription('')
      setTitle('')
      setCategory('')
      router.push('/creator-main-page') // Redirect to creator main page
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

  const handleThumbnailUpload = (index: number, url: string) => {
    setVideos((prevVideos) => {
      const newVideos = [...prevVideos];
      newVideos[index] = { ...newVideos[index], thumbnailUrl: url };
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
                  className="w-full px-3 py-2 rounded border border-black bg-white text-black hover:bg-gray-100 transition"
                >
                  Upload Video
                </button>
              )
            }}
          </CldUploadWidget>
          {videos.length > 0 && (
            <div className="mt-4 space-y-4">
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
                      className="border border-gray-300 rounded p-1 text-sm font-medium text-black"
                      placeholder={`Video ${index + 1} Title`}
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleMoveVideo(index, 'up')}
                        disabled={index === 0}
                        className="px-3 py-1 text-sm bg-gray-200 text-black rounded hover:bg-gray-300 disabled:opacity-50"
                      >
                        Move Up
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveVideo(index, 'down')}
                        disabled={index === videos.length - 1}
                        className="px-3 py-1 text-sm bg-gray-200 text-black rounded hover:bg-gray-300 disabled:opacity-50"
                      >
                        Move Down
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteVideo(index)}
                      className="px-3 py-1 text-sm bg-red-500 text-white rounded hover:bg-red-600 self-start"
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
            className="w-full px-3 py-2 rounded border border-black bg-white text-black focus:outline-none"
            rows={4}
            placeholder="Enter detailed description for the course..."
            required
          />

          <button
            type="submit"
            disabled={loading || videos.length === 0}
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
