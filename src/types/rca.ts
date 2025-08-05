
'use client';
// --- Common Enums and Types ---
export type EventType = 'Incidente' | 'Falla de Equipo' | 'Accidente' | 'No Conformidad' | 'Evento Operacional' | '';
export type PriorityType = 'Alta' | 'Media' | 'Baja' | '';
export type ReportedEventStatus = 'Pendiente' | 'En análisis' | 'En validación' | 'Finalizado' | 'Rechazado' | 'Verificado';

// --- Firestore Document Interfaces ---

export interface Company {
  id: string;
  name: string;
  rut: string;
  adminName: string;
  adminEmail: string;
}

export interface Site {
  id: string;
  name: string;
  address: string;
  country: string;
  coordinator?: string;
  description?: string;
  empresa?: string;
}

export interface FullUserProfile {
  id: string;
  name: string;
  email: string;
  role: 'Super User' | 'Admin' | 'Analista' | 'Revisor' | 'Usuario Pendiente' | '';
  permissionLevel: 'Total' | 'Lectura' | 'Limitado' | '';
  photoURL?: string;
  assignedSites?: string;
  emailNotifications?: boolean;
  empresa?: string;
}

// --- RCA Analysis Document Structure ---

export interface RCAEventData {
  id: string;
  place: string;
  equipo: string;
  date: string;
  eventType: EventType;
  priority: PriorityType;
  focusEventDescription: string;
  empresa?: string;
}

export interface ImmediateAction {
  id: string;
  eventId: string;
  description: string;
  responsible: string;
  dueDate: string;
}

export interface DetailedFacts {
  quien: string;
  que: string;
  donde: string;
  cuando: string; // Stored as 'YYYY-MM-DDTHH:MM'
  cualCuanto: string;
  como: string;
}

export interface InvestigationTeamMember {
  id: string;
  name: string;
  position: string;
  site: string;
  role: string;
}

export interface InvestigationSession {
  id: string;
  sessionDate: string; // 'YYYY-MM-DD'
  members: InvestigationTeamMember[];
}

export interface TimelineEvent {
    id: number;
    description: string;
    datetime: string; // 'YYYY-MM-DDTHH:MM'
}

export const BRAINSTORM_IDEA_TYPES = ['Causa Potencial', 'Consecuencia', 'Solución Potencial', 'Pregunta Abierta', 'Hecho no verificado'] as const;
export type BrainstormIdeaType = typeof BRAINSTORM_IDEA_TYPES[number] | '';

export interface BrainstormIdea {
    id: string;
    type: BrainstormIdeaType;
    description: string;
}

export type AnalysisTechnique = 'Ishikawa' | '5 Por qué' | 'CTM' | '';

export interface IshikawaCause {
  id: string;
  description: string;
  status: 'pending' | 'accepted' | 'rejected';
  validationMethod?: string;
}
export interface IshikawaCategory {
  id: string;
  name: string;
  causes: IshikawaCause[];
}
export type IshikawaData = IshikawaCategory[];


export interface FiveWhysCause {
  id: string;
  description: string;
  status: 'pending' | 'accepted' | 'rejected';
  validationMethod?: string;
}
export interface FiveWhysEntry {
  id: string;
  why: string;
  becauses: FiveWhysCause[];
}
export type FiveWhysData = FiveWhysEntry[];

export interface LatentCause {
  id: string;
  description: string;
}
export interface HumanCause {
  id: string;
  description: string;
  latentCauses: LatentCause[];
}
export interface PhysicalCause {
  id: string;
  description: string;
  humanCauses: HumanCause[];
}
export interface Hypothesis {
  id: string;
  description: string;
  physicalCauses?: PhysicalCause[];
  status: 'pending' | 'accepted' | 'rejected';
  validationMethod?: string;
}
export interface FailureMode {
  id: string;
  description: string;
  hypotheses: Hypothesis[];
}
export type CTMData = FailureMode[];


export interface IdentifiedRootCause {
  id: string;
  description: string;
}

export interface Evidence {
  id: string;
  nombre: string;
  tipo?: 'pdf' | 'jpg' | 'png' | 'jpeg' | 'doc' | 'docx' | 'link' | 'other' | string;
  dataUrl?: string; // Optional because a fact can be created before a file is attached
  comment?: string;
  uploadDate: string; // ISO string
  userGivenName?: string; // Name given by user in the input
  storagePath?: string; // Optional: To track file in Firebase Storage if used
}

