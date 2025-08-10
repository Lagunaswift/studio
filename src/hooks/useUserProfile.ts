// src/hooks/useUserProfile.ts
import { useState, useEffect } from 'react';
import { doc, onSnapshot, getFirestore } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { UserProfileSettings } from '@/types';
import { mergeWithDefaults } from '@/utils/profileDefaults';

export function useUserProfile(user: User | null) {
  const [profile, setProfile] = useState<UserProfileSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.uid) {
      console.log('🚫 No user or user.uid, skipping Firestore setup');
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      // Debug Firebase config
      console.log('🔧 Firebase config check:', {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? 'Present' : 'Missing',
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? 'Present' : 'Missing',
      });

      const db = getFirestore();
      
      console.log('🔥 Firestore instance:', db);
      
      if (!db) {
        throw new Error('Firestore not initialized');
      }

      if (typeof user.uid !== 'string' || user.uid.length === 0) {
        throw new Error(`Invalid user.uid: ${user.uid}`);
      }

      const userDocRef = doc(db, 'profiles', user.uid);

      console.log('🔥 Setting up Firestore listener for user:', user.uid);
      console.log('🔥 Looking in collection: profiles/' + user.uid);

      const unsubscribe = onSnapshot(
        userDocRef,
        (docSnapshot) => {
          try {
            if (docSnapshot.exists()) {
              const firestoreData = docSnapshot.data();
              console.log('📊 Firestore data fetched:', firestoreData);
              
              const completeProfile = mergeWithDefaults(firestoreData, user.uid);
              setProfile(completeProfile);
            } else {
              console.log('📊 No profile document found, using defaults');
              const defaultProfile = mergeWithDefaults({}, user.uid);
              setProfile(defaultProfile);
            }
            setError(null);
          } catch (err) {
            console.error('❌ Error processing profile data:', err);
            setError('Failed to load profile data');
          } finally {
            setLoading(false);
          }
        },
        (err) => {
          console.error('❌ Firestore listener error:', err);
          setError('Failed to connect to profile data');
          setLoading(false);
        }
      );

      return () => {
        console.log('🧹 Cleaning up Firestore listener');
        unsubscribe();
      };
    } catch (err) {
      console.error('❌ Error initializing Firestore:', err);
      setError('Failed to initialize Firestore connection');
      setLoading(false);
    }
  }, [user]);

  return { profile, loading, error };
}
