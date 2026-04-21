import { db } from './firebase'
import {
  doc, setDoc, getDoc, updateDoc, collection,
  addDoc, getDocs, deleteDoc, query, where, serverTimestamp
} from 'firebase/firestore'

// ── SCHEMA ──────────────────────────────────────────────────
//
// users/{userId}
//   role: 'admin' | 'child' | 'guest'
//   email: string
//   displayName: string
//   adminId: string        // for child/guest: which admin they belong to
//   childName: string      // for child accounts
//   ageGroup: '3-6'|'7-10'|'11-14'|'14-18'
//   createdAt: timestamp
//   setupComplete: boolean // admin: has completed initial setup?
//
// adminData/{adminId}
//   tasks1: [{id, name, pts}]         // rutina zilnica
//   tasks2: [{id, name, pts}]         // comportament
//   penalties: [{id, name, pts}]      // comportament gresit
//   rewards: [{id, icon, name, pts, type, dailyLimit, weeklyLimit}]
//   bonus1: number
//   bonus2: number
//   starValue: number                 // 1 stea = X RON (default 0.10)
//   maxLv1: number
//   maxLv2: number
//   maxLv3: number
//
// childState/{adminId}_{childId}
//   stars: number
//   done: {}
//   history: []
//   bonus1Given: bool
//   bonus2Given: bool
//   penaltiesApplied: []
//   extraPoints: []
//   earnedMonth: number
//   spentMonth: number
//   spentToday: number
//   spentTotal: number
//   spentLv1: number
//   todayKey: string
//   weekKey: string
//   monthKey: string
//   dailyCounts: {}
//   weeklyCounts: {}
//   yesterdayDone: {}
//   yesterdayKey: string
//   dailyHistory: {}
//
// invites/{token}
//   adminId: string
//   email: string
//   role: 'child' | 'guest'
//   ageGroup: string
//   childName: string
//   used: boolean
//   expiresAt: timestamp
//   createdAt: timestamp

// ── USER ────────────────────────────────────────────────────

export async function createUserDoc(userId, data) {
  await setDoc(doc(db, 'users', userId), {
    ...data,
    createdAt: serverTimestamp(),
    setupComplete: false,
  })
}

export async function getUserDoc(userId) {
  const snap = await getDoc(doc(db, 'users', userId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}

export async function updateUserDoc(userId, data) {
  await updateDoc(doc(db, 'users', userId), data)
}

// ── ADMIN DATA ───────────────────────────────────────────────

export async function getAdminData(adminId) {
  const snap = await getDoc(doc(db, 'adminData', adminId))
  return snap.exists() ? snap.data() : null
}

export async function saveAdminData(adminId, data) {
  await setDoc(doc(db, 'adminData', adminId), data, { merge: true })
}

// ── CHILD STATE ──────────────────────────────────────────────

export function childStateId(adminId, childId) {
  return `${adminId}_${childId}`
}

export async function getChildState(adminId, childId) {
  const snap = await getDoc(doc(db, 'childState', childStateId(adminId, childId)))
  return snap.exists() ? snap.data() : null
}

export async function saveChildState(adminId, childId, state) {
  await setDoc(doc(db, 'childState', childStateId(adminId, childId)), state, { merge: true })
}

// ── CHILDREN LIST (under an admin) ───────────────────────────

export async function getChildren(adminId) {
  const q = query(collection(db, 'users'), where('adminId', '==', adminId), where('role', '==', 'child'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// ── INVITES ──────────────────────────────────────────────────

export async function createInvite(adminId, { email, role, ageGroup, childName }) {
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
  await setDoc(doc(db, 'invites', token), {
    adminId, email, role, ageGroup, childName,
    used: false,
    expiresAt,
    createdAt: serverTimestamp(),
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

export async function getAdminInvites(adminId) {
  const q = query(collection(db, 'invites'), where('adminId', '==', adminId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ token: d.id, ...d.data() }))
}

// ── GUEST LINKS ───────────────────────────────────────────────

export async function createGuestLink(adminId) {
  const token = crypto.randomUUID()
  await setDoc(doc(db, 'invites', token), {
    adminId,
    role: 'guest',
    used: false,
    permanent: true,
    createdAt: serverTimestamp(),
  })
  return token
}
