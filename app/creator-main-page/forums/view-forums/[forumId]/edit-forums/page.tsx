'use client'

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { db, auth } from '../../../../../lib/ClientApp'; 
import { doc, getDoc, updateDoc, serverTimestamp, setDoc, increment } from 'firebase/firestore';

interface ForumFormData {
  title: string;
  description: string;
  topic?: string;
}

export default function EditForumPageUser() {
  const router = useRouter();
  const params = useParams();
  const forumId = Array.isArray(params?.forumId) ? params.forumId[0] : params?.forumId;

  const [formData, setFormData] = useState<ForumFormData>({
    title: '',
    description: '',
    topic: 'Machine Learning',
  });
  const [initialTopic, setInitialTopic] = useState<string>('');
  const [topics] = useState<string[]>([
    'Machine Learning', 'Deep Learning', 'Natural Language Processing',
    'Computer Vision', 'Robotics', 'AI Ethics', 'Generative AI', 'Neural Networks',
  ]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const uid = auth.currentUser?.uid;
      if (!uid || !forumId) return;

      try {
        const forumDoc = await getDoc(doc(db, 'forums', forumId));
        if (!forumDoc.exists()) {
          setError('Forum not found');
          setLoading(false);
          return;
        }

        const data = forumDoc.data();
        
        if (data.userId !== uid) {
          setError('You do not have permission to edit this forum.');
          setLoading(false);
          return;
        }

        setFormData({
          title: data.title || '',
          description: data.description || '',
          topic: data.topic || 'Machine Learning',
        });
        setInitialTopic(data.topic || 'Machine Learning');

      } catch (err: any) {
        setError('Error loading forum: ' + err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [forumId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const slugify = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forumId) return;
    setSaving(true);
    setError(null);

    try {
      const payload = {
        title: formData.title,
        description: formData.description,
        topic: formData.topic,
        updatedAt: serverTimestamp(),
      };

      await updateDoc(doc(db, 'forums', forumId), payload);

      if (formData.topic && formData.topic !== initialTopic) {
        const topicId = slugify(formData.topic);
        await setDoc(doc(db, 'topics', topicId), {
          name: formData.topic,
          updatedAt: serverTimestamp(),
          count: increment(1),
        }, { merge: true });
      }

      router.push(`/creator-main-page/forums/view-forums/${forumId}`);
    } catch (err: any) {
      setError('Failed to update forum: ' + err.message);
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-gray-800 border border-gray-700 rounded-lg shadow-lg p-8">
        <button onClick={() => router.back()} className="mb-4 text-blue-400 hover:text-blue-300">
          &larr; Back
        </button>
        <h1 className="text-2xl font-bold mb-4 text-center">Edit Forum</h1>
        {error ? (
          <p className="text-red-400 text-center">{error}</p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="mb-4">
              <label className="block text-white text-sm font-bold mb-2">Forum Title:</label>
              <input type="text" name="title" value={formData.title} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 text-white rounded py-2 px-3 focus:outline-none focus:border-white" required />
            </div>
            <div className="mb-4">
              <label className="block text-white text-sm font-bold mb-2">Topic:</label>
              <select name="topic" value={formData.topic} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 text-white rounded py-2 px-3 focus:outline-none focus:border-white">
                {topics.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="mb-6">
              <label className="block text-white text-sm font-bold mb-2">Description:</label>
              <textarea name="description" value={formData.description} onChange={handleChange} className="w-full bg-gray-700 border border-gray-600 text-white rounded py-2 px-3 focus:outline-none focus:border-white h-32" required />
            </div>
            <button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}