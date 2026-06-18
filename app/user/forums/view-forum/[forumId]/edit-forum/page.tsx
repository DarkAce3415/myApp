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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);

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
    if (missingFields.includes(name)) {
      setMissingFields((prev) => prev.filter((field) => field !== name));
    }
  };

  const slugify = (s: string) => s.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-_]/g, '');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forumId) return;
    setSaving(true);
    setSubmitError(null);
    setSuccess(null);
    setMissingFields([]);

    const newMissingFields: string[] = [];
    if (!formData.title.trim()) newMissingFields.push('title');
    if (!formData.topic) newMissingFields.push('topic');
    if (!formData.description.trim()) newMissingFields.push('description');

    if (newMissingFields.length > 0) {
      setSubmitError('Please fill in all required fields.');
      setMissingFields(newMissingFields);
      setSaving(false);
      return;
    }

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

      setSuccess('Forum updated successfully! Redirecting...');
      setTimeout(() => {
        router.push(`/user/forums/view-forum/${forumId}`);
      }, 1000);
    } catch (err: any) {
      setSubmitError('Failed to update forum: ' + err.message);
      setSaving(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-100 text-black flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-100 text-black flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white border border-gray-200 rounded-lg shadow-lg p-8">
        <button onClick={() => router.back()} className="mb-4 text-blue-600 hover:text-blue-500">
          &larr; Back
        </button>
        <h1 className="text-2xl font-bold mb-4 text-center">Edit Forum</h1>
        {error ? (
          <div className="bg-red-100 border border-red-400 text-red-700 text-sm p-3 rounded mb-4 text-center font-medium shadow-sm">
            {error}
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-black text-sm font-bold">Forum Title:</label>
                <span className="text-xs text-gray-500">{formData.title.length}/75</span>
              </div>
              <input type="text" name="title" maxLength={75} value={formData.title} onChange={handleChange} className={`w-full border rounded py-2 px-3 focus:outline-none focus:border-black ${missingFields.includes('title') ? 'border-red-500 bg-red-50 text-red-900 placeholder-red-400' : 'border-gray-300 bg-white text-black'}`} />
            </div>
            <div className="mb-4">
              <label className="block text-black text-sm font-bold mb-2">Topic:</label>
              <select name="topic" value={formData.topic} onChange={handleChange} className={`w-full border rounded py-2 px-3 focus:outline-none focus:border-black ${missingFields.includes('topic') ? 'border-red-500 bg-red-50 text-red-900' : 'border-gray-300 bg-white text-black'}`}>
                {topics.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-black text-sm font-bold">Description:</label>
                <span className="text-xs text-gray-500">{formData.description.length}/300</span>
              </div>
              <textarea name="description" maxLength={300} value={formData.description} onChange={handleChange} className={`w-full border rounded py-2 px-3 focus:outline-none focus:border-black h-32 ${missingFields.includes('description') ? 'border-red-500 bg-red-50 text-red-900 placeholder-red-400' : 'border-gray-300 bg-white text-black'}`} />
            </div>
            {submitError && (
              <div className="bg-red-100 border border-red-400 text-red-700 text-sm p-3 rounded mb-4 text-center font-medium shadow-sm">
                {submitError}
              </div>
            )}
            {success && (
              <div className="bg-green-100 border border-green-400 text-green-700 text-sm p-3 rounded mb-4 text-center font-medium shadow-sm">
                {success}
              </div>
            )}
            <button type="submit" disabled={saving} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}