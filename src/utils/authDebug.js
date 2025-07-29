// Authentication Debug Utility

export const debugAuthenticationFlow = async () => {
  console.log('=== AUTHENTICATION DEBUG START ===');
  
  try {
    // Check if running on client or server
    const isClient = typeof window !== 'undefined';
    console.log('Environment:', isClient ? 'Client' : 'Server');
    
    if (isClient) {
      // Client-side token checks
      const token = localStorage.getItem('authToken') || 
                   sessionStorage.getItem('authToken') ||
                   document.cookie.split(';').find(c => c.trim().startsWith('authToken='));
      
      console.log('Client Token Present:', !!token);
      console.log('Token Type:', typeof token);
      console.log('Token Length:', token?.length || 0);
      
      // Check Firebase Auth state
      const { getAuth, onAuthStateChanged } = await import('firebase/auth');
      const auth = getAuth();
      
      return new Promise((resolve) => {
        onAuthStateChanged(auth, (user) => {
          console.log('Firebase Auth User:', !!user);
          console.log('User UID:', user?.uid || 'Not available');
          console.log('User Email:', user?.email || 'Not available');
          console.log('Token Valid:', !!user?.accessToken);
          resolve({
            hasToken: !!token,
            hasFirebaseUser: !!user,
            uid: user?.uid,
            tokenLength: token?.length || 0
          });
        });
      });
    }
  } catch (error) {
    console.error('Debug Error:', error.message);
    return { error: error.message };
  } finally {
    console.log('=== AUTHENTICATION DEBUG END ===');
  }
};

// Enhanced getUserIdFromToken with debugging
export const debugGetUserIdFromToken = async (token) => {
  console.log('=== TOKEN VERIFICATION DEBUG ===');
  console.log('Token received:', !!token);
  console.log('Token type:', typeof token);
  console.log('Token length:', token?.length || 0);
  
  if (!token) {
    console.error('No token provided');
    throw new Error('No authentication token provided');
  }
  
  try {
    // Import Firebase Admin (server-side only)
    const { getAuth } = await import('firebase-admin/auth');
    const admin = await import('firebase-admin');
    
    // Verify the token format
    if (typeof token !== 'string') {
      throw new Error('Token must be a string');
    }
    
    // Clean token (remove Bearer prefix if present)
    const cleanToken = token.replace(/^Bearer\s+/i, '');
    console.log('Cleaned token length:', cleanToken.length);
    
    // Verify token with Firebase Admin
    const decodedToken = await getAuth().verifyIdToken(cleanToken);
    console.log('Token verified successfully');
    console.log('User ID:', decodedToken.uid);
    
    return decodedToken.uid;
    
  } catch (error) {
    console.error('Token verification failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Full error:', error);
    throw new Error(`Authentication error: Could not verify user. ${error.message}`);
  }
};

// Client-side token refresh utility
export const refreshAuthToken = async () => {
  try {
    const { getAuth } = await import('firebase/auth');
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    // Force token refresh
    const token = await user.getIdToken(true);
    console.log('Token refreshed successfully');
    
    return token;
  } catch (error) {
    console.error('Token refresh failed:', error);
    throw error;
  }
};
