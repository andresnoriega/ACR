
'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type { FullUserProfile, Company } from '@/types/rca'; 
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Users, PlusCircle, Edit2, Trash2, FileUp, FileDown, Loader2, Building, Filter, Search, RefreshCcw, ArrowUp, ArrowDown, ChevronsUpDown } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, writeBatch, where, QueryConstraint } from "firebase/firestore";
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { sanitizeForFirestore } from '@/lib/utils';
import { sendEmailAction } from '@/app/actions';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';

interface UserConfigProfile extends FullUserProfile {
  assignedSites?: string;
  emailNotifications: boolean;
  empresa?: string;
}

interface Filters {
  searchTerm: string;
  role: string;
  empresa: string;
}

type SortableUserKey = 'name' | 'email' | 'role' | 'empresa';

interface SortConfig {
  key: SortableUserKey | null;
  direction: 'ascending' | 'descending';
}


const ALL_USER_ROLES: FullUserProfile['role'][] = ['Super User', 'Admin', 'Analista', 'Revisor', 'Usuario Pendiente', ''];
const defaultPermissionLevel: FullUserProfile['permissionLevel'] = 'Lectura';
const ALL_FILTER_VALUE = "__ALL__";

const expectedUserHeaders = ["Nombre Completo", "Correo Electrónico", "Rol", "Empresa", "Sitios Asignados", "Notificaciones Email"];

