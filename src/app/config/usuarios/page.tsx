
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Users, PlusCircle, Edit3 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface User {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Analista' | 'Revisor' | '';
  assignedSites?: string; // Simple text for now
  emailNotifications: boolean;
}

const initialUsers: User[] = [
  { id: '1', name: 'Carlos Ruiz', email: 'carlos@example.com', role: 'Admin', emailNotifications: true, assignedSites: 'Planta Industrial, Centro Logístico' },
  { id: '2', name: 'Ana López', email: 'ana@example.com', role: 'Analista', emailNotifications: false, assignedSites: 'Planta Industrial' },
  { id: '3', name: 'Luis Torres', email: 'luis@example.com', role: 'Revisor', emailNotifications: true, assignedSites: 'Centro Logístico' },
];

const userRoles: User['role'][] = ['Admin', 'Analista', 'Revisor'];

export default function ConfiguracionUsuariosPage() {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [isAddUserDialogOpen, setIsAddUserDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form state for new user
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserConfirmPassword, setNewUserConfirmPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<User['role']>('');
  const [newUserAssignedSites, setNewUserAssignedSites] = useState('');
  const [newUserEmailNotifications, setNewUserEmailNotifications] = useState(false);

  const resetNewUserForm = () => {
    setNewUserName('');
    setNewUserEmail('');
    setNewUserPassword('');
    setNewUserConfirmPassword('');
    setNewUserRole('');
    setNewUserAssignedSites('');
    setNewUserEmailNotifications(false);
  };

  const handleAddUser = () => {
    if (!newUserName.trim()) {
      toast({ title: "Error", description: "El nombre completo es obligatorio.", variant: "destructive" });
      return;
    }
    if (!newUserEmail.trim() || !/^\S+@\S+\.\S+$/.test(newUserEmail)) {
      toast({ title: "Error", description: "El correo electrónico no es válido.", variant: "destructive" });
      return;
    }
    if (!newUserPassword) {
      toast({ title: "Error", description: "La contraseña es obligatoria.", variant: "destructive" });
      return;
    }
    if (newUserPassword !== newUserConfirmPassword) {
      toast({ title: "Error", description: "Las contraseñas no coinciden.", variant: "destructive" });
      return;
    }
    if (!newUserRole) {
      toast({ title: "Error", description: "El rol es obligatorio.", variant: "destructive" });
      return;
    }

    const newUser: User = {
      id: (users.length + 1).toString(),
      name: newUserName,
      email: newUserEmail,
      role: newUserRole,
      assignedSites: newUserAssignedSites,
      emailNotifications: newUserEmailNotifications,
    };
    setUsers([...users, newUser]);
    toast({ title: "Usuario Añadido", description: `El usuario "${newUser.name}" ha sido añadido.` });
    resetNewUserForm();
    setIsAddUserDialogOpen(false);
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

      <Card className="max-w-4xl mx-auto shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Listado de Usuarios</CardTitle>
            </div>
            <Dialog open={isAddUserDialogOpen} onOpenChange={setIsAddUserDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" onClick={() => { resetNewUserForm(); setIsAddUserDialogOpen(true); }}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Añadir Nuevo Usuario
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle>Añadir Nuevo Usuario</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="user-name" className="text-right">Nombre Completo <span className="text-destructive">*</span></Label>
                    <Input id="user-name" value={newUserName} onChange={(e) => setNewUserName(e.target.value)} className="col-span-3" placeholder="Ej: Juan Pérez" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="user-email" className="text-right">Correo Electrónico <span className="text-destructive">*</span></Label>
                    <Input id="user-email" type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)} className="col-span-3" placeholder="Ej: juan.perez@example.com" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="user-password" className="text-right">Contraseña <span className="text-destructive">*</span></Label>
                    <Input id="user-password" type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="user-confirm-password" className="text-right">Confirmar Contraseña <span className="text-destructive">*</span></Label>
                    <Input id="user-confirm-password" type="password" value={newUserConfirmPassword} onChange={(e) => setNewUserConfirmPassword(e.target.value)} className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="user-role" className="text-right">Rol <span className="text-destructive">*</span></Label>
                    <Select value={newUserRole} onValueChange={(value) => setNewUserRole(value as User['role'])}>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="-- Seleccione un rol --" />
                      </SelectTrigger>
                      <SelectContent>
                        {userRoles.map(role => (
                          role && <SelectItem key={role} value={role}>{role}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="user-sites" className="text-right">Asignado a Sitio(s)</Label>
                    <Input id="user-sites" value={newUserAssignedSites} onChange={(e) => setNewUserAssignedSites(e.target.value)} className="col-span-3" placeholder="Ej: Planta A, Bodega Central (o seleccionar)" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="user-notifications" className="text-right">Notificación por correo</Label>
                    <div className="col-span-3 flex items-center space-x-2">
                      <Switch id="user-notifications" checked={newUserEmailNotifications} onCheckedChange={setNewUserEmailNotifications} />
                      <Label htmlFor="user-notifications">{newUserEmailNotifications ? 'Sí' : 'No'}</Label>
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline" onClick={resetNewUserForm}>Cancelar</Button>
                  </DialogClose>
                  <Button type="button" onClick={handleAddUser}>Guardar Usuario</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <CardDescription>
            Visualice y gestione los usuarios registrados en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[35%]">Nombre</TableHead>
                  <TableHead className="w-[35%]">Correo Electrónico</TableHead>
                  <TableHead className="w-[30%]">Rol</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.length > 0 ? (
                  users.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>{user.role}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
                      No hay usuarios registrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        {users.length > 0 && (
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              Actualmente, la edición y eliminación de usuarios no está implementada en esta maqueta.
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
