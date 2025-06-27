
'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Globe, PlusCircle, Edit2, Trash2, FileUp, FileDown, MapPin, Loader2, Building } from 'lucide-react'; // Added Building icon
import { useToast } from "@/hooks/use-toast";
import { db } from '@/lib/firebase'; 
import { collection, getDocs, addDoc, doc, updateDoc, deleteDoc, query, orderBy, writeBatch } from "firebase/firestore";
import type { Site } from '@/types/rca';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

const expectedSiteHeaders = ["Nombre del Sitio", "Dirección", "País", "Coordinador del Sitio", "Descripción Adicional", "Empresa"];

const countryOptions = [
  { value: "Afganistán", label: "Afganistán" },
  { value: "Albania", label: "Albania" },
  { value: "Alemania", label: "Alemania" },
  { value: "Andorra", label: "Andorra" },
  { value: "Angola", label: "Angola" },
  { value: "Antigua y Barbuda", label: "Antigua y Barbuda" },
  { value: "Arabia Saudita", label: "Arabia Saudita" },
  { value: "Argelia", label: "Argelia" },
  { value: "Argentina", label: "Argentina" },
  { value: "Armenia", label: "Armenia" },
  { value: "Australia", label: "Australia" },
  { value: "Austria", label: "Austria" },
  { value: "Azerbaiyán", label: "Azerbaiyán" },
  { value: "Bahamas", label: "Bahamas" },
  { value: "Bangladés", label: "Bangladés" },
  { value: "Barbados", label: "Barbados" },
  { value: "Baréin", label: "Baréin" },
  { value: "Bélgica", label: "Bélgica" },
  { value: "Belice", label: "Belice" },
  { value: "Benín", label: "Benín" },
  { value: "Bielorrusia", label: "Bielorrusia" },
  { value: "Birmania", label: "Birmania" },
  { value: "Bolivia", label: "Bolivia" },
  { value: "Bosnia y Herzegovina", label: "Bosnia y Herzegovina" },
  { value: "Botsuana", label: "Botsuana" },
  { value: "Brasil", label: "Brasil" },
  { value: "Brunéi", label: "Brunéi" },
  { value: "Bulgaria", label: "Bulgaria" },
  { value: "Burkina Faso", label: "Burkina Faso" },
  { value: "Burundi", label: "Burundi" },
  { value: "Bután", label: "Bután" },
  { value: "Cabo Verde", label: "Cabo Verde" },
  { value: "Camboya", label: "Camboya" },
  { value: "Camerún", label: "Camerún" },
  { value: "Canadá", label: "Canadá" },
  { value: "Catar", label: "Catar" },
  { value: "Chad", label: "Chad" },
  { value: "Chile", label: "Chile" },
  { value: "China", label: "China" },
  { value: "Chipre", label: "Chipre" },
  { value: "Ciudad del Vaticano", label: "Ciudad del Vaticano" },
  { value: "Colombia", label: "Colombia" },
  { value: "Comoras", label: "Comoras" },
  { value: "Corea del Norte", label: "Corea del Norte" },
  { value: "Corea del Sur", label: "Corea del Sur" },
  { value: "Costa de Marfil", label: "Costa de Marfil" },
  { value: "Costa Rica", label: "Costa Rica" },
  { value: "Croacia", label: "Croacia" },
  { value: "Cuba", label: "Cuba" },
  { value: "Dinamarca", label: "Dinamarca" },
  { value: "Dominica", label: "Dominica" },
  { value: "Ecuador", label: "Ecuador" },
  { value: "Egipto", label: "Egipto" },
  { value: "El Salvador", label: "El Salvador" },
  { value: "Emiratos Árabes Unidos", label: "Emiratos Árabes Unidos" },
  { value: "Eritrea", label: "Eritrea" },
  { value: "Eslovaquia", label: "Eslovaquia" },
  { value: "Eslovenia", label: "Eslovenia" },
  { value: "España", label: "España" },
  { value: "Estados Unidos", label: "Estados Unidos" },
  { value: "Estonia", label: "Estonia" },
  { value: "Etiopía", label: "Etiopía" },
  { value: "Filipinas", label: "Filipinas" },
  { value: "Finlandia", label: "Finlandia" },
  { value: "Fiyi", label: "Fiyi" },
  { value: "Francia", label: "Francia" },
  { value: "Gabón", label: "Gabón" },
  { value: "Gambia", label: "Gambia" },
  { value: "Georgia", label: "Georgia" },
  { value: "Ghana", label: "Ghana" },
  { value: "Granada", label: "Granada" },
  { value: "Grecia", label: "Grecia" },
  { value: "Guatemala", label: "Guatemala" },
  { value: "Guinea", label: "Guinea" },
  { value: "Guinea-Bisáu", label: "Guinea-Bisáu" },
  { value: "Guinea Ecuatorial", label: "Guinea Ecuatorial" },
  { value: "Guyana", label: "Guyana" },
  { value: "Haití", label: "Haití" },
  { value: "Honduras", label: "Honduras" },
  { value: "Hungría", label: "Hungría" },
  { value: "India", label: "India" },
  { value: "Indonesia", label: "Indonesia" },
  { value: "Irak", label: "Irak" },
  { value: "Irán", label: "Irán" },
  { value: "Irlanda", label: "Irlanda" },
  { value: "Islandia", label: "Islandia" },
  { value: "Islas Marshall", label: "Islas Marshall" },
  { value: "Islas Salomón", label: "Islas Salomón" },
  { value: "Israel", label: "Israel" },
  { value: "Italia", label: "Italia" },
  { value: "Jamaica", label: "Jamaica" },
  { value: "Japón", label: "Japón" },
  { value: "Jordania", label: "Jordania" },
  { value: "Kazajistán", label: "Kazajistán" },
  { value: "Kenia", label: "Kenia" },
  { value: "Kirguistán", label: "Kirguistán" },
  { value: "Kiribati", label: "Kiribati" },
  { value: "Kuwait", label: "Kuwait" },
  { value: "Laos", label: "Laos" },
  { value: "Lesoto", label: "Lesoto" },
  { value: "Letonia", label: "Letonia" },
  { value: "Líbano", label: "Líbano" },
  { value: "Liberia", label: "Liberia" },
  { value: "Libia", label: "Libia" },
  { value: "Liechtenstein", label: "Liechtenstein" },
  { value: "Lituania", label: "Lituania" },
  { value: "Luxemburgo", label: "Luxemburgo" },
  { value: "Madagascar", label: "Madagascar" },
  { value: "Malasia", label: "Malasia" },
  { value: "Malaui", label: "Malaui" },
  { value: "Maldivas", label: "Maldivas" },
  { value: "Malí", label: "Malí" },
  { value: "Malta", label: "Malta" },
  { value: "Marruecos", label: "Marruecos" },
  { value: "Mauricio", label: "Mauricio" },
  { value: "Mauritania", label: "Mauritania" },
  { value: "México", label: "México" },
  { value: "Micronesia", label: "Micronesia" },
  { value: "Moldavia", label: "Moldavia" },
  { value: "Mónaco", label: "Mónaco" },
  { value: "Mongolia", label: "Mongolia" },
  { value: "Montenegro", label: "Montenegro" },
  { value: "Mozambique", label: "Mozambique" },
  { value: "Namibia", label: "Namibia" },
  { value: "Nauru", label: "Nauru" },
  { value: "Nepal", label: "Nepal" },
  { value: "Nicaragua", label: "Nicaragua" },
  { value: "Níger", label: "Níger" },
  { value: "Nigeria", label: "Nigeria" },
  { value: "Noruega", label: "Noruega" },
  { value: "Nueva Zelanda", label: "Nueva Zelanda" },
  { value: "Omán", label: "Omán" },
  { value: "Países Bajos", label: "Países Bajos" },
  { value: "Pakistán", label: "Pakistán" },
  { value: "Palaos", label: "Palaos" },
  { value: "Panamá", label: "Panamá" },
  { value: "Papúa Nueva Guinea", label: "Papúa Nueva Guinea" },
  { value: "Paraguay", label: "Paraguay" },
  { value: "Perú", label: "Perú" },
  { value: "Polonia", label: "Polonia" },
  { value: "Portugal", label: "Portugal" },
  { value: "Reino Unido", label: "Reino Unido" },
  { value: "República Centroafricana", label: "República Centroafricana" },
  { value: "República Checa", label: "República Checa" },
  { value: "República de Macedonia", label: "República de Macedonia" },
  { value: "República del Congo", label: "República del Congo" },
  { value: "República Democrática del Congo", label: "República Democrática del Congo" },
  { value: "República Dominicana", label: "República Dominicana" },
  { value: "República Sudafricana", label: "República Sudafricana" },
  { value: "Ruanda", label: "Ruanda" },
  { value: "Rumanía", label: "Rumanía" },
  { value: "Rusia", label: "Rusia" },
  { value: "Samoa", label: "Samoa" },
  { value: "San Cristóbal y Nieves", label: "San Cristóbal y Nieves" },
  { value: "San Marino", label: "San Marino" },
  { value: "Santa Lucía", label: "Santa Lucía" },
  { value: "Santo Tomé y Príncipe", label: "Santo Tomé y Príncipe" },
  { value: "San Vicente y las Granadinas", label: "San Vicente y las Granadinas" },
  { value: "Senegal", label: "Senegal" },
  { value: "Serbia", label: "Serbia" },
  { value: "Seychelles", label: "Seychelles" },
  { value: "Sierra Leona", label: "Sierra Leona" },
  { value: "Singapur", label: "Singapur" },
  { value: "Siria", label: "Siria" },
  { value: "Somalia", label: "Somalia" },
  { value: "Sri Lanka", label: "Sri Lanka" },
  { value: "Suazilandia", label: "Suazilandia" },
  { value: "Sudán", label: "Sudán" },
  { value: "Sudán del Sur", label: "Sudán del Sur" },
  { value: "Suecia", label: "Suecia" },
  { value: "Suiza", label: "Suiza" },
  { value: "Surinam", label: "Surinam" },
  { value: "Tailandia", label: "Tailandia" },
  { value: "Tanzania", label: "Tanzania" },
  { value: "Tayikistán", label: "Tayikistán" },
  { value: "Timor Oriental", label: "Timor Oriental" },
  { value: "Togo", label: "Togo" },
  { value: "Tonga", label: "Tonga" },
  { value: "Trinidad y Tobago", label: "Trinidad y Tobago" },
  { value: "Túnez", label: "Túnez" },
  { value: "Turkmenistán", label: "Turkmenistán" },
  { value: "Turquía", label: "Turquía" },
  { value: "Tuvalu", label: "Tuvalu" },
  { value: "Ucrania", label: "Ucrania" },
  { value: "Uganda", label: "Uganda" },
  { value: "Uruguay", label: "Uruguay" },
  { value: "Uzbekistán", label: "Uzbekistán" },
  { value: "Vanuatu", label: "Vanuatu" },
  { value: "Venezuela", label: "Venezuela" },
  { value: "Vietnam", label: "Vietnam" },
  { value: "Yemen", label: "Yemen" },
  { value: "Yibuti", label: "Yibuti" },
  { value: "Zambia", label: "Zambia" },
  { value: "Zimbabue", label: "Zimbabue" },
].sort((a, b) => a.label.localeCompare(b.label));


