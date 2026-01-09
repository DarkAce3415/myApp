'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { db } from '../../lib/ClientApp'
import { collection, getDocs } from 'firebase/firestore'

interface Forum {
    id: string;
    title: string;
    description: string;
}

export default function forums() {
    const [forums, setForums] = useState<Forum[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchForums = async () => {
            try {
                const forumsCollection = collection(db, 'forums');
                const forumSnapshot = await getDocs(forumsCollection);
                const forumsList = forumSnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                })) as Forum[];
                setForums(forumsList);

            } catch (e: any) {
                setError(e.message);
            } finally {
                setLoading(false);
            }
        };

        fetchForums();
    }, []);

    if (loading) return <div>Loading forums...</div>;
    if (error) return <div>Error: {error}</div>;

    return (
        <div>
            <h1>Forums</h1>
            {forums.length === 0 ? <p>No forums available yet.</p> : (
                <ul>
                    {forums.map((forum) => ( 
                        <div key={forum.id} className="flex justify-center my-4">
                            <li className="w-2/3 border border-gray-300 rounded-lg p-4 shadow-md bg-white">
                                <Link href={`/creator-main-page/forums/${forum.id}`} className="block">
                                    <h2 className="text-xl font-semibold mb-2">{forum.title}</h2>
                                </Link>
                                <div className="border-t border-gray-200 pt-2">
                                    <p className="text-black">{forum.description}</p>
                                </div>
                            </li>
                        </div>
                    ))}
                </ul>
            )}
        </div>
    )
}
