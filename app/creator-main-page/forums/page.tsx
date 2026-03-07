'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { db, auth } from '../../lib/ClientApp'
import { collection, getDocs, query, where, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'

interface Forum {
    id: string;
    title: string;
    description: string;
    topic?: string;
    weeklyLikes?: number;
    totalLikes?: number;
    liked?: boolean;
    isCreator?: boolean;
} 

export default function CreatorForumsPage() {
    const [forums, setForums] = useState<Forum[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [topics, setTopics] = useState<string[]>([]);
    const [selectedTopic, setSelectedTopic] = useState<string>('All');
    const [use7Day, setUse7Day] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [liking, setLiking] = useState<Record<string, boolean>>({});

    useEffect(() => {
        const fetchTopicsOnly = async () => {
            try {
                const topicsSnap = await getDocs(collection(db, 'topics'));
                const topicNames = topicsSnap.docs.map((d) => (d.data() as any).name);
                if (topicNames.length) setTopics(topicNames);
            } catch (err) {
            }
        };

        fetchTopicsOnly();
    }, []);

    useEffect(() => {
        const fetchForums = async () => {
            try {
                const forumsCollection = collection(db, 'forums');
                const forumSnapshot = await getDocs(forumsCollection);

                const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

                const forumsList = await Promise.all(
                    forumSnapshot.docs.map(async (d) => {
                        const data = d.data() as any;
                        const id = d.id;

                        const likes7Query = query(collection(db, 'forums', id, 'likes'), where('timestamp', '>=', cutoff));
                        const likes7Snapshot = await getDocs(likes7Query);
                        const weeklyLikes = likes7Snapshot.size;

                        const likesAllSnapshot = await getDocs(collection(db, 'forums', id, 'likes'));
                        const totalLikes = likesAllSnapshot.size;

                        let liked = false;
                        const uid = auth.currentUser?.uid;
                        if (uid) {
                            const likedDoc = await getDoc(doc(db, 'forums', id, 'likes', uid));
                            liked = likedDoc.exists();
                        }

                        return {
                            id,
                            title: data.title,
                            description: data.description,
                            topic: data.topic || 'General',
                            weeklyLikes,
                            totalLikes,
                            liked,
                            isCreator: data.isCreator || false,
                        } as Forum;
                    })
                );

                const uniqueTopics = Array.from(new Set(forumsList.map((f) => f.topic || 'General')));

                setTopics(uniqueTopics);
                setForums(forumsList);
            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchForums();
    }, []);

    const handleTopicChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setSelectedTopic(e.target.value);
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    const handleToggle7Day = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUse7Day(e.target.checked);
    };
    const handleToggleLike = async (forumId: string, liked: boolean) => {
        const uid = auth.currentUser?.uid;
        if (!uid) {
            alert('Please sign in to like forums.');
            return;
        }

        setLiking((p) => ({ ...p, [forumId]: true }));
        try {
            if (liked) {
                await deleteDoc(doc(db, 'forums', forumId, 'likes', uid));
            } else {
                await setDoc(doc(db, 'forums', forumId, 'likes', uid), {
                    userId: uid,
                    role: 'creator',
                    timestamp: serverTimestamp(),
                });
            }

            // Update local state for that forum (update both weekly & total counts)
            setForums((prev) =>
                prev.map((f) => {
                    if (f.id !== forumId) return f;
                    return {
                        ...f,
                        liked: !liked,
                        weeklyLikes: (f.weeklyLikes || 0) + (liked ? -1 : 1),
                        totalLikes: (f.totalLikes || 0) + (liked ? -1 : 1),
                    };
                })
            );
        } catch (err: any) {
            console.error('Failed to toggle like', err);
            alert('Could not update like. Please try again.');
        } finally {
            setLiking((p) => ({ ...p, [forumId]: false }));
        }
    };

    if (loading) return <div className="p-6 flex justify-center text-white bg-gray-900 min-h-screen">Loading forums — please wait...</div>;
    if (error) return <div className="p-6 flex justify-center text-red-400 bg-gray-900 min-h-screen">Something went wrong while loading forums: {error}</div>;

    const filtered = forums
        .filter((f) => (selectedTopic === 'All' || f.topic === selectedTopic) && f.title.toLowerCase().includes(searchQuery.toLowerCase()))
        .sort((a, b) => ((use7Day ? (b.weeklyLikes || 0) : (b.totalLikes || 0)) - (use7Day ? (a.weeklyLikes || 0) : (a.totalLikes || 0))));

    return (
        <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center p-6">
            <div className="w-full max-w-4xl flex flex-col gap-6">
                <div className="flex items-center justify-between mb-4 gap-4">
                    <h1 className="text-2xl font-bold">Creator Forums</h1>
                    <div className="flex items-center gap-4">
                        <input type="text" placeholder="Search by title..." value={searchQuery} onChange={handleSearchChange} className="border border-gray-600 rounded p-1 bg-gray-800 text-white" />
                        <label className="flex items-center gap-2">
                            <input type="checkbox" checked={use7Day} onChange={handleToggle7Day} />
                            <span className="text-sm text-white">Use 7-day ranking</span>
                        </label>
                        <div>
                            <label className="mr-2">Filter by topic:</label>
                            <select value={selectedTopic} onChange={handleTopicChange} className="border border-gray-600 rounded p-1 bg-gray-800 text-white">
                                <option value="All">All Topics</option>
                                {topics.map((t) => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>

                        <Link href="/creator-main-page/forums/my-forums" className="inline-block">
                            <button className="px-4 py-2 border border-white rounded bg-white text-black font-semibold hover:bg-gray-200 transition">My Forums</button>
                        </Link>

                        <Link href="/creator-main-page/forums/add-forums" className="inline-block">
                            <button className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded">Create Forum</button>
                        </Link>
                    </div>
                </div>

                {filtered.length === 0 ? (
                    <p className="text-white text-center py-8">No forums found. Be the first to create a forum to start discussions.</p>
                ) : (
                    <ul className="space-y-4">
                        {filtered.map((forum) => (
                            <div key={forum.id} className="flex justify-center">
                                <li className="w-full border border-gray-600 bg-gray-800 rounded-lg p-4 shadow-md hover:bg-gray-750 transition">
                                    <Link href={`/creator-main-page/forums/view-forums/${forum.id}`} className="block">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h2 className="text-xl font-semibold text-white">{forum.title}</h2>
                                            {forum.isCreator && (
                                                <span className="px-2 py-1 bg-purple-600 text-white text-xs font-semibold rounded">Creator</span>
                                            )}
                                        </div>
                                    </Link>
                                    <div className="flex items-center justify-between border-t border-gray-600 pt-2">
                                        <p className="text-white">{forum.description}</p>
                                        <div className="flex items-center gap-3">
                                            <button 
                                            onClick={() => handleToggleLike(forum.id, !!forum.liked)} 
                                            disabled={!!liking[forum.id]}
                                            className={`px-3 py-1 rounded ${forum.liked ? 'bg-blue-600 text-white' : 'bg-gray-700 text-white'} ${liking[forum.id] ? 'opacity-60 cursor-not-allowed' : ''}`}>
                                            {liking[forum.id] ? (
                                                <span className="inline-flex items-center gap-2">
                                                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                        <span className="text-sm">Processing</span>
                                                    </span>
                                                    ) : forum.liked ? 'Liked' : 'Like'}
                                                </button> 
                                            <span className="text-sm text-white">{use7Day ? (forum.weeklyLikes || 0) + ' likes (7d)' : (forum.totalLikes || 0) + ' likes'}</span>
                                        </div>
                                    </div>
                                </li>
                            </div>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    )
}
