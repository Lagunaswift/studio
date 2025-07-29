// Place this in: /utils/firestoreRecovery.js

import { authRecovery } from './authRecovery.js';
import { tokenManager } from './tokenManager.js';

export class FirestoreRecoveryWrapper {
  constructor() {
    this.baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
  }

  // Enhanced updateUserProfile with recovery
  async updateUserProfile(userId, profileData) {
    return await authRecovery.retryOperation(async () => {
      const token = await tokenManager.getValidToken();
      
      console.log('Updating user profile for:', userId);
      console.log('Profile data:', profileData);
      
      const response = await fetch(`${this.baseUrl}/api/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId,
          ...profileData
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Profile update failed: ${response.status} - ${errorData.message || response.statusText}`);
      }

      const result = await response.json();
      console.log('Profile updated successfully:', result);
      return result;
    }, 'updateUserProfile');
  }

  // Generic Firestore write operation
  async writeToFirestore(collection, docId, data, merge = false) {
    return await authRecovery.retryOperation(async () => {
      const token = await tokenManager.getValidToken();
      
      console.log(`Writing to Firestore: ${collection}/${docId}`);
      
      const response = await fetch(`${this.baseUrl}/api/firestore/write`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          collection,
          docId,
          data,
          merge
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Firestore write failed: ${response.status} - ${errorData.message || response.statusText}`);
      }

      return await response.json();
    }, `writeToFirestore-${collection}`);
  }

  // Generic Firestore read operation
  async readFromFirestore(collection, docId) {
    return await authRecovery.retryOperation(async () => {
      const token = await tokenManager.getValidToken();
      
      console.log(`Reading from Firestore: ${collection}/${docId}`);
      
      const response = await fetch(`${this.baseUrl}/api/firestore/read?collection=${collection}&docId=${docId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Firestore read failed: ${response.status} - ${errorData.message || response.statusText}`);
      }

      return await response.json();
    }, `readFromFirestore-${collection}`);
  }

  // Batch operations
  async batchWrite(operations) {
    return await authRecovery.retryOperation(async () => {
      const token = await tokenManager.getValidToken();
      
      console.log(`Performing batch write with ${operations.length} operations`);
      
      const response = await fetch(`${this.baseUrl}/api/firestore/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ operations })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Batch write failed: ${response.status} - ${errorData.message || response.statusText}`);
      }

      return await response.json();
    }, 'batchWrite');
  }
}

// Server-side operations (for API routes)
export class ServerFirestoreOperations {
  constructor() {
    this.admin = null;
    this.db = null;
  }

  async initialize() {
    if (!this.admin) {
      const admin = await import('firebase-admin');
      
      if (!admin.apps.length) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY || '{}');
        
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: process.env.FIREBASE_DATABASE_URL
        });
      }
      
      this.admin = admin;
      this.db = admin.firestore();
    }
  }

  async verifyToken(token) {
    await this.initialize();
    
    if (!token) {
      throw new Error('No authentication token provided');
    }

    try {
      // Clean token (remove Bearer prefix if present)
      const cleanToken = token.replace(/^Bearer\s+/i, '');
      
      // Verify token with Firebase Admin
      const decodedToken = await this.admin.auth().verifyIdToken(cleanToken);
      console.log('Server: Token verified for user:', decodedToken.uid);
      
      return decodedToken;
    } catch (error) {
      console.error('Server: Token verification failed:', error);
      throw new Error(`Authentication error: Could not verify user. ${error.message}`);
    }
  }

  async updateUserProfile(token, userId, profileData) {
    const decodedToken = await this.verifyToken(token);
    
    // Ensure user can only update their own profile
    if (decodedToken.uid !== userId) {
      throw new Error('Unauthorized: Cannot update another user\'s profile');
    }

    try {
      await this.initialize();
      
      const userRef = this.db.collection('users').doc(userId);
      
      // Add timestamp
      const updateData = {
        ...profileData,
        updatedAt: this.admin.firestore.FieldValue.serverTimestamp()
      };
      
      await userRef.set(updateData, { merge: true });
      
      console.log('Server: User profile updated successfully for:', userId);
      return { success: true, userId, data: updateData };
      
    } catch (error) {
      console.error('Server: Profile update failed:', error);
      throw new Error(`Profile update failed: ${error.message}`);
    }
  }

  async writeDocument(token, collection, docId, data, merge = false) {
    const decodedToken = await this.verifyToken(token);
    
    try {
      await this.initialize();
      
      const docRef = this.db.collection(collection).doc(docId);
      
      // Add metadata
      const writeData = {
        ...data,
        updatedBy: decodedToken.uid,
        updatedAt: this.admin.firestore.FieldValue.serverTimestamp()
      };
      
      if (merge) {
        await docRef.set(writeData, { merge: true });
      } else {
        await docRef.set(writeData);
      }
      
      console.log(`Server: Document written to ${collection}/${docId}`);
      return { success: true, collection, docId, data: writeData };
      
    } catch (error) {
      console.error('Server: Document write failed:', error);
      throw new Error(`Document write failed: ${error.message}`);
    }
  }
}

// Singleton instances
export const firestoreRecovery = new FirestoreRecoveryWrapper();
export const serverFirestore = new ServerFirestoreOperations();
