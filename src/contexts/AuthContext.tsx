
'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { auth, db, storage, type FirebaseUser } from '@/lib/firebase';
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
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
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
          let docSnap = await getDoc(userDocRef);

          if (!docSnap.exists()) {
            console.log(`Profile for UID ${user.uid} not found. Attempting to reclaim by email: ${user.email}`);
            const usersCollectionRef = collection(db, "users");
            const qByEmail = query(usersCollectionRef, where("email", "==", user.email), limit(1));
            const existingByEmailSnap = await getDocs(qByEmail);

            if (!existingByEmailSnap.empty) {
              const preCreatedDoc = existingByEmailSnap.docs[0];
              const profileData = preCreatedDoc.data() as Omit<FullUserProfile, 'id'>;
              console.log(`Found pre-created profile ${preCreatedDoc.id}. Migrating to new UID ${user.uid}.`);

              if (!profileData.name) profileData.name = user.displayName || "Usuario";
              if (!profileData.photoURL) profileData.photoURL = user.photoURL || '';
              
              await setDoc(userDocRef, sanitizeForFirestore(profileData));
              await deleteDoc(preCreatedDoc.ref);

              docSnap = await getDoc(userDocRef);
            }
          }

          if (docSnap.exists()) {
            setUserProfile({ id: docSnap.id, ...docSnap.data() } as FullUserProfile);
          } else {
            console.warn(`No profile found for ${user.email}. Creating a new profile.`);
            
            const usersCollectionRef = collection(db, "users");
            const allUsersQuery = query(usersCollectionRef, limit(2));
            const anyUserSnap = await getDocs(allUsersQuery);
            const isFirstEverUser = anyUserSnap.docs.length === 0;

            const newUserProfileData: Omit<FullUserProfile, 'id'> = {
              name: user.displayName || user.email || "Usuario Nuevo",
              email: user.email!,
              role: isFirstEverUser ? 'Super User' : 'Usuario Pendiente',
              permissionLevel: isFirstEverUser ? 'Total' : '',
              assignedSites: '',
              emailNotifications: true,
              empresa: '',
              photoURL: user.photoURL || '',
            };
            
            await setDoc(userDocRef, sanitizeForFirestore(newUserProfileData));
            setUserProfile({ id: user.uid, ...newUserProfileData });

            if (!isFirstEverUser) {
              try {
                const superUsersQuery = query(usersCollectionRef, where("role", "in", ["Super User", "Admin"]));
                const adminsSnapshot = await getDocs(superUsersQuery);
                const adminEmails = adminsSnapshot.docs
                  .map(docSnap => docSnap.data() as FullUserProfile)
                  .filter(profile => profile.email && (profile.emailNotifications === undefined || profile.emailNotifications))
                  .map(profile => profile.email!);
                
                if (adminEmails.length > 0) {
                  const emailSubject = `Nuevo Usuario Pendiente de Aprobación: ${newUserProfileData.name}`;
                  const emailBody = `Hola,\n\nUn nuevo usuario se ha registrado y está pendiente de aprobación:\n\nNombre: ${newUserProfileData.name}\nCorreo: ${newUserProfileData.email}\n\nPor favor, revise la lista de usuarios en la sección de Configuración para aprobar esta cuenta.\n\nSaludos,\nSistema Asistente ACR`;
                  for (const adminEmail of adminEmails) {
                    await sendEmailAction({ to: adminEmail, subject: emailSubject, body: emailBody });
                  }
                }
              } catch (notifyError) {
                console.error("[AuthContext] Failed to notify admins about new auto-created pending user:", notifyError);
              }
            }
          }
        } catch (error) {
          console.error(`[AuthContext] Critical error fetching/creating profile for UID ${user.uid}:`, error);
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
    setCurrentUser({ ...currentUser, ...updates } as FirebaseUser);
  };
  
  const updateUserProfilePictureFunc = async (file: File): Promise<string> => {
    if (!currentUser || !userProfile) {
      throw new Error("No hay un usuario autenticado o un perfil de usuario para actualizar.");
    }
  
    const fileExtension = file.name.split('.').pop() || 'jpg';
    const fileName = `avatar-${Date.now()}.${fileExtension}`;
    const filePath = `profile-pictures/${currentUser.uid}/${fileName}`;
    const fileRef = storageRef(storage, filePath);
    
    // Add metadata, making it IDENTICAL to how evidences are uploaded for rule consistency.
    const uploadMetadata = {
      customMetadata: {
        userId: userProfile.id, // Using userProfile.id for consistency with working uploads
      }
    };
    
    await uploadBytes(fileRef, file, uploadMetadata);
    const photoURL = await getDownloadURL(fileRef);
  
    await updateProfile(currentUser, { photoURL });
  
    const userDocRef = doc(db, 'users', currentUser.uid);
    await updateDoc(userDocRef, { photoURL });
  
    setUserProfile(prev => prev ? { ...prev, photoURL } : null);
  
    return photoURL;
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
    
    const userDocRef = doc(db, 'users', currentUser.uid);
    await deleteDoc(userDocRef);
    
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
