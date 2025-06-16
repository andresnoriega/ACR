
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
import { doc, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore'; // Added collection, query, where, getDocs
import type { FullUserProfile } from '@/types/rca';
import { sanitizeForFirestore } from '@/lib/utils';
import { sendEmailAction } from '@/app/actions'; // Added sendEmailAction

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
            // User is authenticated but no Firestore profile exists.
            // This can happen if profile creation failed or for users created before profile logic.
            // For new registrations via registerWithEmail, profile is created.
            // For existing users without profiles, an admin might need to create one.
            console.warn(`[AuthContext] No Firestore profile found for user ${user.uid}. User may need to complete profile or be assigned one.`);
            setUserProfile(null); // Ensure profile is null if not found
          }
        } catch (error) {
            console.error(`[AuthContext] Error fetching Firestore profile for UID ${user.uid}:`, error);
            setUserProfile(null); // Error case, set profile to null
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
        role: 'Usuario Pendiente', // Default role for new users
        permissionLevel: '', // Default empty permission level
        assignedSites: '',
        emailNotifications: true, // Default to true
      };
      await setDoc(userDocRef, sanitizeForFirestore(newUserProfileData));
      setUserProfile({ id: firebaseUser.uid, ...newUserProfileData } as FullUserProfile); // Update local profile state

      // Notify Super Users/Admins about the new pending user
      try {
        const usersRef = collection(db, "users");
        const qAdmins = query(usersRef, where("role", "in", ["Super User", "Admin"]));
        const querySnapshot = await getDocs(qAdmins);
        
        const adminEmailsToNotify: string[] = [];
        querySnapshot.forEach((adminDoc) => {
          const adminProfile = adminDoc.data() as FullUserProfile;
          // Notify if email exists and emailNotifications is not explicitly false
          if (adminProfile.email && adminProfile.emailNotifications !== false) { 
            adminEmailsToNotify.push(adminProfile.email);
          }
        });

        if (adminEmailsToNotify.length > 0) {
          const emailSubject = `Nuevo Usuario Pendiente de Aprobación: ${name}`;
          const emailBody = `Hola,\n\nUn nuevo usuario se ha registrado y está pendiente de aprobación:\n\nNombre: ${name}\nCorreo: ${firebaseUser.email || email}\n\nPor favor, revise la lista de usuarios en la sección de Configuración para aprobar o rechazar esta cuenta.\n\nSaludos,\nSistema RCA Assistant`;

          for (const adminEmail of adminEmailsToNotify) {
            // Using await here ensures we process one by one, though sendEmailAction is console.log for now
            await sendEmailAction({
              to: adminEmail,
              subject: emailSubject,
              body: emailBody,
            });
          }
          console.log(`[AuthContext] Notification emails (simulated) sent to ${adminEmailsToNotify.length} Super User(s)/Admin(s) about new pending user: ${name}`);
        } else {
          console.warn(`[AuthContext] New user ${name} registered, but no Super Users/Admins found with email and active notifications to inform for approval.`);
        }
      } catch (notifyError) {
        console.error("[AuthContext] Error trying to notify Super Users/Admins about new pending user:", notifyError);
        // This is a non-critical error for the registration process itself, so we don't re-throw.
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

