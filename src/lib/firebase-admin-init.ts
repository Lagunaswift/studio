import admin from 'firebase-admin';

let app: admin.app.App;

if (!admin.apps.length) {
  // Safe initialization for build environments
  try {
    app = admin.initializeApp();
  } catch (error) {
    console.warn('Firebase Admin initialization failed, using default app:', error);
    app = admin.initializeApp({ 
      projectId: process.env.FIREBASE_PROJECT_ID || 'build-placeholder' 
    });
  }
} else {
  app = admin.app();
}

export const firebaseApp = app;
