
'use client';
import type { FC, ChangeEvent } from 'react';
import { useState, useEffect, useMemo } from 'react'; 
import type { RCAEventData, ImmediateAction, EventType, PriorityType, FullUserProfile, Site, ReportedEventStatus } from '@/types/rca';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2, Save, Send, Mail, Loader2, Bell, UserCog, XCircle, CheckCircle, Edit, Settings2, HardHat, Printer } from 'lucide-react'; // Added HardHat for Equipo
import { useToast } from "@/hooks/use-toast";
import { sendEmailAction } from '@/app/actions';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';

interface Step1InitiationProps {
  eventData: RCAEventData;
  onEventDataChange: (field: keyof RCAEventData, value: string | EventType | PriorityType) => void;
  immediateActions: ImmediateAction[];
  onAddImmediateAction: () => void;
  onUpdateImmediateAction: (index: number, field: keyof Omit<ImmediateAction, 'eventId' | 'id'>, value: string) => void;
  onRemoveImmediateAction: (index: number) => void;
  availableSites: Site[];
  availableUsers: FullUserProfile[];
  onContinue: () => void;
  onForceEnsureEventId: () => string; 
  onSaveAnalysis: (showToast?: boolean, options?: { suppressNavigation?: boolean }) => Promise<{ success: boolean; newEventId?: string; }>;
  onPrintReport: () => void;
  isSaving: boolean;
  onApproveEvent: () => Promise<void>; 
  onRejectEvent: () => Promise<void>; 
  isEventFinalized: boolean;
  currentEventStatus: ReportedEventStatus;
  validateStep1PreRequisites: () => { isValid: boolean, message?: string }; // Added prop
}

const EVENT_TYPES: EventType[] = ['Incidente', 'Accidente', 'Falla de Equipo', 'No Conformidad', 'Evento Operacional', 'No Conformidad Potencial', 'Hallazgo'];
const PRIORITIES: PriorityType[] = ['Alta', 'Media', 'Baja'];

// --- NotifyEventCreationDialog Component ---
interface NotifyEventCreationDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: string;
  eventDescription: string;
  eventSite: string;
  availableUsers: FullUserProfile[];
  availableSites: Site[];
}

