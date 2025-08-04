// /src/utils/firebase-errors.ts - Error handling utilities
import { AuthError } from 'firebase/auth';

export const getAuthErrorMessage = (error: AuthError): string => {
  switch (error.code) {
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password. Please try again.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters long.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/operation-not-allowed':
      return 'This sign-in method is not enabled.';
    case 'auth/requires-recent-login':
      return 'Please sign in again to complete this action.';
    default:
      return error.message || 'An unexpected error occurred.';
  }
};

export const isAuthError = (error: any): error is AuthError => {
  return error && typeof error.code === 'string' && error.code.startsWith('auth/');
};