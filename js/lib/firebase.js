import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC1Id7kdU23_A7fEO1eDna0HKprvIM30E8",
  authDomain: "teknoify-9449c.firebaseapp.com",
  projectId: "teknoify-9449c",
  storageBucket: "teknoify-9449c.firebasestorage.app",
  messagingSenderId: "704314596026",
  appId: "1:704314596026:web:f63fff04c00b7a698ac083",
  measurementId: "G-1DZKJE7BXE"
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
