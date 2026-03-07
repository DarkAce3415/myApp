'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '../lib/ClientApp'
import { collection, query, where, getDocs } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'

export default function CreatorMainPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const q = query(
            collection(db, 'courses'),
            where('creatorId', '==', user.uid)
          )
          const querySnapshot = await getDocs(q)
          const userCourses = querySnapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          }))
          setCourses(userCourses)
        } catch (error) {
          console.error('Error fetching courses:', error)
        }
      } else {
        setCourses([])
      }
      setLoading(false)
    })

    return () => unsubscribe()
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-6">
      <div className="w-full max-w-5xl flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">My Created Courses</h2>
          <button
            onClick={() => router.push('/creator-main-page/upload')}
            className="px-6 py-2 border border-white rounded bg-white text-black font-semibold hover:opacity-90 transition hover:bg-gray-200"
            aria-label="Open upload page"
          >
            Upload Course
          </button>
        </div>
        {loading ? (
          <p className="text-gray-300">Loading courses...</p>
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
                onClick={() => router.push(`/creator-main-page/view-course/${course.id}`)}
                className="border border-gray-700 bg-gray-800 rounded p-4 flex flex-col gap-2 hover:shadow-lg transition cursor-pointer hover:bg-gray-700"
              >
                <div className="h-40 bg-gray-700 rounded flex items-center justify-center border border-gray-600 overflow-hidden">
                  {course.courseThumbnail && course.courseThumbnail.trim() ? (
                    <img 
                      src={course.courseThumbnail} 
                      alt={course.title || 'Course thumbnail'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const parent = e.currentTarget.parentElement;
                        if (parent) {
                          const span = document.createElement('span');
                          span.className = 'text-gray-400 font-medium';
                          span.textContent = course.title ? course.title[0] : 'C';
                          parent.appendChild(span);
                        }
                      }}
                    />
                  ) : (
                    <span className="text-gray-400 font-medium">
                      {course.title ? course.title[0] : 'C'}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-bold mt-2">
                  {course.title || 'Untitled Course'}
                </h3>
                <div className="flex items-center gap-1">
                  <span className="text-yellow-400 text-lg">★</span>
                  <span className="font-semibold">{averageRating.toFixed(1)}</span>
                  <span className="text-gray-400 text-sm">({course.ratings?.length || 0})</span>
                </div>
                <p className="text-sm text-gray-300 line-clamp-2">
                  {course.description || 'No description available.'}
                </p>
                <p className="text-sm text-gray-300">
                  Videos: {course.videoUrls ? course.videoUrls.length : 0}
                </p>
                {course.category && (
                  <span className="text-xs bg-gray-600 px-2 py-1 rounded w-fit">
                    {course.category}
                  </span>
                )}
              </div>
              )
            })}
            {courses.length === 0 && (
              <p className="text-gray-400">You haven't created any courses yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}