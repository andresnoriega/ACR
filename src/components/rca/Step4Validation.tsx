
'use client';
import * as React from "react";
import type { FC } from 'react';
import { useMemo, useState, useEffect } from 'react'; // Added useEffect
import type { PlannedAction, Validation, FullUserProfile, Evidence } from '@/types/rca';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input'; 
import {
 Accordion,
 AccordionContent,
 AccordionItem,
} from "@/components/ui/accordion";
import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown, CheckCircle2, Circle, Eye, FileText, ImageIcon, Paperclip, Loader2, Save, MessageSquare, CalendarCheck, History, Info, XCircle, AlertTriangle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { cn } from '@/lib/utils';
import { format, parseISO, isValid as isValidDate } from 'date-fns';
import { es } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea'; 
import { sendEmailAction } from '@/app/actions';


interface Step4ValidationProps {
  plannedActions: PlannedAction[];
  validations: Validation[];
  onToggleValidation: (actionId: string, newStatus: Validation['status'], rejectionReason?: string) => Promise<void>; 
  projectLeader: string;
  availableUserProfiles: FullUserProfile[]; 
  onPrevious: () => void;
  onNext: () => void;
  onSaveAnalysis: (showToast?: boolean) => Promise<void>;
  isSaving: boolean;
}

const getEvidenceIconLocal = (tipo?: Evidence['tipo']) => {
  if (!tipo) return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500" />;
  switch (tipo.toLowerCase()) {
    case 'pdf': return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-red-600" />;
    case 'jpg': case 'jpeg': case 'png': case 'gif': return <ImageIcon className="h-4 w-4 mr-2 flex-shrink-0 text-blue-600" />;
    case 'doc': case 'docx': return <Paperclip className="h-4 w-4 mr-2 flex-shrink-0 text-sky-700" />;
    default: return <FileText className="h-4 w-4 mr-2 flex-shrink-0 text-gray-500" />;
  }
};

