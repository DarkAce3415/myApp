'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../lib/ClientApp'

export default function MainPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategory, setSelectedCategory] = useState<string>('All')

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'courses'))
        const coursesList = querySnapshot.docs.map((doc) => {
          const data = doc.data()
          return {
            id: doc.id,
            title: data.title || 'Untitled Course',
            description: data.description || 'No description available.',
            category: data.category || 'General',
            videoUrls: data.videoUrls || [],
            ratings: data.ratings || [],
          }
        })
        setCourses(coursesList)
      } catch (error) {
        console.error('Error fetching courses:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [])

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center p-6">
      <div className="w-full max-w-5xl flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Available Courses</h1>
          <button
            onClick={() => router.push('/user/account')}
            className="px-6 py-2 border border-black rounded bg-black text-white font-semibold hover:opacity-90 transition"
            aria-label="Open account page"
          >
            Open account
          </button>
        </div>

        {loading ? (
          <p>Loading courses...</p>
        ) : (
          <>
            {/* Category Filter */}
            <div className="flex items-center gap-3">
              <label className="text-sm font-semibold">Filter by Category:</label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-4 py-2 border border-black rounded bg-white text-black focus:outline-none hover:bg-gray-50 transition"
              >
                <option value="All">All Categories</option>
                {Array.from(new Set(courses.map((course) => course.category))).map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Courses Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses
                .filter((course) => selectedCategory === 'All' || course.category === selectedCategory)
                .map((course) => {
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
                      {course.videoUrls && course.videoUrls.length > 0 && course.videoUrls[0]?.thumbnailUrl ? (
                        <img
                          src={course.videoUrls[0].thumbnailUrl}
                          alt={course.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-gray-400 font-medium">
                          {course.title ? course.title[0] : 'C'}
                        </span>
                      )}
                    </div>
                    <h2 className="text-xl font-bold mt-2">
                      {course.title}
                    </h2>
                    <p className="text-xs text-gray-500 bg-gray-100 rounded px-2 py-1 w-fit">
                      {course.category}
                    </p>
                    <div className="flex items-center gap-1">
                      <span className="text-yellow-400 text-lg">★</span>
                      <span className="font-semibold">{averageRating.toFixed(1)}</span>
                      <span className="text-gray-500 text-sm">({course.ratings?.length || 0})</span>
                    </div>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {course.description}
                    </p>
                  </div>
                    )
                  })}
              {courses.filter((course) => selectedCategory === 'All' || course.category === selectedCategory).length === 0 && (
                <p className="text-gray-500">No courses found in this category.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}