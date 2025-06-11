
'use client';
import type { FC, ChangeEvent } from 'react';
import type { RCAEventData, ImmediateAction } from '@/types/rca';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2 } from 'lucide-react';

interface Step1InitiationProps {
  eventData: RCAEventData;
  onEventDataChange: (field: keyof RCAEventData, value: string) => void;
  immediateActions: ImmediateAction[];
  onAddImmediateAction: () => void;
  onUpdateImmediateAction: (index: number, field: keyof ImmediateAction, value: string) => void;
  onRemoveImmediateAction: (index: number) => void;
  availableSites: Array<{ id: string; name: string; }>;
  availableUsers: Array<{ id: string; name: string; }>; // Added prop
  onNext: () => void;
}

export const Step1Initiation: FC<Step1InitiationProps> = ({
  eventData,
  onEventDataChange,
  immediateActions,
  onAddImmediateAction,
  onUpdateImmediateAction,
  onRemoveImmediateAction,
  availableSites,
  availableUsers, // Destructure new prop
  onNext,
}) => {
  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: keyof RCAEventData) => {
    onEventDataChange(field, e.target.value);
  };

  const handleSelectChange = (value: string, field: keyof RCAEventData) => {
    onEventDataChange(field, value);
  };

  const handleActionChange = (index: number, field: keyof ImmediateAction, value: string) => {
    onUpdateImmediateAction(index, field, value);
  };

  const handleActionResponsibleChange = (index: number, value: string) => {
    onUpdateImmediateAction(index, 'responsible', value);
  };

  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  const maxDateForImmediateActions = getTodayDateString();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-headline">Paso 1: Iniciación</CardTitle>
        <CardDescription>Información básica del evento y acciones inmediatas. ID Evento: <span className="font-semibold text-primary">{eventData.id || "Pendiente"}</span></CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="place">Lugar del Evento</Label>
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
          <Label htmlFor="date">Fecha del Evento</Label>
          <Input id="date" type="date" value={eventData.date} onChange={(e) => handleInputChange(e, 'date')} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="focusEventDescription">Descripción del Evento Foco</Label>
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
                    max={maxDateForImmediateActions}
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
      <CardFooter className="flex justify-end">
        <Button onClick={onNext} className="transition-transform hover:scale-105">Guardar y Continuar</Button>
      </CardFooter>
    </Card>
  );
};

    

    