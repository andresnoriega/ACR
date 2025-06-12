
'use client';
import type { FC, ChangeEvent } from 'react';
import { useState, useEffect } from 'react'; 
import type { RCAEventData, ImmediateAction, EventType, PriorityType, FullUserProfile } from '@/types/rca';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, Save } from 'lucide-react'; // Added Save icon
import { useToast } from "@/hooks/use-toast";

interface Step1InitiationProps {
  eventData: RCAEventData;
  onEventDataChange: (field: keyof RCAEventData, value: string | EventType | PriorityType) => void;
  immediateActions: ImmediateAction[];
  onAddImmediateAction: () => void;
  onUpdateImmediateAction: (index: number, field: keyof Omit<ImmediateAction, 'eventId' | 'id'>, value: string) => void;
  onRemoveImmediateAction: (index: number) => void;
  availableSites: Array<{ id: string; name: string; }>;
  availableUsers: FullUserProfile[]; // Changed to FullUserProfile for email access
  onContinue: () => void; // Renamed from onNext
  onForceEnsureEventId: () => string; // New prop
}

const EVENT_TYPES: EventType[] = ['Incidente', 'Accidente', 'Falla', 'No Conformidad'];
const PRIORITIES: PriorityType[] = ['Alta', 'Media', 'Baja'];

