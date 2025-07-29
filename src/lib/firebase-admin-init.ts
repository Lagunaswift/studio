import admin from 'firebase-admin';

let app: admin.app.App;

if (!admin.apps.length) {
  app = admin.initializeApp();
} else {
  app = admin.app();
}

export const firebaseApp = app;
