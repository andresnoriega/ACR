'use client';
import { useState, useEffect, useMemo, type FC } from "react";
import type { TimelineEvent } from "@/types/rca";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PlusCircle, Edit2, Trash2, CalendarClock, Loader2 } from "lucide-react";
import { format, parseISO, isValid as isValidDate } from 'date-fns';

interface TimelineComponentProps {
  events: TimelineEvent[];
  onSetEvents: (events: TimelineEvent[]) => void;
}

const TimelineComponent: FC<TimelineComponentProps> = ({ events, onSetEvents }) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [dateTimeValue, setDateTimeValue] = useState(""); // Combined date and time "YYYY-MM-DDTHH:MM"
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [maxDateTime, setMaxDateTime] = useState('');

  useEffect(() => {
    const now = new Date();
    // To format for the `max` attribute of a datetime-local input, we need "YYYY-MM-DDTHH:MM".
    // We adjust for the user's timezone offset to get the correct local time string.
    const timezoneOffset = now.getTimezoneOffset() * 60000; //offset in milliseconds
    const localISOTime = new Date(now.getTime() - timezoneOffset).toISOString().slice(0, 16);
    setMaxDateTime(localISOTime);
  }, []);

  const parseDateTimeString = (dateTimeStr: string): Date | null => {
    if (!dateTimeStr) return null;
    try {
      const parsed = new Date(dateTimeStr);
      if (isNaN(parsed.getTime())) return null;
      return parsed;
    } catch (e) {
      return null;
    }
  };
  
  const referenceEventDateTime = useMemo(() => {
    if (events.length === 0) {
      return null; 
    }
    // Create a mutable copy for sorting
    const sortedForReference = [...events].sort((a, b) => {
      const dateA = parseDateTimeString(a.datetime);
      const dateB = parseDateTimeString(b.datetime);
      if (!dateA || !dateB) return 0; // Should ideally not happen with validated data
      // Sort descending to get the latest as the first element
      return dateB.getTime() - dateA.getTime(); 
    });
    const refEvent = sortedForReference[0]; // This is the latest event
    return parseDateTimeString(refEvent.datetime);
  }, [events]);


  const validateDateTime = (newDateTimeStr: string, editingEventId?: number): boolean => {
    const newEventDateTime = parseDateTimeString(newDateTimeStr);
    if (!newEventDateTime) {
      toast({ title: "Fecha/Hora Inválida", description: "El formato de fecha y hora no es válido. Asegúrese de que esté completo.", variant: "destructive" });
      return false;
    }

    if (newEventDateTime > new Date()) {
        toast({
            title: "Fecha Futura no permitida",
            description: "No puede registrar un evento en una fecha u hora futura.",
            variant: "destructive"
        });
        return false;
    }

    // If there are no events, or if we are editing the only event, any date is fine.
    if (events.length === 0 || (events.length === 1 && editingEventId && events[0].id === editingEventId)) {
        return true;
    }
    
    // If editing an existing event that IS the current reference (latest) event, its new date can be anything.
    // The reference will be recalculated.
    if (editingEventId && referenceEventDateTime) {
        const eventBeingEdited = events.find(e => e.id === editingEventId);
        if (eventBeingEdited) {
            const currentDateTimeOfEditingEvent = parseDateTimeString(eventBeingEdited.datetime);
            if (currentDateTimeOfEditingEvent && referenceEventDateTime && currentDateTimeOfEditingEvent.getTime() === referenceEventDateTime.getTime()) {
                return true;
            }
        }
    }

    // For new events or editing non-reference events, it must be strictly before the reference.
    if (referenceEventDateTime) {
      if (newEventDateTime >= referenceEventDateTime) {
        toast({
          title: "Error de Orden Cronológico",
          description: `El evento debe ser anterior al evento de referencia más reciente en la línea de tiempo (${format(referenceEventDateTime, "dd/MM/yyyy HH:mm")}).`,
          variant: "destructive",
          duration: 7000,
        });
        return false;
      }
    }
    return true;
  };


  const addEvent = () => {
    if (!description.trim() || !dateTimeValue) {
        toast({ title: "Campos Requeridos", description: "Por favor, complete la descripción y la fecha/hora.", variant: "destructive"});
        return;
    }
    if (!validateDateTime(dateTimeValue)) return;

    const newEvent: TimelineEvent = {
      id: Date.now(),
      description,
      datetime: dateTimeValue, 
    };

    // Add new event and re-sort
    onSetEvents([...events, newEvent].sort((a, b) => {
        const dateA = parseDateTimeString(a.datetime);
        const dateB = parseDateTimeString(b.datetime);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
    }));
    clearForm();
    toast({ title: "Evento Añadido", description: "El evento se ha añadido a la línea de tiempo."});
  };

  const selectEvent = (id: number) => {
    const event = events.find((e) => e.id === id);
    if (event) {
      setSelectedId(id);
      setDescription(event.description);
      setDateTimeValue(event.datetime); 
    }
  };

  const editSelectedEvent = () => {
    if (!selectedId) {
      toast({ title: "Sin Selección", description: "Selecciona un evento para editarlo.", variant: "default" });
      return;
    }
     if (!description.trim() || !dateTimeValue) {
        toast({ title: "Campos Requeridos", description: "Por favor, complete la descripción y la fecha/hora para editar.", variant: "destructive"});
        return;
    }
    if (!validateDateTime(dateTimeValue, selectedId)) return;

    const updatedEvents = events.map((event) =>
      event.id === selectedId
        ? { ...event, description, datetime: dateTimeValue }
        : event
    ).sort((a, b) => {
        const dateA = parseDateTimeString(a.datetime);
        const dateB = parseDateTimeString(b.datetime);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
    });
    onSetEvents(updatedEvents);
    clearForm();
    toast({ title: "Evento Editado", description: "El evento seleccionado ha sido actualizado."});
  };

  const handleDeleteConfirm = () => {
    if (!selectedId) return;
    setIsProcessing(true);
    // Filter out the event and re-sort
    onSetEvents(events.filter((event) => event.id !== selectedId).sort((a, b) => {
        const dateA = parseDateTimeString(a.datetime);
        const dateB = parseDateTimeString(b.datetime);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
    }));
    clearForm();
    toast({ title: "Evento Eliminado", description: "El evento seleccionado ha sido eliminado.", variant: "destructive"});
    setIsProcessing(false);
  };

  const clearForm = () => {
    setDescription("");
    setDateTimeValue("");
    setSelectedId(null);
  };
  
  const sortedEvents = useMemo(() => {
    // Create a mutable copy before sorting
    return [...events].sort((a, b) => {
      const dateA = parseDateTimeString(a.datetime);
      const dateB = parseDateTimeString(b.datetime);
      if (!dateA || !dateB) return 0; // Should ideally not happen with validated data
      return dateA.getTime() - dateB.getTime();
    });
  }, [events]);

  const formatDisplayDateTime = (dateTimeStr: string): { date: string, time: string } => {
    const parsedDate = parseDateTimeString(dateTimeStr);
    if (parsedDate && isValidDate(parsedDate)) {
      return {
        date: format(parsedDate, "dd/MM/yyyy"),
        time: format(parsedDate, "HH:mm")
      };
    }
    return { date: "Fecha Inválida", time: "Hora Inválida" };
  };


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="text-xl font-semibold font-headline text-primary flex items-center">
          <CalendarClock className="mr-2 h-6 w-6" />
          Línea de Tiempo de Eventos Clave
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3 p-4 border rounded-md bg-secondary/30">
          <div>
            <Label htmlFor="timeline-description">Descripción del Evento</Label>
            <Textarea
              id="timeline-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describa el hito o evento..."
              rows={2}
            />
          </div>
          <div>
            <Label htmlFor="timeline-datetime">Fecha y Hora del Evento</Label>
            <Input
              id="timeline-datetime"
              type="datetime-local"
              value={dateTimeValue}
              onChange={(e) => setDateTimeValue(e.target.value)}
              max={maxDateTime}
            />
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={addEvent} size="sm" disabled={isProcessing}>
              <PlusCircle className="mr-2 h-4 w-4" /> Agregar Evento
            </Button>
            <Button onClick={editSelectedEvent} size="sm" variant="outline" disabled={!selectedId || isProcessing}>
              <Edit2 className="mr-2 h-4 w-4" /> Editar Seleccionado
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={!selectedId || isProcessing}>
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar Seleccionado
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmar Eliminación</AlertDialogTitle>
                  <AlertDialogDescription>
                    ¿Está seguro de que desea eliminar este evento de la línea de tiempo? Esta acción no se puede deshacer.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isProcessing}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteConfirm} disabled={isProcessing}>
                    {isProcessing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Eliminar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <Button onClick={clearForm} size="sm" variant="ghost" disabled={isProcessing}>Limpiar Formulario</Button>
          </div>
        </div>

        <div className="relative mt-6 overflow-x-auto pb-4 min-h-[150px] border rounded-md p-4">
          <div className="inline-flex items-center relative min-h-[120px] w-full">
            {sortedEvents.length > 0 && (
              <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-primary/30 transform -translate-y-1/2 z-0"></div>
            )}
            <div className="flex space-x-4 z-10 w-full">
              {sortedEvents.length === 0 && (
                <p className="italic text-muted-foreground text-center w-full py-10">No hay eventos registrados en la línea de tiempo.</p>
              )}
              {sortedEvents.map((event, index) => {
                const displayDateTime = formatDisplayDateTime(event.datetime);
                return (
                  <div
                    key={event.id}
                    onClick={() => selectEvent(event.id)}
                    className={`relative z-10 w-48 min-w-[12rem] p-3 border-2 rounded-lg shadow-sm text-center cursor-pointer transition-transform duration-200 hover:scale-105 flex-shrink-0
                      ${selectedId === event.id ? "bg-primary/10 border-primary ring-2 ring-primary/50" : "bg-card border-border hover:border-primary/50"}`}
                    style={{ marginLeft: index === 0 ? '0' : undefined }}
                  >
                    <p className="font-semibold text-sm truncate" title={event.description}>{event.description}</p>
                    <div className="text-xs text-muted-foreground mt-1">
                      {displayDateTime.date}
                      <br />
                      {displayDateTime.time}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TimelineComponent;