const ViewEvidenceDialog: FC<{ evidence: Evidence | null; isOpen: boolean; onClose: () => void }> = ({ evidence, isOpen, onClose }) => {
  if (!evidence) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center">
            {getEvidenceIconLocal(evidence.tipo)}
            Detalles de la Evidencia
          </DialogTitle>
          <DialogDescription>
            Información registrada para la evidencia: {evidence.nombre}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 py-3 text-sm">
          <p><strong>Nombre:</strong> {evidence.nombre}</p>
          <p><strong>Tipo:</strong> {evidence.tipo || "No especificado"}</p>
          <div className="mt-2">
            <p><strong>Comentario del Usuario:</strong></p>
            <div 
              className="mt-1 p-2 border rounded-md bg-muted/50 text-xs whitespace-pre-wrap overflow-auto max-h-[150px]"
            >
              {evidence.comment && evidence.comment.trim() ? (
                evidence.comment
              ) : (
                <span className="italic text-muted-foreground">Sin comentarios adicionales.</span>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline">Cerrar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const RejectActionDialog: FC<{
  action: PlannedAction;
  isOpen: boolean;
  onClose: () => void;
  onConfirmReject: (actionId: string, reason: string) => Promise<void>;
}> = ({ action, isOpen, onClose, onConfirmReject }) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      return;
    }
    setIsSubmitting(true);
    await onConfirmReject(action.id, reason);
    setIsSubmitting(false);
    setReason(''); 
    onClose();
  };
  
  useEffect(() => {
    if (isOpen) {
      setReason('');
    }
  }, [isOpen]);


  return (
    <Dialog open={isOpen} onOpenChange={(open) => {if(!isSubmitting) onClose()}}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center"><XCircle className="mr-2 h-5 w-5 text-destructive" />Rechazar Acción Planificada</DialogTitle>
          <DialogDescription>
            Está a punto de rechazar la acción: "{action.description}". Por favor, proporcione un motivo.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="rejectionReason">Motivo del Rechazo <span className="text-destructive">*</span></Label>
          <Textarea
            id="rejectionReason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Explique por qué se rechaza esta acción..."
            rows={3}
            className="mt-1"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancelar</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={!reason.trim() || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar Rechazo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};


export const Step4Validation: FC<Step4ValidationProps> = ({
  plannedActions,
  validations,
  onToggleValidation,
  projectLeader,
  availableUserProfiles, 
  onPrevious,
  onNext,
  onSaveAnalysis,
  isSaving,
}) => {
  const { toast } = useToast();
  const [isSavingLocally, setIsSavingLocally] = useState(false);
  const [viewingEvidence, setViewingEvidence] = useState<Evidence | null>(null);
  const [rejectingAction, setRejectingAction] = useState<PlannedAction | null>(null);
  const [isProcessingEmail, setIsProcessingEmail] = useState(false);


  const uniquePlannedActions = useMemo(() => {
    if (!Array.isArray(plannedActions)) {
      return [];
    }
    const seenIds = new Set<string>();
    return plannedActions.filter(action => {
      if (!action || !action.id) { 
        return false;
      }
      if (seenIds.has(action.id)) {
        return false;
      }
      seenIds.add(action.id);
      return true;
    });
  }, [plannedActions]);

  const getValidation = (actionId: string): Validation | undefined => {
    return validations.find(v => v.actionId === actionId);
  };
  
  const canValidateActions = (loggedInUserName: string | null): boolean => {
    if (!loggedInUserName) return false; 
    const currentUserProfile = availableUserProfiles.find(up => up.name === loggedInUserName);
    if (!currentUserProfile) return false;
    if (currentUserProfile.name === projectLeader) return true;
    if (currentUserProfile.role === 'Admin' && currentUserProfile.permissionLevel === 'Total') return true;
    if (currentUserProfile.role === 'Super User') return true;
    return false;
  };

  const handleValidateClick = async (actionId: string) => {
    const currentValidation = getValidation(actionId);
    const newStatus = currentValidation?.status === 'validated' ? 'pending' : 'validated';
    setIsSavingLocally(true);
    await onToggleValidation(actionId, newStatus);
    setIsSavingLocally(false);
    if (newStatus === 'validated') {
      toast({ title: "Acción Validada", description: "La acción ha sido marcada como validada.", className: "bg-green-500 text-white" });
    } else {
      toast({ title: "Estado Cambiado", description: "La acción ahora está pendiente." });
    }
  };

  const handleRejectClick = (action: PlannedAction) => {
    setRejectingAction(action);
  };

  const handleConfirmRejectAction = async (actionId: string, reason: string) => {
    const actionBeingRejected = uniquePlannedActions.find(act => act.id === actionId);
    if (!actionBeingRejected) {
      toast({ title: "Error", description: "Acción no encontrada.", variant: "destructive" });
      setRejectingAction(null);
      return;
    }

    setIsSavingLocally(true);
    setIsProcessingEmail(true);
    try {
      await onToggleValidation(actionId, 'rejected', reason); 

      const responsibleUserName = actionBeingRejected.responsible;
      const responsibleUser = availableUserProfiles.find(up => up.name === responsibleUserName);

      let emailNotificationStatus = "No se pudo determinar el estado del envío de correo.";
      if (responsibleUser && responsibleUser.email) {
        const emailSubject = `Acción RCA Rechazada: ${actionBeingRejected.description.substring(0, 30)}...`;
        const eventId = actionBeingRejected.eventId; 
        
        const emailBody = `Estimado/a ${responsibleUser.name},\n\nLa siguiente acción planificada ha sido RECHAZADA en el análisis RCA (ID Evento: ${eventId}):\n\nAcción: ${actionBeingRejected.description}\nMotivo del Rechazo: ${reason}\n\nPor favor, revise la acción y tome las medidas necesarias.\n\nSaludos,\nSistema RCA Assistant`;
        
        const emailResult = await sendEmailAction({
          to: responsibleUser.email,
          subject: emailSubject,
          body: emailBody,
        });
        if (emailResult.success) {
          emailNotificationStatus = `Notificación de rechazo enviada a ${responsibleUser.name}.`;
        } else {
          emailNotificationStatus = `Se intentó enviar notificación a ${responsibleUser.name}, pero falló: ${emailResult.message}`;
        }
      } else {
        emailNotificationStatus = `No se pudo enviar notificación: responsable "${responsibleUserName}" no encontrado o sin email.`;
      }
      
      toast({ 
        title: "Acción Rechazada", 
        description: `La acción ha sido marcada como rechazada. ${emailNotificationStatus}`,
        variant: "destructive",
        duration: 7000
      });

    } catch (error) {
      toast({ title: "Error", description: "Ocurrió un error al rechazar la acción.", variant: "destructive" });
      console.error("Error during reject action confirmation:", error);
    } finally {
      setIsSavingLocally(false);
      setIsProcessingEmail(false);
      setRejectingAction(null);
    }
  };


  const handleSaveProgressLocal = async () => {
    setIsSavingLocally(true);
    await onSaveAnalysis(); 
    setIsSavingLocally(false);
  };

  const handleNextLocal = async () => {
    const pendingActions = uniquePlannedActions.filter(action => {
      const validation = getValidation(action.id);
      return !validation || validation.status === 'pending';
    });

    if (pendingActions.length > 0) {
      toast({
        title: "Acciones Pendientes de Decisión",
        description: `Aún hay ${pendingActions.length} acción(es) que no han sido validadas ni rechazadas. Por favor, revise todas las acciones.`,
        variant: "destructive",
        duration: 7000,
      });
      return;
    }

    const rejectedActions = uniquePlannedActions.filter(action => {
      const validation = getValidation(action.id);
      return validation?.status === 'rejected';
    });

    if (rejectedActions.length > 0) {
      toast({
        title: "Acciones Rechazadas Presentes",
        description: `Existen ${rejectedActions.length} acción(es) rechazadas. No puede continuar hasta que todas las acciones estén validadas.`,
        variant: "destructive",
        duration: 7000,
      });
      return;
    }

    setIsSavingLocally(true);
    await onSaveAnalysis(false); 
    setIsSavingLocally(false);
    onNext();
  };

  const isStepSaving = isSaving || isSavingLocally || isProcessingEmail;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="font-headline">Paso 4: Validación de Acciones</CardTitle>
          <CardDescription>
            El Líder del Proyecto o un Administrador (con Edición Total) valida o rechaza la efectividad de las acciones implementadas. Expanda cada acción para ver detalles.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 max-w-sm">
             <p className="text-sm text-muted-foreground">
              El líder del proyecto actual es: <strong>{projectLeader || "No asignado"}</strong>.
              La validación debe ser realizada por el Líder del Proyecto o un Administrador/Super User.
            </p>
          </div>

          <div className="space-y-2 pt-4 border-t">
            {uniquePlannedActions.length === 0 ? (
              <p className="text-muted-foreground">No hay acciones planificadas para validar. Por favor, agréguelas en el Paso 3.</p>
            ) : (
              <Accordion type="multiple" className="w-full">
                {uniquePlannedActions.map((action) => {
                  const validation = getValidation(action.id);
                  const status = validation?.status || 'pending';
                  
                  const hasInformationToVisualize = 
                    (action.evidencias && action.evidencias.length > 0) || 
                    (action.userComments && action.userComments.trim() !== '') || 
                    action.markedAsReadyAt;

                  const isReadyForValidationByLeader = 
                    (action.evidencias && action.evidencias.length > 0) || 
                    (action.userComments && action.userComments.trim() !== '') || 
                    action.markedAsReadyAt;
                  
                  const showNotReadyWarning = !isReadyForValidationByLeader && status === 'pending';
                  
                  let statusDisplay;
                  let statusColorClass = "text-muted-foreground";
                  let StatusIcon = Circle;

                  if (status === 'validated') {
                    statusDisplay = "Validado";
                    statusColorClass = "text-green-600";
                    StatusIcon = CheckCircle2;
                  } else if (status === 'rejected') {
                    statusDisplay = "Rechazado";
                    statusColorClass = "text-destructive";
                    StatusIcon = XCircle;
                  } else {
                    statusDisplay = "Pendiente";
                  }
                  
                  return (
                    <AccordionItem value={action.id} key={action.id} className="border-b">
                      <Card className="shadow-none border-0 rounded-none w-full">
                        <AccordionPrimitive.Header className="flex items-center p-4 w-full">
                          <div className="flex-shrink-0 pr-3" title={hasInformationToVisualize && status === 'pending' ? "Esta acción tiene información adjunta (evidencias/comentarios) y está pendiente de validación." : undefined}>
                            {hasInformationToVisualize && status === 'pending' ? (
                              <Info className="h-5 w-5 text-blue-500" />
                            ) : (
                              <div className="w-5 h-5"></div> 
                            )}
                          </div>
                          <AccordionPrimitive.Trigger className="flex flex-1 items-center text-left hover:underline focus:outline-none group data-[state=open]:text-primary">
                            <div className="flex-1">
                              <h4 className="font-semibold">{action.description}</h4>
                              <p className="text-xs text-muted-foreground">Responsable: {action.responsible} | Límite: {action.dueDate || 'N/A'} | ID: {action.id.substring(0,10)}...</p>
                            </div>
                            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                          </AccordionPrimitive.Trigger>

                          <div className="flex items-center space-x-2 ml-4 shrink-0 pl-2">
                            <span className={cn("text-sm font-medium flex items-center", statusColorClass)}>
                              <StatusIcon className="mr-1.5 h-5 w-5" /> {statusDisplay}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleValidateClick(action.id)}
                              disabled={isStepSaving || status === 'validated' || showNotReadyWarning}
                              className={cn(status === 'validated' ? "bg-green-100 hover:bg-green-200 text-green-700" : "hover:bg-green-50", "transition-colors")}
                              title={showNotReadyWarning ? "Acción no lista para validar" : (status === 'validated' ? "Validado (Click para marcar como pendiente)" : "Marcar como Validado")}
                            >
                              {status === 'validated' ? 'Validado' : 'Validar'}
                            </Button>
                            {status !== 'validated' && (
                               <Button
                                variant="outline"
                                size="sm"
                                onClick={() => status === 'rejected' ? onToggleValidation(action.id, 'pending') : handleRejectClick(action)}
                                disabled={isStepSaving}
                                className={cn(status === 'rejected' ? "bg-red-100 hover:bg-red-200 text-red-700" : "hover:bg-red-50", "transition-colors")}
                                title={status === 'rejected' ? "Rechazado (Click para marcar como pendiente)" : "Rechazar esta acción"}
                              >
                                {status === 'rejected' ? 'Anular Rechazo' : 'Rechazar'}
                              </Button>
                            )}
                          </div>
                        </AccordionPrimitive.Header>
                        <AccordionContent className="p-4 pt-0">
                          <div className="space-y-4 text-xs pl-2 border-l-2 border-primary/30 ml-1">
                            {action.markedAsReadyAt && isValidDate(parseISO(action.markedAsReadyAt)) && (
                              <div>
                                <h5 className="font-semibold text-primary/90 mb-0.5 flex items-center"><History className="mr-1.5 h-3.5 w-3.5" />Marcado como Listo el:</h5>
                                <p className="ml-5">{format(parseISO(action.markedAsReadyAt), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                              </div>
                            )}
                             {status === 'validated' && validation?.validatedAt && isValidDate(parseISO(validation.validatedAt)) && (
                                  <div>
                                      <h5 className="font-semibold text-green-600 mb-0.5 flex items-center">
                                          <CalendarCheck className="mr-1.5 h-3.5 w-3.5" />
                                          Validado el:
                                      </h5>
                                      <p className="ml-5">{format(parseISO(validation.validatedAt), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                                  </div>
                              )}
                              {status === 'rejected' && validation?.rejectedAt && isValidDate(parseISO(validation.rejectedAt)) && (
                                  <div>
                                      <h5 className="font-semibold text-destructive mb-0.5 flex items-center">
                                          <XCircle className="mr-1.5 h-3.5 w-3.5" />
                                          Rechazado el:
                                      </h5>
                                      <p className="ml-5">{format(parseISO(validation.rejectedAt), 'dd/MM/yyyy HH:mm', { locale: es })}</p>
                                      <p className="font-semibold text-destructive mb-0.5 flex items-center mt-1"><MessageSquare className="mr-1.5 h-3.5 w-3.5" />Motivo del Rechazo:</p>
                                      <p className="ml-5 whitespace-pre-wrap p-1.5 bg-red-50 rounded-sm">{validation.rejectionReason || "No se proporcionó motivo."}</p>
                                  </div>
                              )}
                            <div>
                              <h5 className="font-semibold text-primary/90 mb-0.5 flex items-center"><MessageSquare className="mr-1.5 h-3.5 w-3.5" />Comentarios del Usuario (Responsable):</h5>
                              {action.userComments && action.userComments.trim() ? (
                                <p className="whitespace-pre-wrap p-1.5 bg-muted/30 rounded-sm ml-5">{action.userComments}</p>
                              ) : (
                                <p className="text-muted-foreground ml-5">No hay comentarios del usuario.</p>
                              )}
                            </div>
                            
                            <div>
                              <h5 className="font-semibold text-primary/90 mb-0.5 flex items-center"><FileText className="mr-1.5 h-3.5 w-3.5" />Evidencias Adjuntas:</h5>
                              {action.evidencias && action.evidencias.length > 0 ? (
                                <ul className="space-y-1 ml-5">
                                  {action.evidencias.map(ev => (
                                    <li key={ev.id} className="flex items-center justify-between bg-muted/30 p-1.5 rounded-sm">
                                      <div className="flex items-center">
                                        {getEvidenceIconLocal(ev.tipo)}
                                        <span className="text-xs">{ev.nombre}</span>
                                      </div>
                                      <Button variant="link" size="sm" className="p-0 h-auto text-xs" onClick={() => setViewingEvidence(ev)}>
                                        <Eye className="mr-1 h-3 w-3"/>Ver
                                      </Button>
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="text-muted-foreground ml-5">No hay evidencias adjuntas.</p>
                              )}
                            </div>
                            
                            {showNotReadyWarning && (
                               <p className="text-xs text-yellow-600 bg-yellow-50 p-2 rounded-md border border-yellow-200 ml-5 flex items-center">
                                  <AlertTriangle className="h-4 w-4 mr-2 shrink-0" />
                                  Esta acción aún no ha sido marcada como lista por el responsable. No se puede validar.
                               </p>
                            )}

                          </div>
                        </AccordionContent>
                      </Card>
                    </AccordionItem>
                  );
                })}
              </Accordion>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex flex-col sm:flex-row justify-between gap-2 pt-4 border-t">
          <Button onClick={onPrevious} variant="outline" className="w-full sm:w-auto transition-transform hover:scale-105" disabled={isStepSaving}>Anterior</Button>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            <Button onClick={handleSaveProgressLocal} variant="secondary" className="w-full sm:w-auto transition-transform hover:scale-105" disabled={isStepSaving}>
                {isStepSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Save className="mr-2 h-4 w-4" /> Guardar Avance
            </Button>
            <Button onClick={handleNextLocal} className="w-full sm:w-auto transition-transform hover:scale-105" disabled={isStepSaving}>
                {isStepSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Siguiente
            </Button>
          </div>
        </CardFooter>
      </Card>
      <ViewEvidenceDialog
        evidence={viewingEvidence}
        isOpen={!!viewingEvidence}
        onClose={() => setViewingEvidence(null)}
      />
      {rejectingAction && (
        <RejectActionDialog
          action={rejectingAction}
          isOpen={!!rejectingAction}
          onClose={() => setRejectingAction(null)}
          onConfirmReject={handleConfirmRejectAction}
        />
      )}
    </>
  );
};
