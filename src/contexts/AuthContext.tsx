
'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { 
    getAuth, 
    onAuthStateChanged, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut, 
    updateProfile, 
    reauthenticateWithCredential, 
    EmailAuthProvider, 
    updatePassword, 
    deleteUser, 
    type User as FirebaseUser, 
    type UserCredential 
} from 'firebase/auth';
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    query, 
    where, 
    getDocs, 
    limit, 
    deleteDoc, 
    updateDoc,
    serverTimestamp
} from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { app, auth, db, storage } from '@/lib/firebase';
import type { FullUserProfile } from '@/types/rca';
import { sanitizeForFirestore } from '@/lib/utils';
import { sendEmailAction } from '@/app/actions';


interface AuthContextType {
  currentUser: FirebaseUser | null;
  loadingAuth: boolean;
  userProfile: FullUserProfile | null; 
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, name: string) => Promise<UserCredential>;
  logoutUser: () => Promise<void>;
  updateUserProfile: (data: { name?: string }) => Promise<void>;
  updateUser: (updatedUser: FullUserProfile) => Promise<void>; // New function
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

  // This effect handles auth state changes from Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setLoadingAuth(true); // Always start loading on auth change
      if (user) {
        // We have a firebase user, but we need the firestore profile.
        // Keep loading until the profile is fetched or fails.
        setCurrentUser(user);
        const userDocRef = doc(db, 'users', user.uid);
        try {
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
              setUserProfile({ id: user.uid, ...docSnap.data() } as FullUserProfile);
            } else {
              console.warn(`User profile not found for ${user.email}, logging out.`);
              await signOut(auth);
              setUserProfile(null);
              setCurrentUser(null);
            }
        } catch(error) {
            console.error("Error fetching user profile:", error);
            setUserProfile(null);
            setCurrentUser(null);
        } finally {
            setLoadingAuth(false); // Finish loading only after profile fetch attempt
        }
      } else {
        // No user, clear all data and finish loading.
        setCurrentUser(null);
        setUserProfile(null);
        setLoadingAuth(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = useCallback(async (email: string, pass: string): Promise<void> => {
    setLoadingAuth(true); // Start loading process on login attempt
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, pass);
      // onAuthStateChanged will handle setting the user and profile.
      // We don't need to resolve the promise here; the state change will trigger re-renders.
      // The `loadingAuth` state will be managed by the onAuthStateChanged listener.
    } catch (error) {
      setLoadingAuth(false); // On error, stop loading so UI can respond
      throw error; // Re-throw the error to be caught by the login page
    }
  }, []);
  
  const registerWithEmail = async (email: string, pass: string, name: string) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    const user = userCredential.user;
    await updateProfile(user, { displayName: name });
  
    // Default new registrations to 'Usuario Pendiente'
    const assignedRole = 'Usuario Pendiente';
    const assignedPermissionLevel = '';

    const newUserProfileData: Omit<FullUserProfile, 'id'> = {
      name: name,
      email: email,
      role: assignedRole,
      permissionLevel: assignedPermissionLevel,
      assignedSites: '',
      emailNotifications: true,
      empresa: '',
      photoURL: user.photoURL || '',
    };
  
    const userDocRef = doc(db, 'users', user.uid);
    await setDoc(userDocRef, sanitizeForFirestore(newUserProfileData));
    
    return userCredential;
  };

  const logoutUser = () => {
    return signOut(auth);
  };

  const updateUserProfileFunc = async (data: { name?: string }) => {
    if (!currentUser) throw new Error("No hay un usuario autenticado.");
    if (data.name) {
        await updateProfile(currentUser, { displayName: data.name });
        const userDocRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userDocRef, { name: data.name });
        setUserProfile(prev => prev ? { ...prev, name: data.name! } : null);
    }
  };
  
  const updateUserFunc = async (updatedUser: FullUserProfile) => {
    if (!updatedUser.id) throw new Error("ID de usuario es requerido para actualizar.");

    const userDocRef = doc(db, 'users', updatedUser.id);
    const dataToUpdate = {
        name: updatedUser.name,
        role: updatedUser.role,
        empresa: updatedUser.empresa,
        assignedSites: updatedUser.assignedSites,
        emailNotifications: updatedUser.emailNotifications,
        permissionLevel: updatedUser.permissionLevel,
    };
    
    await updateDoc(userDocRef, sanitizeForFirestore(dataToUpdate));
};


  const updateUserProfilePictureFunc = async (file: File): Promise<string> => {
    if (!currentUser) throw new Error("No hay un usuario autenticado.");
    const filePath = `profile_pictures/${currentUser.uid}/${file.name}`;
    const fileRef = storageRef(storage, filePath);
    await uploadBytes(fileRef, file);
    const downloadURL = await getDownloadURL(fileRef);
    await updateProfile(currentUser, { photoURL: downloadURL });
    const userDocRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userDocRef, { photoURL: downloadURL });
    setUserProfile(prev => prev ? { ...prev, photoURL: downloadURL } : null);
    return downloadURL;
  };

  const changePasswordFunc = async (currentPass: string, newPass: string) => {
    if (!currentUser || !currentUser.email) throw new Error("No hay un usuario autenticado o falta el correo electrónico.");
    const credential = EmailAuthProvider.credential(currentUser.email, currentPass);
    await reauthenticateWithCredential(currentUser, credential);
    await updatePassword(currentUser, newPass);
  };

  const deleteAccountFunc = async (currentPass: string) => {
    if (!currentUser || !currentUser.email) throw new Error("No hay un usuario autenticado.");
    const credential = EmailAuthProvider.credential(currentUser.email, currentPass);
    await reauthenticateWithCredential(currentUser, credential);
    await deleteDoc(doc(db, 'users', currentUser.uid));
    await deleteUser(currentUser);
  };

  const value: AuthContextType = {
    currentUser,
    loadingAuth,
    userProfile,
    loginWithEmail,
    registerWithEmail,
    logoutUser,
    updateUserProfile: updateUserProfileFunc,
    updateUser: updateUserFunc,
    updateUserProfilePicture: updateUserProfilePictureFunc,
    changePassword: changePasswordFunc,
    deleteAccount: deleteAccountFunc,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
