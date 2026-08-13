import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyDpqB5TNe0OcVzsfFyBeMxmVy1TgdO0zvw",
  authDomain: "spurthchat.firebaseapp.com",
  databaseURL: "https://spurthchat-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "spurthchat",
  storageBucket: "spurthchat.firebasestorage.app",
  messagingSenderId: "23044304139",
  appId: "1:23044304139:web:452b650a69f00bed42460e",
  measurementId: "G-SEYKRKF0NZ"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);