export default function ConfiguracionSitiosPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false); 
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isAddSiteDialogOpen, setIsAddSiteDialogOpen] = useState(false);
  const [newSiteName, setNewSiteName] = useState('');
  const [newSiteAddress, setNewSiteAddress] = useState('');
  const [newSiteCountry, setNewSiteCountry] = useState('');
  const [newSiteCoordinator, setNewSiteCoordinator] = useState('');
  const [newSiteDescription, setNewSiteDescription] = useState('');
  const [newSiteEmpresa, setNewSiteEmpresa] = useState(''); // New state for company

  const [isEditSiteDialogOpen, setIsEditSiteDialogOpen] = useState(false);
  const [currentSiteToEdit, setCurrentSiteToEdit] = useState<Site | null>(null);
  const [editSiteName, setEditSiteName] = useState('');
  const [editSiteAddress, setEditSiteAddress] = useState('');
  const [editSiteCountry, setEditSiteCountry] = useState('');
  const [editSiteCoordinator, setEditSiteCoordinator] = useState('');
  const [editSiteDescription, setEditSiteDescription] = useState('');
  const [editSiteEmpresa, setEditSiteEmpresa] = useState(''); // New state for company

  const [isDeleteSiteConfirmOpen, setIsDeleteSiteConfirmOpen] = useState(false);
  const [siteToDelete, setSiteToDelete] = useState<Site | null>(null);

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
      toast({ title: "Error al Cargar Sitios", description: "No se pudieron cargar los sitios desde Firestore.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSites();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resetNewSiteForm = () => {
    setNewSiteName('');
    setNewSiteAddress('');
    setNewSiteCountry('');
    setNewSiteCoordinator('');
    setNewSiteDescription('');
    setNewSiteEmpresa(''); // Reset company
  };

  const resetEditSiteForm = () => {
    setCurrentSiteToEdit(null);
    setEditSiteName('');
    setEditSiteAddress('');
    setEditSiteCountry('');
    setEditSiteCoordinator('');
    setEditSiteDescription('');
    setEditSiteEmpresa(''); // Reset company
  };

  const handleAddSite = async () => {
    if (!newSiteName.trim()) {
      toast({ title: "Error de Validación", description: "El nombre del sitio es obligatorio.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const newSiteData: Omit<Site, 'id'> = {
      name: newSiteName.trim(),
      address: newSiteAddress.trim(),
      country: newSiteCountry.trim(),
      coordinator: newSiteCoordinator.trim(),
      description: newSiteDescription.trim(),
      empresa: newSiteEmpresa.trim() || undefined, // Add company, make undefined if empty
    };
    try {
      await addDoc(collection(db, "sites"), newSiteData);
      toast({ title: "Sitio Añadido", description: `El sitio "${newSiteData.name}" ha sido añadido con éxito.` });
      resetNewSiteForm();
      setIsAddSiteDialogOpen(false);
      fetchSites(); // Re-fetch
    } catch (error) {
      console.error("Error adding site to Firestore: ", error);
      toast({ title: "Error al Añadir Sitio", description: "No se pudo añadir el sitio.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditSiteDialog = (site: Site) => {
    setCurrentSiteToEdit(site);
    setEditSiteName(site.name);
    setEditSiteAddress(site.address);
    setEditSiteCountry(site.country);
    setEditSiteCoordinator(site.coordinator || '');
    setEditSiteDescription(site.description || '');
    setEditSiteEmpresa(site.empresa || ''); // Set company
    setIsEditSiteDialogOpen(true);
  };

  const handleUpdateSite = async () => {
    if (!currentSiteToEdit) return;
    if (!editSiteName.trim()) {
      toast({ title: "Error de Validación", description: "El nombre del sitio es obligatorio.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const updatedSiteData: Omit<Site, 'id'> = {
      name: editSiteName.trim(),
      address: editSiteAddress.trim(),
      country: editSiteCountry.trim(),
      coordinator: editSiteCoordinator.trim(),
      description: editSiteDescription.trim(),
      empresa: editSiteEmpresa.trim() || undefined, // Add company, make undefined if empty
    };
    try {
      const siteRef = doc(db, "sites", currentSiteToEdit.id);
      await updateDoc(siteRef, updatedSiteData);
      toast({ title: "Sitio Actualizado", description: `El sitio "${updatedSiteData.name}" ha sido actualizado.` });
      resetEditSiteForm();
      setIsEditSiteDialogOpen(false);
      fetchSites(); // Re-fetch
    } catch (error) {
      console.error("Error updating site in Firestore: ", error);
      toast({ title: "Error al Actualizar", description: "No se pudo actualizar el sitio.", variant: "destructive" });
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
        toast({ title: "Sitio Eliminado", description: `El sitio "${siteToDelete.name}" ha sido eliminado.`, variant: 'destructive' });
        setSiteToDelete(null);
        fetchSites(); // Re-fetch
      } catch (error) {
        console.error("Error deleting site from Firestore: ", error);
        toast({ title: "Error al Eliminar", description: "No se pudo eliminar el sitio.", variant: "destructive" });
      } finally {
        setIsSubmitting(false);
      }
    }
    setIsDeleteSiteConfirmOpen(false);
  };

  const handleSiteExcelExport = () => {
    if (sites.length === 0) {
      toast({ title: "Sin Datos", description: "No hay sitios para exportar.", variant: "default" });
      return;
    }
    const dataToExport = sites.map(site => ({
      "Nombre del Sitio": site.name,
      "Dirección": site.address,
      "País": site.country,
      "Coordinador del Sitio": site.coordinator || '',
      "Descripción Adicional": site.description || '',
      "Empresa": site.empresa || '', // Export company
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sitios");
    worksheet['!cols'] = [ { wch: 30 }, { wch: 40 }, { wch: 20 }, { wch: 25 }, { wch: 40 }, { wch: 25 } ]; // Adjust widths
    
    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const dataBlob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    const fileName = `Sitios_RCA_Assistant_${new Date().toISOString().split('T')[0]}.xlsx`;
    saveAs(dataBlob, fileName);
    toast({ title: "Exportación Iniciada", description: `El archivo ${fileName} ha comenzado a descargarse.` });
  };

  const handleTriggerSiteFileInput = () => {
    fileInputRef.current?.click();
  };

  const handleSiteExcelImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
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
        if (!headers.includes("Nombre del Sitio")) {
            toast({ title: "Cabecera Faltante", description: `Falta la cabecera obligatoria: "Nombre del Sitio". Por favor, use la plantilla correcta.`, variant: "destructive", duration: 7000 });
            setIsImporting(false);
            if(fileInputRef.current) fileInputRef.current.value = "";
            return;
        }

        let importedCount = 0;
        let skippedCount = 0;
        const batch = writeBatch(db);
        let operationsInBatch = 0;

        for (const row of jsonData) {
          const name = row["Nombre del Sitio"]?.trim();
          if (!name) {
            skippedCount++;
            continue;
          }
          
          const country = row["País"]?.trim() || '';

          const newSite: Omit<Site, 'id'> = {
            name,
            address: row["Dirección"]?.trim() || '',
            country: country,
            coordinator: row["Coordinador del Sitio"]?.trim() || '',
            description: row["Descripción Adicional"]?.trim() || '',
            empresa: row["Empresa"]?.trim() || undefined, // Import company
          };
          
          const siteRef = doc(collection(db, "sites"));
          batch.set(siteRef, newSite);
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
        
        toast({ title: "Importación Completada", description: `${importedCount} sitios importados. ${skippedCount} filas omitidas.` });
        fetchSites(); // Refresh
      } catch (error) {
        console.error("Error importing sites: ", error);
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

  const getGoogleMapsLink = (address: string) => {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
  };

  return (
    <div className="space-y-8 py-8">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleSiteExcelImport} 
        accept=".xlsx, .xls" 
        style={{ display: 'none' }} 
      />
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

      <Card className="max-w-5xl mx-auto shadow-lg"> {/* Increased max-width for new column */}
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Globe className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">Listado de Sitios</CardTitle>
            </div>
            <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={handleTriggerSiteFileInput} disabled={isImporting || isLoading}>
                    {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                    Importar Excel
                </Button>
                <Button variant="outline" onClick={handleSiteExcelExport} disabled={isLoading || sites.length === 0}>
                    <FileDown className="mr-2 h-4 w-4" />
                    Exportar Excel
                </Button>
                <Dialog open={isAddSiteDialogOpen} onOpenChange={setIsAddSiteDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default" onClick={() => { resetNewSiteForm(); setIsAddSiteDialogOpen(true); }} disabled={isLoading}>
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
                        <Label htmlFor="add-site-name" className="text-right">Nombre <span className="text-destructive">*</span></Label>
                        <Input id="add-site-name" value={newSiteName} onChange={(e) => setNewSiteName(e.target.value)} className="col-span-3" placeholder="Ej: Planta Principal" />
                      </div>
                       <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="add-site-empresa" className="text-right">Empresa</Label>
                        <Input id="add-site-empresa" value={newSiteEmpresa} onChange={(e) => setNewSiteEmpresa(e.target.value)} className="col-span-3" placeholder="Nombre de la empresa" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="add-site-address" className="text-right">Dirección</Label>
                        <Input id="add-site-address" value={newSiteAddress} onChange={(e) => setNewSiteAddress(e.target.value)} className="col-span-3" placeholder="Ej: Calle Falsa 123, Ciudad" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="add-site-country" className="text-right">País</Label>
                        <Select value={newSiteCountry} onValueChange={(value) => setNewSiteCountry(value)}>
                            <SelectTrigger id="add-site-country" className="col-span-3">
                                <SelectValue placeholder="-- Seleccione un país --" />
                            </SelectTrigger>
                            <SelectContent>
                                {countryOptions.map(country => (
                                    <SelectItem key={country.value} value={country.value}>{country.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="add-site-coordinator" className="text-right">Coordinador</Label>
                        <Input id="add-site-coordinator" value={newSiteCoordinator} onChange={(e) => setNewSiteCoordinator(e.target.value)} className="col-span-3" placeholder="Nombre del coordinador" />
                      </div>
                      <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="add-site-description" className="text-right">Descripción</Label>
                        <Textarea id="add-site-description" value={newSiteDescription} onChange={(e) => setNewSiteDescription(e.target.value)} className="col-span-3" placeholder="Notas adicionales (opcional)" />
                      </div>
                    </div>
                    <DialogFooter>
                      <DialogClose asChild>
                        <Button type="button" variant="outline" onClick={() => setIsAddSiteDialogOpen(false)} disabled={isSubmitting}>Cancelar</Button>
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
            Visualice, añada, edite o elimine sitios registrados en el sistema.
            <span className="block text-xs mt-1">Plantilla Importación: Columnas requeridas - {expectedSiteHeaders[0]}. Opcionales: {expectedSiteHeaders.slice(1).join(', ')}.</span>
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
                  <TableRow><TableHead className="w-[20%]">Nombre</TableHead><TableHead className="w-[20%]">Empresa</TableHead><TableHead className="w-[25%]">Dirección</TableHead><TableHead className="w-[15%]">País</TableHead><TableHead className="w-[20%] text-right">Acciones</TableHead></TableRow>
                </TableHeader>
                <TableBody>
                  {sites.length > 0 ? (
                    sites.map((site) => (
                      <TableRow key={site.id}><TableCell className="font-medium">{site.name}</TableCell><TableCell>{site.empresa || '-'}</TableCell><TableCell>
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
                        </TableCell><TableCell>{site.country || '-'}</TableCell><TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="mr-2 hover:text-primary" onClick={() => openEditSiteDialog(site)} disabled={isSubmitting}>
                            <Edit2 className="h-4 w-4" />
                            <span className="sr-only">Editar</span>
                          </Button>
                          <Button variant="ghost" size="icon" className="hover:text-destructive" onClick={() => openDeleteSiteDialog(site)} disabled={isSubmitting}>
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Eliminar</span>
                          </Button>
                        </TableCell></TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground h-24">
                        No hay sitios registrados. Puede añadir uno usando el botón de arriba o importando desde Excel.
                      </TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
         {sites.length > 0 && !isLoading && ( 
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              Actualmente gestionando {sites.length} sitio(s) desde Firestore.
            </p>
          </CardFooter>
        )}
      </Card>

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
              <Label htmlFor="edit-site-empresa" className="text-right">Empresa</Label>
              <Input id="edit-site-empresa" value={editSiteEmpresa} onChange={(e) => setEditSiteEmpresa(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-site-address" className="text-right">Dirección</Label>
              <Input id="edit-site-address" value={editSiteAddress} onChange={(e) => setEditSiteAddress(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-site-country" className="text-right">País</Label>
                <Select value={editSiteCountry || ''} onValueChange={(value) => setEditSiteCountry(value)}>
                    <SelectTrigger id="edit-site-country" className="col-span-3">
                        <SelectValue placeholder="-- Seleccione un país --" />
                    </SelectTrigger>
                    <SelectContent>
                        {countryOptions.map(country => (
                            <SelectItem key={country.value} value={country.value}>{country.label}</SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-site-coordinator" className="text-right">Coordinador</Label>
              <Input id="edit-site-coordinator" value={editSiteCoordinator || ''} onChange={(e) => setEditSiteCoordinator(e.target.value)} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="edit-site-description" className="text-right">Descripción</Label>
              <Textarea id="edit-site-description" value={editSiteDescription || ''} onChange={(e) => setEditSiteDescription(e.target.value)} className="col-span-3" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={() => { resetEditSiteForm(); setIsEditSiteDialogOpen(false); }} disabled={isSubmitting}>Cancelar</Button>
            </DialogClose>
            <Button type="button" onClick={handleUpdateSite} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar Cambios
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
