# Migration Plan: Supabase to Firebase

This document outlines the strategic plan for migrating the MealPlannerPro application from the Supabase ecosystem to the Firebase platform. This plan is to be executed on the `supabasetofirebase` branch.

---

### Phase 0: Firebase Project Setup & Configuration (The Foundation)

*This is the non-code setup phase. Before touching the application code, a Firebase project is needed to connect the application to all Firebase services.*

- [ ] **Create Firebase Project**: Use internal tools to request a new Firebase project and obtain the `firebaseConfig` object.
- [ ] **Set up Firestore**: Initialize Cloud Firestore in the Firebase console. Initial security rules should be set to be highly restrictive (e.g., `allow read, write: if false;`), ensuring no data is exposed until explicitly defined.
- [ ] **Enable Firebase Authentication**: In the Firebase console, enable the "Email/Password" sign-in method, as this is what the application currently uses.

---

### Phase 1: Authentication Service Swap (The Front Door)

*The first code change is to replace the user authentication system. This is a critical first step, as user identity underpins everything else.*

- [ ] **Introduce Firebase Client**: Create a new file `src/lib/firebase/client.ts` and initialize the Firebase client SDK using the `firebaseConfig` object from Phase 0.
- [ ] **Rewrite Auth Logic**:
    - [ ] Update `AuthContext` (`src/context/AuthContext.tsx`) to import and use the Firebase Auth client instead of the Supabase client.
    - [ ] Replace all Supabase auth calls (`signInWithPassword`, `signOut`, `resetPasswordForEmail`, etc.) in the authentication pages (`src/app/(auth)/*`) with their Firebase SDK equivalents.
- [ ] **Test Authentication**: Pause and thoroughly test the entire user authentication flow: sign up, log in, log out, and password reset.

---

### Phase 2: Database Migration & Logic Rewrite (The Core Engine)

*This is the most significant phase, where all database interactions are replaced.*

- [ ] **Rewrite Server Actions**: Go through `src/app/(main)/profile/actions.ts`. Rewrite every function that uses the Supabase client to use the Firebase Admin SDK or client-side SDK for the equivalent Firestore operation (e.g., `updateDoc`, `addDoc`).
- [ ] **Refactor Data Loading**: Update `src/context/AppContext.tsx` to fetch data from Firestore instead of Dexie/Supabase. This involves replacing `useLiveQuery` with Firestore's real-time listeners (`onSnapshot`).
- [ ] **Implement Security Rules**: For each data type (`profiles`, `recipes`, `planned_meals`), write corresponding Firestore Security Rules to ensure users can only access their own data (e.g., `allow read, write: if request.auth.uid == resource.data.user_id;`).

---

### Phase 3: Data Migration (The Move-in)

*Once the new Firestore-connected code is tested, migrate existing data.*

- [ ] **Develop Migration Script**: Write a secure, one-off script (outside the app's codebase) to:
    - [ ] Export user data from Supabase Auth.
    - [ ] Export all table data from the Supabase database.
    - [ ] Import user data into Firebase Authentication, mapping old IDs to new ones.
    - [ ] Transform table data to Firestore's NoSQL structure and import into Firestore, using the new user IDs.
- [ ] **Dry Run & Final Migration**: Run the script against a staging/development Firebase project first. Verify data integrity. Once confirmed, schedule a maintenance window to run it on the production project.

---

### Phase 4: Cleanup and Finalization

*The final step is to remove the old, now-unused Supabase code.*

- [ ] **Delete Old Dependencies**: Remove Supabase npm packages (`@supabase/ssr`, `@supabase/supabase-js`) from `package.json`.
- [ ] **Remove Old Code**: Delete the Supabase client files from `src/lib/supabase` and ensure no parts of the application still import them.
