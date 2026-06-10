'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { doc, getDoc, updateDoc, arrayUnion, setDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '../../../lib/ClientApp'

export default function UserViewCoursePage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
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
  const [watchedVideos, setWatchedVideos] = useState<number[]>([])

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
            
            // Check enrollment in the course subcollection
            const enrollmentRef = doc(db, 'courses', courseId, 'enrollments', user.uid)
            const enrollmentSnap = await getDoc(enrollmentRef)
            
            if (enrollmentSnap.exists()) {
              setIsPurchased(true) // Enrolled
            }

            if (userSnap.exists()) {
              const userData = userSnap.data()
              // Fallback for older purchases before enrollments collection was added
              if (!enrollmentSnap.exists() && userData.purchasedCourses?.includes(courseId)) {
                setIsPurchased(true)
              }
              if (userData.courseProgress && userData.courseProgress[courseId]) {
                setWatchedVideos(userData.courseProgress[courseId])
              }
            }
          } catch (error) {
            console.error('Error fetching user data:', error)
          }
        }
      }
    })
    return () => unsubscribe()
  }, [courseId])

  const handleSuccessfulPurchase = useCallback(async () => {
    if (!userUid || !courseId) return;
    // This is an optimistic update for better UX. 
    // The webhook is the primary source of truth, but we add a client-side update
    // as a fallback in case the webhook is delayed or not set up for local testing.
    setIsPurchased(true);
    setShowPurchaseModal(false);
    if (pendingVideoIndex !== null) {
      setSelectedVideoIndex(pendingVideoIndex);
      setPendingVideoIndex(null);
    }

    try {
      const userRef = doc(db, 'users', userUid);
      await updateDoc(userRef, {
        purchasedCourses: arrayUnion(courseId)
      });
      const courseRef = doc(db, 'courses', courseId);
      await updateDoc(courseRef, {
        purchasedBy: arrayUnion(userUid)
      });

      // Add user to the enrollment collection in the course document
      const enrollmentRef = doc(db, 'courses', courseId, 'enrollments', userUid);
      await setDoc(enrollmentRef, {
        userId: userUid,
        enrolledAt: new Date().toISOString(),
        paymentStatus: 'settled'
      });
    } catch (error) {
      console.error('Error fallback updating purchased courses:', error);
    }

    alert('Purchase successful! You now have full access to the course.');
    // Clean the URL
    router.replace(`/user/view-course/${courseId}`);
  }, [userUid, courseId, router, pendingVideoIndex]);

  useEffect(() => {
    const paymentStatus = searchParams.get('payment_status');
    if (paymentStatus === 'success') {
      handleSuccessfulPurchase();
    } else if (paymentStatus === 'failure') {
      alert('Payment failed or was cancelled. Please try again.');
      router.replace(`/user/view-course/${courseId}`);
    }
  }, [searchParams, handleSuccessfulPurchase, router, courseId]);

  const handleVideoEnded = async () => {
    if (!userUid || !courseId || watchedVideos.includes(selectedVideoIndex)) return;
    
    const newWatched = [...watchedVideos, selectedVideoIndex];
    setWatchedVideos(newWatched);
    
    try {
      const userRef = doc(db, 'users', userUid);
      await updateDoc(userRef, {
        [`courseProgress.${courseId}`]: arrayUnion(selectedVideoIndex)
      });
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  }

  const handleRatingSubmit = async (newRating: number) => {
    if (!isPurchased) {
      alert('You must enroll in this course to rate it.')
      return
    }

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
    if (!userUid || !courseId || !course) return;
    
    try {
      const response = await fetch('/api/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId,
          userId: userUid,
          price: course.price,
          title: course.title,
          email: auth.currentUser?.email
        })
      });

      let data;
      const contentType = response.headers.get("content-type");
      if (contentType && contentType.indexOf("application/json") !== -1) {
        data = await response.json();
        console.log('Invoice creation response:', data); // Inspect this in browser console
      } else {
        const text = await response.text();
        console.error('Received non-JSON response:', text);
        alert(`Failed to initiate payment: API route error (${response.status} ${response.statusText}).`);
        return;
      }

      if (!response.ok) {
        // Try to extract the exact error message provided by Xendit's API response
        const detailedError = data.details?.message || data.message || data.error || response.statusText;
        alert(`Failed to initiate payment: ${detailedError}`);
        return;
      }

      const checkoutUrl = data.invoiceUrl || data.invoice_url;
      if (checkoutUrl) {
        window.location.href = checkoutUrl; // Redirect to Xendit Checkout
      } else {
        alert('Failed to initiate payment: Checkout URL not found.');
      }
    } catch (err) {
      console.error('Error initiating payment:', err);
      alert('Error initiating payment.');
    }
  }

  if (loading) return <div className="p-6 flex justify-center">Loading...</div>
  if (!course) return <div className="p-6 flex justify-center">Course not found</div>
  if (course.status !== 'Published' && !isPurchased) return <div className="p-6 flex justify-center">This course is not currently available.</div>

  const lessons = course.lessons || course.videoUrls || [];

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center p-6">
      <div className="w-full max-w-4xl flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <button 
            onClick={() => router.push('/user/owned-courses')}
            className="w-fit px-4 py-2 border border-black rounded hover:bg-gray-100 transition"
          >
            Back to Courses
          </button>
          
          {!isPurchased && (
            <button
              onClick={() => setShowPurchaseModal(true)}
              className="px-6 py-2 bg-black text-white font-semibold rounded hover:bg-gray-800 transition shadow-md"
            >
              Enroll in Course
            </button>
          )}
        </div>

        <h1 className="text-3xl font-bold">{course.title}</h1>
        
        <div className="w-full flex gap-6">
          <div className="flex-grow">
            <div className="w-full aspect-video bg-black rounded overflow-hidden flex items-center justify-center shadow-lg">
              {lessons.length > 0 && lessons[selectedVideoIndex]?.url ? (
                <video
                  src={lessons[selectedVideoIndex].url}
                  className="w-full h-full"
                  controls
                  controlsList="nodownload"
                  onEnded={handleVideoEnded}
                />
              ) : course.videoUrl ? (
                <video
                  src={course.videoUrl}
                  className="w-full h-full"
                  controls
                  controlsList="nodownload"
                  onEnded={handleVideoEnded}
                />
              ) : (
                <span className="text-white">No video available</span>
              )}
            </div>
            {lessons.length > 0 && (
              <p className="text-gray-600 mt-2">{lessons[selectedVideoIndex]?.title || 'Untitled Video'}</p>
            )}
            {lessons.length > 0 && lessons[selectedVideoIndex]?.description && (
              <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">{lessons[selectedVideoIndex].description}</p>
            )}
          </div>

          {/* Video Selector */}
          {lessons.length > 0 && (
            <div className="w-80 bg-gray-50 rounded-xl p-5 border border-gray-200 flex flex-col gap-4 shadow-sm shrink-0">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xl">Course Content</h3>
                  <span className="text-sm font-medium text-gray-500">
                    {watchedVideos.length}/{lessons.length} Watched
                  </span>
                </div>
                
                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mb-2">
                  <div 
                    className="bg-black h-2 rounded-full transition-all duration-500 ease-out" 
                    style={{ width: `${(watchedVideos.length / lessons.length) * 100}%` }}
                  ></div>
                </div>

                <div className="flex flex-col gap-3 max-h-[450px] overflow-y-auto pr-1">
                  {lessons.map((lesson: any, index: number) => (
                    <button
                      key={index}
                      onClick={() => handleVideoSelect(index)}
                      className={`relative overflow-hidden p-3 rounded-lg text-left transition-all duration-200 border-2 ${
                        selectedVideoIndex === index
                          ? 'border-black bg-black text-white shadow-md scale-[1.02]'
                          : 'border-transparent bg-white text-black hover:border-gray-300 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`flex items-center justify-center w-8 h-8 rounded-full shrink-0 ${
                            selectedVideoIndex === index ? 'bg-white/20' : 'bg-gray-100'
                          }`}>
                            {selectedVideoIndex === index ? (
                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"/></svg>
                            ) : watchedVideos.includes(index) ? (
                              <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            ) : (
                              <span className="text-sm font-semibold">{index + 1}</span>
                            )}
                          </div>
                          <span className="font-medium text-sm line-clamp-2">{lesson.title || `Lesson ${index + 1}`}</span>
                        </div>
                        {!isPurchased && index > 0 && (
                          <svg className={`w-5 h-5 shrink-0 ml-2 ${selectedVideoIndex === index ? 'text-white/70' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {isPurchased && (
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
        )}

        <div className="flex flex-col gap-2">
          <h2 className="text-xl font-semibold">Description</h2>
          <p className="text-gray-700 whitespace-pre-wrap">{course.description}</p>
        </div>
        
      </div>

      {/* Purchase Modal */}
      {showPurchaseModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center flex flex-col gap-4">
            <h2 className="text-2xl font-bold">Enrollment Required</h2>
            <p className="text-gray-600">
              You need to enroll in this course to view the rest of the videos. The price is IDR {course.price?.toLocaleString() || '50,000'}. Do you want to proceed to payment?
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
                Pay with Xendit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
