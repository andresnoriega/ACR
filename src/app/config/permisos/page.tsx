
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ListChecks, Users, Edit2, KeyRound, ShieldOff, History, Loader2 } from 'lucide-react';
import type { FullUserProfile } from '@/types/rca'; 
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, query, orderBy, where, QueryConstraint } from "firebase/firestore";
import { useAuth } from '@/contexts/AuthContext';

const ALL_ROLES: FullUserProfile['role'][] = ['Super User', 'Admin', 'Analista', 'Revisor', 'Usuario Pendiente', ''];
const ALL_PERMISSION_LEVELS: FullUserProfile['permissionLevel'][] = ['Total', 'Lectura', 'Limitado', ''];

export default function ConfiguracionPermisosPage() {
  const [userProfiles, setUserProfiles] = useState<FullUserProfile[]>([]);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentUserToEdit, setCurrentUserToEdit] = useState<FullUserProfile | null>(null);
  
  const [editRole, setEditRole] = useState<FullUserProfile['role']>('');
  const [editPermissionLevel, setEditPermissionLevel] = useState<FullUserProfile['permissionLevel']>('');
  
  const { userProfile: loggedInUserProfile } = useAuth();

  useEffect(() => {
    const fetchUserProfiles = async () => {
      if (!loggedInUserProfile) return;
      setIsLoading(true);
      try {
        const usersCollectionRef = collection(db, "users");
        const queryConstraints: QueryConstraint[] = [];
        
        if (loggedInUserProfile.role === 'Admin' && loggedInUserProfile.empresa) {
          queryConstraints.push(where("empresa", "==", loggedInUserProfile.empresa));
        }
        
        const q = query(usersCollectionRef, ...queryConstraints);
        const querySnapshot = await getDocs(q);
        const profilesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FullUserProfile));

        // Sort on the client to avoid composite index
        profilesData.sort((a, b) => a.name.localeCompare(b.name));
        
        setUserProfiles(profilesData);
      } catch (error) {
        console.error("Error fetching user profiles: ", error);
        toast({ title: "Error al Cargar Perfiles", description: "No se pudieron cargar los perfiles de usuario desde Firestore.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchUserProfiles();
  }, [toast, loggedInUserProfile]);
  
  const availableRolesForDropdown = useMemo(() => {
    if (loggedInUserProfile?.role === 'Super User') {
      return ALL_ROLES;
    }
    return ALL_ROLES.filter(r => r !== 'Super User');
  }, [loggedInUserProfile]);

  const openEditDialog = (user: FullUserProfile) => {
    setCurrentUserToEdit(user);
    setEditRole(user.role);
    setEditPermissionLevel(user.permissionLevel);
    setIsEditDialogOpen(true);
  };

  const handleSaveChanges = async () => {
    if (!currentUserToEdit || !loggedInUserProfile) return;
    
    // Security check: An Admin cannot edit a Super User's profile
    if (loggedInUserProfile.role === 'Admin' && currentUserToEdit.role === 'Super User') {
      toast({ title: "Acción no permitida", description: "Los Administradores no pueden modificar los perfiles de Super Usuarios.", variant: "destructive"});
      return;
    }
    
    setIsSubmitting(true);

    try {
      const userRef = doc(db, "users", currentUserToEdit.id);
      await updateDoc(userRef, {
        role: editRole,
        permissionLevel: editPermissionLevel,
      });

      setUserProfiles(prevProfiles =>
        prevProfiles.map(profile =>
          profile.id === currentUserToEdit.id
            ? { ...profile, role: editRole, permissionLevel: editPermissionLevel }
            : profile
        ).sort((a,b) => a.name.localeCompare(b.name))
      );
      toast({
        title: "Permisos Actualizados",
        description: `Se actualizaron los permisos para ${currentUserToEdit.name}.`,
      });
      setIsEditDialogOpen(false);
      setCurrentUserToEdit(null);
    } catch (error) {
      console.error("Error updating permissions in Firestore: ", error);
      toast({ title: "Error al Actualizar", description: "No se pudieron actualizar los permisos.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getProjectAccessDisplay = (role: FullUserProfile['role']): string => {
    switch (role) {
      case 'Super User': return 'Total (Super Usuario)';
      case 'Admin': return 'Total de Empresa (Admin)';
      case 'Analista': return 'Específico de Equipo/Proyecto (Analista)';
      case 'Revisor': return 'Solo Revisión (Revisor)';
      case 'Usuario Pendiente': return 'Pendiente de Aprobación';
      default: return 'No Definido';
    }
  };

  const getEditionDisplay = (level: FullUserProfile['permissionLevel']): string => {
    switch (level) {
      case 'Total': return 'Total';
      case 'Lectura': return 'Solo Lectura';
      case 'Limitado': return 'Limitada';
      default: return 'No Definido';
    }
  };

  return (
    <div className="space-y-8 py-8">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
          <KeyRound className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary">
          Configuración de Permisos
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Gestione los roles y niveles de acceso dentro de Asistente ACR.
        </p>
      </header>

      <Card className="max-w-3xl mx-auto shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Permisos de Usuario</CardTitle>
          </div>
          <CardDescription>
            Visualice y edite los permisos asignados a cada usuario del sistema. {loggedInUserProfile?.role === 'Admin' ? 'Solo se muestran usuarios de su empresa.' : 'Los datos se obtienen desde Firestore.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Cargando perfiles de usuario...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow><TableHead className="w-[30%]">Usuario</TableHead><TableHead className="w-[30%]">Rol (Acceso)</TableHead><TableHead className="w-[30%]">Nivel de Permiso (Edición)</TableHead><TableHead className="w-[10%] text-right">Acción</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {userProfiles.map((user) => {
                    const canEditUser = loggedInUserProfile?.role === 'Super User' || (loggedInUserProfile?.role === 'Admin' && user.role !== 'Super User');
                    return (
                        <TableRow key={user.id}>
                          <TableCell className="font-medium">{user.name}</TableCell>
                          <TableCell>{getProjectAccessDisplay(user.role)}</TableCell>
                          <TableCell>{getEditionDisplay(user.permissionLevel)}</TableCell>
                          <TableCell className="text-right">
                              <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)} className="h-8 w-8 hover:text-primary" disabled={isSubmitting || !canEditUser} title={!canEditUser ? "No puede editar este usuario" : "Editar Permisos"}>
                                  <Edit2 className="h-4 w-4" />
                                  <span className="sr-only">Editar Permisos</span>
                              </Button>
                          </TableCell>
                        </TableRow>
                    );
                  })}
                  {userProfiles.length === 0 && !isLoading && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                          No hay usuarios para mostrar. Verifique la sección de 'Configuración de Usuarios'.
                          </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Permisos para {currentUserToEdit?.name}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="role" className="text-right">
                Rol
              </Label>
              <Select value={editRole} onValueChange={(value) => setEditRole(value as FullUserProfile['role'])}>
                <SelectTrigger id="role" className="col-span-3">
                  <SelectValue placeholder="Seleccionar rol" />
                </SelectTrigger>
                <SelectContent>
                  {availableRolesForDropdown.filter(r => r !== '').map(r => (
                    <SelectItem key={r} value={r}>{getProjectAccessDisplay(r)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="permissionLevel" className="text-right">
                Nivel de Permiso
              </Label>
              <Select value={editPermissionLevel} onValueChange={(value) => setEditPermissionLevel(value as FullUserProfile['permissionLevel'])}>
                <SelectTrigger id="permissionLevel" className="col-span-3">
                  <SelectValue placeholder="Seleccionar nivel" />
                </SelectTrigger>
                <SelectContent>
                  {ALL_PERMISSION_LEVELS.filter(pl => pl !== '').map(pl => (
                    <SelectItem key={pl} value={pl}>{getEditionDisplay(pl)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setCurrentUserToEdit(null);}} disabled={isSubmitting}>Cancelar</Button>
            </DialogClose>
            <Button onClick={handleSaveChanges} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="max-w-3xl mx-auto shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <ListChecks className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Opciones de Administración de Permisos (Avanzado)</CardTitle>
          </div>
           <CardDescription>
            Estas opciones son ilustrativas para futuras funcionalidades.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3 text-sm text-muted-foreground">
            <li className="flex items-center p-2 rounded-md">
              <KeyRound className="mr-3 h-5 w-5 text-primary/70" />
              Definir nuevos roles personalizados en el sistema.
            </li>
            <li className="flex items-center p-2 rounded-md">
              <ShieldOff className="mr-3 h-5 w-5 text-primary/70" />
              Asignar permisos granulares a cada rol existente.
            </li>
            <li className="flex items-center p-2 rounded-md">
              <History className="mr-3 h-5 w-5 text-primary/70" />
              Auditar historial de cambios de permisos.
            </li>
          </ul>
        </CardContent>
         <CardFooter>
          <p className="text-xs text-muted-foreground">
            La funcionalidad completa de gestión avanzada de permisos (creación de roles, asignación granular) requeriría una implementación de backend más compleja.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
