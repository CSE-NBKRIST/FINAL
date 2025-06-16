import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyD7E6E-RWRarR0-fVWY8MnDTJ4npg513BU",
  authDomain: "cn-lab-evaluation-system.firebaseapp.com",
  projectId: "cn-lab-evaluation-system",
  storageBucket: "cn-lab-evaluation-system.firebasestorage.app",
  messagingSenderId: "810320773504",
  appId: "1:810320773504:web:dca156ec01d90ff12d4165",
  measurementId: "G-WZDMGF95L0"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);