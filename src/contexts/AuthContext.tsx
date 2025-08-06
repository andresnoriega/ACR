
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
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userDocRef);
        if (docSnap.exists()) {
          setUserProfile({ id: user.uid, ...docSnap.data() } as FullUserProfile);
        } else {
            console.warn(`User profile for ${user.email} not found in Firestore. Creating a pending profile.`);
            const usersCollection = collection(db, 'users');
            const allUsersSnapshot = await getDocs(usersCollection);
            const isFirstUser = allUsersSnapshot.empty;

            const assignedRole = isFirstUser ? 'Super User' : 'Usuario Pendiente';
            const assignedPermissionLevel = isFirstUser ? 'Total' : '';
            const nameFromEmail = user.displayName || user.email?.split('@')[0] || 'Nuevo Usuario';

            const newUserProfile: Omit<FullUserProfile, 'id'> = {
                name: nameFromEmail,
                email: user.email!,
                role: assignedRole,
                permissionLevel: assignedPermissionLevel,
                photoURL: user.photoURL || '',
                emailNotifications: true,
                empresa: '',
                assignedSites: '',
            };
            await setDoc(doc(db, 'users', user.uid), sanitizeForFirestore(newUserProfile));
            setUserProfile({ id: user.uid, ...newUserProfile });
        }
        setCurrentUser(user);
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
    const user = userCredential.user;
    await updateProfile(user, { displayName: name });
  
    const usersCollectionRef = collection(db, "users");
    const q = query(usersCollectionRef, limit(1));
    const snapshot = await getDocs(q);
    const isFirstUser = snapshot.empty;
  
    const assignedRole = isFirstUser ? 'Super User' : 'Usuario Pendiente';
    const assignedPermissionLevel = isFirstUser ? 'Total' : '';

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
    updateUserProfilePicture: updateUserProfilePictureFunc,
    changePassword: changePasswordFunc,
    deleteAccount: deleteAccountFunc,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