export const PRESERVED_FACT_CATEGORIES = [
    "Partes, Posición, Personas, Papel y Paradigmas",
    "Fotografías o videos del Evento",
    "Datos operacionales (Sensores, Vibraciones, etc.)",
    "Registro mantenimientos y pruebas realizadas",
    "Procedimientos",
    "Entrevistas",
    "PT, AST, OT",
    "Charlas",
    "Manuales, planos, P&ID, catálogos, Normativa asociada",
    "Otras"
] as const;

export type PreservedFactCategory = typeof PRESERVED_FACT_CATEGORIES[number] | '';

export interface PreservedFact extends Omit<Evidence, 'uploadDate'> {
  uploadDate: string; // ISO string for when the fact was preserved
  downloadURL?: string; // URL to view/download the file from Storage
  category: PreservedFactCategory; // New field for categorization
}


export interface PlannedAction {
  id: string;
  eventId: string;
  description: string;
  responsible: string;
  dueDate: string;
  relatedRootCauseIds: string[];
  evidences: Evidence[];
  userComments?: string;
  isNotificationSent: boolean;
  markedAsReadyAt?: string; // ISO string
}

export interface ActionPlan {
    id: string;
    _originalRcaDocId: string;
    _originalActionId: string;
    accionResumen: string;
    estado: 'Pendiente' | 'En proceso' | 'En Validación' | 'Completado' | 'Rechazado';
    plazoLimite: string; // 'dd/MM/yyyy'
    asignadoPor: string;
    validatorName: string;
    tituloDetalle: string;
    descripcionDetallada: string;
    responsableDetalle: string;
    codigoRCA: string;
    evidencias: Evidence[];
    userComments: string;
    userMarkedReadyDate?: string; // 'dd/MM/yyyy HH:mm'
    validationDate?: string; // 'dd/MM/yyyy HH:mm'
    ultimaActualizacion: {
        usuario: string;
        mensaje: string;
        fechaRelativa: string;
    };
}


export interface Validation {
  actionId: string;
  eventId: string;
  status: 'pending' | 'validated' | 'rejected';
  validatedAt?: string; // ISO string
  rejectedAt?: string; // ISO string
  rejectionReason?: string;
}

export interface RejectionDetails {
  reason: string;
  rejectedBy: string;
  rejectedAt: string; // ISO string
}

export interface EfficacyVerification {
  status: 'pending' | 'verified';
  verifiedBy: string;
  verifiedAt: string; // ISO String
  comments: string;
  verificationDate: string; // YYYY-MM-DD
}

export interface RCAAnalysisDocument {
  eventData: RCAEventData;
  immediateActions: ImmediateAction[];
  projectLeader: string;
  detailedFacts: DetailedFacts;
  investigationObjective: string;
  investigationSessions: InvestigationSession[];
  analysisDetails: string;
  timelineEvents: TimelineEvent[];
  brainstormingIdeas: BrainstormIdea[];
  analysisTechnique: AnalysisTechnique;
  analysisTechniqueNotes: string;
  ishikawaData: IshikawaData;
  fiveWhysData: FiveWhysData;
  ctmData: CTMData;
  identifiedRootCauses: IdentifiedRootCause[];
  plannedActions: PlannedAction[];
  preservedFacts: PreservedFact[];
  validations: Validation[];
  finalComments: string;
  leccionesAprendidas: string;
  isFinalized: boolean;
  rejectionDetails?: RejectionDetails;
  efficacyVerification: EfficacyVerification;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  createdBy?: string;
  empresa?: string;
}

// --- Used in frontend components, not directly in DB ---

export interface ReportedEvent {
    id: string;
    title: string;
    site: string;
    equipo: string;
    date: string; // 'YYYY-MM-DD'
    type: EventType;
    priority: PriorityType;
    status: ReportedEventStatus;
    description: string;
    createdAt?: string; // ISO string
    updatedAt: string; // ISO string
    empresa?: string;
}

export interface EfficacyVerificationTask {
    rcaId: string;
    rcaTitle: string;
    objective: string;
    finalizedDate: string; // ISO string
}

export type ReportedEventType = 'Incidente' | 'Falla de Equipo' | 'Accidente' | 'No Conformidad' | 'Evento Operacional' | '';