const NotifyEventCreationDialog: FC<NotifyEventCreationDialogProps> = ({
  isOpen,
  onOpenChange,
  eventId,
  eventDescription,
  eventSite,
  availableUsers,
  availableSites,
}) => {
  const { toast } = useToast();
  const [selectedUserEmails, setSelectedUserEmails] = useState<string[]>([]);
  const [emailSearchTerm, setEmailSearchTerm] = useState('');
  const [isSendingEmails, setIsSendingEmails] = useState(false);

  const adminAndSuperUsers = useMemo(() => {
    if (!availableUsers || !Array.isArray(availableUsers)) return [];

    const siteDetails = availableSites.find(s => s.name === eventSite);
    const siteCompany = siteDetails?.empresa;

    return availableUsers.filter(user => {
      // Only include users with notifications enabled.
      if (user.emailNotifications === false) return false;
      
      if (user.role === 'Super User') return true; 
      if (user.role === 'Admin') {
        if (siteCompany) {
          return user.empresa === siteCompany;
        }
        return !user.empresa; 
      }
      return false;
    });
  }, [availableUsers, availableSites, eventSite]);

  const filteredUsersForDialog = useMemo(() => {
    if (!adminAndSuperUsers) return [];
    return adminAndSuperUsers.filter(user => 
      user.name.toLowerCase().includes(emailSearchTerm.toLowerCase()) ||
      (user.email && user.email.toLowerCase().includes(emailSearchTerm.toLowerCase()))
    ).sort((a,b) => a.name.localeCompare(b.name));
  }, [adminAndSuperUsers, emailSearchTerm]);

  const handleSelectAllFilteredUsers = (checked: boolean) => {
    if (checked) {
      setSelectedUserEmails(filteredUsersForDialog.map(user => user.email).filter(email => !!email));
    } else {
      setSelectedUserEmails([]);
    }
  };

  const handleUserSelectionChange = (userEmail: string, checked: boolean) => {
    if (checked) {
      setSelectedUserEmails(prev => [...prev, userEmail]);
    } else {
      setSelectedUserEmails(prev => prev.filter(email => email !== email));
    }
  };
  
  const areAllFilteredUsersSelected = useMemo(() => {
    if (filteredUsersForDialog.length === 0) return false;
    return filteredUsersForDialog.every(user => user.email && selectedUserEmails.includes(user.email));
  }, [filteredUsersForDialog, selectedUserEmails]);


  const handleConfirmSendNotifications = async () => {
    setIsSendingEmails(true);
    
    if (selectedUserEmails.length === 0) {
      toast({ title: "No se seleccionaron destinatarios", description: "Por favor, seleccione al menos un destinatario (Admin/Super User).", variant: "destructive" });
      setIsSendingEmails(false);
      return;
    }

    const emailSubject = `Nuevo Evento RCA Registrado: ${eventDescription.substring(0, 40)}... (ID: ${eventId})`;
    const emailBody = `Estimado/a,\n\nSe ha registrado un nuevo evento para Análisis de Causa Raíz:\n\nID del Evento: ${eventId}\nDescripción: ${eventDescription}\nSitio: ${eventSite || 'No especificado'}\n\nSe requiere su atención o conocimiento según corresponda.\n\nSaludos,\nSistema Asistente ACR`;
    
    let emailsSentCount = 0;
    for (const email of selectedUserEmails) {
      const result = await sendEmailAction({
        to: email,
        subject: emailSubject,
        body: emailBody,
      });
      if (result.success) emailsSentCount++;
    }
    
    toast({ 
      title: "Notificaciones de Evento", 
      description: `${emailsSentCount} de ${selectedUserEmails.length} correos fueron procesados exitosamente.`
    });
    setIsSendingEmails(false);
    onOpenChange(false); 
    setSelectedUserEmails([]);
    setEmailSearchTerm('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center"><Mail className="mr-2 h-5 w-5" />Notificar Creación de Evento</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">
            Evento: "${eventDescription.substring(0,50)}{eventDescription.length > 50 ? '...' : ''}" (ID: {eventId})
          </p>
          <Input 
            placeholder="Buscar Admin/Super User por nombre o correo..."
            value={emailSearchTerm}
            onChange={(e) => setEmailSearchTerm(e.target.value)}
          />
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="select-all-filtered-admin-emails" 
              checked={areAllFilteredUsersSelected && filteredUsersForDialog.length > 0}
              onCheckedChange={(checked) => handleSelectAllFilteredUsers(checked as boolean)} 
              disabled={filteredUsersForDialog.length === 0}
            />
            <Label htmlFor="select-all-filtered-admin-emails" className="text-sm font-medium">
              Seleccionar Todos los Filtrados ({filteredUsersForDialog.length})
            </Label>
          </div>
          <ScrollArea className="h-[180px] w-full rounded-md border p-2">
            {adminAndSuperUsers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No hay Admin/Super Users configurados para notificar.</p>
            ) : filteredUsersForDialog.length > 0 ? (
              filteredUsersForDialog.map(user => (
                user.email && (
                  <div key={user.id} className="flex items-center space-x-2 p-1.5 hover:bg-accent rounded-md">
                    <Checkbox
                      id={`user-email-notify-${user.id}`}
                      checked={selectedUserEmails.includes(user.email)}
                      onCheckedChange={(checked) => handleUserSelectionChange(user.email!, checked as boolean)}
                    />
                    <Label htmlFor={`user-email-notify-${user.id}`} className="text-xs cursor-pointer flex-grow">
                      {user.name} <span className="text-muted-foreground">({user.email}) - {user.role}</span>
                    </Label>
                  </div>
                )
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">No hay Admin/Super Users que coincidan con la búsqueda.</p>
            )}
          </ScrollArea>
          <div>
            <p className="text-xs text-muted-foreground">
              Seleccionados: {selectedUserEmails.length}
            </p>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" onClick={()=> { setEmailSearchTerm(''); setSelectedUserEmails([]);}} disabled={isSendingEmails}>Cancelar</Button>
          </DialogClose>
          <Button type="button" onClick={handleConfirmSendNotifications} disabled={isSendingEmails || selectedUserEmails.length === 0}>
            {isSendingEmails && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Enviar Notificaciones
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


// --- Step1Initiation Component ---
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
  onSaveAnalysis,
  onPrintReport,
  isSaving,
  onApproveEvent,
  onRejectEvent,
  isEventFinalized,
  currentEventStatus,
  validateStep1PreRequisites,
}) => {
  const { toast } = useToast();
  const { userProfile } = useAuth(); 
  const router = useRouter();
  const [clientSideMaxDate, setClientSideMaxDate] = useState<string | undefined>(undefined);
  const [isNotifyDialogOpen, setIsNotifyDialogOpen] = useState(false);
  const [eventDetailsForNotification, setEventDetailsForNotification] = useState<{id: string, description: string, site: string} | null>(null);
  const [navigationTaskUrl, setNavigationTaskUrl] = useState<string | null>(null);
  
  const sitesForDropdown = useMemo(() => {
    if (userProfile && userProfile.role !== 'Super User' && userProfile.empresa) {
      return availableSites.filter(site => site.empresa === userProfile.empresa);
    }
    return availableSites;
  }, [availableSites, userProfile]);

  const usersForDropdown = useMemo(() => {
    if (userProfile?.role === 'Super User') {
      return availableUsers;
    }
    const siteDetails = availableSites.find(s => s.name === eventData.place);
    const siteCompany = siteDetails?.empresa;

    if (!siteCompany) {
      // If no site is selected, or site has no company, show users that also have no company assigned.
      // This prevents mixing users from different companies if they exist.
      return availableUsers.filter(u => !u.empresa);
    }

    return availableUsers.filter(u => u.empresa === siteCompany);
  }, [availableUsers, availableSites, eventData.place, userProfile]);

  useEffect(() => {
    const getTodayDateString = () => {
      const today = new Date();
      // To format for the `max` attribute of a datetime-local input, we need "YYYY-MM-DD".
      const year = today.getFullYear();
      const month = String(today.getMonth() + 1).padStart(2, '0');
      const day = String(today.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };
    setClientSideMaxDate(getTodayDateString());
  }, []); 

  useEffect(() => {
    if (!isNotifyDialogOpen && navigationTaskUrl) {
      router.replace(navigationTaskUrl, { scroll: false });
      setNavigationTaskUrl(null); 
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNotifyDialogOpen, navigationTaskUrl]); 


  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>, field: keyof RCAEventData) => {
    onEventDataChange(field, e.target.value);
  };

  const handleSelectChange = (value: string, field: keyof Pick<RCAEventData, 'place' | 'eventType' | 'priority' | 'equipo'>) => {
    if (field === 'eventType') {
      onEventDataChange(field, value as EventType);
    } else if (field === 'priority') {
      onEventDataChange(field, value as PriorityType);
    } else { // 'place' or 'equipo'
      onEventDataChange(field, value);
    }
  };

  const handleActionChange = (index: number, field: keyof Omit<ImmediateAction, 'eventId' | 'id'>, value: string) => {
    onUpdateImmediateAction(index, field, value);
  };

  const handleActionResponsibleChange = (index: number, value: string) => {
    onUpdateImmediateAction(index, 'responsible', value);
  };
  
  const handlePrepareNotification = async () => {
    const validationResult = validateStep1PreRequisites();
    if (!validationResult.isValid && validationResult.message?.includes("Complete los campos obligatorios")) {
        toast({
            title: "Campos Incompletos",
            description: validationResult.message,
            variant: "destructive",
        });
        return;
    }
    
    // Ensure event is saved and has an ID before opening notification dialog
    const saveResult = await onSaveAnalysis(false, { suppressNavigation: true }); 
    
    if (saveResult.success) {
        const finalEventId = saveResult.newEventId || eventData.id; 
        if (!finalEventId) {
            toast({ title: "Error", description: "No se pudo obtener un ID para el evento.", variant: "destructive" });
            return;
        }
        setEventDetailsForNotification({
            id: finalEventId, 
            description: eventData.focusEventDescription,
            site: eventData.place
        });
        setNavigationTaskUrl(null);
        setIsNotifyDialogOpen(true);
    } else {
        toast({
            title: "Error al Guardar",
            description: "No se pudo guardar el evento antes de notificar. Intente guardar manualmente primero.",
            variant: "destructive"
        });
    }
  };
  
  const handleContinueToNextStep = async () => {
    const validationResult = validateStep1PreRequisites();
    if (!validationResult.isValid) {
      toast({
        title: "Acción Requerida",
        description: validationResult.message,
        variant: "destructive",
      });
      return;
    }
    
    if (!eventData.id) { 
      onForceEnsureEventId(); 
      const saveResult = await onSaveAnalysis(false, { suppressNavigation: false }); 
      if (!saveResult.success) return; 
    }
    onContinue();
  };

  const canUserManageEventState = useMemo(() => {
    if (!userProfile) return false;
    return userProfile.role === 'Admin' || userProfile.role === 'Super User';
  }, [userProfile]);

  const isManageStateButtonDisabled = isEventFinalized || isSaving || !canUserManageEventState;
  
  const getRejectButtonTitle = () => {
    if (!eventData.id && canUserManageEventState) return "Guarde el evento para habilitar opciones de estado.";
    if (isEventFinalized) return "El evento ya está finalizado, no se puede cambiar el estado.";
    if (currentEventStatus === 'Rechazado') return "El evento ya está rechazado.";
    if (!canUserManageEventState) return "No tiene permisos para gestionar el estado de este evento.";
    return "Aprobar o Rechazar este reporte de evento";
  };


  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Paso 1: Iniciación</CardTitle>
          <CardDescription>Información básica del evento y acciones inmediatas. ID Evento: <span className="font-semibold text-primary">{eventData.id || "Pendiente (se generará al guardar)"}</span></CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="place">Lugar del Evento <span className="text-destructive">*</span></Label>
            <Select onValueChange={(value) => handleSelectChange(value, 'place')} value={eventData.place}>
              <SelectTrigger id="place">
                <SelectValue placeholder="-- Seleccione un lugar --" />
              </SelectTrigger>
              <SelectContent>
                {sitesForDropdown.length > 0 ? (
                  sitesForDropdown.map(site => (
                    <SelectItem key={site.id} value={site.name}>{site.name}</SelectItem>
                  ))
                ) : (
                  <div className="p-2 text-sm text-muted-foreground text-center">No hay sitios configurados para su empresa</div>
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="equipo" className="flex items-center">
              <HardHat className="mr-2 h-4 w-4 text-primary" />
              Equipo Involucrado <span className="text-destructive">*</span>
            </Label>
            <Input 
              id="equipo" 
              value={eventData.equipo} 
              onChange={(e) => handleInputChange(e, 'equipo')} 
              placeholder="Ej: Bomba P-101, Molino SAG, Transformador Principal" 
            />
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
            <h3 className="text-lg font-semibold font-headline">Acciones Inmediatas (Opcional)</h3>
            {immediateActions.map((action, index) => (
              <Card key={action.id} className="p-4 space-y-3 bg-secondary/50">
                <div className="flex justify-between items-center">
                  <p className="font-medium text-sm text-primary">Acción Inmediata #{index + 1}</p>
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
                        {usersForDropdown.length > 0 ? (
                          usersForDropdown.map(user => (
                            <SelectItem key={user.id} value={user.name}>{user.name} ({user.email})</SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-sm text-muted-foreground text-center">No hay usuarios para esta empresa</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`ia-date-${index}`}>Fecha Límite</Label>
                    <Input 
                      id={`ia-date-${index}`} 
                      type="date" 
                      value={action.dueDate} 
                      onChange={(e) => handleActionChange(index, 'dueDate', e.target.value)}
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
        <CardFooter className="flex justify-between items-center gap-2 pt-4 border-t">
            <div className="mr-auto">
                <Button
                    variant="default"
                    onClick={onPrintReport}
                    className="w-full sm:w-auto"
                    title="Exportar el informe completo del análisis a PDF."
                >
                    <Printer className="mr-2 h-4 w-4" />
                    Exportar a PDF
                </Button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
              <Button 
                  onClick={handlePrepareNotification} 
                  variant="secondary" 
                  className="w-full sm:w-auto transition-transform hover:scale-105" 
                  disabled={isSaving || currentEventStatus === 'Rechazado' || isEventFinalized}
                  title={(currentEventStatus === 'Rechazado' || isEventFinalized) ? "Evento rechazado o finalizado." : "Guardar el evento y luego notificar su creación"}
              >
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  <Bell className="mr-2 h-4 w-4" /> Notificar Creación
              </Button>
              
              <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                  <Button 
                      variant="destructive" 
                      className="w-full sm:w-auto transition-transform hover:scale-105" 
                      disabled={isManageStateButtonDisabled}
                      title={getRejectButtonTitle()}
                  >
                      {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Settings2 className="mr-2 h-4 w-4" /> Gestionar Estado
                  </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Acciones de Estado</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                      onClick={onApproveEvent}
                      disabled={isSaving || currentEventStatus !== 'Pendiente' || isEventFinalized || !canUserManageEventState}
                      className="text-green-600 focus:bg-green-100 focus:text-green-700"
                  >
                      <CheckCircle className="mr-2 h-4 w-4" /> Aprobar Evento
                  </DropdownMenuItem>
                  <DropdownMenuItem
                      onClick={onRejectEvent}
                      disabled={isSaving || currentEventStatus === 'Rechazado' || currentEventStatus === 'Finalizado' || isEventFinalized || !canUserManageEventState}
                      className="text-red-600 focus:bg-red-100 focus:text-red-700"
                  >
                      <XCircle className="mr-2 h-4 w-4" /> Rechazar Reporte
                  </DropdownMenuItem>
                  </DropdownMenuContent>
              </DropdownMenu>

              <Button onClick={handleContinueToNextStep} className="w-full sm:w-auto transition-transform hover:scale-105" disabled={isSaving || isEventFinalized}>
                  {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Continuar
              </Button>
          </div>
        </CardFooter>
      </Card>

      {eventDetailsForNotification && (
        <NotifyEventCreationDialog
          isOpen={isNotifyDialogOpen}
          onOpenChange={(open) => {
            setIsNotifyDialogOpen(open);
            if (!open && navigationTaskUrl) { 
                router.replace(navigationTaskUrl, { scroll: false });
                setNavigationTaskUrl(null);
            }
          }}
          eventId={eventDetailsForNotification.id}
          eventDescription={eventDetailsForNotification.description}
          eventSite={eventDetailsForNotification.site}
          availableUsers={availableUsers}
          availableSites={availableSites}
        />
      )}
    </>
  );
};
