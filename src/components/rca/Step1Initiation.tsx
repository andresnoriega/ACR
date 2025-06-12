
'use client';
import type { FC, ChangeEvent } from 'react';
import { useState, useEffect } from 'react'; 
import type { RCAEventData, ImmediateAction, EventType, PriorityType, FullUserProfile, Site } from '@/types/rca'; // Added Site
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, Save, Send } from 'lucide-react'; // Added Send icon
import { useToast } from "@/hooks/use-toast";
import { sendEmailAction } from '@/app/actions';

interface Step1InitiationProps {
  eventData: RCAEventData;
  onEventDataChange: (field: keyof RCAEventData, value: string | EventType | PriorityType) => void;
  immediateActions: ImmediateAction[];
  onAddImmediateAction: () => void;
  onUpdateImmediateAction: (index: number, field: keyof Omit<ImmediateAction, 'eventId' | 'id'>, value: string) => void;
  onRemoveImmediateAction: (index: number) => void;
  availableSites: Site[]; // Changed from Array<{ id: string; name: string; }>
  availableUsers: FullUserProfile[];
  onContinue: () => void;
  onForceEnsureEventId: () => string;
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

  const handleSaveEvent = async () => {
    if (!validateFields()) {
      return;
    }

    const currentEventId = onForceEnsureEventId(); 
    let emailsProcessed = 0;
    let emailsSuccessfullySent = 0;

    for (const action of immediateActions) {
      if (action.responsible && action.description.trim() && action.dueDate) {
        emailsProcessed++;
        const responsibleUser = availableUsers.find(user => user.name === action.responsible);
        if (responsibleUser && responsibleUser.email) {
          const emailSubject = `Acción Inmediata Asignada: ${action.description.substring(0,30)}... (Evento: ${currentEventId})`;
          const emailBody = `Estimado/a ${responsibleUser.name},\n\nSe le ha asignado la siguiente acción inmediata relacionada con el evento ${currentEventId} ("${eventData.focusEventDescription.substring(0,50)}..."):\n\nTarea: ${action.description}\nFecha Límite: ${action.dueDate}\n\nPor favor, proceda según corresponda.\n\nSaludos,\nSistema RCA Assistant`;
          
          const result = await sendEmailAction({
            to: responsibleUser.email,
            subject: emailSubject,
            body: emailBody,
          });
          if (result.success) {
            emailsSuccessfullySent++;
          }
          toast({
            title: result.success ? "Notificación de Acción Inmediata (Simulación)" : "Error en Notificación (Simulación)",
            description: result.success 
              ? `Notificación enviada a ${responsibleUser.name} (${responsibleUser.email}) sobre: "${action.description.substring(0, 40)}...".`
              : `Fallo al notificar a ${responsibleUser.name} sobre: "${action.description.substring(0, 40)}...". Consulte la consola del servidor.`,
            variant: result.success ? "default" : "destructive",
            duration: result.success ? 3000: 5000,
          });
        } else {
           toast({
            title: "Error en Notificación",
            description: `No se pudo encontrar el correo para el responsable '${action.responsible}' de la acción: "${action.description.substring(0, 40)}...".`,
            variant: "destructive",
            duration: 5000,
          });
        }
      }
    }

    let saveMessage = `Los detalles del evento ${currentEventId} han sido guardados.`;
    if (emailsProcessed > 0) {
      saveMessage += ` Se procesaron ${emailsSuccessfullySent} de ${emailsProcessed} notificaciones por correo para acciones inmediatas.`;
    }

    toast({
      title: "Evento Guardado",
      description: saveMessage,
    });
  };
  
  const handleContinueToNextStep = () => {
    if (!validateFields()) {
      return;
    }
    if (!eventData.id) {
      onForceEnsureEventId();
    }
    onContinue();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Paso 1: Iniciación</CardTitle>
        <CardDescription>Información básica del evento y acciones inmediatas. ID Evento: <span className="font-semibold text-primary">{eventData.id || "Pendiente (se generará al guardar o continuar)"}</span></CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="place">Lugar del Evento <span className="text-destructive">*</span></Label>
          <Select onValueChange={(value) => handleSelectChange(value, 'place')} value={eventData.place}>
            <SelectTrigger id="place">
              <SelectValue placeholder="-- Seleccione un lugar --" />
            </SelectTrigger>
            <SelectContent>
              {availableSites.length > 0 ? availableSites.map(site => (
                <SelectItem key={site.id} value={site.name}>{site.name}</SelectItem>
              )) : <SelectItem value="" disabled>No hay sitios configurados</SelectItem>}
            </SelectContent>
          </Select>
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
                <Label htmlFor={`ia-desc-${index}`}>Tarea <span className="text-destructive">*</span></Label>
                <Input id={`ia-desc-${index}`} value={action.description} onChange={(e) => handleActionChange(index, 'description', e.target.value)} placeholder="Descripción de la tarea" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor={`ia-resp-${index}`}>Responsable <span className="text-destructive">*</span></Label>
                   <Select value={action.responsible} onValueChange={(value) => handleActionResponsibleChange(index, value)}>
                    <SelectTrigger id={`ia-resp-${index}`}>
                      <SelectValue placeholder="-- Seleccione un responsable --" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableUsers.length > 0 ? availableUsers.map(user => (
                        <SelectItem key={user.id} value={user.name}>{user.name} ({user.email})</SelectItem>
                      )) : <SelectItem value="" disabled>No hay usuarios configurados</SelectItem>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor={`ia-date-${index}`}>Fecha <span className="text-destructive">*</span></Label>
                  <Input 
                    id={`ia-date-${index}`} 
                    type="date" 
                    value={action.dueDate} 
                    onChange={(e) => handleActionChange(index, 'dueDate', e.target.value)}
                    min={clientSideMaxDate} // Use min instead of max for future dates
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
