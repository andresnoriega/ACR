
'use client';

import { useState, useEffect } from 'react';
import type { FullUserProfile } from '@/types/rca'; // Import FullUserProfile
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Users, PlusCircle, Edit2, Trash2, FileUp, FileDown } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

// Define a local interface extending FullUserProfile for fields specific to this page
interface UserConfigProfile extends FullUserProfile {
  assignedSites?: string;
  emailNotifications: boolean;
  // Password is not stored in state but used for forms
}

// Base user data, aligned with FullUserProfile structure from /config/permisos
const masterInitialUserProfiles: Omit<FullUserProfile, 'permissionLevel'>[] = [
  { id: 'u1', name: 'Carlos Ruiz', email: 'carlos.ruiz@example.com', role: 'Admin' },
  { id: 'u2', name: 'Ana López', email: 'ana.lopez@example.com', role: 'Analista' },
  { id: 'u3', name: 'Luis Torres', email: 'luis.torres@example.com', role: 'Revisor' },
  { id: 'u4', name: 'Maria Solano', email: 'maria.solano@example.com', role: 'Analista'},
  { id: 'u5', name: 'Pedro Gómez', email: 'pedro.gomez@example.com', role: 'Analista'},
];

// Initial data for this page, extending the master list
const initialUserProfilesData: UserConfigProfile[] = masterInitialUserProfiles.map((user, index) => ({
  ...user,
  permissionLevel: user.role === 'Admin' ? 'Total' : (index % 2 === 0 ? 'Lectura' : 'Limitado'), // Assign permissionLevel
  emailNotifications: index % 2 === 0,
  assignedSites: user.role === 'Admin' ? 'Planta Industrial, Centro Logístico' : (index === 1 ? 'Planta Industrial' : (index === 2 ? 'Centro Logístico' : `Planta Ejemplo ${index + 1}`)),
}));


const userRoles: FullUserProfile['role'][] = ['Admin', 'Analista', 'Revisor', ''];

