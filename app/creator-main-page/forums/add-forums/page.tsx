'use client'

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '../../../lib/ClientApp'; 
import { collection, addDoc, serverTimestamp, setDoc, doc, increment } from 'firebase/firestore';

interface ForumFormData {
  title: string;
  description: string;
  topic?: string;
  userId: string;
  isCreator: boolean;
}

export default function CreateForumPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<ForumFormData>({
    title: '',
    description: '',
    topic: 'Machine Learning',
    userId: auth.currentUser?.uid || '',
    isCreator: true,
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target as HTMLInputElement;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const slugify = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '')

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await addDoc(collection(db, 'forums'), {
        ...formData,
        createdAt: serverTimestamp(),
      });

      // Upsert topic into topics collection for normalization & fast reads
      const topicId = slugify(formData.topic || 'general') || 'general';
      await setDoc(doc(db, 'topics', topicId), {
        name: formData.topic,
        updatedAt: serverTimestamp(),
        count: increment(1),
      }, { merge: true });

      router.push('/creator-main-page/forums'); // Redirect to the forums list after creation
    } catch (err: any) {
      setError('Failed to create forum: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-gray-800 rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-4 text-center">Create New Forum</h1>
        <form onSubmit={handleSubmit} className="bg-gray-800 rounded px-8 pt-6 pb-8 mb-4 space-y-4">
          <div className="mb-4">
            <label htmlFor="title" className="block text-white text-sm font-bold mb-2">
              Forum Title:
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              className="shadow appearance-none border border-gray-600 bg-gray-700 text-white rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline"
              required
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
              className="border border-gray-600 bg-gray-700 text-white rounded w-full py-2 px-3"
            >
              {topics.map((t) => (
                <option value={t} key={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="mb-6">
            <label htmlFor="description" className="block text-white text-sm font-bold mb-2">
              Description:
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="shadow appearance-none border border-gray-600 bg-gray-700 text-white rounded w-full py-2 px-3 leading-tight focus:outline-none focus:shadow-outline h-32"
              required
            ></textarea>
          </div>
          {error && <p className="text-red-400 text-xs italic mb-4">{error}</p>}
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
