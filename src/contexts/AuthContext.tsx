
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
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import type { FullUserProfile } from '@/types/rca';
import { sanitizeForFirestore } from '@/lib/utils';
import { sendEmailAction } from '@/app/actions';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  loadingAuth: boolean;
  userProfile: FullUserProfile | null; 
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
      setCurrentUser(user);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        try {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const profileData = { id: docSnap.id, ...docSnap.data() } as FullUserProfile;
            setUserProfile(profileData);
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
      }
      setLoadingAuth(false);
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
      const userDocRef = doc(db, 'users', firebaseUser.uid);
      const newUserProfileData: Omit<FullUserProfile, 'id'> = { 
        name: name,
        email: firebaseUser.email || email, 
        role: 'Usuario Pendiente',
        permissionLevel: '',
        assignedSites: '',
        emailNotifications: false, // Default to false, admin can enable
        // No password field is stored here
      };
      await setDoc(userDocRef, sanitizeForFirestore(newUserProfileData));
      setUserProfile({ id: firebaseUser.uid, ...newUserProfileData } as FullUserProfile);

      try {
        const usersRef = collection(db, "users");
        // Query for "Super User" roles only
        const qSuperUsers = query(usersRef, where("role", "==", "Super User"));
        const querySnapshot = await getDocs(qSuperUsers);
        
        const superUserEmailsToNotify: string[] = [];
        querySnapshot.forEach((adminDoc) => {
          const adminProfile = adminDoc.data() as FullUserProfile;
          if (adminProfile.email && (adminProfile.emailNotifications === undefined || adminProfile.emailNotifications === true)) { 
            superUserEmailsToNotify.push(adminProfile.email);
          }
        });

        if (superUserEmailsToNotify.length > 0) {
          const emailSubject = `Nuevo Usuario Pendiente de Aprobación: ${name}`;
          const emailBody = `Hola,\n\nUn nuevo usuario se ha registrado y está pendiente de aprobación:\n\nNombre: ${name}\nCorreo: ${firebaseUser.email || email}\n\nPor favor, revise la lista de usuarios en la sección de Configuración para aprobar o rechazar esta cuenta.\n\nSaludos,\nSistema RCA Assistant`;

          for (const superUserEmail of superUserEmailsToNotify) {
            await sendEmailAction({
              to: superUserEmail,
              subject: emailSubject,
              body: emailBody,
            });
          }
          console.log(`[AuthContext] Notification emails (simulated) sent to ${superUserEmailsToNotify.length} Super User(s) about new pending user: ${name}`);
        } else {
          console.warn(`[AuthContext] New user ${name} registered, but no Super Users found with email and active notifications to inform for approval.`);
        }
      } catch (notifyError) {
        console.error("[AuthContext] Error trying to notify Super Users about new pending user:", notifyError);
      }
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
