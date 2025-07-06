
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
      setCurrentUser(user);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        try {
          const docSnap = await getDoc(userDocRef);
          if (docSnap.exists()) {
            const profileData = { id: docSnap.id, ...docSnap.data() } as FullUserProfile;
            setUserProfile(profileData);
          } else {
            // Profile with UID doesn't exist. Check by email to find pre-created profiles.
            const usersCollectionRef = collection(db, "users");
            const qByEmail = query(usersCollectionRef, where("email", "==", user.email), limit(1));
            const existingByEmailSnap = await getDocs(qByEmail);

            if (!existingByEmailSnap.empty) {
                // Found a pre-created profile with a random ID. Migrate it.
                const preCreatedDoc = existingByEmailSnap.docs[0];
                const profileData = preCreatedDoc.data() as Omit<FullUserProfile, 'id'>;
                
                console.warn(`Data consistency issue found for ${user.email}. Migrating profile from doc ${preCreatedDoc.id} to new doc with UID ${user.uid}.`);

                // Create the new document with the correct UID
                await setDoc(userDocRef, profileData);
                
                // Delete the old document with the random ID
                await deleteDoc(preCreatedDoc.ref);

                // Set the profile in the app state
                setUserProfile({ id: user.uid, ...profileData } as FullUserProfile);
            } else {
                // No profile found by UID or email. This is a genuinely new user.
                // Check if this is the very first user in the system for Super User promotion.
                const allUsersQuery = query(usersCollectionRef, limit(1));
                const anyUserSnap = await getDocs(allUsersQuery);
                const isFirstUser = anyUserSnap.empty;
                
                const roleToAssign = isFirstUser ? 'Super User' : 'Usuario Pendiente';
                const permissionToAssign = isFirstUser ? 'Total' : '';
                
                console.warn(`[AuthContext] No Firestore profile found for user ${user.uid} by UID or email. Creating a new profile with role: ${roleToAssign}.`);
                
                const newUserProfileData: Omit<FullUserProfile, 'id'> = { 
                    name: user.displayName || user.email || 'Usuario Nuevo',
                    email: user.email || '',
                    role: roleToAssign,
                    permissionLevel: permissionToAssign,
                    assignedSites: '',
                    emailNotifications: true,
                };
                
                await setDoc(userDocRef, sanitizeForFirestore(newUserProfileData));
                setUserProfile({ id: user.uid, ...newUserProfileData } as FullUserProfile);
                
                // If it's not the first user, it's a pending user, so notify admins
                if (!isFirstUser) {
                  try {
                    const superUsersQuery = query(usersCollectionRef, where("role", "==", "Super User"));
                    const querySnapshot = await getDocs(superUsersQuery);
                    const superUserEmails = querySnapshot.docs
                      .map(doc => doc.data() as FullUserProfile)
                      .filter(profile => profile.email && (profile.emailNotifications === undefined || profile.emailNotifications))
                      .map(profile => profile.email);
                    
                    if (superUserEmails.length > 0) {
                      const emailSubject = `Nuevo Usuario Pendiente de Aprobación: ${newUserProfileData.name}`;
                      const emailBody = `Hola,\n\nUn nuevo usuario se ha registrado y está pendiente de aprobación:\n\nNombre: ${newUserProfileData.name}\nCorreo: ${newUserProfileData.email}\n\nPor favor, revise la lista de usuarios en la sección de Configuración para aprobar o rechazar esta cuenta.\n\nSaludos,\nSistema Asistente ACR`;
                      for (const email of superUserEmails) {
                        await sendEmailAction({ to: email, subject: emailSubject, body: emailBody });
                      }
                    }
                  } catch (notifyError) {
                      console.error("[AuthContext] Failed to notify admins about new pending user:", notifyError);
                  }
                }
            }
          }
        } catch (error) {
            console.error(`[AuthContext] Error fetching or creating Firestore profile for UID ${user.uid}:`, error);
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
    // The onAuthStateChanged listener will now handle creating the Firestore user document automatically.
    // This simplifies the registration flow and makes it more consistent.
    // We just need to make sure the display name is available for the listener.
    // However, updating displayName is not immediate. The most reliable way is for the listener to handle it.
    
    // We can still send the notification from here if we want it to be immediate upon registration.
     try {
        const usersRef = collection(db, "users");
        const qSuperUsers = query(usersRef, where("role", "==", "Super User"));
        const querySnapshot = await getDocs(qSuperUsers);
        
        const superUserEmailsToNotify = querySnapshot.docs
          .map(adminDoc => adminDoc.data() as FullUserProfile)
          .filter(p => p.email && (p.emailNotifications === undefined || p.emailNotifications))
          .map(p => p.email);

        if (superUserEmailsToNotify.length > 0) {
          const emailSubject = `Nuevo Usuario Pendiente de Aprobación: ${name}`;
          const emailBody = `Hola,\n\nUn nuevo usuario se ha registrado y está pendiente de aprobación:\n\nNombre: ${name}\nCorreo: ${email}\n\nPor favor, revise la lista de usuarios en la sección de Configuración para aprobar o rechazar esta cuenta.\n\nSaludos,\nSistema Asistente ACR`;

          for (const superUserEmail of superUserEmailsToNotify) {
            await sendEmailAction({ to: superUserEmail, subject: emailSubject, body: emailBody });
          }
        } else {
          console.warn(`[AuthContext] New user ${name} registered, but no Super Users found with email and active notifications to inform for approval.`);
        }
      } catch (notifyError) {
        console.error("[AuthContext] Error trying to notify Super Users about new pending user:", notifyError);
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
