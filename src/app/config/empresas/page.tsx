
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building, PlusCircle, Edit2, Trash2, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase';
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";
import type { Company } from '@/types/rca';

export default function ConfiguracionEmpresasPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');
  const [newCompanyRut, setNewCompanyRut] = useState('');
  const [newCompanyAdminName, setNewCompanyAdminName] = useState('');
  const [newCompanyAdminEmail, setNewCompanyAdminEmail] = useState('');

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [currentCompanyToEdit, setCurrentCompanyToEdit] = useState<Company | null>(null);
  const [editCompanyName, setEditCompanyName] = useState('');
  const [editCompanyRut, setEditCompanyRut] = useState('');
  const [editCompanyAdminName, setEditCompanyAdminName] = useState('');
  const [editCompanyAdminEmail, setEditCompanyAdminEmail] = useState('');

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const companiesCollectionRef = collection(db, "companies");
      const q = query(companiesCollectionRef, orderBy("name", "asc"));
      const querySnapshot = await getDocs(q);
      const companiesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Company));
      setCompanies(companiesData);
    } catch (error) {
      console.error("Error fetching companies: ", error);
      toast({ title: "Error al Cargar Empresas", description: "No se pudieron cargar las empresas desde Firestore.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCompanies();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetAddForm = () => {
    setNewCompanyName('');
    setNewCompanyRut('');
    setNewCompanyAdminName('');
    setNewCompanyAdminEmail('');
  };
  
  const resetEditForm = () => {
    setCurrentCompanyToEdit(null);
    setEditCompanyName('');
    setEditCompanyRut('');
    setEditCompanyAdminName('');
    setEditCompanyAdminEmail('');
  };

  const validateForm = (name: string, rut: string, adminName: string, adminEmail: string): boolean => {
    if (!name.trim()) {
      toast({ title: "Error de Validación", description: "El nombre de la empresa es obligatorio.", variant: "destructive" });
      return false;
    }
    if (!rut.trim()) {
      toast({ title: "Error de Validación", description: "El RUT de la empresa es obligatorio.", variant: "destructive" });
      return false;
    }
    if (!adminName.trim()) {
      toast({ title: "Error de Validación", description: "El nombre del administrador es obligatorio.", variant: "destructive" });
      return false;
    }
    if (!adminEmail.trim() || !/^\S+@\S+\.\S+$/.test(adminEmail)) {
      toast({ title: "Error de Validación", description: "El correo electrónico del administrador no es válido.", variant: "destructive" });
      return false;
    }
    return true;
  };

  const handleAddCompany = async () => {
    if (!validateForm(newCompanyName, newCompanyRut, newCompanyAdminName, newCompanyAdminEmail)) return;
    
    setIsSubmitting(true);
    const newCompanyData: Omit<Company, 'id'> = {
      name: newCompanyName.trim(),
      rut: newCompanyRut.trim(),
      adminName: newCompanyAdminName.trim(),
      adminEmail: newCompanyAdminEmail.trim(),
    };
    try {
      await addDoc(collection(db, "companies"), newCompanyData);
      toast({ title: "Empresa Añadida", description: `La empresa "${newCompanyData.name}" ha sido añadida con éxito.` });
      resetAddForm();
      setIsAddDialogOpen(false);
      fetchCompanies(); // Re-fetch
    } catch (error) {
      console.error("Error adding company to Firestore: ", error);
      toast({ title: "Error al Añadir Empresa", description: "No se pudo añadir la empresa.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditDialog = (company: Company) => {
    setCurrentCompanyToEdit(company);
    setEditCompanyName(company.name);
    setEditCompanyRut(company.rut);
    setEditCompanyAdminName(company.adminName);
    setEditCompanyAdminEmail(company.adminEmail);
    setIsEditDialogOpen(true);
  };

  const handleUpdateCompany = async () => {
    if (!currentCompanyToEdit) return;
    if (!validateForm(editCompanyName, editCompanyRut, editCompanyAdminName, editCompanyAdminEmail)) return;

    setIsSubmitting(true);
    const updatedCompanyData = {
      name: editCompanyName.trim(),
      rut: editCompanyRut.trim(),
      adminName: editCompanyAdminName.trim(),
      adminEmail: editCompanyAdminEmail.trim(),
    };
    try {
      const companyRef = doc(db, "companies", currentCompanyToEdit.id);
      await updateDoc(companyRef, updatedCompanyData);
      toast({ title: "Empresa Actualizada", description: `La empresa "${updatedCompanyData.name}" ha sido actualizada.` });
      resetEditForm();
      setIsEditDialogOpen(false);
      fetchCompanies(); // Re-fetch
    } catch (error) {
      console.error("Error updating company in Firestore: ", error);
      toast({ title: "Error al Actualizar", description: "No se pudo actualizar la empresa.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteDialog = (company: Company) => {
    setCompanyToDelete(company);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteCompany = async () => {
    if (companyToDelete) {
      setIsSubmitting(true);
      try {
        await deleteDoc(doc(db, "companies", companyToDelete.id));
        toast({ title: "Empresa Eliminada", description: `La empresa "${companyToDelete.name}" ha sido eliminada.`, variant: 'destructive' });
        setCompanyToDelete(null);
        fetchCompanies(); // Re-fetch
      } catch (error) {
        console.error("Error deleting company from Firestore: ", error);
        toast({ title: "Error al Eliminar", description: "No se pudo eliminar la empresa.", variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    }
    setIsDeleteDialogOpen(false);
  };

  return (
    <div className="space-y-8 py-8">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
          <Building className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary">
          Gestión de Empresas
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Administre las empresas clientes que tienen acceso al sistema Asistente ACR.
        </p>
      </header>

      <Card className="max-w-4xl mx-auto shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Building className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Listado de Empresas</CardTitle>
            </div>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" onClick={() => { resetAddForm(); setIsAddDialogOpen(true); }} disabled={isLoading}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Añadir Nueva Empresa
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Añadir Nueva Empresa</DialogTitle>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="add-company-name">Nombre Empresa <span className="text-destructive">*</span></Label>
                    <Input id="add-company-name" value={newCompanyName} onChange={(e) => setNewCompanyName(e.target.value)} placeholder="Nombre de la empresa" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-company-rut">RUT Empresa <span className="text-destructive">*</span></Label>
                    <Input id="add-company-rut" value={newCompanyRut} onChange={(e) => setNewCompanyRut(e.target.value)} placeholder="Ej: 76.123.456-7" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-admin-name">Nombre Administrador <span className="text-destructive">*</span></Label>
                    <Input id="add-admin-name" value={newCompanyAdminName} onChange={(e) => setNewCompanyAdminName(e.target.value)} placeholder="Nombre del contacto principal" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="add-admin-email">Correo Administrador <span className="text-destructive">*</span></Label>
                    <Input id="add-admin-email" type="email" value={newCompanyAdminEmail} onChange={(e) => setNewCompanyAdminEmail(e.target.value)} placeholder="admin@empresa.com" />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline" onClick={() => setIsAddDialogOpen(false)} disabled={isSubmitting}>Cancelar</Button>
                  </DialogClose>
                  <Button type="button" onClick={handleAddCompany} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Guardar Empresa
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Cargando empresas...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[25%]">Nombre Empresa</TableHead>
                    <TableHead className="w-[15%]">RUT</TableHead>
                    <TableHead className="w-[25%]">Administrador</TableHead>
                    <TableHead className="w-[25%]">Correo Administrador</TableHead>
                    <TableHead className="w-[10%] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {companies.length > 0 ? (
                    companies.map((company) => (
                      <TableRow key={company.id}>
                        <TableCell className="font-medium">{company.name}</TableCell>
                        <TableCell>{company.rut}</TableCell>
                        <TableCell>{company.adminName}</TableCell>
                        <TableCell>{company.adminEmail}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="mr-2 hover:text-primary" onClick={() => openEditDialog(company)} disabled={isSubmitting}>
                            <Edit2 className="h-4 w-4" /><span className="sr-only">Editar</span>
                          </Button>
                          <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => openDeleteDialog(company)} disabled={isSubmitting}>
                            <Trash2 className="h-4 w-4" /><span className="sr-only">Eliminar</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                        No hay empresas registradas. Puede añadir una usando el botón de arriba.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {companies.length > 0 && !isLoading && (
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              Actualmente gestionando {companies.length} empresa(s).
            </p>
          </CardFooter>
        )}
      </Card>
      
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Editar Empresa</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-company-name">Nombre Empresa <span className="text-destructive">*</span></Label>
              <Input id="edit-company-name" value={editCompanyName} onChange={(e) => setEditCompanyName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-company-rut">RUT Empresa <span className="text-destructive">*</span></Label>
              <Input id="edit-company-rut" value={editCompanyRut} onChange={(e) => setEditCompanyRut(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-admin-name">Nombre Administrador <span className="text-destructive">*</span></Label>
              <Input id="edit-admin-name" value={editCompanyAdminName} onChange={(e) => setEditCompanyAdminName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-admin-email">Correo Administrador <span className="text-destructive">*</span></Label>
              <Input id="edit-admin-email" type="email" value={editCompanyAdminEmail} onChange={(e) => setEditCompanyAdminEmail(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => { resetEditForm(); setIsEditDialogOpen(false); }} disabled={isSubmitting}>Cancelar</Button>
            </DialogClose>
            <Button type="button" onClick={handleUpdateCompany} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Eliminación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea eliminar la empresa "{companyToDelete?.name}"? Esta acción no se puede deshacer y podría afectar a los usuarios y sitios asociados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCompanyToDelete(null)} disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteCompany} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
