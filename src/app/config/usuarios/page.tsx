
'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { FullUserProfile, Company } from '@/types/rca'; 
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Users, PlusCircle, Edit2, Trash2, FileUp, FileDown, Loader2, Building } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, writeBatch, where, QueryConstraint } from "firebase/firestore";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { sanitizeForFirestore } from '@/lib/utils';
import { sendEmailAction } from '@/app/actions';
import { useAuth } from '@/contexts/AuthContext';

interface UserConfigProfile extends FullUserProfile {
  assignedSites?: string;
  emailNotifications: boolean;
  empresa?: string;
}

const ALL_USER_ROLES: FullUserProfile['role'][] = ['Super User', 'Admin', 'Analista', 'Revisor', 'Usuario Pendiente', ''];
const defaultPermissionLevel: FullUserProfile['permissionLevel'] = 'Lectura';

const expectedUserHeaders = ["Nombre Completo", "Correo Electrónico", "Rol", "Empresa", "Sitios Asignados", "Notificaciones Email"];

export default function ConfiguracionUsuariosPage() {
  const [users, setUsers] = useState<UserConfigProfile[]>([]);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const { userProfile: loggedInUserProfile } = useAuth();

  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserConfigProfile | null>(null);

  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<FullUserProfile['role']>('');
  const [userEmpresa, setUserEmpresa] = useState('');
  const [userAssignedSites, setUserAssignedSites] = useState('');
  const [userEmailNotifications, setUserEmailNotifications] = useState(false);
  
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserConfigProfile | null>(null);

  const fetchInitialData = useCallback(async () => {
    if (!loggedInUserProfile) return; // Guard clause to prevent running before profile is loaded.
    setIsLoading(true);
    try {
      const usersCollectionRef = collection(db, "users");
      const companiesCollectionRef = collection(db, "companies");

      const usersQueryConstraints: QueryConstraint[] = [];
      const companiesQueryConstraints: QueryConstraint[] = [orderBy("name", "asc")];

      if (loggedInUserProfile.role !== 'Super User' && loggedInUserProfile.empresa) {
        usersQueryConstraints.push(where("empresa", "==", loggedInUserProfile.empresa));
        companiesQueryConstraints.push(where("name", "==", loggedInUserProfile.empresa));
      }

      const qUsers = query(usersCollectionRef, ...usersQueryConstraints);
      const usersSnapshot = await getDocs(qUsers);
      const usersData = usersSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() } as UserConfigProfile));
      
      // Sort on the client to avoid composite index
      usersData.sort((a,b) => a.name.localeCompare(b.name));

      setUsers(usersData);

      const qCompanies = query(companiesCollectionRef, ...companiesQueryConstraints);
      const companiesSnapshot = await getDocs(qCompanies);
      const companiesData = companiesSnapshot.docs.map(docSnapshot => ({ id: docSnapshot.id, ...docSnapshot.data() } as Company));
      setCompanies(companiesData);

    } catch (error) {
      console.error("Error fetching data: ", error);
      toast({ title: "Error al Cargar Datos", description: "No se pudieron cargar los usuarios o empresas desde Firestore.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [loggedInUserProfile, toast]);


  useEffect(() => {
    // This effect ensures fetchInitialData runs only when loggedInUserProfile is available.
    if (loggedInUserProfile) {
      fetchInitialData();
    }
  }, [fetchInitialData, loggedInUserProfile]);

  const availableRolesForDropdown = useMemo(() => {
    if (loggedInUserProfile?.role === 'Super User') {
      return ALL_USER_ROLES;
    }
    // Admins cannot create or assign the Super User role.
    return ALL_USER_ROLES.filter(r => r !== 'Super User');
  }, [loggedInUserProfile]);

  const resetUserForm = () => {
    setUserName('');
    setUserEmail('');
    setUserRole('');
    setUserEmpresa(loggedInUserProfile?.role === 'Admin' && loggedInUserProfile.empresa ? loggedInUserProfile.empresa : '');
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
    setUserEmpresa(user.empresa || '');
    setUserAssignedSites(user.assignedSites || '');
    setUserEmailNotifications(user.emailNotifications || false); 
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
    if (!userRole) {
      toast({ title: "Error", description: "El rol es obligatorio.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    let finalEmpresa = userEmpresa.trim() || undefined;
    if (loggedInUserProfile?.role === 'Admin' && loggedInUserProfile.empresa) {
        finalEmpresa = loggedInUserProfile.empresa;
    }

    if (isEditing && currentUser) {
      const wasPending = currentUser.role === 'Usuario Pendiente';
      const isNowActive = userRole && userRole !== 'Usuario Pendiente' && userRole !== '';
      const updatedUserData: Partial<UserConfigProfile> = {
        name: userName.trim(),
        email: userEmail.trim(),
        role: userRole,
        empresa: finalEmpresa,
        assignedSites: userAssignedSites.trim(),
        emailNotifications: userEmailNotifications,
      };
      try {
        const userRef = doc(db, "users", currentUser.id);
        await updateDoc(userRef, sanitizeForFirestore(updatedUserData));
        
        if (wasPending && isNowActive) {
            const emailResult = await sendEmailAction({
                to: userEmail.trim(),
                subject: "¡Tu cuenta en Asistente ACR ha sido activada!",
                body: `Hola ${userName.trim()},\n\nTu cuenta en Asistente ACR ha sido aprobada por un administrador. Ya puedes iniciar sesión con tu correo y contraseña.\n\nSaludos,\nEl equipo de Asistente ACR`,
                htmlBody: `<p>Hola ${userName.trim()},</p><p>Tu cuenta en Asistente ACR ha sido aprobada por un administrador. Ya puedes <strong>iniciar sesión</strong> con tu correo y contraseña.</p><p>Saludos,<br/>El equipo de Asistente ACR</p>`
            });
            if (emailResult.success) {
                toast({
                    title: "Usuario Actualizado y Notificado",
                    description: `El usuario "${userName}" fue activado y se le envió un correo de notificación.`,
                });
            } else {
                toast({
                    title: "Usuario Actualizado con Error de Notificación",
                    description: `El rol de "${userName}" fue actualizado, pero falló el envío del correo de notificación.`,
                    variant: "destructive",
                });
            }
        } else {
            toast({ title: "Usuario Actualizado", description: `El usuario "${userName}" ha sido actualizado.` });
        }
        fetchInitialData(); 
      } catch (error) {
        console.error("Error updating user in Firestore: ", error);
        toast({ title: "Error al Actualizar", description: "No se pudo actualizar el usuario.", variant: "destructive" });
      }
    } else {
      const newUserPayload: Omit<UserConfigProfile, 'id'> = {
        name: userName.trim(),
        email: userEmail.trim(),
        role: userRole,
        permissionLevel: userRole === 'Usuario Pendiente' ? '' : defaultPermissionLevel, 
        empresa: finalEmpresa,
        assignedSites: userAssignedSites.trim(),
        emailNotifications: userEmailNotifications,
      };
      try {
        // Here we add a user profile to Firestore. Registration in Firebase Auth is separate.
        // A user might be created here first by an admin, then register later.
        await addDoc(collection(db, "users"), sanitizeForFirestore(newUserPayload));
        toast({ title: "Perfil de Usuario Añadido", description: `El perfil para "${newUserPayload.name}" ha sido añadido a Firestore. El usuario deberá registrarse con este mismo correo para activar la cuenta.` });
        fetchInitialData(); 
      } catch (error) {
        console.error("Error adding user profile to Firestore: ", error);
        toast({ title: "Error al Añadir Perfil", description: "No se pudo añadir el perfil de usuario a Firestore.", variant: "destructive" });
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
        toast({ title: "Perfil de Usuario Eliminado", description: `El perfil de "${userToDelete.name}" ha sido eliminado de Firestore. El usuario de autenticación (si existe) debe eliminarse por separado.`, variant: 'destructive', duration: 7000 });
        setUserToDelete(null);
        fetchInitialData(); 
      } catch (error) {
        console.error("Error deleting user from Firestore: ", error);
        toast({ title: "Error al Eliminar Perfil", description: "No se pudo eliminar el perfil de usuario de Firestore.", variant: "destructive" });
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
      "Empresa": user.empresa || '',
      "Sitios Asignados": user.assignedSites || '',
      "Notificaciones Email": user.emailNotifications ? "Sí" : "No",
      "Nivel Permiso (Info)": user.permissionLevel,
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Usuarios");
    worksheet['!cols'] = [ { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 20 }, {wch: 20} ];
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    const fileName = `Usuarios_Asistente_ACR_${new Date().toISOString().split('T')[0]}.xlsx`;
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
        
        const headers = XLSX.utils.sheet_to_json(worksheet, { header: 1 })[0] as string[];
        const requiredHeaders = ["Nombre Completo", "Correo Electrónico", "Rol"];
        const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
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
          if (!ALL_USER_ROLES.includes(role) || role === '') {
             skippedCount++;
             continue;
          }

          let empresa = row["Empresa"]?.trim() || undefined;
          if (loggedInUserProfile?.role !== 'Super User' && loggedInUserProfile?.empresa) {
              if (empresa && empresa !== loggedInUserProfile.empresa) {
                  skippedCount++;
                  continue; // Skip users not belonging to the admin's company
              }
              empresa = loggedInUserProfile.empresa;
          }

          const newUser: Omit<UserConfigProfile, 'id'> = {
            name,
            email,
            role,
            permissionLevel: role === 'Usuario Pendiente' ? '' : defaultPermissionLevel,
            empresa: empresa,
            assignedSites: row["Sitios Asignados"]?.trim() || '',
            emailNotifications: (row["Notificaciones Email"]?.toLowerCase() === 'sí' || row["Notificaciones Email"]?.toLowerCase() === 'si'),
          };
          
          const userRef = doc(collection(db, "users")); 
          batch.set(userRef, sanitizeForFirestore(newUser));
          importedCount++;
          operationsInBatch++;

          if (operationsInBatch >= 490) { 
            await batch.commit();
            operationsInBatch = 0;
          }
        }

        if (operationsInBatch > 0) {
          await batch.commit();
        }

        toast({ title: "Importación Completada", description: `${importedCount} perfiles de usuario importados. ${skippedCount} filas omitidas por datos inválidos o faltantes.` });
        fetchInitialData(); 
      } catch (error) {
        console.error("Error importing users: ", error);
        toast({ title: "Error de Importación", description: "No se pudo procesar el archivo. Verifique el formato y los datos.", variant: "destructive" });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = ""; 
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
          Administre los perfiles de usuario en Firestore. La autenticación y contraseñas se gestionan vía Firebase Authentication.
        </p>
      </header>

      <Card className="max-w-6xl mx-auto shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Users className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Listado de Perfiles de Usuario</CardTitle>
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
                    Añadir Perfil
                  </Button>
                </DialogTrigger>
                 <DialogContent className="sm:max-w-[525px]">
                    <DialogHeader>
                        <DialogTitle>{isEditing ? 'Editar Perfil de Usuario' : 'Añadir Nuevo Perfil de Usuario'}</DialogTitle>
                        <CardDescription>
                            {isEditing ? 'Modifique los detalles del perfil.' : 'Cree un nuevo perfil en Firestore. El usuario debe existir o registrarse por separado en Firebase Authentication con el mismo correo electrónico para poder iniciar sesión.'}
                        </CardDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                        <div className="space-y-2">
                          <Label htmlFor="user-name">Nombre <span className="text-destructive">*</span></Label>
                          <Input id="user-name" value={userName} onChange={(e) => setUserName(e.target.value)} placeholder="Ej: Juan Pérez" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="user-email">Correo <span className="text-destructive">*</span></Label>
                          <Input id="user-email" type="email" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} placeholder="Ej: juan.perez@example.com" disabled={isEditing} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="user-role">Rol <span className="text-destructive">*</span></Label>
                          <Select value={userRole} onValueChange={(value) => setUserRole(value as FullUserProfile['role'])}>
                              <SelectTrigger>
                              <SelectValue placeholder="-- Seleccione un rol --" />
                              </SelectTrigger>
                              <SelectContent>
                              {availableRolesForDropdown.filter(r => r !== '').map(role => (
                                  <SelectItem key={role} value={role}>{role}</SelectItem>
                              ))}
                              </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="user-empresa">Empresa</Label>
                           <Select 
                            value={userEmpresa} 
                            onValueChange={setUserEmpresa}
                            disabled={loggedInUserProfile?.role !== 'Super User'}
                           >
                            <SelectTrigger id="user-empresa">
                              <SelectValue placeholder="-- Seleccione una empresa --" />
                            </SelectTrigger>
                            <SelectContent>
                              {companies.map(company => (
                                <SelectItem key={company.id} value={company.name}>{company.name}</SelectItem>
                              ))}
                              {companies.length === 0 && (
                                <div className="p-2 text-center text-sm text-muted-foreground">No hay empresas creadas.</div>
                              )}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="user-sites">Sitio(s) Asignados</Label>
                          <Input id="user-sites" value={userAssignedSites} onChange={(e) => setUserAssignedSites(e.target.value)} placeholder="Ej: Planta A, Bodega Central (separado por comas)" />
                        </div>
                        <div className="flex items-center space-x-2 pt-2">
                            <Switch id="user-notifications" checked={userEmailNotifications} onCheckedChange={setUserEmailNotifications} />
                            <Label htmlFor="user-notifications">Recibir Notificaciones por Correo</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                        <Button type="button" variant="outline" onClick={() => { resetUserForm(); setIsUserDialogOpen(false);}} disabled={isSubmitting}>Cancelar</Button>
                        </DialogClose>
                        <Button type="button" onClick={handleSaveUser} disabled={isSubmitting}>
                         {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                         {isEditing ? 'Guardar Cambios' : 'Crear Perfil'}
                        </Button>
                    </DialogFooter>
                 </DialogContent>
              </Dialog>
            </div>
          </div>
          <CardDescription>
            Visualice, añada, edite o elimine perfiles de usuario en Firestore.
            <span className="block text-xs mt-1">Plantilla Importación: Columnas requeridas - {expectedUserHeaders.slice(0,3).join(', ')}. Opcionales: {expectedUserHeaders.slice(3).join(', ')}.</span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Cargando perfiles de usuario...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow><TableHead className="w-[25%]">Nombre</TableHead><TableHead className="w-[25%]">Correo Electrónico</TableHead><TableHead className="w-[15%]">Rol</TableHead><TableHead className="w-[15%]">Empresa</TableHead><TableHead className="w-[10%]">Notif. Email</TableHead><TableHead className="w-[10%] text-right">Acciones</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {users.length > 0 ? (
                    users.map((user) => (
                      <TableRow key={user.id}><TableCell className="font-medium">{user.name}</TableCell><TableCell>{user.email}</TableCell><TableCell>{user.role || 'N/A'}</TableCell><TableCell>{user.empresa || '-'}</TableCell><TableCell>{user.emailNotifications ? 'Sí' : 'No'}</TableCell><TableCell className="text-right"><Button variant="ghost" size="icon" className="mr-2 hover:text-primary" onClick={() => openEditUserDialog(user)} disabled={isSubmitting}><Edit2 className="h-4 w-4" /><span className="sr-only">Editar</span></Button><Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => openDeleteDialog(user)} disabled={isSubmitting}><Trash2 className="h-4 w-4" /><span className="sr-only">Eliminar</span></Button></TableCell></TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground h-24">No hay perfiles de usuario registrados. Puede añadir uno usando el botón de arriba o importando desde Excel.</TableCell></TableRow>
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
              ¿Está seguro de que desea eliminar el perfil de usuario de "{userToDelete?.name}"? Esta acción solo elimina el perfil de Firestore y no el usuario de autenticación.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setUserToDelete(null)} disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar Perfil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
