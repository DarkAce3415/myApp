'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { collection, doc, getDoc, getDocs, query, where, documentId } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '../../lib/ClientApp'

export default function OwnedCoursesPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const userRef = doc(db, 'users', user.uid)
          const userSnap = await getDoc(userRef)
          
          if (userSnap.exists()) {
            const userData = userSnap.data()
            const purchasedCourseIds = userData.purchasedCourses || []
            const courseProgress = userData.courseProgress || {}
            
            if (purchasedCourseIds.length > 0) {
              const coursesList: any[] = []
              const chunkSize = 10
              for (let i = 0; i < purchasedCourseIds.length; i += chunkSize) {
                const chunk = purchasedCourseIds.slice(i, i + chunkSize)
                const q = query(collection(db, 'courses'), where(documentId(), 'in', chunk))
                const querySnapshot = await getDocs(q)
                querySnapshot.forEach((doc) => {
                  const data = doc.data()
                  const watchedCount = courseProgress[doc.id]?.length || 0
                  const totalVideos = data.videoUrls?.length || 0
                  const progress = totalVideos > 0 ? (watchedCount / totalVideos) * 100 : 0

                  coursesList.push({
                    id: doc.id,
                    title: data.title || 'Untitled Course',
                    description: data.description || 'No description available.',
                    category: data.category || 'General',
                    videoUrls: data.videoUrls || [],
                    ratings: data.ratings || [],
                    courseThumbnail: data.courseThumbnail || null,
                    progress: progress,
                  })
                })
              }
              setCourses(coursesList)
            } else {
              setCourses([])
            }
          }
        } catch (error) {
          console.error('Error fetching owned courses:', error)
        } finally {
          setLoading(false)
        }
      } else {
        router.push('/login-page')
      }
    })

    return () => unsubscribe()
  }, [router])

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center p-6">
      <div className="w-full max-w-5xl flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">My Owned Courses</h1>
          <button
            onClick={() => router.back()}
            className="px-6 py-2 border border-black rounded bg-white text-black font-semibold hover:bg-gray-100 transition"
          >
            Back
          </button>
        </div>

        {loading ? (
          <p>Loading your courses...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => {
              const averageRating =
                course.ratings && course.ratings.length > 0
                  ? course.ratings.reduce((acc: number, curr: any) => acc + (typeof curr === 'number' ? curr : (curr?.rating || 0)), 0) / course.ratings.length
                  : 0

              return (
                <div
                  key={course.id}
                  onClick={() => router.push(`/user/view-course/${course.id}`)}
                  className="border border-black rounded p-4 flex flex-col gap-2 hover:shadow-lg transition cursor-pointer"
                >
                  <div className="h-40 bg-gray-100 rounded flex items-center justify-center border border-gray-200 overflow-hidden">
                    {course.courseThumbnail ? (
                      <img
                        src={course.courseThumbnail}
                        alt={course.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-400 font-medium">
                        {course.title ? course.title[0] : 'C'}
                      </span>
                    )}
                  </div>
                  <h2 className="text-xl font-bold mt-2">{course.title}</h2>
                  <p className="text-xs text-gray-500 bg-gray-100 rounded px-2 py-1 w-fit">{course.category}</p>
                  <p className="text-sm text-gray-600 line-clamp-2">{course.description}</p>
                  
                  <div className="mt-auto pt-4">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-gray-600">Progress</span>
                      <span className="text-sm font-semibold text-black">{Math.round(course.progress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div className="bg-black h-2 rounded-full transition-all duration-500 ease-out" style={{ width: `${course.progress}%` }}></div>
                    </div>
                  </div>
                </div>
              )
            })}
            {courses.length === 0 && (
              <p className="text-gray-500">You haven't purchased any courses yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}