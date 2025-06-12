
'use client';
import type { FC, ChangeEvent } from 'react';
import { useState, useEffect, useMemo } from 'react';
import type { DetailedFacts, PreservedFact, PreservedFactCategory } from '@/types/rca';
import { PRESERVED_FACT_CATEGORIES } from '@/types/rca';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Calendar as CalendarIcon, PlusCircle, Trash2, FileText, Paperclip, UserCircle } from 'lucide-react';
import { format, parse, isValid } from 'date-fns';
import { es } from 'date-fns/locale';
import { useToast } from "@/hooks/use-toast";

interface Step2FactsProps {
  projectLeader: string;
  onProjectLeaderChange: (value: string) => void;
  availableUsers: Array<{ id: string; name: string; }>;
  detailedFacts: DetailedFacts;
  onDetailedFactChange: (field: keyof DetailedFacts, value: string) => void;
  analysisDetails: string;
  onAnalysisDetailsChange: (value: string) => void;
  preservedFacts: PreservedFact[];
  onAddPreservedFact: (fact: Omit<PreservedFact, 'id' | 'uploadDate' | 'eventId'>) => void;
  onRemovePreservedFact: (id: string) => void;
  onPrevious: () => void;
  onNext: () => void;
}

const PreservedFactDialog: FC<{
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (factData: Omit<PreservedFact, 'id' | 'uploadDate' | 'eventId'>) => void;
}> = ({ open, onOpenChange, onSave }) => {
  const [userGivenName, setUserGivenName] = useState('');
  const [category, setCategory] = useState<PreservedFactCategory | ''>('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    } else {
      setSelectedFile(null);
    }
  };

  const handleSubmit = () => {
    if (!userGivenName.trim()) {
      toast({ title: "Error", description: "El nombre del documento es obligatorio.", variant: "destructive" });
      return;
    }
    if (!category) {
      toast({ title: "Error", description: "La categoría es obligatoria.", variant: "destructive" });
      return;
    }

    onSave({
      userGivenName,
      category,
      description,
      fileName: selectedFile?.name || null,
      fileType: selectedFile?.type || null,
      fileSize: selectedFile?.size || null,
    });
    // Reset form and close dialog
    setUserGivenName('');
    setCategory('');
    setDescription('');
    setSelectedFile(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center"><Paperclip className="mr-2 h-5 w-5" />Añadir Hecho Preservado</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="pf-name" className="text-right">Nombre <span className="text-destructive">*</span></Label>
            <Input id="pf-name" value={userGivenName} onChange={(e) => setUserGivenName(e.target.value)} className="col-span-3" placeholder="Ej: Informe Técnico Bomba X" />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="pf-category" className="text-right">Categoría <span className="text-destructive">*</span></Label>
            <Select value={category} onValueChange={(value) => setCategory(value as PreservedFactCategory)}>
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="-- Seleccione una categoría --" />
              </SelectTrigger>
              <SelectContent>
                {PRESERVED_FACT_CATEGORIES.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="pf-file" className="text-right">Archivo</Label>
            <Input id="pf-file" type="file" onChange={handleFileChange} className="col-span-3" />
          </div>
          {selectedFile && (
            <div className="col-span-4 pl-[calc(25%+1rem)] text-xs text-muted-foreground">
              <p>Archivo: {selectedFile.name} ({selectedFile.type}, {(selectedFile.size / 1024).toFixed(2)} KB)</p>
            </div>
          )}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="pf-description" className="text-right">Descripción</Label>
            <Textarea id="pf-description" value={description} onChange={(e) => setDescription(e.target.value)} className="col-span-3" placeholder="Detalles adicionales sobre el hecho o documento..." />
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cancelar</Button>
          </DialogClose>
          <Button type="button" onClick={handleSubmit}>Guardar Hecho</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


export const Step2Facts: FC<Step2FactsProps> = ({
  projectLeader,
  onProjectLeaderChange,
  availableUsers,
  detailedFacts,
  onDetailedFactChange,
  analysisDetails,
  onAnalysisDetailsChange,
  preservedFacts,
  onAddPreservedFact,
  onRemovePreservedFact,
  onPrevious,
  onNext,
}) => {
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<Date | undefined>();
  const [isAddFactDialogOpen, setIsAddFactDialogOpen] = useState(false);
  const { toast } = useToast();

  const { derivedDate, derivedTime } = useMemo(() => {
    const text = detailedFacts.cuando;
    let dDate: Date | undefined;
    let tString = "";

    const dateMatchDMY = text.match(/(\d{2}-\d{2}-\d{4})/);
    if (dateMatchDMY?.[1]) {
      const parsed = parse(dateMatchDMY[1], "dd-MM-yyyy", new Date());
      if (isValid(parsed)) {
        dDate = parsed;
      }
    } else {
      const dateMatchYMD = text.match(/(\d{4}-\d{2}-\d{2})/);
      if (dateMatchYMD?.[1]) {
        const parsed = parse(dateMatchYMD[1], "yyyy-MM-dd", new Date());
        if (isValid(parsed)) {
          dDate = parsed;
        }
      }
    }
    
    const timeMatch = text.match(/(\d{2}:\d{2}(?::\d{2})?)/);
    if (timeMatch?.[1]) {
      tString = timeMatch[1].substring(0,5);
    }
    return { derivedDate: dDate, derivedTime: tString };
  }, [detailedFacts.cuando]);

  useEffect(() => {
    setSelectedCalendarDate(derivedDate);
  }, [derivedDate]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: keyof DetailedFacts) => {
    onDetailedFactChange(field, e.target.value);
  };
  
  const handleDateSelect = (date?: Date) => {
    setSelectedCalendarDate(date);
    const newDateString = date ? format(date, "dd-MM-yyyy") : "";
    const currentTimeString = derivedTime;

    let finalCuando = "";
    if (newDateString) {
      if (currentTimeString) {
        finalCuando = `A las ${currentTimeString} del ${newDateString}`;
      } else {
        finalCuando = newDateString;
      }
    } else { 
      if (currentTimeString) {
        finalCuando = `A las ${currentTimeString}`;
      } else {
        finalCuando = '';
      }
    }
    onDetailedFactChange('cuando', finalCuando);
  };

  const handleTimeChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value; 
    
    const dateString = selectedCalendarDate ? format(selectedCalendarDate, "dd-MM-yyyy") : (derivedDate ? format(derivedDate, "dd-MM-yyyy") : "");

    let finalCuando = "";
    if (newTime) {
      if (dateString) {
        finalCuando = `A las ${newTime} del ${dateString}`;
      } else {
        const existingDateMatch = detailedFacts.cuando.match(/(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2})/);
        if (existingDateMatch?.[0]) {
           const parsedExisting = parse(existingDateMatch[0], existingDateMatch[0].includes('-') && existingDateMatch[0].length === 10 && existingDateMatch[0][4] === '-' ? "yyyy-MM-dd" : "dd-MM-yyyy", new Date());
           if (isValid(parsedExisting)) {
             finalCuando = `A las ${newTime} del ${format(parsedExisting, "dd-MM-yyyy")}`;
           } else {
             finalCuando = `A las ${newTime}`;
           }
        } else {
          finalCuando = `A las ${newTime}`;
        }
      }
    } else { 
      if (dateString) {
        finalCuando = dateString; 
      } else {
        const existingDateMatch = detailedFacts.cuando.match(/(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2})/);
         if (existingDateMatch?.[0]) {
            const parsedExisting = parse(existingDateMatch[0], existingDateMatch[0].includes('-') && existingDateMatch[0].length === 10 && existingDateMatch[0][4] === '-' ? "yyyy-MM-dd" : "dd-MM-yyyy", new Date());
            if (isValid(parsedExisting)) {
                finalCuando = format(parsedExisting, "dd-MM-yyyy");
            } else {
                finalCuando = '';
            }
        } else {
           finalCuando = ''; 
        }
      }
    }
     onDetailedFactChange('cuando', finalCuando);
  };

  const constructedPhenomenonDescription = `La desviación ocurrió de la siguiente manera: "${detailedFacts.como || 'CÓMO (no especificado)'}".
El evento identificado fue: "${detailedFacts.que || 'QUÉ (no especificado)'}".
Esto tuvo lugar en: "${detailedFacts.donde || 'DÓNDE (no especificado)'}".
Sucedió el: "${detailedFacts.cuando || 'CUÁNDO (no especificado)'}".
El impacto o tendencia fue: "${detailedFacts.cualCuanto || 'CUÁL/CUÁNTO (no especificado)'}".
Las personas o equipos implicados fueron: "${detailedFacts.quien || 'QUIÉN (no especificado)'}".`;

  const handleNextWithValidation = () => {
    const missingFields = [];
    if (!projectLeader) missingFields.push("Líder del Proyecto");
    if (!detailedFacts.como.trim()) missingFields.push("CÓMO (ocurrió la desviación)");
    if (!detailedFacts.que.trim()) missingFields.push("QUÉ (ocurrió)");
    if (!detailedFacts.donde.trim()) missingFields.push("DÓNDE (ocurrió)");
    if (!detailedFacts.cuando.trim()) missingFields.push("CUÁNDO (Fecha y Hora)");
    if (!detailedFacts.cualCuanto.trim()) missingFields.push("CUÁL/CUÁNTO (tendencia e impacto)");
    if (!detailedFacts.quien.trim()) missingFields.push("QUIÉN");

    if (missingFields.length > 0) {
      toast({
        title: "Campos Obligatorios Faltantes",
        description: `Por favor, complete los siguientes campos: ${missingFields.join(', ')}.`,
        variant: "destructive",
      });
      return;
    }
    onNext();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Paso 2: Hechos y Análisis Preliminar</CardTitle>
        <CardDescription>Recopile y documente todos los hechos relevantes sobre el evento.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="projectLeader" className="flex items-center">
            <UserCircle className="mr-2 h-4 w-4 text-primary" />
            Líder del Proyecto <span className="text-destructive">*</span>
          </Label>
          <Select value={projectLeader} onValueChange={onProjectLeaderChange}>
            <SelectTrigger id="projectLeader">
              <SelectValue placeholder="-- Seleccione un líder --" />
            </SelectTrigger>
            <SelectContent>
              {availableUsers.map(user => (
                <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Nota: Lista de usuarios de ejemplo. En una aplicación real, esta lista se cargaría dinámicamente.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t">
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="como">CÓMO (ocurrió la desviación) <span className="text-destructive">*</span></Label>
            <Input id="como" value={detailedFacts.como} onChange={(e) => handleInputChange(e, 'como')} placeholder="Ej: Durante operación normal" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label htmlFor="que">QUÉ (ocurrió) <span className="text-destructive">*</span></Label>
            <Textarea id="que" value={detailedFacts.que} onChange={(e) => handleInputChange(e, 'que')} placeholder="Ej: Trip por alta Temperatura Descanso 1" rows={2} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="donde">DÓNDE (ocurrió) <span className="text-destructive">*</span></Label>
            <Input id="donde" value={detailedFacts.donde} onChange={(e) => handleInputChange(e, 'donde')} placeholder="Ej: Planta Teno, Sistema Calcinación, Horno" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="cuando-input">CUÁNDO (Fecha y Hora) <span className="text-destructive">*</span></Label>
            <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                <Input 
                    id="cuando-input" 
                    value={detailedFacts.cuando} 
                    onChange={(e) => handleInputChange(e, 'cuando')} 
                    placeholder="Ej: A las 18:13 del 28-05-2021"
                    className="flex-grow"
                />
                <div className="flex gap-2 shrink-0">
                    <Popover>
                        <PopoverTrigger asChild>
                        <Button variant="outline" className="w-auto aspect-square p-2.5">
                            <CalendarIcon className="h-4 w-4" />
                            <span className="sr-only">Abrir calendario</span>
                        </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                        <Calendar
                            mode="single"
                            selected={selectedCalendarDate}
                            onSelect={handleDateSelect}
                            initialFocus
                            locale={es}
                            disabled={{ after: new Date() }}
                        />
                        </PopoverContent>
                    </Popover>
                    <Input 
                        type="time"
                        value={derivedTime}
                        onChange={handleTimeChange}
                        className="w-auto shrink-0"
                        aria-label="Seleccionar hora"
                    />
                </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cualCuanto">CUÁL/CUÁNTO (tendencia e impacto) <span className="text-destructive">*</span></Label>
            <Input id="cualCuanto" value={detailedFacts.cualCuanto} onChange={(e) => handleInputChange(e, 'cualCuanto')} placeholder="Ej: Evento único / 2 Días de detención" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quien">QUIÉN <span className="text-destructive">*</span></Label>
            <Input id="quien" value={detailedFacts.quien} onChange={(e) => handleInputChange(e, 'quien')} placeholder="Personas o equipos implicados (Ej: N/A, Operador Turno A)" />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="font-semibold">DESCRIPCIÓN DEL FENÓMENO (Auto-generado)</Label>
          <Alert variant="default" className="bg-secondary/30">
            <AlertDescription className="whitespace-pre-line">
              {detailedFacts.como || detailedFacts.que || detailedFacts.donde || detailedFacts.cuando || detailedFacts.cualCuanto || detailedFacts.quien ? 
               constructedPhenomenonDescription : 
               "Complete los campos anteriores para generar la descripción."}
            </AlertDescription>
          </Alert>
        </div>

        <div className="space-y-2">
          <Label htmlFor="analysisDetails">Análisis Realizado (Técnicas Usadas y Hallazgos)</Label>
          <Textarea
            id="analysisDetails"
            value={analysisDetails}
            onChange={(e: ChangeEvent<HTMLTextAreaElement>) => onAnalysisDetailsChange(e.target.value)}
            placeholder="Describa el análisis efectuado, qué técnicas se usaron (ej: entrevistas, revisión de logs, etc.) y los hallazgos preliminares..."
            rows={5}
          />
        </div>

        <div className="space-y-4 pt-4 border-t">
            <h3 className="text-lg font-semibold font-headline flex items-center"><FileText className="mr-2 h-5 w-5 text-primary" />Preservación de los Hechos</h3>
            <Button onClick={() => setIsAddFactDialogOpen(true)} variant="outline">
                <PlusCircle className="mr-2 h-4 w-4" /> Añadir Hecho Preservado
            </Button>
            <PreservedFactDialog 
                open={isAddFactDialogOpen} 
                onOpenChange={setIsAddFactDialogOpen} 
                onSave={onAddPreservedFact}
            />
            {preservedFacts.length === 0 && (
                <p className="text-sm text-muted-foreground">No se han añadido hechos preservados aún.</p>
            )}
            <div className="space-y-3">
                {preservedFacts.map(fact => (
                    <Card key={fact.id} className="p-4 bg-secondary/30">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-semibold text-primary">{fact.userGivenName}</p>
                                <p className="text-xs text-muted-foreground">Categoría: {fact.category}</p>
                                {fact.fileName && <p className="text-xs text-muted-foreground">Archivo: {fact.fileName} ({fact.fileType}, {(fact.fileSize || 0 / 1024).toFixed(2)} KB)</p>}
                                {fact.description && <p className="text-sm mt-1">{fact.description}</p>}
                                <p className="text-xs text-muted-foreground mt-1">Cargado: {format(new Date(fact.uploadDate), "dd/MM/yyyy HH:mm", { locale: es })}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => onRemovePreservedFact(fact.id)} aria-label="Eliminar hecho preservado">
                                <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                        </div>
                    </Card>
                ))}
            </div>
        </div>

      </CardContent>
      <CardFooter className="flex justify-between">
        <Button onClick={onPrevious} variant="outline" className="transition-transform hover:scale-105">Anterior</Button>
        <Button onClick={handleNextWithValidation} className="transition-transform hover:scale-105">Siguiente</Button>
      </CardFooter>
    </Card>
  );
};


    