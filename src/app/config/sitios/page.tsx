
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Globe, PlusCircle, Edit3 } from 'lucide-react';
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
  { id: '1', name: 'Planta Industrial', address: 'Calle 10, Madrid', zone: 'Norte' },
  { id: '2', name: 'Centro Logístico', address: 'Avda. 5, Barcelona', zone: 'Sur' },
];

const geographicalZones = ['Norte', 'Sur', 'Este', 'Oeste', 'Centro'];

export default function ConfiguracionSitiosPage() {
  const [sites, setSites] = useState<Site[]>(initialSites);
  const [isAddSiteDialogOpen, setIsAddSiteDialogOpen] = useState(false);
  const { toast } = useToast();

  // Form state for new site
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteAddress, setNewSiteAddress] = useState('');
  const [newSiteZone, setNewSiteZone] = useState('');
  const [newSiteCoordinator, setNewSiteCoordinator] = useState('');
  const [newSiteDescription, setNewSiteDescription] = useState('');

  const handleAddSite = () => {
    if (!newSiteName.trim()) {
      toast({ title: "Error", description: "El nombre del sitio es obligatorio.", variant: "destructive" });
      return;
    }
    const newSite: Site = {
      id: (sites.length + 1).toString(),
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

  const resetNewSiteForm = () => {
    setNewSiteName('');
    setNewSiteAddress('');
    setNewSiteZone('');
    setNewSiteCoordinator('');
    setNewSiteDescription('');
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
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Globe className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Listado de Sitios</CardTitle>
            </div>
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
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="site-name" className="text-right">Nombre del Sitio <span className="text-destructive">*</span></Label>
                    <Input id="site-name" value={newSiteName} onChange={(e) => setNewSiteName(e.target.value)} className="col-span-3" placeholder="Ej: Planta Principal" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="site-address" className="text-right">Dirección Completa</Label>
                    <Input id="site-address" value={newSiteAddress} onChange={(e) => setNewSiteAddress(e.target.value)} className="col-span-3" placeholder="Ej: Calle Falsa 123, Ciudad" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="site-zone" className="text-right">Zona Geográfica</Label>
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
                    <Input id="site-coordinator" value={newSiteCoordinator} onChange={(e) => setNewSiteCoordinator(e.target.value)} className="col-span-3" placeholder="Seleccionar o escribir nombre" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="site-description" className="text-right">Descripción</Label>
                    <Textarea id="site-description" value={newSiteDescription} onChange={(e) => setNewSiteDescription(e.target.value)} className="col-span-3" placeholder="Notas adicionales sobre el sitio (opcional)" />
                  </div>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Cancelar</Button>
                  </DialogClose>
                  <Button type="button" onClick={handleAddSite}>Guardar Sitio</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
          <CardDescription>
            Visualice y gestione los sitios registrados en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[30%]">Nombre</TableHead>
                  <TableHead className="w-[45%]">Dirección</TableHead>
                  <TableHead className="w-[25%]">Zona</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.length > 0 ? (
                  sites.map((site) => (
                    <TableRow key={site.id}>
                      <TableCell className="font-medium">{site.name}</TableCell>
                      <TableCell>{site.address}</TableCell>
                      <TableCell>{site.zone}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground h-24">
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
              Actualmente, la edición y eliminación de sitios no está implementada en esta maqueta.
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
