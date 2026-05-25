'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '../lib/ClientApp'

export default function GuestPage() {
  const router = useRouter()
  const [courses, setCourses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, 'courses'))
        const coursesData = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setCourses(coursesData)
      } catch (error) {
        console.error('Error fetching courses:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchCourses()
  }, [])

  // Extract unique categories from the fetched courses
  const categories = ['All', ...Array.from(new Set(courses.map(c => c.category).filter(Boolean)))]

  // Filter courses based on search term and selected category
  const filteredCourses = courses.filter(course => {
    const matchesSearch = (course.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (course.description || '').toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'All' || course.category === selectedCategory
    
    return matchesSearch && matchesCategory
  })

  const handleCourseClick = (courseId: string) => {
    // Redirect to login page and pass the intended course path as a URL parameter
    router.push(`/login-page?redirect=/user/view-course/${courseId}`)
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-white text-black">Loading...</div>
  }

  return (
    <div className="min-h-screen bg-white text-black p-8">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h1 className="text-3xl font-bold">Browse Courses</h1>
          <button 
            onClick={() => router.push('/login-page')}
            className="px-6 py-2 border border-black rounded hover:bg-gray-100 transition shadow-sm"
          >
            Sign in
          </button>
        </div>

        {/* Search and Filter Section */}
        <div className="flex flex-col md:flex-row gap-4">
          <input
            type="text"
            placeholder="Search courses by title or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-grow px-4 py-2 border border-gray-300 rounded bg-white text-black focus:outline-none focus:border-black transition"
          />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded bg-white text-black focus:outline-none focus:border-black transition cursor-pointer"
          >
            {categories.map((cat: any) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Courses Grid */}
        {filteredCourses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => {
              const averageRating =
                course.ratings && course.ratings.length > 0
                  ? course.ratings.reduce((acc: number, curr: any) => acc + (typeof curr === 'number' ? curr : (curr?.rating || 0)), 0) / course.ratings.length
                  : 0

              return (
              <div 
                key={course.id} 
                onClick={() => handleCourseClick(course.id)}
                className="border border-black rounded p-4 flex flex-col gap-2 hover:shadow-lg transition cursor-pointer"
              >
                <div className="h-40 bg-gray-100 rounded flex items-center justify-center border border-gray-200 overflow-hidden">
                  {course.courseThumbnail ? (
                    <img
                      src={course.courseThumbnail}
                      alt={course.title}
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
                <h2 className="text-xl font-bold mt-2">
                  {course.title || 'Untitled Course'}
                </h2>
                <p className="text-xs text-gray-500 bg-gray-100 rounded px-2 py-1 w-fit">
                  {course.category || 'General'}
                </p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <span className="text-yellow-400 text-lg">★</span>
                    <span className="font-semibold">{averageRating.toFixed(1)}</span>
                    <span className="text-gray-500 text-sm">({course.ratings?.length || 0})</span>
                  </div>
                  <span className="font-semibold text-black">
                    {course.price ? `IDR ${course.price.toLocaleString()}` : 'Free'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 line-clamp-2">
                  {course.description || 'No description available.'}
                </p>
              </div>
            )})}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500 border border-dashed border-gray-300 rounded-lg">
            No courses found matching your criteria.
          </div>
        )}
      </div>
    </div>
  )
}