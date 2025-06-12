
'use client';

import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Globe, PlusCircle, Edit2, Trash2, FileUp, FileDown, MapPin, Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase'; // Import Firestore instance
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy } from "firebase/firestore";

interface Site {
  id: string; // Firestore document ID
  name: string;
  address: string;
  zone: string;
  coordinator?: string;
  description?: string;
}

const geographicalZones = ['Norte', 'Sur', 'Este', 'Oeste', 'Centro', 'Noreste', 'Noroeste', 'Sureste', 'Suroeste'];

export default function ConfiguracionSitiosPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); // For add/edit/delete operations

  // State for Add Site Dialog
  const [isAddSiteDialogOpen, setIsAddSiteDialogOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteAddress, setNewSiteAddress] = useState('');
  const [newSiteZone, setNewSiteZone] = useState('');
  const [newSiteCoordinator, setNewSiteCoordinator] = useState('');
  const [newSiteDescription, setNewSiteDescription] = useState('');

  // State for Edit Site Dialog
  const [isEditSiteDialogOpen, setIsEditSiteDialogOpen] = useState(false);
  const [currentSiteToEdit, setCurrentSiteToEdit] = useState<Site | null>(null);
  const [editSiteName, setEditSiteName] = useState('');
  const [editSiteAddress, setEditSiteAddress] = useState('');
  const [editSiteZone, setEditSiteZone] = useState('');
  const [editSiteCoordinator, setEditSiteCoordinator] = useState('');
  const [editSiteDescription, setEditSiteDescription] = useState('');

  // State for Delete Confirmation Dialog
  const [isDeleteSiteConfirmOpen, setIsDeleteSiteConfirmOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);

  // Fetch sites from Firestore
  useEffect(() => {
    const fetchSites = async () => {
      setIsLoading(true);
      try {
        const sitesCollectionRef = collection(db, "sites");
        const q = query(sitesCollectionRef, orderBy("name", "asc"));
        const querySnapshot = await getDocs(q);
        const sitesData = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Site));
        setSites(sitesData);
      } catch (error) {
        console.error("Error fetching sites: ", error);
        toast({ title: "Error al Cargar Sitios", description: "No se pudieron cargar los sitios desde Firestore. Verifique la consola para más detalles.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchSites();
  }, [toast]);

  const resetNewSiteForm = () => {
    setNewSiteName('');
    setNewSiteAddress('');
    setNewSiteZone('');
    setNewSiteCoordinator('');
    setNewSiteDescription('');
  };

  const resetEditSiteForm = () => {
    setCurrentSiteToEdit(null);
    setEditSiteName('');
    setEditSiteAddress('');
    setEditSiteZone('');
    setEditSiteCoordinator('');
    setEditSiteDescription('');
  };

  const handleAddSite = async () => {
    if (!newSiteName.trim()) {
      toast({ title: "Error de Validación", description: "El nombre del sitio es obligatorio.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const newSiteData = {
        name: newSiteName.trim(),
        address: newSiteAddress.trim(),
        zone: newSiteZone,
        coordinator: newSiteCoordinator.trim(),
        description: newSiteDescription.trim(),
      };
      const docRef = await addDoc(collection(db, "sites"), newSiteData);
      setSites(prevSites => [...prevSites, { id: docRef.id, ...newSiteData }].sort((a, b) => a.name.localeCompare(b.name)));
      toast({ title: "Sitio Añadido", description: `El sitio "${newSiteData.name}" ha sido añadido con éxito.` });
      resetNewSiteForm();
      setIsAddSiteDialogOpen(false);
    } catch (error) {
      console.error("Error adding site: ", error);
      toast({ title: "Error al Añadir Sitio", description: "No se pudo añadir el sitio. Verifique la consola.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditSiteDialog = (site: Site) => {
    setCurrentSiteToEdit(site);
    setEditSiteName(site.name);
    setEditSiteAddress(site.address);
    setEditSiteZone(site.zone);
    setEditSiteCoordinator(site.coordinator || '');
    setEditSiteDescription(site.description || '');
    setIsEditSiteDialogOpen(true);
  };

  const handleUpdateSite = async () => {
    if (!currentSiteToEdit) return;
    if (!editSiteName.trim()) {
      toast({ title: "Error de Validación", description: "El nombre del sitio es obligatorio.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const siteRef = doc(db, "sites", currentSiteToEdit.id);
      const updatedSiteData = {
        name: editSiteName.trim(),
        address: editSiteAddress.trim(),
        zone: editSiteZone,
        coordinator: editSiteCoordinator.trim(),
        description: editSiteDescription.trim(),
      };
      await updateDoc(siteRef, updatedSiteData);
      setSites(sites.map(s => s.id === currentSiteToEdit.id ? { ...s, ...updatedSiteData } : s).sort((a,b) => a.name.localeCompare(b.name)));
      toast({ title: "Sitio Actualizado", description: `El sitio "${updatedSiteData.name}" ha sido actualizado.` });
      resetEditSiteForm();
      setIsEditSiteDialogOpen(false);
    } catch (error) {
      console.error("Error updating site: ", error);
      toast({ title: "Error al Actualizar", description: "No se pudo actualizar el sitio. Verifique la consola.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteSiteDialog = (site: Site) => {
    setSiteToDelete(site);
    setIsDeleteSiteConfirmOpen(true);
  };

  const confirmDeleteSite = async () => {
    if (siteToDelete) {
      setIsSubmitting(true); 
      try {
        await deleteDoc(doc(db, "sites", siteToDelete.id));
        setSites(sites.filter(s => s.id !== siteToDelete.id));
        toast({ title: "Sitio Eliminado", description: `El sitio "${siteToDelete.name}" ha sido eliminado.`, variant: 'destructive' });
        setSiteToDelete(null);
      } catch (error) {
        console.error("Error deleting site: ", error);
        toast({ title: "Error al Eliminar", description: "No se pudo eliminar el sitio. Verifique la consola.", variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    }
    setIsDeleteSiteConfirmOpen(false);
  };

  const handleSiteExcelImport = () => {
    toast({ title: "Funcionalidad no implementada", description: "La importación desde Excel aún no está disponible." });
  };

  const handleSiteExcelExport = () => {
    toast({ title: "Funcionalidad no implementada", description: "La exportación a Excel aún no está disponible." });
  };

  const getGoogleMapsLink = (address: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  return (
    <div className="space-y-8 py-8">
      <header className="text-center space-y-2">
        <div className="inline-flex items-center justify-center bg-primary/10 text-primary p-3 rounded-full mb-4">
          <Globe className="h-10 w-10" />
        </div>
        <h1 className="text-4xl font-bold font-headline text-primary">
          Configuración de Sitios/Plantas
        </h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Administre los diferentes sitios, plantas o áreas de su organización.
        </p>
      </header>

      <Card className="max-w-4xl mx-auto shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Globe className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Listado de Sitios</CardTitle>
            </div>
            <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={handleSiteExcelImport}>
                    <FileUp className="mr-2 h-4 w-4" />
                    Importar Excel
                </Button>
                <Button variant="outline" onClick={handleSiteExcelExport}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Exportar Excel
                </Button>
                <Dialog open={isAddSiteDialogOpen} onOpenChange={setIsAddSiteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default" onClick={() => { resetNewSiteForm(); setIsAddSiteDialogOpen(true); }}>
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Añadir Nuevo Sitio
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[525px]">
                    <DialogHeader>
                      <DialogTitle>Añadir Nuevo Sitio</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="site-name" className="text-right">Nombre <span className="text-destructive">*</span></Label>
                        <Input id="site-name" value={newSiteName} onChange={(e) => setNewSiteName(e.target.value)} className="col-span-3" placeholder="Ej: Planta Principal" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="site-address" className="text-right">Dirección</Label>
                        <Input id="site-address" value={newSiteAddress} onChange={(e) => setNewSiteAddress(e.target.value)} className="col-span-3" placeholder="Ej: Calle Falsa 123, Ciudad" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="add-site-zone-trigger" className="text-right">Zona</Label>
                        <Select value={newSiteZone} onValueChange={setNewSiteZone}>
                          <SelectTrigger id="add-site-zone-trigger" className="col-span-3">
                            <SelectValue placeholder="-- Seleccione una zona --" />
                          </SelectTrigger>
                          <SelectContent>
                            {geographicalZones.map(zone => (
                              <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="site-coordinator" className="text-right">Coordinador</Label>
                        <Input id="site-coordinator" value={newSiteCoordinator} onChange={(e) => setNewSiteCoordinator(e.target.value)} className="col-span-3" placeholder="Nombre del coordinador" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="site-description" className="text-right">Descripción</Label>
                        <Textarea id="site-description" value={newSiteDescription} onChange={(e) => setNewSiteDescription(e.target.value)} className="col-span-3" placeholder="Notas adicionales (opcional)" />
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button type="button" variant="outline" onClick={() => setIsAddSiteDialogOpen(false)}>Cancelar</Button>
                      </DialogClose>
                      <Button type="button" onClick={handleAddSite} disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Sitio
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
            </div>
          </div>
          <CardDescription>
            Visualice, añada, edite o elimine sitios registrados en el sistema. Los datos se almacenan en Firestore.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="ml-2 text-muted-foreground">Cargando sitios...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[25%]">Nombre</TableHead>
                    <TableHead className="w-[35%]">Dirección</TableHead>
                    <TableHead className="w-[15%]">Zona</TableHead>
                    <TableHead className="w-[25%] text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sites.length > 0 ? (
                    sites.map((site) => (
                      <TableRow key={site.id}>
                        <TableCell className="font-medium">{site.name}</TableCell>
                        <TableCell>
                          {site.address ? (
                            <a
                              href={getGoogleMapsLink(site.address)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center hover:text-primary hover:underline"
                            >
                              <MapPin className="mr-1.5 h-4 w-4 flex-shrink-0" />
                              {site.address}
                            </a>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                        <TableCell>{site.zone}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="mr-2 hover:text-primary" onClick={() => openEditSiteDialog(site)} disabled={isSubmitting}>
                            <Edit2 className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => openDeleteSiteDialog(site)} disabled={isSubmitting}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Eliminar</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                        No hay sitios registrados. Puede añadir uno usando el botón de arriba.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
         {sites.length > 0 && !isLoading && ( 
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              Actualmente gestionando {sites.length} sitio(s) desde Firestore. La importación/exportación no está implementada.
            </p>
          </CardFooter>
        )}
      </Card>

      {/* Edit Site Dialog */}
      <Dialog open={isEditSiteDialogOpen} onOpenChange={setIsEditSiteDialogOpen}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Editar Sitio</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-site-name" className="text-right">Nombre <span className="text-destructive">*</span></Label>
              <Input id="edit-site-name" value={editSiteName} onChange={(e) => setEditSiteName(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-site-address" className="text-right">Dirección</Label>
              <Input id="edit-site-address" value={editSiteAddress} onChange={(e) => setEditSiteAddress(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-site-zone-trigger" className="text-right">Zona</Label>
              <Select value={editSiteZone} onValueChange={setEditSiteZone}>
                <SelectTrigger id="edit-site-zone-trigger" className="col-span-3">
                  <SelectValue placeholder="-- Seleccione una zona --" />
                </SelectTrigger>
                <SelectContent>
                  {geographicalZones.map(zone => (
                    <SelectItem key={zone} value={zone}>{zone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-site-coordinator" className="text-right">Coordinador</Label>
              <Input id="edit-site-coordinator" value={editSiteCoordinator} onChange={(e) => setEditSiteCoordinator(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-site-description" className="text-right">Descripción</Label>
              <Textarea id="edit-site-description" value={editSiteDescription} onChange={(e) => setEditSiteDescription(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => { resetEditSiteForm(); setIsEditSiteDialogOpen(false); }}>Cancelar</Button>
            </DialogClose>
            <Button type="button" onClick={handleUpdateSite} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Site Confirmation Dialog */}
      <AlertDialog open={isDeleteSiteConfirmOpen} onOpenChange={setIsDeleteSiteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Eliminación</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Está seguro de que desea eliminar el sitio "{siteToDelete?.name}"? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSiteToDelete(null)} disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSite} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}
    
