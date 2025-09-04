// Firebase configuration - ADD YOUR FIREBASE CONFIG HERE
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

// TODO: Replace with your Firebase config object
const firebaseConfig = {
  apiKey: "AIzaSyCyWq1akBXvhlGTbDXLOoO2SjRBK5Don90",
  authDomain: "ai-music-player-2969a.firebaseapp.com",
  databaseURL: "https://ai-music-player-2969a-default-rtdb.firebaseio.com",
  projectId: "ai-music-player-2969a",
  storageBucket: "ai-music-player-2969a.firebasestorage.app",
  messagingSenderId: "121872065800",
  appId: "1:121872065800:web:d82a389d805293fb7b78bd",
  measurementId: "G-K45KXN77GC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Realtime Database and get a reference to the service
export const database = getDatabase(app);

export default app;
