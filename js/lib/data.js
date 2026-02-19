// js/lib/data.js
import { db } from "./firebase.js";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  writeBatch,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

export async function getUsers() {
  const snap = await getDocs(collection(db, "users"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getAdminUids() {
  const snap = await getDocs(collection(db, "admins"));
  return snap.docs.map((d) => d.id);
}

export async function getProjects() {
  const snap = await getDocs(collection(db, "projects"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function getUserEntitledProjectIds(userId) {
  const snap = await getDoc(doc(db, "entitlements", userId));
  if (!snap.exists()) return [];
  const data = snap.data();
  return Array.isArray(data.projectIds) ? data.projectIds : [];
}

export async function getAllEntitlements() {
  const snap = await getDocs(collection(db, "entitlements"));
  return snap.docs.map((d) => ({
    userId: d.id,
    projectIds: Array.isArray(d.data().projectIds) ? d.data().projectIds : []
  }));
}

export async function setEntitlementsBulk(entitlementsArray) {
  const batch = writeBatch(db);

  entitlementsArray.forEach(({ userId, projectIds }) => {
    batch.set(
      doc(db, "entitlements", userId),
      { projectIds: projectIds || [], updatedAt: serverTimestamp() },
      { merge: true }
    );
  });

  await batch.commit();
}