export default function ConfiguracionUsuariosPage() {
  const [users, setUsers] = useState<UserConfigProfile[]>(initialUserProfilesData);
  const { toast } = useToast();

  // State for Add/Edit Dialog
  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserConfigProfile | null>(null);

  // Form state for new/edit user
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userConfirmPassword, setUserConfirmPassword] = useState('');
  const [userRole, setUserRole] = useState<FullUserProfile['role']>('');
  const [userAssignedSites, setUserAssignedSites] = useState('');
  const [userEmailNotifications, setUserEmailNotifications] = useState(false);

  // State for Delete Confirmation Dialog
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserConfigProfile | null>(null);


  const resetUserForm = () => {
    setUserName('');
    setUserEmail('');
    setUserPassword('');
    setUserConfirmPassword('');
    setUserRole('');
    setUserAssignedSites('');
    setUserEmailNotifications(false);
    setCurrentUser(null);
    setIsEditing(false);
  };

  const openAddUserDialog = () => {
    resetUserForm();
    setIsEditing(false);
    setIsUserDialogOpen(true);
  };

  const openEditUserDialog = (user: UserConfigProfile) => {
    resetUserForm();
    setIsEditing(true);
    setCurrentUser(user);
    setUserName(user.name);
    setUserEmail(user.email);
    setUserRole(user.role);
    setUserAssignedSites(user.assignedSites || '');
    setUserEmailNotifications(user.emailNotifications);
    setUserPassword(''); 
    setUserConfirmPassword('');
    setIsUserDialogOpen(true);
  };

  const handleSaveUser = () => {
    if (!userName.trim()) {
      toast({ title: "Error", description: "El nombre completo es obligatorio.", variant: "destructive" });
      return;
    }
    if (!userEmail.trim() || !/^\S+@\S+\.\S+$/.test(userEmail)) {
      toast({ title: "Error", description: "El correo electrónico no es válido.", variant: "destructive" });
      return;
    }
    if (!isEditing && !userPassword) { 
      toast({ title: "Error", description: "La contraseña es obligatoria para nuevos usuarios.", variant: "destructive" });
      return;
    }
    if (userPassword && userPassword !== userConfirmPassword) {
      toast({ title: "Error", description: "Las contraseñas no coinciden.", variant: "destructive" });
      return;
    }
    if (!userRole) {
      toast({ title: "Error", description: "El rol es obligatorio.", variant: "destructive" });
      return;
    }

    if (isEditing && currentUser) {
      setUsers(users.map(u => u.id === currentUser.id ? {
        ...u, // Spread existing fields like permissionLevel
        name: userName,
        email: userEmail,
        role: userRole,
        assignedSites: userAssignedSites,
        emailNotifications: userEmailNotifications,
      } : u));
      toast({ title: "Usuario Actualizado", description: `El usuario "${userName}" ha sido actualizado.` });
    } else {
      const newUser: UserConfigProfile = {
        id: `u-${Date.now()}`, 
        name: userName,
        email: userEmail,
        role: userRole,
        permissionLevel: 'Lectura', // Default permission level for new users
        assignedSites: userAssignedSites,
        emailNotifications: userEmailNotifications,
      };
      setUsers([...users, newUser]);
      toast({ title: "Usuario Añadido", description: `El usuario "${newUser.name}" ha sido añadido.` });
    }
    resetUserForm();
    setIsUserDialogOpen(false);
  };

  const openDeleteDialog = (user: UserConfigProfile) => {
    setUserToDelete(user);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteUser = () => {
    if (userToDelete) {
      setUsers(users.filter(u => u.id !== userToDelete.id));
      toast({ title: "Usuario Eliminado", description: `El usuario "${userToDelete.name}" ha sido eliminado.`, variant: 'destructive' });
      setUserToDelete(null);
    }
    setIsDeleteConfirmOpen(false);
  };
  
  const handleExcelImport = () => {
    toast({ title: "Funcionalidad no implementada", description: "La importación desde Excel aún no está disponible." });
  };

  const handleExcelExport = () => {
    toast({ title: "Funcionalidad no implementada", description: "La exportación a Excel aún no está disponible." });
  };


  return (
    <div className="space-y-8 py-8">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
          <Users className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary">
          Configuración de Usuarios
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Administre los usuarios del sistema, sus roles y permisos.
        </p>
      </header>

      <Card className="max-w-5xl mx-auto shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Listado de Usuarios</CardTitle>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button variant="outline" onClick={handleExcelImport}>
                <FileUp className="mr-2 h-4 w-4" />
                Importar Excel
              </Button>
              <Button variant="outline" onClick={handleExcelExport}>
                <FileDown className="mr-2 h-4 w-4" />
                Exportar Excel
              </Button>
              <Button variant="default" onClick={openAddUserDialog}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Añadir Usuario
              </Button>
            </div>
          </div>
          <CardDescription>
            Visualice, añada, edite o elimine usuarios registrados en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Nombre</TableHead>
                  <TableHead className="w-[30%]">Correo Electrónico</TableHead>
                  <TableHead className="w-[20%]">Rol</TableHead>
                  <TableHead className="w-[20%] text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.role}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="mr-2 hover:text-primary" onClick={() => openEditUserDialog(user)}>
                          <Edit2 className="h-4 w-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => openDeleteDialog(user)}>
                          <Trash2 className="h-4 w-4" />
                           <span className="sr-only">Eliminar</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                      No hay usuarios registrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Add/Edit User Dialog */}
      <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Usuario' : 'Añadir Nuevo Usuario'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user-name" className="text-right">Nombre <span className="text-destructive">*</span></Label>
              <Input id="user-name" value={userName} onChange={(e) => setUserName(e.target.value)} className="col-span-3" placeholder="Ej: Juan Pérez" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user-email" className="text-right">Correo <span className="text-destructive">*</span></Label>
              <Input id="user-email" type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} className="col-span-3" placeholder="Ej: juan.perez@example.com" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user-password" className="text-right">Contraseña {isEditing ? '(Nueva)' : <span className="text-destructive">*</span>}</Label>
              <Input id="user-password" type="password" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} className="col-span-3" placeholder={isEditing ? 'Dejar en blanco para no cambiar' : ''} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user-confirm-password" className="text-right">Confirmar {isEditing ? 'Nueva ' : ''}Contra. {isEditing ? '' : <span className="text-destructive">*</span>}</Label>
              <Input id="user-confirm-password" type="password" value={userConfirmPassword} onChange={(e) => setUserConfirmPassword(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user-role" className="text-right">Rol <span className="text-destructive">*</span></Label>
              <Select value={userRole} onValueChange={(value) => setUserRole(value as FullUserProfile['role'])}>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="-- Seleccione un rol --" />
                </SelectTrigger>
                <SelectContent>
                  {userRoles.filter(r => r !== '').map(role => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user-sites" className="text-right">Sitio(s)</Label>
              <Input id="user-sites" value={userAssignedSites} onChange={(e) => setUserAssignedSites(e.target.value)} className="col-span-3" placeholder="Ej: Planta A, Bodega Central" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="user-notifications" className="text-right">Notificación</Label>
              <div className="col-span-3 flex items-center space-x-2">
                <Switch id="user-notifications" checked={userEmailNotifications} onCheckedChange={setUserEmailNotifications} />
                <Label htmlFor="user-notifications">{userEmailNotifications ? 'Sí' : 'No'}</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => { resetUserForm(); setIsUserDialogOpen(false);}}>Cancelar</Button>
            </DialogClose>
            <Button type="button" onClick={handleSaveUser}>Guardar Usuario</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Eliminación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea eliminar al usuario "{userToDelete?.name}"? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

