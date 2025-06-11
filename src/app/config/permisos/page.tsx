
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ListChecks, Users, Edit3, KeyRound, ShieldOff, History, Edit2 } from 'lucide-react';
import type { FullUserProfile } from '@/types/rca'; 
import { useToast } from "@/hooks/use-toast";

// This initial data should ideally be consistent with /config/usuarios page's initial data
const initialUserProfilesData: FullUserProfile[] = [
  { id: 'u1', name: 'Carlos Ruiz', email: 'carlos.ruiz@example.com', role: 'Admin', permissionLevel: 'Total' },
  { id: 'u2', name: 'Ana López', email: 'ana.lopez@example.com', role: 'Analista', permissionLevel: 'Lectura' },
  { id: 'u3', name: 'Luis Torres', email: 'luis.torres@example.com', role: 'Revisor', permissionLevel: 'Limitado' },
  { id: 'u4', name: 'Maria Solano', email: 'maria.solano@example.com', role: 'Analista', permissionLevel: 'Lectura'},
  { id: 'u5', name: 'Pedro Gómez', email: 'pedro.gomez@example.com', role: 'Analista', permissionLevel: 'Lectura'},
];

const availableRoles: FullUserProfile['role'][] = ['Admin', 'Analista', 'Revisor', ''];
const availablePermissionLevels: FullUserProfile['permissionLevel'][] = ['Total', 'Lectura', 'Limitado', ''];


export default function ConfiguracionPermisosPage() {
  const [userProfiles, setUserProfiles] = useState<FullUserProfile[]>(initialUserProfilesData);
  const { toast } = useToast();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentUserToEdit, setCurrentUserToEdit] = useState<FullUserProfile | null>(null);
  
  const [editRole, setEditRole] = useState<FullUserProfile['role']>('');
  const [editPermissionLevel, setEditPermissionLevel] = useState<FullUserProfile['permissionLevel']>('');

  const openEditDialog = (user: FullUserProfile) => {
    setCurrentUserToEdit(user);
    setEditRole(user.role);
    setEditPermissionLevel(user.permissionLevel);
    setIsEditDialogOpen(true);
  };

  const handleSaveChanges = () => {
    if (!currentUserToEdit) return;

    setUserProfiles(prevProfiles =>
      prevProfiles.map(profile =>
        profile.id === currentUserToEdit.id
          ? { ...profile, role: editRole, permissionLevel: editPermissionLevel }
          : profile
      )
    );
    toast({
      title: "Permisos Actualizados",
      description: `Se actualizaron los permisos para ${currentUserToEdit.name}.`,
    });
    setIsEditDialogOpen(false);
    setCurrentUserToEdit(null);
  };

  const getProjectAccessDisplay = (role: FullUserProfile['role']): string => {
    switch (role) {
      case 'Admin': return 'Total (Administrador)';
      case 'Analista': return 'Específico de Equipo/Proyecto (Analista)';
      case 'Revisor': return 'Solo Revisión (Revisor)';
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
          Gestione los roles y niveles de acceso dentro de RCA Assistant.
        </p>
      </header>

      <Card className="max-w-3xl mx-auto shadow-lg">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Users className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl">Permisos de Usuario</CardTitle>
          </div>
          <CardDescription>
            Visualice y edite los permisos asignados a cada usuario del sistema. La lista de usuarios se inicializa de forma consistente con la página de gestión de usuarios.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Usuario</TableHead>
                  <TableHead className="w-[30%]">Rol (Acceso)</TableHead>
                  <TableHead className="w-[30%]">Nivel de Permiso (Edición)</TableHead>
                  <TableHead className="w-[10%] text-right">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {userProfiles.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.name}</TableCell>
                    <TableCell>{getProjectAccessDisplay(user.role)}</TableCell>
                    <TableCell>{getEditionDisplay(user.permissionLevel)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEditDialog(user)} className="hover:text-primary">
                        <Edit2 className="h-4 w-4" />
                        <span className="sr-only">Editar Permisos</span>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                 {userProfiles.length === 0 && (
                    <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                        No hay usuarios para mostrar.
                        </TableCell>
                    </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Edit Permissions Dialog */}
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
                  {availableRoles.filter(r => r !== '').map(r => (
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
                  {availablePermissionLevels.filter(pl => pl !== '').map(pl => (
                    <SelectItem key={pl} value={pl}>{getEditionDisplay(pl)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setCurrentUserToEdit(null);}}>Cancelar</Button>
            </DialogClose>
            <Button onClick={handleSaveChanges}>Guardar Cambios</Button>
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

