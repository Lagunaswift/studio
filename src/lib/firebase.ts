// /src/lib/firebase.ts - Legacy compatibility (if you want to keep existing imports)
// This file maintains backward compatibility with existing imports
// Gradually migrate to use firebase-client.ts directly

export { auth, db, storage } from './firebase-client';

// Re-export types that are commonly used
export type {
  User,
  UserCredential,
  AuthError,
  IdTokenResult,
} from 'firebase/auth';

export type {
  DocumentData,
  QuerySnapshot,
  DocumentSnapshot,
  Timestamp,
} from 'firebase/firestore';