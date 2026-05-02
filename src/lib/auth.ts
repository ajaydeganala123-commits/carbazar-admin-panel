import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';

import { auth, db } from './firebase';

export interface AdminSession {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
}

/**
 * Subscribe to auth state and resolve admin status by checking
 * `admins/{uid}` doc existence.
 */
export function useAdminSession(): AdminSession {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u == null) {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, 'admins', u.uid));
        setIsAdmin(snap.exists());
      } catch (e) {
        console.error('admin check failed', e);
        setIsAdmin(false);
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  return { user, isAdmin, loading };
}

export async function signInAdmin(email: string, password: string) {
  await signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signOutAdmin() {
  await signOut(auth);
}
