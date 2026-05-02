import {
  onSnapshot,
  type Query,
  type DocumentReference,
} from 'firebase/firestore';
import { useEffect, useState } from 'react';

export interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
}

/// Live subscription to a Firestore query. Cleans itself up on unmount.
export function useCollection<T>(
  query: Query | null,
  map: (id: string, data: any) => T,
): AsyncState<T[]> {
  const [data, setData] = useState<T[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (query == null) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      query,
      (snap) => {
        setData(snap.docs.map((d) => map(d.id, d.data())));
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query?.toString()]);

  return { data, loading, error };
}

/// Live subscription to a single Firestore document.
export function useDocument<T>(
  ref: DocumentReference | null,
  map: (id: string, data: any) => T,
): AsyncState<T | null> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (ref == null) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const unsub = onSnapshot(
      ref,
      (snap) => {
        setData(snap.exists() ? map(snap.id, snap.data()) : null);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      },
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref?.path]);

  return { data, loading, error };
}
