'use client';

import { useState, useEffect, useRef } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, KeyRound, ShieldAlert, UploadCloud } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const profileFormSchema = z.object({
  name: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
});

const passwordFormSchema = z.object({
  currentPassword: z.string().min(1, { message: "La contraseña actual es requerida." }),
  newPassword: z.string().min(6, { message: "La nueva contraseña debe tener al menos 6 caracteres." }),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las nuevas contraseñas no coinciden.",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;
type PasswordFormValues = z.infer<typeof passwordFormSchema>;

export default function PerfilPage() {
  const { currentUser, userProfile, updateUserProfile, changePassword, deleteAccount, updateUserProfilePicture, loadingAuth } = useAuth();
  const { toast } = useToast();
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { register: registerProfile, handleSubmit: handleSubmitProfile, setValue: setProfileValue, formState: { errors: profileErrors } } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
  });

  const { register: registerPassword, handleSubmit: handleSubmitPassword, reset: resetPasswordForm, formState: { errors: passwordErrors } } = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordFormSchema),
  });

  useEffect(() => {
    if (userProfile) {
      setProfileValue('name', userProfile.name);
    }
  }, [userProfile, setProfileValue]);

  const onProfileSubmit: SubmitHandler<ProfileFormValues> = async (data) => {
    setIsSavingProfile(true);
    try {
      await updateUserProfile({ name: data.name });
      toast({ title: "Perfil Actualizado", description: "Tu nombre ha sido actualizado correctamente." });
    } catch (error: any) {
      toast({ title: "Error", description: `No se pudo actualizar el perfil: ${error.message}`, variant: "destructive" });
    }
    setIsSavingProfile(false);
  };

  const onPasswordSubmit: SubmitHandler<PasswordFormValues> = async (data) => {
    setIsSavingPassword(true);
    try {
      await changePassword(data.currentPassword, data.newPassword);
      toast({ title: "Contraseña Actualizada", description: "Tu contraseña ha sido cambiada exitosamente." });
      resetPasswordForm();
    } catch (error: any) {
      toast({ title: "Error", description: `No se pudo cambiar la contraseña: ${error.message}`, variant: "destructive" });
    }
    setIsSavingPassword(false);
  };

  const handleDeleteAccount = async () => {
    if(!deletePassword) {
        toast({ title: "Contraseña requerida", description: "Debes ingresar tu contraseña para eliminar la cuenta.", variant: "destructive"});
        return;
    }
    setIsDeleting(true);
    try {
      await deleteAccount(deletePassword);
      toast({ title: "Cuenta Eliminada", description: "Tu cuenta ha sido eliminada permanentemente.", variant: "destructive" });
      // The AuthProvider will handle the redirect on auth state change
    } catch (error: any) {
      toast({ title: "Error", description: `No se pudo eliminar la cuenta: ${error.message}`, variant: "destructive" });
      setIsDeleting(false);
      setIsDeleteConfirmOpen(false);
    }
  };
  
  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast({ title: "Archivo Demasiado Grande", description: "La imagen no puede superar los 2MB.", variant: "destructive" });
        return;
    }

    setIsUploading(true);
    try {
        await updateUserProfilePicture(file);
        toast({ title: "Foto de Perfil Actualizada", description: "Tu foto de perfil ha sido cambiada." });
    } catch (error: any) {
        toast({ title: "Error al Subir", description: `No se pudo subir la imagen: ${error.message}`, variant: "destructive" });
    } finally {
        setIsUploading(false);
    }
  };

  if (loadingAuth || !userProfile) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-10rem)] text-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-muted-foreground">Cargando perfil...</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <header>
          <h1 className="text-3xl font-bold font-headline text-primary">Mi Perfil</h1>
          <p className="text-muted-foreground">Gestiona tu información personal y de seguridad.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><User className="h-5 w-5"/> Información Personal</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col items-center space-y-3">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={currentUser?.photoURL || ''} alt={userProfile?.name || 'Avatar'} />
                  <AvatarFallback>{userProfile?.name?.charAt(0) || 'U'}</AvatarFallback>
                </Avatar>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/png, image/jpeg" className="hidden" />
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
                  {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                  {isUploading ? 'Subiendo...' : 'Cambiar Foto de Perfil'}
                </Button>
              </div>
              <form onSubmit={handleSubmitProfile(onProfileSubmit)} className="space-y-4">
                <div className="space-y-1">
                  <Label htmlFor="name">Nombre Completo</Label>
                  <Input id="name" {...registerProfile('name')} />
                  {profileErrors.name && <p className="text-xs text-destructive">{profileErrors.name.message}</p>}
                </div>
                <div className="space-y-1">
                  <Label htmlFor="email">Correo Electrónico</Label>
                  <Input id="email" type="email" value={currentUser?.email || ''} disabled />
                  <p className="text-xs text-muted-foreground">El correo electrónico no se puede cambiar.</p>
                </div>
                <Button type="submit" className="w-full" disabled={isSavingProfile}>
                  {isSavingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Guardar Cambios
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><KeyRound className="h-5 w-5"/> Cambiar Contraseña</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmitPassword(onPasswordSubmit)} className="space-y-4">
                  <div className="space-y-1">
                    <Label htmlFor="currentPassword">Contraseña Actual</Label>
                    <Input id="currentPassword" type="password" {...registerPassword('currentPassword')} />
                    {passwordErrors.currentPassword && <p className="text-xs text-destructive">{passwordErrors.currentPassword.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="newPassword">Nueva Contraseña</Label>
                    <Input id="newPassword" type="password" {...registerPassword('newPassword')} />
                     {passwordErrors.newPassword && <p className="text-xs text-destructive">{passwordErrors.newPassword.message}</p>}
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                    <Input id="confirmPassword" type="password" {...registerPassword('confirmPassword')} />
                    {passwordErrors.confirmPassword && <p className="text-xs text-destructive">{passwordErrors.confirmPassword.message}</p>}
                  </div>
                  <Button type="submit" className="w-full" disabled={isSavingPassword}>
                    {isSavingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Actualizar Contraseña
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-destructive"><ShieldAlert className="h-5 w-5"/> Zona de Peligro</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div>
                    <p className="font-medium">Eliminar esta cuenta</p>
                    <p className="text-sm text-muted-foreground">
                      Una vez eliminada, tu cuenta es irrecuperable.
                    </p>
                  </div>
                  <Button variant="destructive" onClick={() => setIsDeleteConfirmOpen(true)}>Eliminar Cuenta</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Estás absolutamente seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción es irreversible. Para confirmar, ingresa tu contraseña actual.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="delete-password">Contraseña Actual</Label>
            <Input
              id="delete-password"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Ingresa tu contraseña para confirmar"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeletePassword('')} disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isDeleting || !deletePassword}>
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Sí, eliminar mi cuenta"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
