'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '../../lib/ClientApp'
import { onAuthStateChanged, signOut, updateProfile, sendPasswordResetEmail } from 'firebase/auth'
import { doc, getDoc, updateDoc, collection, query, where, getDocs, documentId } from 'firebase/firestore'
import { CldUploadWidget } from 'next-cloudinary'

export default function AccountPageUser() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [userEmail, setUserEmail] = useState<string | null>(null)
    const [username, setUsername] = useState('')
    const [photoUrl, setPhotoUrl] = useState('')
    const [ownedCoursesCount, setOwnedCoursesCount] = useState(0)
    const [completedCoursesCount, setCompletedCoursesCount] = useState(0)
    const [inProgressCoursesCount, setInProgressCoursesCount] = useState(0)
    const [forumsCreatedCount, setForumsCreatedCount] = useState(0)
    const [totalForumLikes, setTotalForumLikes] = useState(0)
    const [isEditing, setIsEditing] = useState(false)
    const [showResetConfirm, setShowResetConfirm] = useState(false)

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (!user) {
                router.push('/login-page')
            } else {
                setUserEmail(user.email)
                try {
                    const userRef = doc(db, 'users', user.uid)
                    const userSnap = await getDoc(userRef)
                    if (userSnap.exists()) {
                        const data = userSnap.data()
                        setUsername(user.displayName || data.username || '')
                        setPhotoUrl(user.photoURL || data.profilePicture || '')
                        
                        const purchasedCourseIds = data.purchasedCourses || []
                        const courseProgress = data.courseProgress || {}
                        const purchasedCount = purchasedCourseIds.length
                        setOwnedCoursesCount(purchasedCount)
                        
                        let completedCount = 0
                        if (purchasedCount > 0) {
                            const chunkSize = 10
                            for (let i = 0; i < purchasedCourseIds.length; i += chunkSize) {
                                const chunk = purchasedCourseIds.slice(i, i + chunkSize)
                                const q = query(collection(db, 'courses'), where(documentId(), 'in', chunk))
                                const querySnapshot = await getDocs(q)
                                querySnapshot.forEach((courseDoc) => {
                                    const courseData = courseDoc.data()
                                    const watchedCount = courseProgress[courseDoc.id]?.length || 0
                                    const lessons = courseData.lessons || courseData.videoUrls || []
                                    const totalVideos = lessons.length
                                    if (totalVideos > 0 && watchedCount >= totalVideos) {
                                        completedCount++
                                    }
                                })
                            }
                        }

                        setCompletedCoursesCount(completedCount)
                        setInProgressCoursesCount(Math.max(0, purchasedCount - completedCount))
                    } else {
                        setUsername(user.displayName || '')
                        setPhotoUrl(user.photoURL || '')
                    }

                    // Fetch forums and their total likes
                    const forumsQuery = query(collection(db, 'forums'), where('userId', '==', user.uid))
                    const forumsSnapshot = await getDocs(forumsQuery)
                    setForumsCreatedCount(forumsSnapshot.size)
                    
                    const likesPromises = forumsSnapshot.docs.map(forumDoc => 
                        getDocs(collection(db, 'forums', forumDoc.id, 'likes'))
                    )
                    const likesSnapshots = await Promise.all(likesPromises)
                    const likesSum = likesSnapshots.reduce((acc, snap) => acc + snap.size, 0)
                    setTotalForumLikes(likesSum)
                } catch (error) {
                    console.error('Error fetching user data:', error)
                }
                setLoading(false)
            }
        })

        return () => unsubscribe()
    }, [router])

    const handleSignOut = async () => {
        try {
            await signOut(auth)
            router.push('/')
        } catch (error) {
            console.error('Error signing out:', error)
        }
    }

    const handleUpdateProfile = async () => {
        if (!auth.currentUser) return;
        try {
            await updateProfile(auth.currentUser, {
                displayName: username,
                photoURL: photoUrl
            })
            const userRef = doc(db, 'users', auth.currentUser.uid)
            await updateDoc(userRef, {
                username: username,
                profilePicture: photoUrl
            }).catch(() => console.log('Firestore user doc not updated, might not exist yet.'))
            alert('Profile updated successfully!')
            setIsEditing(false)
        } catch (error) {
            console.error('Error updating profile:', error)
            alert('Failed to update profile.')
        }
    }

    const handleResetPassword = async () => {
        if (!userEmail) return;
        try {
            await sendPasswordResetEmail(auth, userEmail)
            alert('Password reset email sent! Check your inbox.')
            setShowResetConfirm(false)
        } catch (error) {
            console.error('Error sending reset email:', error)
            alert('Failed to send reset email.')
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
                <span className="text-xl">Loading...</span>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-black text-white flex items-center justify-center p-6">
            <div className="w-full max-w-4xl flex flex-col md:flex-row items-stretch gap-6 pt-16">
                
                {/* Profile Settings Card */}
                <div className="bg-white text-black rounded-lg shadow-lg p-8 flex-1 w-full">
                <div className="flex flex-col items-center mb-6">
                    {photoUrl ? (
                        <img src={photoUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover border-2 border-black mb-4" />
                    ) : (
                        <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center border-2 border-black mb-4">
                            <span className="text-gray-500 font-medium">No Pic</span>
                        </div>
                    )}
                    <h1 className="text-2xl font-bold text-center">{username || 'User'}</h1>
                    <p className="text-gray-600 text-center">{userEmail}</p>
                </div>


                {isEditing ? (
                    <div className="flex flex-col gap-4 mb-6">
                        <div>
                            <label className="block text-sm font-semibold mb-1">Username</label>
                            <input type="text" value={username} onChange={(e)=>setUsername(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold mb-1">Profile Picture</label>
                            <CldUploadWidget
                                uploadPreset={process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET}
                                options={{
                                    maxFiles: 1,
                                    resourceType: 'image'
                                }}
                                onSuccess={(result: any) => {
                                    if (result.info && typeof result.info === 'object' && result.info.secure_url) {
                                        setPhotoUrl(result.info.secure_url)
                                    }
                                }}
                            >
                                {({ open }) => (
                                    <button type="button" onClick={() => open()} className="w-full border border-gray-300 bg-gray-100 rounded px-3 py-2 text-left hover:bg-gray-200 transition">
                                        {photoUrl ? 'Change Image' : 'Upload Image'}
                                    </button>
                                )}
                            </CldUploadWidget>
                        </div>
                        <div className="flex gap-2 mt-2">
                            <button onClick={handleUpdateProfile} className="flex-1 bg-black text-white py-2 rounded font-semibold hover:bg-gray-800 transition">Save</button>
                            <button onClick={()=>setIsEditing(false)} className="flex-1 border border-black text-black py-2 rounded font-semibold hover:bg-gray-100 transition">Cancel</button>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 mb-6">
                        <button onClick={()=>setIsEditing(true)} className="w-full border border-black text-black py-2 rounded font-semibold hover:bg-gray-100 transition">Edit Profile</button>
                        <button onClick={()=>setShowResetConfirm(true)} className="w-full border border-black text-black py-2 rounded font-semibold hover:bg-gray-100 transition">Reset Password</button>
                    </div>
                )}

                <button
                    onClick={handleSignOut}
                    className="w-full py-2 rounded bg-red-600 text-white font-semibold hover:bg-red-700 transition"
                >
                    Sign Out
                </button>
                </div>

                {/* Progress Tracker Card */}
                <div className="bg-white text-black rounded-lg shadow-lg p-8 flex-1 w-full flex flex-col">
                    <h2 className="text-xl font-bold text-center mb-6 uppercase tracking-widest border-b border-gray-200 pb-2">Progress Tracker</h2>
                    <div className="grid grid-cols-3 gap-4 text-center">
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Total</span>
                            <span className="text-3xl font-bold">{ownedCoursesCount}</span>
                        </div>
                        <div className="flex flex-col border-l border-r border-gray-200">
                            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">In Progress</span>
                            <span className="text-3xl font-bold">{inProgressCoursesCount}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Completed</span>
                            <span className="text-3xl font-bold">{completedCoursesCount}</span>
                        </div>
                    </div>
                    <div className="mt-5 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div className="bg-black h-full transition-all duration-500" style={{ width: `${ownedCoursesCount > 0 ? (completedCoursesCount / ownedCoursesCount) * 100 : 0}%` }} />
                    </div>
                    <p className="text-xs text-center text-gray-500 mt-2 pb-6 border-b border-gray-200">
                        {ownedCoursesCount > 0 ? `${Math.round((completedCoursesCount / ownedCoursesCount) * 100)}% overall completion` : 'Enroll in courses to start learning'}
                    </p>

                    <div className="mt-6 flex justify-around items-center text-center flex-1">
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Forums Created</span>
                            <span className="text-3xl font-bold">{forumsCreatedCount}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-1">Forum Likes</span>
                            <span className="text-3xl font-bold">{totalForumLikes}</span>
                        </div>
                    </div>
                </div>

                {showResetConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white p-6 rounded-lg max-w-sm w-full text-center">
                            <h2 className="text-xl font-bold mb-4">Reset Password</h2>
                            <p className="mb-6 text-gray-700">Are you sure you want to send a password reset email to <strong>{userEmail}</strong>?</p>
                            <div className="flex gap-4 justify-center">
                                <button onClick={()=>setShowResetConfirm(false)} className="text-gray-900 px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition">Cancel</button>
                                <button onClick={handleResetPassword} className="px-4 py-2 bg-black text-white rounded hover:opacity-90 transition">Confirm</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}