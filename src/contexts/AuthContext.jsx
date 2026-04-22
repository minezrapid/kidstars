import { createContext, useContext, useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
} from 'firebase/auth'
import { auth } from '../lib/firebase'
import { createUserDoc, getUserDoc } from '../lib/firestore'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)       // Firebase Auth user
  const [profile, setProfile] = useState(null) // Firestore user doc
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        const prof = await getUserDoc(firebaseUser.uid)
        setProfile(prof)
      } else {
        setUser(null)
        setProfile(null)
      }
      setLoading(false)
    })
    return unsub
  }, [])

  async function registerAdmin(email, password, displayName) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await createUserDoc(cred.user.uid, {
      role: 'admin',
      email,
      displayName,
      adminId: cred.user.uid, // admin's own id is their adminId
      setupComplete: false,
    })
    const prof = await getUserDoc(cred.user.uid)
    setProfile(prof)
    return cred.user
  }

  async function registerChild(email, password, { displayName, childName, ageGroup, adminId, childId, gender }) {
    const cred = await createUserWithEmailAndPassword(auth, email, password)
    await createUserDoc(cred.user.uid, {
      role: 'child',
      email,
      displayName: displayName || childName,
      childName,
      ageGroup,
      adminId,
      childId: childId || null,
      gender: gender || 'girl',
      setupComplete: true,
    })
    const prof = await getUserDoc(cred.user.uid)
    setProfile(prof)
    return cred.user
  }

  async function login(email, password) {
    const cred = await signInWithEmailAndPassword(auth, email, password)
    const prof = await getUserDoc(cred.user.uid)
    setProfile(prof)
    return prof
  }

  async function logout() {
    await signOut(auth)
    setUser(null)
    setProfile(null)
  }

  async function resetPassword(email) {
    await sendPasswordResetEmail(auth, email)
  }

  async function refreshProfile() {
    if (user) {
      const prof = await getUserDoc(user.uid)
      setProfile(prof)
    }
  }

  return (
    <AuthContext.Provider value={{
      user, profile, loading,
      registerAdmin, registerChild,
      login, logout, resetPassword,
      refreshProfile,
      isAdmin: profile?.role === 'admin',
      isChild: profile?.role === 'child',
      isGuest: profile?.role === 'guest',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
