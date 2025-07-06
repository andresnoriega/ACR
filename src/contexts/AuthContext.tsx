
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
import { doc, setDoc, getDoc, collection, query, where, getDocs, limit, deleteDoc } from 'firebase/firestore';
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
      setLoadingAuth(true);
      if (user) {
        setCurrentUser(user);
        const userDocRef = doc(db, 'users', user.uid);
        try {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            setUserProfile({ id: docSnap.id, ...docSnap.data() } as FullUserProfile);
          } else {
            // This case handles a logged-in user without a Firestore profile document.
            // This can happen if profile creation failed, or if they just registered and the profile hasn't been set yet.
            // The register function now handles creation, so this indicates a potential issue or a lag.
            // Setting profile to null is the correct state until it's resolved.
            console.warn(`[AuthContext] User ${user.uid} (${user.email}) is authenticated but has no Firestore profile. This state should resolve upon registration or if an admin creates the profile.`);
            setUserProfile(null); 
          }
        } catch (error) {
          console.error(`[AuthContext] Error fetching Firestore profile for UID ${user.uid}:`, error);
          setUserProfile(null);
        }
      } else {
        setCurrentUser(null);
        setUserProfile(null);
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, []);

  const loginWithEmail = (email: string, pass: string) => {
    // The onAuthStateChanged listener will handle fetching the user profile upon successful login.
    return signInWithEmailAndPassword(auth, email, pass);
  };
  
  const registerWithEmail = async (email: string, pass: string, name: string) => {
    // 1. Check if a profile was pre-created for this email by an admin
    const usersCollectionRef = collection(db, "users");
    const qByEmail = query(usersCollectionRef, where("email", "==", email), limit(1));
    const existingByEmailSnap = await getDocs(qByEmail);
    
    // 2. Create the Firebase Auth user. This is the source of truth for authentication.
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;

    if (!existingByEmailSnap.empty) {
      // 3a. Profile was pre-created. We need to migrate it to the new, correct UID.
      const preCreatedDoc = existingByEmailSnap.docs[0];
      const profileData = preCreatedDoc.data() as Omit<FullUserProfile, 'id'>;
      
      console.log(`User ${email} registered. Found pre-created profile (${preCreatedDoc.id}). Migrating to new UID ${user.uid}.`);
      
      // Update name from registration form, just in case it differs.
      profileData.name = name;

      // Create new doc with user's UID and delete the old one. This is the "claim" process.
      await setDoc(doc(db, 'users', user.uid), sanitizeForFirestore(profileData));
      await deleteDoc(preCreatedDoc.ref);
      
    } else {
      // 3b. This is a brand new user. Create their profile from scratch.
      console.log(`User ${email} registered. Creating new pending profile with UID ${user.uid}.`);

      const allUsersQuery = query(collection(db, "users"), limit(1));
      const anyUserSnap = await getDocs(allUsersQuery);
      // The check is tricky because we just added a user. A better check is needed if we were to scale this.
      // For now, we assume if an Admin or Super User exists, it's not the first user.
      const adminOrSuperUserQuery = query(collection(db, "users"), where("role", "in", ["Admin", "Super User"]), limit(1));
      const adminOrSuperUserSnap = await getDocs(adminOrSuperUserQuery);
      const isFirstEverUser = adminOrSuperUserSnap.empty;

      const newUserProfileData: Omit<FullUserProfile, 'id'> = {
        name: name,
        email: email,
        role: isFirstEverUser ? 'Super User' : 'Usuario Pendiente',
        permissionLevel: isFirstEverUser ? 'Total' : '',
        assignedSites: '',
        emailNotifications: true,
        empresa: '', 
      };
      
      await setDoc(doc(db, 'users', user.uid), sanitizeForFirestore(newUserProfileData));

      // If it's a pending user, notify the admins.
      if (!isFirstEverUser) {
        try {
          const superUsersQuery = query(usersCollectionRef, where("role", "==", "Super User"));
          const superUsersSnapshot = await getDocs(superUsersQuery);
          const superUserEmails = superUsersSnapshot.docs
            .map(doc => doc.data() as FullUserProfile)
            .filter(profile => profile.email && (profile.emailNotifications === undefined || profile.emailNotifications))
            .map(profile => profile.email!);
          
          if (superUserEmails.length > 0) {
            const emailSubject = `Nuevo Usuario Pendiente de Aprobación: ${newUserProfileData.name}`;
            const emailBody = `Hola,\n\nUn nuevo usuario se ha registrado y está pendiente de aprobación:\n\nNombre: ${newUserProfileData.name}\nCorreo: ${newUserProfileData.email}\n\nPor favor, revise la lista de usuarios en la sección de Configuración para aprobar o rechazar esta cuenta.\n\nSaludos,\nSistema Asistente ACR`;
            for (const adminEmail of superUserEmails) {
              await sendEmailAction({ to: adminEmail, subject: emailSubject, body: emailBody });
            }
          }
        } catch (notifyError) {
          console.error("[AuthContext] Failed to notify admins about new pending user:", notifyError);
        }
      }
    }
    
    // The onAuthStateChanged listener will automatically pick up the new user session
    // and attempt to read the profile document we just created/migrated.
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
