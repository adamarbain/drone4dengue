/**
 * Google Authentication Utility
 * 
 * Handles Google Sign-In using Firebase Authentication and expo-auth-session
 */

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import Constants from 'expo-constants';
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeAuth, GoogleAuthProvider, signInWithCredential, signOut as firebaseSignOut, Auth, getAuth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

// Complete the auth session properly
WebBrowser.maybeCompleteAuthSession();

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';
const WEB_CLIENT_ID = '93522668734-450k3d6bf46ibs47e5dnmkiavds24i13.apps.googleusercontent.com';

// Firebase configuration
const firebaseConfig = {
  apiKey: 'AIzaSyBsaP_qpS-jHeREou8kzzPMCHzvTqOoqXs',
  authDomain: 'dengueeye-notifications.firebaseapp.com',
  projectId: 'dengueeye-notifications',
  storageBucket: 'dengueeye-notifications.firebasestorage.app',
  messagingSenderId: '93522668734',
};

// Initialize Firebase (only if not already initialized)
let app: FirebaseApp | undefined;
let auth: Auth | undefined;
try {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  // Note: Firebase v11 handles persistence automatically in React Native
  // The warning can be ignored or we can configure it later if needed
  auth = getAuth(app);
} catch (error) {
  console.error('[GOOGLE AUTH] Firebase initialization error:', error);
}

// Initialize Google Sign-In (call this once when app starts)
export const initGoogleSignIn = async () => {
  try {
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
    // Configure the redirect URI
    // When using Expo proxy, we need to manually construct: https://auth.expo.io/@owner/slug
    // This URI MUST be added to Google Cloud Console as an authorized redirect URI
    const useProxy = Platform.OS !== 'web';
    
    // Manually construct Expo proxy URI when using proxy
    let redirectUri: string;
    if (useProxy) {
      // Get owner and slug from expo config
      const owner = Constants.expoConfig?.owner || Constants.manifest2?.extra?.eas?.projectId?.split('-')[0] || 'adamarbain';
      const slug = Constants.expoConfig?.slug || Constants.manifest2?.extra?.eas?.projectId || 'dengueeye-mobile-app';
      redirectUri = `https://auth.expo.io/@${owner}/${slug}`;
    } else {
      // Use custom scheme for non-proxy (development builds)
      redirectUri = AuthSession.makeRedirectUri({
        scheme: 'dengueeye',
        path: 'auth',
      });
    }

    console.log('[GOOGLE AUTH] Redirect URI:', redirectUri);
    console.log('[GOOGLE AUTH] Using proxy:', useProxy);
    console.log('[GOOGLE AUTH] IMPORTANT: Add this redirect URI to Google Cloud Console:', redirectUri);

    // Use implicit flow with ID token (works better with Expo proxy)
    // Note: This requires the OAuth client to be configured as "Web application" type
    const request = new AuthSession.AuthRequest({
      clientId: WEB_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.IdToken,
      redirectUri,
    });

    // Google OAuth endpoints
    const discovery = {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
    };

    // Start the auth session
    console.log('[GOOGLE AUTH] Starting OAuth flow with Google...');
    console.log('[GOOGLE AUTH] Request details:', {
      clientId: WEB_CLIENT_ID.substring(0, 20) + '...',
      redirectUri,
      responseType: 'id_token',
      useProxy,
    });

    let result;
    try {
      result = await request.promptAsync(discovery, {
        useProxy,
      } as any);
      console.log('[GOOGLE AUTH] OAuth flow completed, result type:', result.type);
    } catch (promptError: any) {
      console.error('[GOOGLE AUTH] promptAsync error:', promptError);
      console.error('[GOOGLE AUTH] promptAsync error message:', promptError?.message);
      console.error('[GOOGLE AUTH] promptAsync error stack:', promptError?.stack);
      throw new Error(`OAuth flow failed: ${promptError?.message || 'Unknown error'}`);
    }

    console.log('[GOOGLE AUTH] Auth result type:', result.type);

    if (result.type !== 'success') {
      if (result.type === 'cancel') {
        return { success: false, error: 'Sign-in was cancelled' };
      }
      // Log detailed error information
      console.error('[GOOGLE AUTH] Auth failed with type:', result.type);
      console.error('[GOOGLE AUTH] Full result:', JSON.stringify(result, null, 2));
      throw new Error(`Authentication failed: ${result.type}`);
    }

    // Type guard: result.type is 'success', so params should exist
    const successResult = result as { type: 'success'; params: Record<string, string> };
    console.log('[GOOGLE AUTH] Auth result params:', JSON.stringify(successResult.params || {}, null, 2));

    // Extract ID token from result (implicit flow returns it directly)
    const idToken = successResult.params?.id_token || successResult.params?.idToken;
    
    if (!idToken) {
      console.error('[GOOGLE AUTH] ID token not found in result.params:', successResult.params);
      console.error('[GOOGLE AUTH] Available params keys:', Object.keys(successResult.params || {}));
      throw new Error('No ID token received from Google. Please try again.');
    }

    console.log('[GOOGLE AUTH] ID token received successfully');

    console.log('[GOOGLE AUTH] Google Sign-In successful, getting Firebase credential...');

    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }

    // Create Firebase credential
    const googleCredential = GoogleAuthProvider.credential(idToken);

    // Sign in to Firebase
    const firebaseUserCredential = await signInWithCredential(auth, googleCredential);
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

    // Handle specific error cases
    if (error.message?.includes('cancelled')) {
      return { success: false, error: 'Sign-in was cancelled' };
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
    if (auth) {
      await firebaseSignOut(auth);
    }
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
    if (!auth) return false;
    const currentUser = auth.currentUser;
    return currentUser !== null;
  } catch (error) {
    console.error('[GOOGLE AUTH] Check sign-in status error:', error);
    return false;
  }
};

