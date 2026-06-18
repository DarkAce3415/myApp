'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '../../../lib/ClientApp'; 
import { collection, addDoc, serverTimestamp, setDoc, doc, increment, getDocs, query, where } from 'firebase/firestore';

interface ForumFormData {
  title: string;
  description: string;
  topic?: string;
  userId: string;
  isCreator: boolean;
  linkedCourseId?: string;
}

export default function CreateForumPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<ForumFormData>({
    title: '',
    description: '',
    topic: 'Machine Learning',
    userId: auth.currentUser?.uid || '',
    isCreator: true,
    linkedCourseId: '',
  });
  // AI-related topics only
  const [topics] = useState<string[]>([
    'Machine Learning',
    'Deep Learning',
    'Natural Language Processing',
    'Computer Vision',
    'Robotics',
    'AI Ethics',
    'Generative AI',
    'Neural Networks',
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [courses, setCourses] = useState<{ id: string; title: string }[]>([]);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  useEffect(() => {
    const fetchCourses = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid) return;
      
      try {
        // Fetch courses created by the current user
        const q = query(collection(db, 'courses'), where('creatorId', '==', uid));
        const querySnapshot = await getDocs(q);
        const coursesList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          title: doc.data().title || `Course ${doc.id}`
        }));
        setCourses(coursesList);
      } catch (err) {
        console.error('Failed to fetch courses:', err);
      }
    };
    
    fetchCourses();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target as HTMLInputElement;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
    if (missingFields.includes(name)) {
      setMissingFields((prev) => prev.filter((field) => field !== name));
    }
  };

  const slugify = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    setMissingFields([]);

    const newMissingFields: string[] = [];
    if (!formData.title.trim()) newMissingFields.push('title');
    if (!formData.topic) newMissingFields.push('topic');
    if (!formData.description.trim()) newMissingFields.push('description');

    if (newMissingFields.length > 0) {
      setError('Please fill in all required fields.');
      setMissingFields(newMissingFields);
      setLoading(false);
      return;
    }

    try {
      const forumPayload = {
        ...formData,
        createdAt: serverTimestamp(),
      };
      
      if (!forumPayload.linkedCourseId?.trim()) {
        delete forumPayload.linkedCourseId;
      }

      await addDoc(collection(db, 'forums'), forumPayload);

      // Upsert topic into topics collection for normalization & fast reads
      const topicId = slugify(formData.topic || 'general') || 'general';
      await setDoc(doc(db, 'topics', topicId), {
        name: formData.topic,
        updatedAt: serverTimestamp(),
        count: increment(1),
      }, { merge: true });

      setSuccess('Forum created successfully! Redirecting...');
      setTimeout(() => {
        router.push('/creator-main-page/forums'); // Redirect to the forums list after creation
      }, 1500);
    } catch (err: any) {
      setError('Failed to create forum: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-gray-800 rounded-lg shadow-lg p-8">
        <button onClick={() => router.back()} className="mb-4 text-blue-400 hover:text-blue-300">
          &larr; Back
        </button>
        <h1 className="text-2xl font-bold mb-4 text-center">Create New Forum</h1>
        <form onSubmit={handleSubmit} className="bg-gray-800 rounded px-8 pt-6 pb-8 mb-4 space-y-4" noValidate>
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="title" className="block text-white text-sm font-bold">
                Forum Title:
              </label>
              <span className="text-xs text-gray-400">{formData.title.length}/75</span>
            </div>
            <input
              type="text"
              id="title"
              name="title"
              maxLength={75}
              value={formData.title}
              onChange={handleChange}
              className={`shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline ${missingFields.includes('title') ? 'border-red-500 bg-red-50 text-red-900 placeholder-red-400' : 'border-gray-600 bg-gray-700 text-white'}`}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="topic" className="block text-white text-sm font-bold mb-2">
              Topic:
            </label>
            <select
              id="topic"
              name="topic"
              value={formData.topic}
              onChange={handleChange}
              className={`border rounded w-full py-2 px-3 ${missingFields.includes('topic') ? 'border-red-500 bg-red-50 text-red-900' : 'border-gray-600 bg-gray-700 text-white'}`}
            >
              {topics.map((t) => (
                <option value={t} key={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label htmlFor="linkedCourseId" className="block text-white text-sm font-bold mb-2">
              Linked Course (Optional):
            </label>
            <select
              id="linkedCourseId"
              name="linkedCourseId"
              value={formData.linkedCourseId}
              onChange={handleChange}
              className="shadow appearance-none border border-gray-600 bg-gray-700 text-white rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"
            >
              <option value="">None (Public Forum)</option>
              {courses.map(course => (
                <option key={course.id} value={course.id}>{course.title}</option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center mb-2">
              <label htmlFor="description" className="block text-white text-sm font-bold">
                Description:
              </label>
              <span className="text-xs text-gray-400">{formData.description.length}/300</span>
            </div>
            <textarea
              id="description"
              name="description"
              maxLength={300}
              value={formData.description}
              onChange={handleChange}
              className={`shadow appearance-none border rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline h-32 ${missingFields.includes('description') ? 'border-red-500 bg-red-50 text-red-900 placeholder-red-400' : 'border-gray-600 bg-gray-700 text-white'}`}
            ></textarea>
          </div>
          {error && (
            <div className="bg-red-900/50 border border-red-500 text-red-200 text-sm p-3 rounded mb-4 text-center font-medium shadow-sm">
              {error}
            </div>
          )}
          {success && (
            <div className="bg-green-900/50 border border-green-500 text-green-200 text-sm p-3 rounded mb-4 text-center font-medium shadow-sm">
              {success}
            </div>
          )}
          <div className="flex items-center justify-between">
            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
              disabled={loading}
            >
              {loading ? 'Creating...' : 'Create Forum'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
