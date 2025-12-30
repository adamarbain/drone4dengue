/**
 * Google Authentication Utility
 * 
 * Handles Google Sign-In using Firebase Authentication and @react-native-google-signin
 */

import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import auth from '@react-native-firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
const WEB_CLIENT_ID = '93522668734-450k3d6bf46ibs47e5dnmkiavds24i13.apps.googleusercontent.com';

// Configure Google Sign-In
export const configureGoogleSignIn = () => {
  GoogleSignin.configure({
    webClientId: WEB_CLIENT_ID,
    offlineAccess: true,
    forceCodeForRefreshToken: true,
  });
};

// Initialize Google Sign-In (call this once when app starts)
export const initGoogleSignIn = async () => {
  try {
    configureGoogleSignIn();
    // hasPlayServices is Android-only, skip on iOS
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }
    console.log('[GOOGLE AUTH] Google Sign-In configured successfully');
    return true;
  } catch (error) {
    console.error('[GOOGLE AUTH] Configuration error:', error);
    return false;
  }
};

// Sign in with Google
export const signInWithGoogle = async (): Promise<{
  success: boolean;
  data?: {
    token: string;
    user: any;
    isNewUser: boolean;
    requiresVerification: boolean;
  };
  error?: string;
}> => {
  try {
    // Check Play Services availability (Android only)
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }

    // Sign in with Google
    const signInResult = await GoogleSignin.signIn();
    
    if (!signInResult.data?.idToken) {
      throw new Error('No ID token received from Google');
    }

    console.log('[GOOGLE AUTH] Google Sign-In successful, getting Firebase credential...');

    // Create Firebase credential
    const googleCredential = auth.GoogleAuthProvider.credential(signInResult.data.idToken);

    // Sign in to Firebase
    const firebaseUserCredential = await auth().signInWithCredential(googleCredential);
    const firebaseUser = firebaseUserCredential.user;

    console.log('[GOOGLE AUTH] Firebase Sign-In successful:', firebaseUser.email);

    // Get Firebase ID token to send to our backend
    const firebaseIdToken = await firebaseUser.getIdToken();

    // Send to our backend for user creation/login
    const response = await fetch(`${API_URL}/auth/google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idToken: firebaseIdToken,
        email: firebaseUser.email,
        name: firebaseUser.displayName,
        profilePicture: firebaseUser.photoURL,
        googleId: firebaseUser.uid,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Authentication failed');
    }

    // Store token in AsyncStorage
    await AsyncStorage.setItem('token', data.token);
    
    // Set token expiration (30 days)
    const oneMonthFromNow = Date.now() + (30 * 24 * 60 * 60 * 1000);
    await AsyncStorage.setItem('token_exp', oneMonthFromNow.toString());

    console.log('[GOOGLE AUTH] Backend authentication successful');

    return {
      success: true,
      data: {
        token: data.token,
        user: data.user,
        isNewUser: data.isNewUser,
        requiresVerification: data.requiresVerification,
      },
    };
  } catch (error: any) {
    console.error('[GOOGLE AUTH] Sign-in error:', error);

    // Handle specific error codes
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return { success: false, error: 'Sign-in was cancelled' };
    } else if (error.code === statusCodes.IN_PROGRESS) {
      return { success: false, error: 'Sign-in is already in progress' };
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      return { success: false, error: 'Google Play Services not available' };
    }

    return {
      success: false,
      error: error.message || 'Failed to sign in with Google',
    };
  }
};

// Sign out from Google
export const signOutGoogle = async () => {
  try {
    await GoogleSignin.signOut();
    await auth().signOut();
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('token_exp');
    console.log('[GOOGLE AUTH] Signed out successfully');
    return true;
  } catch (error) {
    console.error('[GOOGLE AUTH] Sign-out error:', error);
    return false;
  }
};

// Check if user is signed in with Google
export const isGoogleSignedIn = async () => {
  try {
    const currentUser = await GoogleSignin.getCurrentUser();
    return currentUser !== null;
  } catch (error) {
    console.error('[GOOGLE AUTH] Check sign-in status error:', error);
    return false;
  }
};

// Get current Google user
export const getCurrentGoogleUser = async () => {
  try {
    const currentUser = await GoogleSignin.getCurrentUser();
    return currentUser;
  } catch (error) {
    console.error('[GOOGLE AUTH] Get current user error:', error);
    return null;
  }
};

// Link existing account with Google
export const linkAccountWithGoogle = async (existingToken: string): Promise<{
  success: boolean;
  error?: string;
}> => {
  try {
    // Check Play Services availability (Android only)
    if (Platform.OS === 'android') {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    }
    const signInResult = await GoogleSignin.signIn();
    
    if (!signInResult.data?.idToken) {
      throw new Error('No ID token received from Google');
    }

    const googleCredential = auth.GoogleAuthProvider.credential(signInResult.data.idToken);
    const firebaseUserCredential = await auth().signInWithCredential(googleCredential);
    const firebaseUser = firebaseUserCredential.user;
    const firebaseIdToken = await firebaseUser.getIdToken();

    // Call backend to link accounts
    const response = await fetch(`${API_URL}/auth/link-google`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${existingToken}`,
      },
      body: JSON.stringify({
        idToken: firebaseIdToken,
        googleId: firebaseUser.uid,
        profilePicture: firebaseUser.photoURL,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || 'Failed to link account');
    }

    console.log('[GOOGLE AUTH] Account linked successfully');
    return { success: true };
  } catch (error: any) {
    console.error('[GOOGLE AUTH] Link account error:', error);
    
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      return { success: false, error: 'Linking was cancelled' };
    }
    
    return {
      success: false,
      error: error.message || 'Failed to link Google account',
    };
  }
};

