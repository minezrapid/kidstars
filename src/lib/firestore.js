import { db } from './firebase'
import {
  doc, setDoc, getDoc, updateDoc, collection,
  getDocs, deleteDoc, query, where, serverTimestamp
} from 'firebase/firestore'

// ── USERS ─────────────────────────────────────────────────────
export async function createUserDoc(userId, data) {
  await setDoc(doc(db, 'users', userId), {
    ...data, createdAt: serverTimestamp(), setupComplete: false,
  })
}
export async function getUserDoc(userId) {
  const snap = await getDoc(doc(db, 'users', userId))
  return snap.exists() ? { id: snap.id, ...snap.data() } : null
}
export async function updateUserDoc(userId, data) {
  await updateDoc(doc(db, 'users', userId), data)
}

// ── CHILDREN ──────────────────────────────────────────────────
// Children can exist in two ways:
// 1. Admin created them in setup → document in 'children' collection
// 2. Child registered via invite → document in 'users' collection with role='child'
// getChildren returns ALL children for an admin, from both sources

export async function addChild(adminId, { childName, ageGroup, gender }) {
  const childId = `${adminId}_${Date.now()}`
  await setDoc(doc(db, 'children', childId), {
    adminId, childName, ageGroup, gender: gender || 'girl',
    userId: null, createdAt: serverTimestamp(),
  })
  return childId
}

export async function getChildren(adminId) {
  // Source 1: children collection (created in setup)
  const q1 = query(collection(db, 'children'), where('adminId', '==', adminId))
  const snap1 = await getDocs(q1)
  const fromSetup = snap1.docs.map(d => ({ id: d.id, source: 'children', ...d.data() }))

  // Source 2: users with role=child and adminId matching (registered via invite)
  const q2 = query(collection(db, 'users'), where('adminId', '==', adminId), where('role', '==', 'child'))
  const snap2 = await getDocs(q2)
  const fromUsers = snap2.docs.map(d => ({
    id: d.data().childId || d.id, // use childId if set, otherwise use userId as fallback
    userId: d.id,
    source: 'users',
    childName: d.data().childName,
    ageGroup: d.data().ageGroup,
    gender: d.data().gender || 'girl',
    adminId,
  }))

  // Merge: avoid duplicates (child in 'children' collection may have userId linked)
  const linkedUserIds = new Set(fromSetup.filter(c => c.userId).map(c => c.userId))
  const uniqueFromUsers = fromUsers.filter(c => !linkedUserIds.has(c.userId))

  // For users-source children, ensure a childId doc exists in children collection
  for (const child of uniqueFromUsers) {
    if (child.source === 'users' && child.id === child.userId) {
      // Create a proper children doc so config/state can work
      try {
        const existing = await getDoc(doc(db, 'children', child.id))
        if (!existing.exists()) {
          await setDoc(doc(db, 'children', child.id), {
            adminId, childName: child.childName, ageGroup: child.ageGroup,
            gender: child.gender, userId: child.userId, createdAt: serverTimestamp(),
          })
        }
      } catch {}
    }
  }

  return [...fromSetup, ...uniqueFromUsers]
}

export async function getChildDoc(childId) {
  // Try children collection first
  const snap = await getDoc(doc(db, 'children', childId))
  if (snap.exists()) return { id: snap.id, ...snap.data() }
  // Fallback: user doc
  const snap2 = await getDoc(doc(db, 'users', childId))
  if (snap2.exists()) return { id: snap2.id, ...snap2.data() }
  return null
}

export async function updateChildDoc(childId, data) {
  try {
    await updateDoc(doc(db, 'children', childId), data)
  } catch {
    await updateDoc(doc(db, 'users', childId), data)
  }
}

// ── CHILD CONFIG ──────────────────────────────────────────────
export async function getChildConfig(adminId, childId) {
  const snap = await getDoc(doc(db, 'childConfig', `${adminId}_${childId}`))
  return snap.exists() ? snap.data() : null
}
export async function saveChildConfig(adminId, childId, data) {
  await setDoc(doc(db, 'childConfig', `${adminId}_${childId}`), data, { merge: true })
}

// ── CHILD STATE ───────────────────────────────────────────────
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

// Delete a child completely (children doc + config + state)
export async function deleteChild(adminId, childId) {
  const promises = [
    deleteDoc(doc(db, 'children', childId)).catch(() => {}),
    deleteDoc(doc(db, 'childConfig', `${adminId}_${childId}`)).catch(() => {}),
    deleteDoc(doc(db, 'childState', `${adminId}_${childId}`)).catch(() => {}),
  ]
  await Promise.all(promises)
}

// Get all invites for a specific child
export async function getChildInvites(adminId, childId) {
  const q = query(collection(db, 'invites'), where('adminId', '==', adminId), where('childId', '==', childId))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ token: d.id, ...d.data() }))
}

// ── INVITES ───────────────────────────────────────────────────
export async function createInvite(adminId, childId, { email, role, ageGroup, childName, gender }) {
  const token = crypto.randomUUID()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  await setDoc(doc(db, 'invites', token), {
    adminId, childId: childId || null, email: email || '',
    role, ageGroup, childName, gender: gender || 'girl',
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
