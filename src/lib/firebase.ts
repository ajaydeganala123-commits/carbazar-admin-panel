import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Auto-generated when we registered the Web app via:
//   firebase apps:create web "CARBAZAR Admin" --project=aimodel-ba509
// These values are public — they identify the project, not authenticate it.
// Real access control is enforced by Firestore security rules.
const firebaseConfig = {
  apiKey: 'AIzaSyAtFoxvecyBSyceGFhjqJBj4reAIat8cO4',
  authDomain: 'aimodel-ba509.firebaseapp.com',
  projectId: 'aimodel-ba509',
  storageBucket: 'aimodel-ba509.firebasestorage.app',
  messagingSenderId: '528690321698',
  appId: '1:528690321698:web:3e9a1de71666bde0052d7b',
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
