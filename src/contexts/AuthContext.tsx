
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, db, type FirebaseUser } from '@/lib/firebase';
import { 
  onAuthStateChanged, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut,
  UserCredential,
  updateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
  updatePassword,
  deleteUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, collection, query, where, getDocs, limit, deleteDoc, updateDoc } from 'firebase/firestore';
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
  updateUserProfile: (data: { name?: string }) => Promise<void>;
  updateUserProfilePicture: (file: File) => Promise<string>;
  changePassword: (currentPass: string, newPass: string) => Promise<void>;
  deleteAccount: (currentPass: string) => Promise<void>;
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
            // This case might happen if a user was created in Auth but the Firestore doc creation failed.
            // The register function now handles doc creation, so this is a fallback.
            console.warn(`No profile found for UID ${user.uid}. A profile should have been created on registration.`);
            setUserProfile(null);
          }
        } catch (error) {
          console.error(`[AuthContext] Critical error fetching profile for UID ${user.uid}:`, error);
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
    return signInWithEmailAndPassword(auth, email, pass);
  };
  
  const registerWithEmail = async (email: string, pass: string, name: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(userCredential.user, { displayName: name });
  
    // Immediately create the Firestore document
    const usersCollectionRef = collection(db, "users");
    const q = query(usersCollectionRef, limit(1));
    const querySnapshot = await getDocs(q);
    const isFirstEverUser = querySnapshot.empty;
  
    const newUserProfileData: Omit<FullUserProfile, 'id'> = {
      name: name,
      email: email,
      role: isFirstEverUser ? 'Super User' : 'Usuario Pendiente',
      permissionLevel: isFirstEverUser ? 'Total' : '',
      assignedSites: '',
      emailNotifications: true,
      empresa: '',
      photoURL: userCredential.user.photoURL || '',
    };
  
    const userDocRef = doc(db, 'users', userCredential.user.uid);
    await setDoc(userDocRef, sanitizeForFirestore(newUserProfileData));
    
    // Notify admins if not the first user
    if (!isFirstEverUser) {
      try {
        const emailSubject = `Nuevo Usuario Pendiente de Aprobación: ${newUserProfileData.name}`;
        const emailBody = `Hola,\n\nUn nuevo usuario se ha registrado y está pendiente de aprobación:\n\nNombre: ${newUserProfileData.name}\nCorreo: ${newUserProfileData.email}\n\nPor favor, revise la lista de usuarios en la sección de Configuración para aprobar esta cuenta.\n\nSaludos,\nSistema Asistente ACR`;
        
        await sendEmailAction({ 
          to: 'contacto@damc.cl', // This should be a dynamic list of admins in a real app
          subject: emailSubject, 
          body: emailBody 
        });

      } catch (notifyError) {
        console.error("[AuthContext] Failed to notify admins about new pending user:", notifyError);
      }
    }

    // No need to call reload, as the onAuthStateChanged listener will pick up the new user
    // and their newly created profile.
    return userCredential;
  };

  const logoutUser = () => {
    return signOut(auth);
  };

  const updateUserProfileFunc = async (data: { name?: string }) => {
    if (!currentUser) throw new Error("No hay un usuario autenticado para actualizar.");

    const updates: { displayName?: string } = {};
    if (data.name) updates.displayName = data.name;
    
    await updateProfile(currentUser, updates);
    
    const userDocRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userDocRef, { name: data.name });

    setUserProfile(prev => prev ? { ...prev, name: data.name ?? prev.name } : null);
    await currentUser.reload();
    setCurrentUser(auth.currentUser);
  };
  
  const updateUserProfilePictureFunc = async (file: File): Promise<string> => {
    if (!currentUser) throw new Error("No hay un usuario autenticado para actualizar.");

    const reader = new FileReader();
    const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });

    const userDocRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userDocRef, { photoURL: dataUrl });
  
    setUserProfile(prev => prev ? { ...prev, photoURL: dataUrl } : null);
    
    // We also update the Firebase Auth profile photoURL
    await updateProfile(currentUser, { photoURL: dataUrl });
    await currentUser.reload();
    setCurrentUser(auth.currentUser);
  
    return dataUrl;
  };

  const changePasswordFunc = async (currentPass: string, newPass: string) => {
    if (!currentUser || !currentUser.email) throw new Error("No hay un usuario autenticado o falta el correo electrónico.");
    
    try {
      const credential = EmailAuthProvider.credential(currentUser.email, currentPass);
      await reauthenticateWithCredential(currentUser, credential);
      await updatePassword(currentUser, newPass);
    } catch (error: any) {
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
          throw new Error("La contraseña actual es incorrecta.");
        }
        throw error;
    }
  };

  const deleteAccountFunc = async (currentPass: string) => {
    if (!currentUser || !currentUser.email) throw new Error("No hay un usuario autenticado.");

    try {
        const credential = EmailAuthProvider.credential(currentUser.email, currentPass);
        await reauthenticateWithCredential(currentUser, credential);
        
        const userDocRef = doc(db, 'users', currentUser.uid);
        await deleteDoc(userDocRef);
        
        await deleteUser(currentUser);
    } catch (error: any) {
        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            throw new Error("La contraseña actual es incorrecta.");
        }
        throw error;
    }
  };

  const value: AuthContextType = {
    currentUser,
    loadingAuth,
    userProfile,
    loginWithEmail,
    registerWithEmail,
    logoutUser,
    updateUserProfile: updateUserProfileFunc,
    updateUserProfilePicture: updateUserProfilePictureFunc,
    changePassword: changePasswordFunc,
    deleteAccount: deleteAccountFunc,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
