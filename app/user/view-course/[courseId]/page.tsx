'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '../../../lib/ClientApp'

export default function UserViewCoursePage() {
  const params = useParams()
  const router = useRouter()
  const courseId = Array.isArray(params?.courseId) ? params.courseId[0] : params?.courseId
  
  const [course, setCourse] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [rating, setRating] = useState(0)
  const [selectedVideoIndex, setSelectedVideoIndex] = useState(0)
  const [ratingSubmitted, setRatingSubmitted] = useState(false)
  const [isPurchased, setIsPurchased] = useState(false)
  const [showPurchaseModal, setShowPurchaseModal] = useState(false)
  const [pendingVideoIndex, setPendingVideoIndex] = useState<number | null>(null)
  const [userUid, setUserUid] = useState<string | null>(null)

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return
      try {
        const docRef = doc(db, 'courses', courseId)
        const docSnap = await getDoc(docRef)
        if (docSnap.exists()) {
          setCourse({ id: docSnap.id, ...docSnap.data() })
        }
      } catch (error) {
        console.error('Error fetching course:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchCourse()
  }, [courseId])

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserUid(user.uid)
        if (courseId) {
          try {
            const userRef = doc(db, 'users', user.uid)
            const userSnap = await getDoc(userRef)
            if (userSnap.exists() && userSnap.data().purchasedCourses?.includes(courseId)) {
              setIsPurchased(true)
            }
          } catch (error) {
            console.error('Error fetching user purchase status:', error)
          }
        }
      }
    })
    return () => unsubscribe()
  }, [courseId])

  const handleRatingSubmit = async (newRating: number) => {
    setRating(newRating)
    setRatingSubmitted(true)
    
    if (!courseId) return
    try {
      const docRef = doc(db, 'courses', courseId)
      await updateDoc(docRef, {
        ratings: arrayUnion(newRating)
      })
      // Refresh course data to show updated rating
      const updatedDoc = await getDoc(docRef)
      if (updatedDoc.exists()) {
        setCourse({ id: updatedDoc.id, ...updatedDoc.data() })
      }
    } catch (error) {
      console.error('Error submitting rating:', error)
    }
  }

  const handleVideoSelect = (index: number) => {
    if (index === 0 || isPurchased) {
      setSelectedVideoIndex(index)
    } else {
      setPendingVideoIndex(index)
      setShowPurchaseModal(true)
    }
  }

  const handleConfirmPurchase = async () => {
    if (userUid && courseId) {
      const userRef = doc(db, 'users', userUid)
      await updateDoc(userRef, {
        purchasedCourses: arrayUnion(courseId)
      }).catch((err) => console.error('Error purchasing course:', err))
    }
    setIsPurchased(true)
    setShowPurchaseModal(false)
    if (pendingVideoIndex !== null) {
      setSelectedVideoIndex(pendingVideoIndex)
      setPendingVideoIndex(null)
    }
  }

  if (loading) return <div className="p-6 flex justify-center">Loading...</div>
  if (!course) return <div className="p-6 flex justify-center">Course not found</div>

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center p-6">
      <div className="w-full max-w-4xl flex flex-col gap-6">
        <button 
          onClick={() => router.back()}
          className="w-fit px-4 py-2 border border-black rounded hover:bg-gray-100 transition"
        >
          Back to Courses
        </button>

        <h1 className="text-3xl font-bold">{course.title}</h1>
        
        <div className="w-full flex gap-6">
          {/* Video Player */}
          <div className="flex-1">
            <div className="w-full aspect-video bg-black rounded overflow-hidden flex items-center justify-center">
              {course.videoUrls && course.videoUrls.length > 0 && course.videoUrls[selectedVideoIndex]?.url ? (
                <video
                  src={course.videoUrls[selectedVideoIndex].url}
                  className="w-full h-full"
                  controls
                  controlsList="nodownload"
                />
              ) : course.videoUrl ? (
                <video
                  src={course.videoUrl}
                  className="w-full h-full"
                  controls
                  controlsList="nodownload"
                />
              ) : (
                <span className="text-white">No video available</span>
              )}
            </div>
            {course.videoUrls && course.videoUrls.length > 0 && (
              <p className="text-gray-600 mt-2">{course.videoUrls[selectedVideoIndex]?.title || 'Untitled Video'}</p>
            )}
            {course.videoUrls && course.videoUrls.length > 0 && course.videoUrls[selectedVideoIndex]?.description && (
              <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{course.videoUrls[selectedVideoIndex].description}</p>
            )}
          </div>

          {/* Video Selector */}
          {course.videoUrls && course.videoUrls.length > 0 && (
            <div className="w-48 bg-gray-50 rounded p-4 border border-gray-200 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <h3 className="font-semibold text-lg">Videos</h3>
                <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
                  {course.videoUrls.map((video: any, index: number) => (
                    <button
                      key={index}
                      onClick={() => handleVideoSelect(index)}
                      className={`p-3 rounded text-left transition ${
                        selectedVideoIndex === index
                          ? 'bg-black text-white'
                          : 'bg-white text-black border border-gray-300 hover:bg-gray-100'
                      }`}
                    >
                      <p className="font-medium text-sm flex items-center justify-between">
                        <span>{video.title || `Video ${index + 1}`}</span>
                        {!isPurchased && index > 0 && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">Locked</span>}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">Rate this Course</h2>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-6 h-6 cursor-pointer transition ${star <= rating ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-300`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                  onClick={() => handleRatingSubmit(star)}
                ><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.538 1.118l-2.8-2.034a1 1 0 00-1.176 0l-2.8 2.034c-.783.57-1.838-.197-1.538-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.381-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z" /></svg>
              ))}
            </div>
            {ratingSubmitted && <span className="text-green-600 text-sm font-medium">Rating saved!</span>}
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">Description</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{course.description}</p>
        </div>
        
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center flex flex-col gap-4">
            <h2 className="text-2xl font-bold">Purchase Required</h2>
            <p className="text-gray-600">
              You need to purchase this course to view the rest of the videos. Do you want to purchase it now?
            </p>
            <div className="flex gap-4 justify-center mt-4">
              <button
                onClick={() => {
                  setShowPurchaseModal(false)
                  setPendingVideoIndex(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPurchase}
                className="px-4 py-2 bg-black text-white rounded hover:opacity-90 transition"
              >
                Confirm Purchase
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