export default function ConfiguracionUsuariosPage() {
  const [allUsers, setAllUsers] = useState<UserConfigProfile[]>([]);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [companies, setCompanies] = useState<Company[]>([]);
  const { userProfile: loggedInUserProfile, loadingAuth } = useAuth();

  const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentUserToEdit, setCurrentUserToEdit] = useState<UserConfigProfile | null>(null);

  // States for the form fields
  const [formState, setFormState] = useState({
      name: '',
      email: '',
      role: '' as FullUserProfile['role'],
      empresa: '',
      assignedSites: '',
      emailNotifications: false,
      permissionLevel: '' as FullUserProfile['permissionLevel'],
  });
  
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserConfigProfile | null>(null);

  const [filters, setFilters] = useState<Filters>({ searchTerm: '', role: '', empresa: '' });
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'name', direction: 'ascending' });

  const fetchInitialData = useCallback(async (profile: FullUserProfile) => {
    setIsLoading(true);
    try {
      const usersCollectionRef = collection(db, "users");
      const companiesCollectionRef = collection(db, "companies");

      const usersQueryConstraints: QueryConstraint[] = [];
      const companiesQueryConstraints: QueryConstraint[] = [orderBy("name", "asc")];
      
      if (profile.role !== 'Super User' && profile.empresa) {
        usersQueryConstraints.push(where("empresa", "==", profile.empresa));
        companiesQueryConstraints.push(where("name", "==", profile.empresa));
      }

      const qUsers = query(usersCollectionRef, ...usersQueryConstraints);
      const qCompanies = query(companiesCollectionRef, ...companiesQueryConstraints);
      
      const [usersSnapshot, companiesSnapshot] = await Promise.all([
        getDocs(qUsers),
        getDocs(qCompanies)
      ]);

      const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserConfigProfile));
      const companiesData = companiesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));

      setAllUsers(usersData);
      setCompanies(companiesData);

    } catch (error) {
      console.error("Error fetching initial data for user config: ", error);
      toast({ title: "Error al Cargar Datos", description: "No se pudieron cargar usuarios o empresas.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);
  
  useEffect(() => {
    if (!loadingAuth && loggedInUserProfile) {
      fetchInitialData(loggedInUserProfile);
    } else if (!loadingAuth && !loggedInUserProfile) {
      setIsLoading(false);
    }
  }, [loadingAuth, loggedInUserProfile, fetchInitialData]);

  const sortedFilteredUsers = useMemo(() => {
    let filtered = [...allUsers];

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(user =>
        user.name.toLowerCase().includes(term) ||
        user.email.toLowerCase().includes(term)
      );
    }
    if (filters.role) {
      filtered = filtered.filter(user => user.role === filters.role);
    }
    if (filters.empresa && loggedInUserProfile?.role === 'Super User') {
      filtered = filtered.filter(user => user.empresa === filters.empresa);
    }

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const valA = a[sortConfig.key!] ?? '';
        const valB = b[sortConfig.key!] ?? '';
        if (valA < valB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (valA > valB) return sortConfig.direction === 'ascending' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [allUsers, filters, sortConfig, loggedInUserProfile]);

  const requestSort = (key: SortableUserKey) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIcon = (columnKey: SortableUserKey) => {
    if (sortConfig.key !== columnKey) {
      return <ChevronsUpDown className="h-4 w-4 opacity-30 ml-1" />;
    }
    return sortConfig.direction === 'ascending' ? <ArrowUp className="h-4 w-4 ml-1" /> : <ArrowDown className="h-4 w-4 ml-1" />;
  };

  const handleFilterChange = (field: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value === ALL_FILTER_VALUE ? '' : value }));
  };

  const clearFilters = () => {
    setFilters({ searchTerm: '', role: '', empresa: '' });
  };


  const availableRolesForDropdown = useMemo(() => {
    if (loggedInUserProfile?.role === 'Super User') {
      return ALL_USER_ROLES;
    }
    return ALL_USER_ROLES.filter(role => role !== 'Super User');
  }, [loggedInUserProfile]);

  const resetFormState = useCallback(() => {
    setFormState({
        name: '',
        email: '',
        role: '',
        empresa: loggedInUserProfile?.role === 'Admin' && loggedInUserProfile.empresa ? loggedInUserProfile.empresa : '',
        assignedSites: '',
        emailNotifications: false,
        permissionLevel: '',
    });
    setCurrentUserToEdit(null);
  }, [loggedInUserProfile]);

  const openAddUserDialog = () => {
    resetFormState();
    setIsEditing(false);
    setIsUserDialogOpen(true);
  };

  const openEditUserDialog = (user: UserConfigProfile) => {
    setIsEditing(true);
    setCurrentUserToEdit(user);
    setFormState({
        name: user.name || '',
        email: user.email || '',
        role: user.role || '',
        empresa: user.empresa || '',
        assignedSites: user.assignedSites || '',
        emailNotifications: user.emailNotifications || false,
        permissionLevel: user.permissionLevel || '',
    });
    setIsUserDialogOpen(true);
  };

  const handleDialogClose = useCallback((open: boolean) => {
      if (!open) {
          resetFormState();
      }
      setIsUserDialogOpen(open);
  }, [resetFormState]);

  const handleSaveUser = async () => {
    if (!formState.name.trim() || !formState.role) {
      toast({ title: "Error de Validación", description: "Nombre y Rol son campos obligatorios.", variant: "destructive" });
      return;
    }
    // Solo valida email al crear
    if (!isEditing && !formState.email.trim()) {
      toast({ title: "Error de Validación", description: "El correo electrónico es obligatorio.", variant: "destructive" });
      return;
    }
    if (!isEditing && !/^\S+@\S+\.\S+$/.test(formState.email)) {
      toast({ title: "Error de Validación", description: "El correo electrónico no es válido.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    
    const finalEmpresa = formState.empresa.trim() || undefined;

    if (isEditing && currentUserToEdit) {
      const wasPending = currentUserToEdit.role === 'Usuario Pendiente';
      const isNowActive = formState.role && formState.role !== 'Usuario Pendiente' && formState.role !== '';
      
      // Objeto solo con los campos que se pueden modificar.
      const dataToUpdate = {
          name: formState.name.trim(),
          role: formState.role,
          empresa: finalEmpresa,
          assignedSites: formState.assignedSites.trim(),
          emailNotifications: formState.emailNotifications,
          permissionLevel: formState.permissionLevel || defaultPermissionLevel,
      };

      try {
        const userRef = doc(db, "users", currentUserToEdit.id);
        await updateDoc(userRef, sanitizeForFirestore(dataToUpdate));
        
        if (wasPending && isNowActive) {
            await sendEmailAction({
                to: formState.email, 
                subject: "¡Tu cuenta en Asistente ACR ha sido activada!",
                body: `Hola ${dataToUpdate.name},\n\nTu cuenta en Asistente ACR ha sido aprobada por un administrador. Ya puedes iniciar sesión con tu correo y contraseña.\n\nSaludos,\nEl equipo de Asistente ACR`
            });
             toast({
                title: "Usuario Actualizado y Notificado",
                description: `El usuario "${dataToUpdate.name}" fue activado y se le envió un correo.`,
            });
        } else {
            toast({ title: "Usuario Actualizado", description: `El usuario "${dataToUpdate.name}" ha sido actualizado.` });
        }
        if(loggedInUserProfile) fetchInitialData(loggedInUserProfile);
        handleDialogClose(false);
      } catch (error) {
        console.error("Error updating user in Firestore: ", error);
        toast({ title: "Error al Actualizar", description: "No se pudo actualizar el usuario.", variant: "destructive" });
      }
    } else {
      // Lógica para crear un nuevo usuario (sin cambios)
      const dataToSave: Omit<UserConfigProfile, 'id'> = {
          name: formState.name.trim(),
          email: formState.email.trim(),
          role: formState.role,
          empresa: finalEmpresa,
          assignedSites: formState.assignedSites.trim(),
          emailNotifications: formState.emailNotifications,
          permissionLevel: formState.permissionLevel || defaultPermissionLevel,
      };
      try {
        await addDoc(collection(db, "users"), sanitizeForFirestore(dataToSave));
        toast({ title: "Perfil de Usuario Añadido", description: `El perfil para "${dataToSave.name}" ha sido añadido.` });
        if(loggedInUserProfile) fetchInitialData(loggedInUserProfile);
        handleDialogClose(false);
      } catch (error) {
        console.error("Error adding user profile to Firestore: ", error);
        toast({ title: "Error al Añadir Perfil", description: "No se pudo añadir el perfil de usuario.", variant: "destructive" });
      }
    }
    
    setIsSubmitting(false);
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
        toast({ title: "Perfil de Usuario Eliminado", description: `El perfil de "${userToDelete.name}" ha sido eliminado de Firestore.`, variant: 'destructive', duration: 7000 });
        setUserToDelete(null);
        if(loggedInUserProfile) fetchInitialData(loggedInUserProfile);
      } catch (error) {
        console.error("Error deleting user from Firestore: ", error);
        toast({ title: "Error al Eliminar Perfil", description: "No se pudo eliminar el perfil de usuario.", variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    }
    setIsDeleteConfirmOpen(false);
  };
  
  const handleUserExcelExport = () => {
    if (sortedFilteredUsers.length === 0) {
      toast({ title: "Sin Datos", description: "No hay usuarios para exportar.", variant: "default" });
      return;
    }
    const dataToExport = sortedFilteredUsers.map(user => ({
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
        if(loggedInUserProfile) fetchInitialData(loggedInUserProfile);
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
              <Button variant="outline" onClick={handleTriggerFileInput} disabled={isImporting || isLoading || loadingAuth}>
                {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                Importar Excel
              </Button>
              <Button variant="outline" onClick={handleUserExcelExport} disabled={isLoading || loadingAuth || sortedFilteredUsers.length === 0}>
                <FileDown className="mr-2 h-4 w-4" />
                Exportar Excel
              </Button>
              <Dialog open={isUserDialogOpen} onOpenChange={handleDialogClose}>
                <DialogTrigger asChild>
                  <Button variant="default" onClick={openAddUserDialog} disabled={isLoading || loadingAuth}>
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
                          <Input id="user-name" value={formState.name} onChange={(e) => setFormState(s => ({...s, name: e.target.value}))} placeholder="Ej: Juan Pérez" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="user-email">Correo <span className="text-destructive">*</span></Label>
                          <Input id="user-email" type="email" value={formState.email} onChange={(e) => setFormState(s => ({...s, email: e.target.value}))} placeholder="Ej: juan.perez@example.com" disabled={isEditing} />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="user-role">Rol <span className="text-destructive">*</span></Label>
                          <Select value={formState.role} onValueChange={(value) => setFormState(s => ({...s, role: value as FullUserProfile['role']}))}>
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
                            value={formState.empresa} 
                            onValueChange={(value) => setFormState(s => ({...s, empresa: value}))}
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
                          <Input id="user-sites" value={formState.assignedSites} onChange={(e) => setFormState(s => ({...s, assignedSites: e.target.value}))} placeholder="Ej: Planta A, Bodega Central (separado por comas)" />
                        </div>
                        <div className="flex items-center space-x-2 pt-2">
                            <Switch id="user-notifications" checked={formState.emailNotifications} onCheckedChange={(checked) => setFormState(s => ({...s, emailNotifications: checked}))} />
                            <Label htmlFor="user-notifications">Recibir Notificaciones por Correo</Label>
                        </div>
                    </div>
                    <DialogFooter>
                        <DialogClose asChild>
                        <Button type="button" variant="outline" onClick={() => handleDialogClose(false)} disabled={isSubmitting}>Cancelar</Button>
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
          <div className="border rounded-md p-4 mb-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search-term">Buscar por Nombre/Correo</Label>
                <Input
                  id="search-term"
                  placeholder="Buscar..."
                  value={filters.searchTerm}
                  onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-role">Filtrar por Rol</Label>
                <Select value={filters.role} onValueChange={(value) => handleFilterChange('role', value)}>
                  <SelectTrigger><SelectValue placeholder="Todos los roles" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_FILTER_VALUE}>Todos los roles</SelectItem>
                    {ALL_USER_ROLES.filter(r => r).map(role => (
                      <SelectItem key={role} value={role}>{role}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-empresa">Filtrar por Empresa</Label>
                <Select value={filters.empresa} onValueChange={(value) => handleFilterChange('empresa', value)} disabled={loggedInUserProfile?.role !== 'Super User'}>
                  <SelectTrigger><SelectValue placeholder="Todas las empresas" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL_FILTER_VALUE}>Todas las empresas</SelectItem>
                    {companies.map(company => (
                      <SelectItem key={company.id} value={company.name}>{company.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" onClick={clearFilters}><RefreshCcw className="mr-2 h-4 w-4"/>Limpiar</Button>
            </div>
          </div>
          {loadingAuth || isLoading ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Cargando perfiles de usuario...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[25%] cursor-pointer" onClick={() => requestSort('name')}>
                      <div className="flex items-center">Nombre {renderSortIcon('name')}</div>
                    </TableHead>
                    <TableHead className="w-[25%] cursor-pointer" onClick={() => requestSort('email')}>
                      <div className="flex items-center">Correo Electrónico {renderSortIcon('email')}</div>
                    </TableHead>
                    <TableHead className="w-[15%] cursor-pointer" onClick={() => requestSort('role')}>
                      <div className="flex items-center">Rol {renderSortIcon('role')}</div>
                    </TableHead>
                    <TableHead className="w-[15%] cursor-pointer" onClick={() => requestSort('empresa')}>
                      <div className="flex items-center">Empresa {renderSortIcon('empresa')}</div>
                    </TableHead>
                    <TableHead className="w-[10%]">Notif. Email</TableHead>
                    <TableHead className="w-[10%] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedFilteredUsers.length > 0 ? (
                    sortedFilteredUsers.map((user) => (
                      <TableRow key={user.id}><TableCell className="font-medium">{user.name}</TableCell><TableCell>{user.email}</TableCell><TableCell>{user.role || 'N/A'}</TableCell><TableCell>{user.empresa || '-'}</TableCell><TableCell>{user.emailNotifications ? 'Sí' : 'No'}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-primary" onClick={() => openEditUserDialog(user)} disabled={isSubmitting}><Edit2 className="h-4 w-4" /><span className="sr-only">Editar</span></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive" onClick={() => openDeleteDialog(user)} disabled={isSubmitting}><Trash2 className="h-4 w-4" /><span className="sr-only">Eliminar</span></Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground h-24">No se encontraron usuarios con los filtros actuales.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
         <CardFooter>
            <p className="text-xs text-muted-foreground">
              Mostrando {sortedFilteredUsers.length} de {allUsers.length} perfiles de usuario.
            </p>
          </CardFooter>
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
