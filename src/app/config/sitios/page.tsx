
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
import { Globe, PlusCircle, Edit2, Trash2, FileUp, FileDown } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";

interface Site {
  id: string;
  name: string;
  address: string;
  zone: string;
  coordinator?: string;
  description?: string;
}

const initialSites: Site[] = [
  { id: '1', name: 'Planta Industrial', address: 'Calle 10, Madrid', zone: 'Norte', coordinator: 'Juan Pérez', description: 'Planta principal de producción.' },
  { id: '2', name: 'Centro Logístico', address: 'Avda. 5, Barcelona', zone: 'Sur', coordinator: 'Ana García', description: 'Almacén y distribución.' },
];

const geographicalZones = ['Norte', 'Sur', 'Este', 'Oeste', 'Centro', 'Noreste', 'Noroeste', 'Sureste', 'Suroeste'];

export default function ConfiguracionSitiosPage() {
  const [sites, setSites] = useState<Site[]>(initialSites);
  const { toast } = useToast();

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

  const handleAddSite = () => {
    if (!newSiteName.trim()) {
      toast({ title: "Error", description: "El nombre del sitio es obligatorio.", variant: "destructive" });
      return;
    }
    const newSite: Site = {
      id: (Date.now()).toString(), // More unique ID
      name: newSiteName,
      address: newSiteAddress,
      zone: newSiteZone,
      coordinator: newSiteCoordinator,
      description: newSiteDescription,
    };
    setSites([...sites, newSite]);
    toast({ title: "Sitio Añadido", description: `El sitio "${newSite.name}" ha sido añadido.` });
    resetNewSiteForm();
    setIsAddSiteDialogOpen(false);
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

  const handleUpdateSite = () => {
    if (!currentSiteToEdit) return;
    if (!editSiteName.trim()) {
      toast({ title: "Error", description: "El nombre del sitio es obligatorio.", variant: "destructive" });
      return;
    }
    
    setSites(sites.map(s => s.id === currentSiteToEdit.id ? {
      ...s,
      name: editSiteName,
      address: editSiteAddress,
      zone: editSiteZone,
      coordinator: editSiteCoordinator,
      description: editSiteDescription,
    } : s));
    toast({ title: "Sitio Actualizado", description: `El sitio "${editSiteName}" ha sido actualizado.` });
    resetEditSiteForm();
    setIsEditSiteDialogOpen(false);
  };

  const openDeleteSiteDialog = (site: Site) => {
    setSiteToDelete(site);
    setIsDeleteSiteConfirmOpen(true);
  };

  const confirmDeleteSite = () => {
    if (siteToDelete) {
      setSites(sites.filter(s => s.id !== siteToDelete.id));
      toast({ title: "Sitio Eliminado", description: `El sitio "${siteToDelete.name}" ha sido eliminado.`, variant: 'destructive' });
      setSiteToDelete(null);
    }
    setIsDeleteSiteConfirmOpen(false);
  };

  const handleSiteExcelImport = () => {
    toast({ title: "Funcionalidad no implementada", description: "La importación desde Excel aún no está disponible." });
  };

  const handleSiteExcelExport = () => {
    toast({ title: "Funcionalidad no implementada", description: "La exportación a Excel aún no está disponible." });
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
                        <Label htmlFor="site-zone" className="text-right">Zona</Label>
                        <Select value={newSiteZone} onValueChange={setNewSiteZone}>
                          <SelectTrigger className="col-span-3">
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
                      <Button type="button" onClick={handleAddSite}>Guardar Sitio</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
            </div>
          </div>
          <CardDescription>
            Visualice, añada, edite o elimine sitios registrados en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
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
                      <TableCell>{site.address}</TableCell>
                      <TableCell>{site.zone}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="mr-2 hover:text-primary" onClick={() => openEditSiteDialog(site)}>
                          <Edit2 className="h-4 w-4" />
                          <span className="sr-only">Editar</span>
                        </Button>
                        <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => openDeleteSiteDialog(site)}>
                          <Trash2 className="h-4 w-4" />
                           <span className="sr-only">Eliminar</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-muted-foreground h-24">
                      No hay sitios registrados.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
         {sites.length > 0 && (
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              La importación/exportación desde Excel no está implementada en esta maqueta.
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
              <Label htmlFor="edit-site-zone" className="text-right">Zona</Label>
              <Select value={editSiteZone} onValueChange={setEditSiteZone}>
                <SelectTrigger className="col-span-3">
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
            <Button type="button" onClick={handleUpdateSite}>Guardar Cambios</Button>
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
            <AlertDialogCancel onClick={() => setSiteToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSite} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">Eliminar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}


    