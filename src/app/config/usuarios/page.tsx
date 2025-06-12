
'use client';

import { useState, useEffect, useRef } from 'react';
import type { FullUserProfile } from '@/types/rca'; 
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Users, PlusCircle, Edit2, Trash2, FileUp, FileDown, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, writeBatch } from "firebase/firestore";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface UserConfigProfile extends FullUserProfile {
  assignedSites?: string;
  emailNotifications: boolean;
}

const userRoles: FullUserProfile['role'][] = ['Admin', 'Analista', 'Revisor', ''];
const defaultPermissionLevel: FullUserProfile['permissionLevel'] = 'Lectura';

// Define expected headers for Excel import
const expectedUserHeaders = ["Nombre Completo", "Correo Electrónico", "Rol", "Sitios Asignados", "Notificaciones Email"];


export default function ConfiguracionUsuariosPage() {
  const [users, setUsers] = useState<UserConfigProfile[]>([]);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserConfigProfile | null>(null);

  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userConfirmPassword, setUserConfirmPassword] = useState('');
  const [userRole, setUserRole] = useState<FullUserProfile['role']>('');
  const [userAssignedSites, setUserAssignedSites] = useState('');
  const [userEmailNotifications, setUserEmailNotifications] = useState(false);
  
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserConfigProfile | null>(null);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const usersCollectionRef = collection(db, "users");
      const q = query(usersCollectionRef, orderBy("name", "asc"));
      const querySnapshot = await getDocs(q);
      const usersData = querySnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() } as UserConfigProfile));
      setUsers(usersData);
    } catch (error) {
      console.error("Error fetching users: ", error);
      toast({ title: "Error al Cargar Usuarios", description: "No se pudieron cargar los usuarios desde Firestore.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [toast]);

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
    setUserEmailNotifications(user.emailNotifications || false); 
    setUserPassword(''); 
    setUserConfirmPassword('');
    setIsUserDialogOpen(true);
  };

  const handleSaveUser = async () => {
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

    setIsSubmitting(true);

    if (isEditing && currentUser) {
      const updatedUserData: Partial<UserConfigProfile> = {
        name: userName.trim(),
        email: userEmail.trim(),
        role: userRole,
        assignedSites: userAssignedSites.trim(),
        emailNotifications: userEmailNotifications,
      };
      try {
        const userRef = doc(db, "users", currentUser.id);
        await updateDoc(userRef, updatedUserData);
        toast({ title: "Usuario Actualizado", description: `El usuario "${userName}" ha sido actualizado.` });
        fetchUsers(); // Re-fetch to update table
      } catch (error) {
        console.error("Error updating user in Firestore: ", error);
        toast({ title: "Error al Actualizar", description: "No se pudo actualizar el usuario.", variant: "destructive" });
      }
    } else {
      const newUserPayload: Omit<UserConfigProfile, 'id'> = {
        name: userName.trim(),
        email: userEmail.trim(),
        role: userRole,
        permissionLevel: defaultPermissionLevel, 
        assignedSites: userAssignedSites.trim(),
        emailNotifications: userEmailNotifications,
      };
      try {
        await addDoc(collection(db, "users"), newUserPayload);
        toast({ title: "Usuario Añadido", description: `El usuario "${newUserPayload.name}" ha sido añadido.` });
        fetchUsers(); // Re-fetch
      } catch (error) {
        console.error("Error adding user to Firestore: ", error);
        toast({ title: "Error al Añadir", description: "No se pudo añadir el usuario.", variant: "destructive" });
      }
    }
    
    setIsSubmitting(false);
    resetUserForm();
    setIsUserDialogOpen(false);
  };

  const openDeleteDialog = (user: UserConfigProfile) => {
    setUserToDelete(user);
    setIsDeleteConfirmOpen(true);
  };

  const handleDeleteUser = async () => {
    if (userToDelete) {
      setIsSubmitting(true);
      try {
        await deleteDoc(doc(db, "users", userToDelete.id));
        toast({ title: "Usuario Eliminado", description: `El usuario "${userToDelete.name}" ha sido eliminado.`, variant: 'destructive' });
        setUserToDelete(null);
        fetchUsers(); // Re-fetch
      } catch (error) {
        console.error("Error deleting user from Firestore: ", error);
        toast({ title: "Error al Eliminar", description: "No se pudo eliminar el usuario.", variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    }
    setIsDeleteConfirmOpen(false);
  };
  
  const handleUserExcelExport = () => {
    if (users.length === 0) {
      toast({ title: "Sin Datos", description: "No hay usuarios para exportar.", variant: "default" });
      return;
    }
    const dataToExport = users.map(user => ({
      "Nombre Completo": user.name,
      "Correo Electrónico": user.email,
      "Rol": user.role,
      "Sitios Asignados": user.assignedSites || '',
      "Notificaciones Email": user.emailNotifications ? "Sí" : "No",
      "Nivel Permiso (Info)": user.permissionLevel,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Usuarios");
    worksheet['!cols'] = [ { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 30 }, { wch: 20 }, {wch: 20} ];
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    const fileName = `Usuarios_RCA_Assistant_${new Date().toISOString().split('T')[0]}.xlsx`;
    saveAs(dataBlob, fileName);
    toast({ title: "Exportación Iniciada", description: `El archivo ${fileName} ha comenzado a descargarse.` });
  };

  const handleTriggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleUserExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (jsonData.length === 0) {
          toast({ title: "Archivo Vacío", description: "El archivo Excel no contiene datos.", variant: "destructive" });
          setIsImporting(false);
          return;
        }
        
        // Validate headers (optional but good practice)
        const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[];
        const missingHeaders = expectedUserHeaders.filter(h => !headers.includes(h) && (h === "Nombre Completo" || h === "Correo Electrónico" || h === "Rol"));
        if (missingHeaders.length > 0) {
            toast({ title: "Cabeceras Faltantes", description: `Faltan cabeceras obligatorias: ${missingHeaders.join(', ')}. Por favor, use la plantilla correcta.`, variant: "destructive", duration: 7000 });
            setIsImporting(false);
            if(fileInputRef.current) fileInputRef.current.value = "";
            return;
        }


        let importedCount = 0;
        let skippedCount = 0;
        const batch = writeBatch(db);
        let operationsInBatch = 0;

        for (const row of jsonData) {
          const name = row["Nombre Completo"]?.trim();
          const email = row["Correo Electrónico"]?.trim();
          const role = row["Rol"]?.trim() as FullUserProfile['role'];
          
          if (!name || !email || !role) {
            skippedCount++;
            continue; 
          }
          if (!/^\S+@\S+\.\S+$/.test(email)) {
            skippedCount++;
            continue;
          }
          if (!userRoles.includes(role) || role === '') {
             skippedCount++;
             continue;
          }

          const newUser: Omit<UserConfigProfile, 'id'> = {
            name,
            email,
            role,
            permissionLevel: defaultPermissionLevel,
            assignedSites: row["Sitios Asignados"]?.trim() || '',
            emailNotifications: (row["Notificaciones Email"]?.toLowerCase() === 'sí' || row["Notificaciones Email"]?.toLowerCase() === 'si'),
          };
          
          const userRef = doc(collection(db, "users")); // Create new doc ref for batch
          batch.set(userRef, newUser);
          importedCount++;
          operationsInBatch++;

          if (operationsInBatch >= 490) { // Firestore batch limit is 500
            await batch.commit();
            operationsInBatch = 0;
            // batch = writeBatch(db); // Re-initialize for next batch - This line was wrong, should be batch = writeBatch(db);
          }
        }

        if (operationsInBatch > 0) {
          await batch.commit();
        }

        toast({ title: "Importación Completada", description: `${importedCount} usuarios importados. ${skippedCount} filas omitidas por datos inválidos o faltantes.` });
        fetchUsers(); // Refresh list
      } catch (error) {
        console.error("Error importing users: ", error);
        toast({ title: "Error de Importación", description: "No se pudo procesar el archivo. Verifique el formato y los datos.", variant: "destructive" });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = ""; // Reset file input
        }
      }
    };
    reader.readAsArrayBuffer(file);
  };


  return (
    <div className="space-y-8 py-8">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleUserExcelImport} 
        accept=".xlsx, .xls" 
        style={{ display: 'none' }} 
      />
      <header className="text-center space-y-2">
        <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
          <Users className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary">
          Configuración de Usuarios
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Administre los usuarios del sistema, sus roles y permisos. Los datos se almacenan en Firestore.
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
              <Button variant="outline" onClick={handleTriggerFileInput} disabled={isImporting || isLoading}>
                {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                Importar Excel
              </Button>
              <Button variant="outline" onClick={handleUserExcelExport} disabled={isLoading || users.length === 0}>
                <FileDown className="mr-2 h-4 w-4" />
                Exportar Excel
              </Button>
              <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="default" onClick={openAddUserDialog} disabled={isLoading}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Añadir Usuario
                  </Button>
                </DialogTrigger>
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
                        <Button type="button" variant="outline" onClick={() => { resetUserForm(); setIsUserDialogOpen(false);}} disabled={isSubmitting}>Cancelar</Button>
                        </DialogClose>
                        <Button type="button" onClick={handleSaveUser} disabled={isSubmitting}>
                         {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                         {isEditing ? 'Guardar Cambios' : 'Crear Usuario'}
                        </Button>
                    </DialogFooter>
                 </DialogContent>
              </Dialog>
            </div>
          </div>
          <CardDescription>
            Visualice, añada, edite o elimine usuarios registrados en el sistema.
            <span className="block text-xs mt-1">Plantilla Importación: Columnas requeridas - {expectedUserHeaders.slice(0,3).join(', ')}. Opcionales: {expectedUserHeaders.slice(3).join(', ')}.</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Cargando usuarios...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[30%]">Nombre</TableHead>
                    <TableHead className="w-[30%]">Correo Electrónico</TableHead>
                    <TableHead className="w-[15%]">Rol</TableHead>
                    <TableHead className="w-[15%]">Notif. Email</TableHead>
                    <TableHead className="w-[10%] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length > 0 ? (
                    users.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.name}</TableCell>
                        <TableCell>{user.email}</TableCell>
                        <TableCell>{user.role || 'N/A'}</TableCell>
                        <TableCell>{user.emailNotifications ? 'Sí' : 'No'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="mr-2 hover:text-primary" onClick={() => openEditUserDialog(user)} disabled={isSubmitting}>
                            <Edit2 className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => openDeleteDialog(user)} disabled={isSubmitting}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Eliminar</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                        No hay usuarios registrados. Puede añadir uno usando el botón de arriba o importando desde Excel.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Eliminación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea eliminar al usuario "{userToDelete?.name}"? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)} disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