// Get current Google user
export const getCurrentGoogleUser = async () => {
  try {
    if (!auth) return null;
    const currentUser = auth.currentUser;
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
    // Configure the redirect URI
    // When using Expo proxy, we need to manually construct: https://auth.expo.io/@owner/slug
    // This URI MUST be added to Google Cloud Console as an authorized redirect URI
    const useProxy = Platform.OS !== 'web';
    
    // Manually construct Expo proxy URI when using proxy
    let redirectUri: string;
    if (useProxy) {
      // Get owner and slug from expo config
      const owner = Constants.expoConfig?.owner || Constants.manifest2?.extra?.eas?.projectId?.split('-')[0] || 'adamarbain';
      const slug = Constants.expoConfig?.slug || Constants.manifest2?.extra?.eas?.projectId || 'dengueeye-mobile-app';
      redirectUri = `https://auth.expo.io/@${owner}/${slug}`;
    } else {
      // Use custom scheme for non-proxy (development builds)
      redirectUri = AuthSession.makeRedirectUri({
        scheme: 'dengueeye',
        path: 'auth',
      });
    }

    console.log('[GOOGLE AUTH] Redirect URI:', redirectUri);
    console.log('[GOOGLE AUTH] Using proxy:', useProxy);

    // Use implicit flow with ID token (works better with Expo proxy)
    // Note: This requires the OAuth client to be configured as "Web application" type
    const request = new AuthSession.AuthRequest({
      clientId: WEB_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      responseType: AuthSession.ResponseType.IdToken,
      redirectUri,
    });

    // Google OAuth endpoints
    const discovery = {
      authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenEndpoint: 'https://oauth2.googleapis.com/token',
      revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
    };

    // Start the auth session
    const result = await request.promptAsync(discovery, {
      useProxy,
    } as any);

    if (result.type !== 'success') {
      if (result.type === 'cancel') {
        return { success: false, error: 'Linking was cancelled' };
      }
      throw new Error(`Authentication failed: ${result.type}`);
    }

    // Type guard: result.type is 'success', so params should exist
    const successResult = result as { type: 'success'; params: Record<string, string> };
    console.log('[GOOGLE AUTH] Auth result params:', JSON.stringify(successResult.params || {}, null, 2));

    // Extract ID token from result (implicit flow returns it directly)
    const idToken = successResult.params?.id_token || successResult.params?.idToken;
    
    if (!idToken) {
      console.error('[GOOGLE AUTH] ID token not found in result.params:', successResult.params);
      console.error('[GOOGLE AUTH] Available params keys:', Object.keys(successResult.params || {}));
      throw new Error('No ID token received from Google. Please try again.');
    }

    console.log('[GOOGLE AUTH] ID token received successfully');

    if (!auth) {
      throw new Error('Firebase Auth not initialized');
    }

    const googleCredential = GoogleAuthProvider.credential(idToken);
    const firebaseUserCredential = await signInWithCredential(auth, googleCredential);
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
    
    if (error.message?.includes('cancelled')) {
      return { success: false, error: 'Linking was cancelled' };
    }
    
    return {
      success: false,
      error: error.message || 'Failed to link Google account',
    };
  }
};

