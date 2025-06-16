
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, db, type FirebaseUser } from '@/lib/firebase';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  UserCredential
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import type { FullUserProfile } from '@/types/rca';
import { sanitizeForFirestore } from '@/lib/utils';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  loadingAuth: boolean;
  userProfile: FullUserProfile | null; // Added to store Firestore user profile
  loginWithEmail: (email: string, pass: string) => Promise<UserCredential>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<UserCredential>;
  logoutUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<FullUserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('[AuthContext] onAuthStateChanged triggered. Firebase user:', user?.uid || 'null');
      setCurrentUser(user);
      if (user) {
        // Fetch user profile from Firestore
        const userDocRef = doc(db, 'users', user.uid);
        console.log(`[AuthContext] Attempting to fetch Firestore profile for UID: ${user.uid}`);
        try {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const profileData = { id: docSnap.id, ...docSnap.data() } as FullUserProfile;
            setUserProfile(profileData);
            console.log('[AuthContext] Firestore profile loaded:', profileData);
          } else {
            console.warn(`[AuthContext] No Firestore profile found for user ${user.uid}. User may need to complete profile or be assigned one.`);
            setUserProfile(null);
          }
        } catch (error) {
            console.error(`[AuthContext] Error fetching Firestore profile for UID ${user.uid}:`, error);
            setUserProfile(null);
        }
      } else {
        setUserProfile(null);
        console.log('[AuthContext] No Firebase user, so Firestore profile set to null.');
      }
      setLoadingAuth(false);
      console.log('[AuthContext] loadingAuth set to false.');
    });
    return () => unsubscribe();
  }, []);

  const loginWithEmail = (email: string, pass: string) => {
    return signInWithEmailAndPassword(auth, email, pass);
  };

  const registerWithEmail = async (email: string, pass: string, name: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const firebaseUser = userCredential.user;
    if (firebaseUser) {
      // Create a corresponding user document in Firestore
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const newUserProfileData: Omit<FullUserProfile, 'id'> = { 
        name: name,
        email: firebaseUser.email || email, 
        role: 'Usuario Pendiente',
        permissionLevel: '', 
        assignedSites: '',
        emailNotifications: false,
      };
      await setDoc(userDocRef, sanitizeForFirestore(newUserProfileData));
      // Set userProfile state immediately after registration to avoid delay
      setUserProfile({ id: firebaseUser.uid, ...newUserProfileData } as FullUserProfile);
      console.log('[AuthContext] New user registered and Firestore profile created:', { uid: firebaseUser.uid, ...newUserProfileData });
    }
    return userCredential;
  };

  const logoutUser = () => {
    return signOut(auth);
  };

  const value = {
    currentUser,
    loadingAuth,
    userProfile,
    loginWithEmail,
    registerWithEmail,
    logoutUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
