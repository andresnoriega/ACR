
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
    return dateStr && timeStr ? new Date(`${dateStr}T${timeStr}`) : null;
  };

  const validateDateOrder = (newDate: Date | null): boolean => {
    if (!newDate) return false;
    if (events.length === 0) return true;

    // Assuming events[0] is the reference event (earliest or first entered)
    const firstEventParts = events[0].datetime.split(" ");
    const firstEventDate = parseDateTime(firstEventParts[0], firstEventParts[1]);

    if (firstEventDate && newDate > firstEventDate) {
      toast({
        title: "Error de Fecha",
        description: "El evento debe tener una fecha menor o igual al primer evento en la línea de tiempo.",
        variant: "destructive",
      });
      return false;
    }
    return true;
  };

  const addEvent = () => {
    if (!description.trim() || !date || !time) {
        toast({ title: "Campos Requeridos", description: "Por favor, complete la descripción, fecha y hora.", variant: "destructive"});
        return;
    }
    const datetime = `${date} ${time}`;
    const newDateObj = parseDateTime(date, time);

    // const isValidOrder = validateDateOrder(newDateObj); // Consider re-evaluating this validation logic if it causes issues
    // if (!isValidOrder) return;

    const newEvent: TimelineEvent = {
      id: Date.now(),
      description,
      datetime,
    };

    onSetEvents([newEvent, ...events].sort((a, b) => {
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
    
    // Note: Using window.prompt is generally not recommended for modern UX.
    // Consider replacing with a custom dialog if more complex input is needed.
    const newDateInput = prompt("Introduce la nueva fecha (YYYY-MM-DD):", originalDate);
    if (!newDateInput) return; // User cancelled or entered nothing
    const newTimeInput = prompt("Introduce la nueva hora (HH:MM):", "00:00");
    if (!newTimeInput) return; // User cancelled or entered nothing

    const parsedNewDate = parseDateTime(newDateInput, newTimeInput);
    if (!parsedNewDate) {
        toast({ title: "Fecha/Hora Inválida", description: "El formato de fecha u hora ingresado no es válido.", variant: "destructive"});
        return;
    }

    // const validation = validateDateOrder(parsedNewDate);
    // if (!validation) return;

    const duplicatedEvent: TimelineEvent = {
      ...eventToDuplicate,
      id: Date.now(),
      datetime: `${newDateInput} ${newTimeInput}`,
    };

    onSetEvents([duplicatedEvent, ...events].sort((a, b) => {
        const dateA = parseDateTime(a.datetime.split(" ")[0], a.datetime.split(" ")[1]);
        const dateB = parseDateTime(b.datetime.split(" ")[0], b.datetime.split(" ")[1]);
        if (!dateA || !dateB) return 0;
        return dateA.getTime() - dateB.getTime();
    }));
    
    // Update form to reflect the new duplicated event for immediate editing if desired
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
  
  // Sort events chronologically for display
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

