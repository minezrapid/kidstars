import { db } from './firebase'
import {
  doc, setDoc, getDoc, updateDoc, collection,
  getDocs, deleteDoc, query, where, serverTimestamp
} from 'firebase/firestore'

export async function createUserDoc(userId, data) {
  await setDoc(doc(db, 'users', userId), { ...data, createdAt: serverTimestamp(), setupComplete: false })
}
export async function getUserDoc(userId) {
  const snap = await getDoc(doc(db, 'users', userId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}
export async function updateUserDoc(userId, data) {
  await updateDoc(doc(db, 'users', userId), data)
}

// Children list (separate collection, not tied to Firebase Auth)
export async function addChild(adminId, { childName, ageGroup, gender }) {
  const childId = `${adminId}_${Date.now()}`
  await setDoc(doc(db, 'children', childId), {
    adminId, childName, ageGroup, gender: gender || 'boy', userId: null, createdAt: serverTimestamp(),
  })
  return childId
}
export async function getChildren(adminId) {
  const q = query(collection(db, 'children'), where('adminId', '==', adminId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}
export async function getChildDoc(childId) {
  const snap = await getDoc(doc(db, 'children', childId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}
export async function updateChildDoc(childId, data) {
  await updateDoc(doc(db, 'children', childId), data)
}

// Per-child config set by admin
export async function getChildConfig(adminId, childId) {
  const snap = await getDoc(doc(db, 'childConfig', `${adminId}_${childId}`))
  return snap.exists() ? snap.data() : null
}
export async function saveChildConfig(adminId, childId, data) {
  await setDoc(doc(db, 'childConfig', `${adminId}_${childId}`), data, { merge: true })
}

// Child state (stars, done tasks, history)
export async function getChildState(adminId, childId) {
  const snap = await getDoc(doc(db, 'childState', `${adminId}_${childId}`))
  return snap.exists() ? snap.data() : null
}
export async function saveChildState(adminId, childId, state) {
  await setDoc(doc(db, 'childState', `${adminId}_${childId}`), state)
}
export async function resetChildState(adminId, childId) {
  await deleteDoc(doc(db, 'childState', `${adminId}_${childId}`))
}

// Invites
export async function createInvite(adminId, childId, { email, role, ageGroup, childName, gender }) {
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await setDoc(doc(db, 'invites', token), {
    adminId, childId, email: email || '', role, ageGroup, childName, gender: gender || 'boy',
    used: false, expiresAt, createdAt: serverTimestamp(),
  })
  return token
}
export async function getInvite(token) {
  const snap = await getDoc(doc(db, 'invites', token))
  return snap.exists() ? { token, ...snap.data() } : null
}
export async function markInviteUsed(token) {
  await updateDoc(doc(db, 'invites', token), { used: true })
}
export async function cancelInvite(token) {
  await deleteDoc(doc(db, 'invites', token))
}
export async function getAdminInvites(adminId) {
  const q = query(collection(db, 'invites'), where('adminId', '==', adminId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ token: d.id, ...d.data() }))
}
export async function createGuestLink(adminId) {
  const token = crypto.randomUUID()
  await setDoc(doc(db, 'invites', token), {
    adminId, role: 'guest', used: false, permanent: true, createdAt: serverTimestamp(),
  })
  return token
}
