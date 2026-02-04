'use client'

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db, auth } from '../../../lib/ClientApp'; 
import { collection, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';

interface ForumFormData {
  title: string;
  description: string;
  topic?: string;
  creatorId: string; // 
  isCreator: boolean; // 
}

export default function CreateForumPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<ForumFormData>({
    title: '',
    description: '',
    topic: 'General',
    creatorId: auth.currentUser?.uid || '', // Replace with actual creator ID from authentication context
    isCreator: true, // This page is specifically for creators
  });
  const [topics, setTopics] = useState<string[]>([]);
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [newTopic, setNewTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTopics = async () => {
      try {
        const forumsCol = collection(db, 'forums');
        const snap = await getDocs(forumsCol);
        const unique = Array.from(new Set(snap.docs.map((d) => (d.data() as any).topic || 'General')));
        setTopics(unique.length ? unique : ['General']);
      } catch (err) {
        // ignore errors here, topics are optional
        setTopics(['General']);
      }
    };

    fetchTopics();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target as HTMLInputElement;
    if (name === 'topic') {
      if (value === '__new__') {
        setShowNewTopic(true);
        setFormData((prev) => ({ ...prev, topic: '' }));
        return;
      } else {
        setShowNewTopic(false);
      }
    }

    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const topicToSave = showNewTopic && newTopic ? newTopic : formData.topic;
      await addDoc(collection(db, 'forums'), {
        ...formData,
        topic: topicToSave,
        createdAt: serverTimestamp(),
      });
      router.push('/creator-main-page/forums'); // Redirect to the forums list after creation
    } catch (err: any) {
      setError('Failed to create forum: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Create New Forum</h1>
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded px-8 pt-6 pb-8 mb-4">
        <div className="mb-4">
          <label htmlFor="title" className="block text-gray-700 text-sm font-bold mb-2">
            Forum Title:
          </label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
            required
          />
        </div>

        <div className="mb-4">
          <label htmlFor="topic" className="block text-gray-700 text-sm font-bold mb-2">
            Topic:
          </label>
          <select
            id="topic"
            name="topic"
            value={showNewTopic ? '__new__' : formData.topic}
            onChange={handleChange}
            className="border rounded w-full py-2 px-3"
          >
            {topics.map((t) => (
              <option value={t} key={t}>{t}</option>
            ))}
            <option value="__new__">New topic...</option>
          </select>
        </div>

        {showNewTopic && (
          <div className="mb-4">
            <label htmlFor="newTopic" className="block text-gray-700 text-sm font-bold mb-2">New Topic Name:</label>
            <input id="newTopic" name="newTopic" value={newTopic} onChange={(e) => setNewTopic(e.target.value)} className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline" />
          </div>
        )}

        <div className="mb-6">
          <label htmlFor="description" className="block text-gray-700 text-sm font-bold mb-2">
            Description:
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline h-32"
            required
          ></textarea>
        </div>
        {error && <p className="text-red-500 text-xs italic mb-4">{error}</p>}
        <div className="flex items-center justify-between">
          <button
            type="submit"
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Forum'}
          </button>
        </div>
      </form>
    </div>
  );
}
