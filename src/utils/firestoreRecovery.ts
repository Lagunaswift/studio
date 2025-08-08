// src/utils/firestoreRecovery.ts
import { authRecovery } from './authRecovery';
import { tokenManager } from './tokenManager';
import * as admin from 'firebase-admin';
import type { App } from 'firebase-admin/app';

export class FirestoreRecoveryWrapper {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  }

  async updateUserProfile(userId: string, profileData: any): Promise<any> {
    return await authRecovery.retryOperation(async () => {
      const token = await tokenManager.getValidToken();
      console.log('Updating user profile for:', userId);
      console.log('Profile data:', profileData);

      const response = await Promise.race([
        fetch(`${this.baseUrl}/api/user/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            userId,
            ...profileData,
          }),
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        )
      ]);

      if (!(response as Response).ok) {
        const errorData = await (response as Response).json().catch(() => ({}));
        throw new Error(`Profile update failed: ${(response as Response).status} - ${errorData.message || (response as Response).statusText}`);
      }

      const result = await (response as Response).json();
      console.log('Profile updated successfully:', result);
      return result;
    }, 'updateUserProfile');
  }

  async writeToFirestore(collection: string, docId: string, data: any, merge: boolean = false): Promise<any> {
    return await authRecovery.retryOperation(async () => {
      const token = await tokenManager.getValidToken();
      console.log(`Writing to Firestore: ${collection}/${docId}`);

      const response = await Promise.race([
        fetch(`${this.baseUrl}/api/firestore/write`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            collection,
            docId,
            data,
            merge,
          }),
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        )
      ]);

      if (!(response as Response).ok) {
        const errorData = await (response as Response).json().catch(() => ({}));
        throw new Error(`Firestore write failed: ${(response as Response).status} - ${errorData.message || (response as Response).statusText}`);
      }

      return await (response as Response).json();
    }, `writeToFirestore-${collection}`);
  }

  async readFromFirestore(collection: string, docId: string): Promise<any> {
    return await authRecovery.retryOperation(async () => {
      const token = await tokenManager.getValidToken();
      console.log(`Reading from Firestore: ${collection}/${docId}`);

      const response = await Promise.race([
        fetch(`${this.baseUrl}/api/firestore/read?collection=${collection}&docId=${docId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        )
      ]);

      if (!(response as Response).ok) {
        const errorData = await (response as Response).json().catch(() => ({}));
        throw new Error(`Firestore read failed: ${(response as Response).status} - ${errorData.message || (response as Response).statusText}`);
      }

      return await (response as Response).json();
    }, `readFromFirestore-${collection}`);
  }

  async batchWrite(operations: any[]): Promise<any> {
    return await authRecovery.retryOperation(async () => {
      const token = await tokenManager.getValidToken();
      console.log(`Performing batch write with ${operations.length} operations`);

      const response = await Promise.race([
        fetch(`${this.baseUrl}/api/firestore/batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ operations }),
        }),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 10000)
        )
      ]);

      if (!(response as Response).ok) {
        const errorData = await (response as Response).json().catch(() => ({}));
        throw new Error(`Batch write failed: ${(response as Response).status} - ${errorData.message || (response as Response).statusText}`);
      }

      return await (response as Response).json();
    }, 'batchWrite');
  }
}

export class ServerFirestoreOperations {
  private adminApp: App | null = null;
  private db: admin.firestore.Firestore | null = null;

  async initialize(): Promise<void> {
    if (!this.adminApp) {
      // Use individual environment variables instead of service account JSON
      const projectId = process.env.FIREBASE_PROJECT_ID;
      const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
      const privateKey = process.env.FIREBASE_PRIVATE_KEY;

      if (!projectId || !clientEmail || !privateKey) {
        throw new Error('Missing Firebase configuration: FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY are required');
      }

      const serviceAccount = {
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      };

      if (!admin.apps.length) {
        this.adminApp = admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          projectId,
        });
      } else {
        this.adminApp = admin.apps[0] as App;
      }
      this.db = admin.firestore();
    }
  }

  async verifyToken(token: string): Promise<admin.auth.DecodedIdToken> {
    await this.initialize();
    if (!token) {
      throw new Error('No authentication token provided');
    }

    try {
      const cleanToken = token.replace(/^Bearer\s+/i, '');
      const decodedToken = await admin.auth().verifyIdToken(cleanToken, true); // Check revocation
      console.log('Server: Token verified for user:', decodedToken.uid);
      return decodedToken;
    } catch (error: any) {
      console.error('Server: Token verification failed:', error);
      throw new Error(`Authentication error: Could not verify user. ${error.message}`);
    }
  }

  async updateUserProfile(token: string, userId: string, profileData: any): Promise<any> {
    const decodedToken = await this.verifyToken(token);
    if (decodedToken.uid !== userId) {
      throw new Error('Unauthorized: Cannot update another user\'s profile');
    }

    try {
      await this.initialize();
      if (!this.db) {
        throw new Error('Firestore not initialized');
      }
      const userRef = this.db.collection('profiles').doc(userId); // Changed to 'profiles'
      const updateData = {
        ...profileData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await userRef.set(updateData, { merge: true });
      console.log('Server: User profile updated successfully for:', userId);
      return { success: true, userId, data: updateData };
    } catch (error: any) {
      console.error('Server: Profile update failed:', error);
      throw new Error(`Profile update failed: ${error.message}`);
    }
  }

  async writeDocument(token: string, collection: string, docId: string, data: any, merge: boolean = false): Promise<any> {
    const decodedToken = await this.verifyToken(token);
    try {
      await this.initialize();
      if (!this.db) {
        throw new Error('Firestore not initialized');
      }
      const docRef = this.db.collection(collection).doc(docId);
      const writeData = {
        ...data,
        updatedBy: decodedToken.uid,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await docRef.set(writeData, { merge });
      console.log(`Server: Document written to ${collection}/${docId}`);
      return { success: true, collection, docId, data: writeData };
    } catch (error: any) {
      console.error('Server: Document write failed:', error);
      throw new Error(`Document write failed: ${error.message}`);
    }
  }
}

export const firestoreRecovery = new FirestoreRecoveryWrapper();
export const serverFirestore = new ServerFirestoreOperations();