export const Step1Initiation: FC<Step1InitiationProps> = ({
  eventData,
  onEventDataChange,
  immediateActions,
  onAddImmediateAction,
  onUpdateImmediateAction,
  onRemoveImmediateAction,
  availableSites,
  availableUsers,
  onContinue,
  onForceEnsureEventId,
}) => {
  const { toast } = useToast();
  const [clientSideMaxDate, setClientSideMaxDate] = useState<string | undefined>(undefined);

  useEffect(() => {
    const getTodayDateString = () => {
      const today = new Date();
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    setClientSideMaxDate(getTodayDateString());
  }, []); 

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: keyof RCAEventData) => {
    onEventDataChange(field, e.target.value);
  };

  const handleSelectChange = (value: string, field: keyof Pick<RCAEventData, 'place' | 'eventType' | 'priority'>) => {
    if (field === 'eventType') {
      onEventDataChange(field, value as EventType);
    } else if (field === 'priority') {
      onEventDataChange(field, value as PriorityType);
    } else {
      onEventDataChange(field, value);
    }
  };

  const handleActionChange = (index: number, field: keyof Omit<ImmediateAction, 'eventId' | 'id'>, value: string) => {
    onUpdateImmediateAction(index, field, value);
  };

  const handleActionResponsibleChange = (index: number, value: string) => {
    onUpdateImmediateAction(index, 'responsible', value);
  };

  const validateFields = (): boolean => {
    const missingFields = [];
    if (!eventData.place) missingFields.push("Lugar del Evento");
    if (!eventData.date) missingFields.push("Fecha del Evento");
    if (!eventData.eventType) missingFields.push("Tipo de Evento");
    if (!eventData.priority) missingFields.push("Prioridad");
    if (!eventData.focusEventDescription.trim()) missingFields.push("Descripción del Evento Foco");

    if (missingFields.length > 0) {
      toast({
        title: "Campos Obligatorios Faltantes",
        description: `Por favor, complete los siguientes campos: ${missingFields.join(', ')}.`,
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const handleSaveEvent = () => {
    if (!validateFields()) {
      return;
    }

    const currentEventId = onForceEnsureEventId(); // Genera o confirma el ID

    immediateActions.forEach(action => {
      if (action.responsible) {
        const responsibleUser = availableUsers.find(user => user.name === action.responsible);
        if (responsibleUser && responsibleUser.email) {
          toast({
            title: "Simulación de Envío de Correo (Acción Inmediata)",
            description: `Correo enviado a ${responsibleUser.name} (${responsibleUser.email}) sobre la acción inmediata: "${action.description.substring(0, 50)}${action.description.length > 50 ? "..." : ""}".`,
            duration: 5000,
          });
        }
      }
    });

    toast({
      title: "Evento Guardado",
      description: `Los detalles del evento ${currentEventId} han sido guardados.`,
    });
  };
  
  const handleContinueToNextStep = () => {
    if (!validateFields()) {
      return;
    }
    onContinue();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Paso 1: Iniciación</CardTitle>
        <CardDescription>Información básica del evento y acciones inmediatas. ID Evento: <span className="font-semibold text-primary">{eventData.id || "Pendiente"}</span></CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="place">Lugar del Evento <span className="text-destructive">*</span></Label>
          <Select onValueChange={(value) => handleSelectChange(value, 'place')} value={eventData.place}>
            <SelectTrigger id="place">
              <SelectValue placeholder="-- Seleccione un lugar --" />
            </SelectTrigger>
            <SelectContent>
              {availableSites.map(site => (
                <SelectItem key={site.id} value={site.name}>{site.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Nota: En una aplicación completa, esta lista se cargaría dinámicamente desde la configuración de sitios.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">Fecha del Evento <span className="text-destructive">*</span></Label>
          <Input 
            id="date" 
            type="date" 
            value={eventData.date} 
            onChange={(e) => handleInputChange(e, 'date')} 
            max={clientSideMaxDate} 
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="eventType">Tipo de Evento <span className="text-destructive">*</span></Label>
          <Select onValueChange={(value) => handleSelectChange(value as EventType, 'eventType')} value={eventData.eventType}>
            <SelectTrigger id="eventType">
              <SelectValue placeholder="-- Seleccione el tipo de evento --" />
            </SelectTrigger>
            <SelectContent>
              {EVENT_TYPES.map(type => (
                type && <SelectItem key={type} value={type}>{type}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="priority">Prioridad <span className="text-destructive">*</span></Label>
          <Select onValueChange={(value) => handleSelectChange(value as PriorityType, 'priority')} value={eventData.priority}>
            <SelectTrigger id="priority">
              <SelectValue placeholder="-- Seleccione la prioridad --" />
            </SelectTrigger>
            <SelectContent>
              {PRIORITIES.map(prio => (
                prio && <SelectItem key={prio} value={prio}>{prio}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="focusEventDescription">Descripción del Evento Foco <span className="text-destructive">*</span></Label>
          <Textarea id="focusEventDescription" value={eventData.focusEventDescription} onChange={(e) => handleInputChange(e, 'focusEventDescription')} placeholder="Describa brevemente el evento principal..." />
        </div>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold font-headline">Acciones Inmediatas</h3>
          {immediateActions.map((action, index) => (
            <Card key={action.id} className="p-4 space-y-3 bg-secondary/50">
              <div className="flex justify-between items-center">
                <p className="font-medium text-sm text-primary">Acción Inmediata #{index + 1} (ID: {action.id})</p>
                <Button variant="ghost" size="icon" onClick={() => onRemoveImmediateAction(index)} aria-label="Eliminar acción inmediata">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              <div className="space-y-2">
                <Label htmlFor={`ia-desc-${index}`}>Tarea</Label>
                <Input id={`ia-desc-${index}`} value={action.description} onChange={(e) => handleActionChange(index, 'description', e.target.value)} placeholder="Descripción de la tarea" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`ia-resp-${index}`}>Responsable</Label>
                   <Select value={action.responsible} onValueChange={(value) => handleActionResponsibleChange(index, value)}>
                    <SelectTrigger id={`ia-resp-${index}`}>
                      <SelectValue placeholder="-- Seleccione un responsable --" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.map(user => (
                        <SelectItem key={user.id} value={user.name}>{user.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Nota: Lista de usuarios de ejemplo.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`ia-date-${index}`}>Fecha</Label>
                  <Input 
                    id={`ia-date-${index}`} 
                    type="date" 
                    value={action.dueDate} 
                    onChange={(e) => handleActionChange(index, 'dueDate', e.target.value)}
                    max={clientSideMaxDate}
                  />
                </div>
              </div>
            </Card>
          ))}
          <Button onClick={onAddImmediateAction} variant="outline">
            <PlusCircle className="mr-2 h-4 w-4" /> Añadir Acción Inmediata
          </Button>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end space-x-2">
        <Button onClick={handleSaveEvent} variant="outline" className="transition-transform hover:scale-105">
          <Save className="mr-2 h-4 w-4" /> Guardar Evento
        </Button>
        <Button onClick={handleContinueToNextStep} className="transition-transform hover:scale-105">Continuar</Button>
      </CardFooter>
    </Card>
  );
};

