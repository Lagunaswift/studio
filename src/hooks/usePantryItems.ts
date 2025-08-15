import { useState, useEffect } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '@/lib/firebase-client';
import type { PantryItem } from '@/types';

export function usePantryItems(userId: string | undefined) {
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setPantryItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const pantryRef = collection(db, `profiles/${userId}/pantry`);
    const q = query(pantryRef);

    const unsubscribe = onSnapshot(q, 
      (querySnapshot) => {
        const items: PantryItem[] = [];
        querySnapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() } as PantryItem);
        });
        setPantryItems(items);
        setLoading(false);
      },
      (error) => {
        console.error('Error loading pantry items:', error);
        setError(error.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [userId]);

  return { pantryItems, loading, error };
}