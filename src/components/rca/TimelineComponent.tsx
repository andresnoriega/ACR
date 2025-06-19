
'use client';
import { useState, useEffect, useMemo, type FC } from "react"; // Added useMemo
import type { TimelineEvent } from "@/types/rca";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { PlusCircle, Edit2, Copy, Trash2, CalendarClock, Loader2 } from "lucide-react";

interface TimelineComponentProps {
  events: TimelineEvent[];
  onSetEvents: (events: TimelineEvent[]) => void;
}

const TimelineComponent: FC<TimelineComponentProps> = ({ events, onSetEvents }) => {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const parseDateTime = (dateStr: string, timeStr: string): Date | null => {
    if (!dateStr || !timeStr) return null;
    try {
      const parsed = new Date(`${dateStr}T${timeStr}`);
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
    const sortedForReference = [...events].sort((a, b) => {
      const dateA = parseDateTime(a.datetime.split(" ")[0], a.datetime.split(" ")[1]);
      const dateB = parseDateTime(b.datetime.split(" ")[0], b.datetime.split(" ")[1]);
      if (!dateA || !dateB) return 0;
      return dateB.getTime() - dateA.getTime(); 
    });
    const refEvent = sortedForReference[0];
    return parseDateTime(refEvent.datetime.split(" ")[0], refEvent.datetime.split(" ")[1]);
  }, [events]);


  const validateDateTime = (newDateStr: string, newTimeStr: string, editingEventId?: number): boolean => {
    const newEventDateTime = parseDateTime(newDateStr, newTimeStr);
    if (!newEventDateTime) {
      toast({ title: "Fecha/Hora Inválida", description: "El formato de fecha u hora no es válido. Use YYYY-MM-DD y HH:MM.", variant: "destructive" });
      return false;
    }

    if (events.length === 0 || (events.length === 1 && editingEventId && events[0].id === editingEventId)) {
        return true;
    }
    
    if (editingEventId && referenceEventDateTime) {
        const eventBeingEdited = events.find(e => e.id === editingEventId);
        if (eventBeingEdited) {
            const currentDateTimeOfEditingEvent = parseDateTime(eventBeingEdited.datetime.split(" ")[0], eventBeingEdited.datetime.split(" ")[1]);
            if (currentDateTimeOfEditingEvent && referenceEventDateTime && currentDateTimeOfEditingEvent.getTime() === referenceEventDateTime.getTime()) {
                // Estamos editando el actual evento de referencia (el más reciente).
                // Su nueva fecha puede ser cualquiera, ya que la referencia se recalculará.
                // Sin embargo, si hay otros eventos, la nueva fecha del ancla no debería ser anterior a *todos* ellos,
                // pero esa es una lógica de re-validación más compleja que no se implementa aquí.
                return true;
            }
        }
    }

    if (referenceEventDateTime) {
      if (newEventDateTime >= referenceEventDateTime) {
        toast({
          title: "Error de Orden Cronológico",
          description: `El evento debe ser anterior al evento de referencia más reciente en la línea de tiempo (${referenceEventDateTime.toLocaleDateString('es-CL', {year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit'})}).`,
          variant: "destructive",
          duration: 7000,
        });
        return false;
      }
    }
    return true;
  };


  const addEvent = () => {
    if (!description.trim() || !date || !time) {
        toast({ title: "Campos Requeridos", description: "Por favor, complete la descripción, fecha y hora.", variant: "destructive"});
        return;
    }
    if (!validateDateTime(date, time)) return;

    const newEvent: TimelineEvent = {
      id: Date.now(),
      description,
      datetime: `${date} ${time}`,
    };

    onSetEvents([...events, newEvent].sort((a, b) => {
        const dateA = parseDateTime(a.datetime.split(" ")[0], a.datetime.split(" ")[1]);
        const dateB = parseDateTime(b.datetime.split(" ")[0], b.datetime.split(" ")[1]);
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
      const [d, t] = event.datetime.split(" ");
      setDate(d);
      setTime(t);
    }
  };

  const editSelectedEvent = () => {
    if (!selectedId) {
      toast({ title: "Sin Selección", description: "Selecciona un evento para editarlo.", variant: "default" });
      return;
    }
     if (!description.trim() || !date || !time) {
        toast({ title: "Campos Requeridos", description: "Por favor, complete la descripción, fecha y hora para editar.", variant: "destructive"});
        return;
    }
    if (!validateDateTime(date, time, selectedId)) return;

    const updatedEvents = events.map((event) =>
      event.id === selectedId
        ? { ...event, description, datetime: `${date} ${time}` }
        : event
    ).sort((a, b) => {
        const dateA = parseDateTime(a.datetime.split(" ")[0], a.datetime.split(" ")[1]);
        const dateB = parseDateTime(b.datetime.split(" ")[0], b.datetime.split(" ")[1]);
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
    onSetEvents(events.filter((event) => event.id !== selectedId).sort((a, b) => {
        const dateA = parseDateTime(a.datetime.split(" ")[0], a.datetime.split(" ")[1]);
        const dateB = parseDateTime(b.datetime.split(" ")[0], b.datetime.split(" ")[1]);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
    }));
    clearForm();
    toast({ title: "Evento Eliminado", description: "El evento seleccionado ha sido eliminado.", variant: "destructive"});
    setIsProcessing(false);
  };

  const duplicateSelectedEvent = () => {
    if (!selectedId) {
      toast({ title: "Sin Selección", description: "Selecciona un evento para duplicarlo.", variant: "default" });
      return;
    }

    const eventToDuplicate = events.find((e) => e.id === selectedId);
    if (!eventToDuplicate) return;

    const [originalDate] = eventToDuplicate.datetime.split(" ");
    
    const newDateInput = prompt("Introduce la nueva fecha (YYYY-MM-DD):", originalDate);
    if (!newDateInput) return; 
    const newTimeInput = prompt("Introduce la nueva hora (HH:MM):", "00:00");
    if (!newTimeInput) return; 

    if (!validateDateTime(newDateInput, newTimeInput)) return;

    const duplicatedEvent: TimelineEvent = {
      ...eventToDuplicate,
      id: Date.now(),
      datetime: `${newDateInput} ${newTimeInput}`,
    };

    onSetEvents([...events, duplicatedEvent].sort((a, b) => {
        const dateA = parseDateTime(a.datetime.split(" ")[0], a.datetime.split(" ")[1]);
        const dateB = parseDateTime(b.datetime.split(" ")[0], b.datetime.split(" ")[1]);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
    }));
    
    setSelectedId(duplicatedEvent.id);
    setDescription(duplicatedEvent.description);
    setDate(newDateInput);
    setTime(newTimeInput);
    toast({ title: "Evento Duplicado", description: "El evento ha sido duplicado y seleccionado."});
  };

  const clearForm = () => {
    setDescription("");
    setDate("");
    setTime("");
    setSelectedId(null);
  };
  
  const sortedEvents = useMemo(() => {
    return [...events].sort((a, b) => {
      const dateA = parseDateTime(a.datetime.split(" ")[0], a.datetime.split(" ")[1]);
      const dateB = parseDateTime(b.datetime.split(" ")[0], b.datetime.split(" ")[1]);
      if (!dateA || !dateB) return 0;
      return dateA.getTime() - dateB.getTime();
    });
  }, [events]);


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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="timeline-date">Fecha</Label>
              <Input
                id="timeline-date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="timeline-time">Hora</Label>
              <Input
                id="timeline-time"
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <Button onClick={addEvent} size="sm" disabled={isProcessing}>
              <PlusCircle className="mr-2 h-4 w-4" /> Agregar Evento
            </Button>
            <Button onClick={editSelectedEvent} size="sm" variant="outline" disabled={!selectedId || isProcessing}>
              <Edit2 className="mr-2 h-4 w-4" /> Editar Seleccionado
            </Button>
            <Button onClick={duplicateSelectedEvent} size="sm" variant="outline" disabled={!selectedId || isProcessing}>
              <Copy className="mr-2 h-4 w-4" /> Duplicar Seleccionado
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
              {sortedEvents.map((event, index) => (
                <div
                  key={event.id}
                  onClick={() => selectEvent(event.id)}
                  className={`relative z-10 w-48 min-w-[12rem] p-3 border-2 rounded-lg shadow-sm text-center cursor-pointer transition-transform duration-200 hover:scale-105 flex-shrink-0
                    ${selectedId === event.id ? "bg-primary/10 border-primary ring-2 ring-primary/50" : "bg-card border-border hover:border-primary/50"}`}
                  style={{ marginLeft: index === 0 ? '0' : undefined }}
                >
                  <p className="font-semibold text-sm truncate" title={event.description}>{event.description}</p>
                  <div className="text-xs text-muted-foreground mt-1">
                    {event.datetime.split(" ")[0]}
                    <br />
                    {event.datetime.split(" ")[1]}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TimelineComponent;
