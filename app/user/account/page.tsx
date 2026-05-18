'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { auth, db } from '../../lib/ClientApp'
import { onAuthStateChanged, signOut, updateProfile, sendPasswordResetEmail } from 'firebase/auth'
import { doc, getDoc, updateDoc } from 'firebase/firestore'
import { CldUploadWidget } from 'next-cloudinary'

export default function AccountPageUser() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [userEmail, setUserEmail] = useState<string | null>(null)
    const [username, setUsername] = useState('')
    const [photoUrl, setPhotoUrl] = useState('')
    const [ownedCoursesCount, setOwnedCoursesCount] = useState(0)
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
                        setOwnedCoursesCount(data.purchasedCourses?.length || 0)
                    } else {
                        setUsername(user.displayName || '')
                        setPhotoUrl(user.photoURL || '')
                    }
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
            <div className="w-full max-w-md bg-white text-black rounded-lg shadow-lg p-8">
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

                <div className="mb-6 bg-gray-100 rounded p-4 text-center">
                    <p className="text-lg font-semibold">Courses Owned</p>
                    <p className="text-3xl font-bold text-black">{ownedCoursesCount}</p>
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

                {showResetConfirm && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white p-6 rounded-lg max-w-sm w-full text-center">
                            <h2 className="text-xl font-bold mb-4">Reset Password</h2>
                            <p className="mb-6 text-gray-700">Are you sure you want to send a password reset email to <strong>{userEmail}</strong>?</p>
                            <div className="flex gap-4 justify-center">
                                <button onClick={()=>setShowResetConfirm(false)} className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition">Cancel</button>
                                <button onClick={handleResetPassword} className="px-4 py-2 bg-black text-white rounded hover:opacity-90 transition">Confirm</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}