
export type EventType = 'Incidente' | 'Accidente' | 'Falla de Equipo' | 'No Conformidad' | 'Evento Operacional' | '';
export type PriorityType = 'Alta' | 'Media' | 'Baja' | '';

export interface Company {
  id: string;
  name: string;
  rut: string; // Chilean RUT format e.g., 76.123.456-7
  adminName: string;
  adminEmail: string;
}

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

export interface IdentifiedRootCause {
  id: string;
  description: string;
}

// Definición del tipo Evidence
export interface Evidence {
  id: string;
  nombre: string;
  tipo: 'pdf' | 'jpg' | 'jpeg' | 'png' | 'doc' | 'docx' | 'other' | 'link';
  comment?: string;
  dataUrl: string;
}

export interface PlannedAction {
  id: string;
  eventId: string;
  description: string;
  responsible: string;
  dueDate: string;
  relatedRootCauseIds?: string[];
  evidencias?: Evidence[];
  userComments?: string;
  isNotificationSent?: boolean;
  markedAsReadyAt?: string;
}

export interface Validation {
  actionId: string;
  eventId: string;
  status: 'pending' | 'validated' | 'rejected';
  validatedAt?: string;
  rejectionReason?: string;
  rejectedAt?: string;
}

export type AnalysisTechnique = '' | 'Ishikawa' | 'CTM' | 'WhyWhy';

export interface IshikawaCause {
  id: string;
  description: string;
  status?: 'pending' | 'accepted' | 'rejected';
  validationMethod?: string;
}

export interface IshikawaCategory {
  id: string;
  name: string;
  causes: IshikawaCause[];
}

export type IshikawaData = IshikawaCategory[];


// --- Tree Structure for CTM ---
export interface LatentCause {
  id:string;
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
  physicalCauses: PhysicalCause[];
  status?: 'pending' | 'accepted' | 'rejected';
  validationMethod?: string;
}

export interface FailureMode {
  id: string;
  description: string;
  hypotheses: Hypothesis[];
}

export type CTMData = FailureMode[];

// --- 5 Whys Structure ---
export interface FiveWhy {
  id: string;
  why: string;
  because: string;
  status?: 'pending' | 'accepted' | 'rejected';
  validationMethod?: string;
  isRootCause?: boolean; // To mark the final root cause
}
export type FiveWhysData = FiveWhy[][];


export interface DetailedFacts {
  quien: string;
  que: string;
  donde: string;
  cuando: string;
  cualCuanto: string;
  como: string;
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
  "Manuales, planos, P&ID, catálogos, Normativa asociada, entre otras."
] as const;

export type PreservedFactCategory = typeof PRESERVED_FACT_CATEGORIES[number];

export interface PreservedFact {
  id: string;
  eventId: string;
  userGivenName: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  category: PreservedFactCategory | '';
  description: string;
  uploadDate: string;
  storagePath: string;
  downloadURL: string;
}

export interface FullUserProfile {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Analista' | 'Revisor' | 'Super User' | 'Usuario Pendiente' | '';
  permissionLevel: 'Total' | 'Lectura' | 'Limitado' | '';
  assignedSites?: string;
  emailNotifications?: boolean;
  empresa?: string;
  photoURL?: string;
}

// Types for Eventos Reportados page
export type ReportedEventType = 'Incidente' | 'Falla de Equipo' | 'Accidente' | 'No Conformidad' | 'Evento Operacional' | '';
export type ReportedEventStatus = 'Pendiente' | 'En análisis' | 'En validación' | 'Finalizado' | 'Rechazado' | '';


export interface ReportedEvent {
  id: string;
  title: string;
  site: string;
  equipo?: string;
  date: string;
  type: ReportedEventType;
  priority: PriorityType;
  status: ReportedEventStatus;
  description?: string;
  createdAt?: string;
  updatedAt?: string;
  empresa?: string;
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

export interface RejectionDetails {
  reason: string;
  rejectedBy: string;
  rejectedAt: string;
}

// --- Brainstorming Idea Types ---
export const BRAINSTORM_IDEA_TYPES = ['Humana', 'Técnica', 'Organizacional', 'Externa', 'Otra'] as const;
export type BrainstormIdeaType = typeof BRAINSTORM_IDEA_TYPES[number] | '';

export interface BrainstormIdea {
  id: string;
  type: BrainstormIdeaType;
  description: string;
}

// --- Timeline Event Type ---
export interface TimelineEvent {
  id: number;
  description: string;
  datetime: string;
}

// --- Investigation Team Types ---
export interface InvestigationTeamMember {
  id: string;
  name: string;
  position: string;
  site: string;
  role: string;
}

export interface InvestigationSession {
  id: string;
  sessionDate: string;
  members: InvestigationTeamMember[];
}


// Document structure for an ACR Analysis in Firestore
export interface RCAAnalysisDocument {
  // From Step 1
  eventData: RCAEventData;
  immediateActions: ImmediateAction[];
  // From Step 2
  projectLeader: string;
  detailedFacts: DetailedFacts;
  investigationObjective?: string;
  investigationSessions?: InvestigationSession[]; 
  analysisDetails: string;
  preservedFacts: PreservedFact[];
  // From Step 3
  timelineEvents?: TimelineEvent[];
  brainstormingIdeas?: BrainstormIdea[]; 
  analysisTechnique: AnalysisTechnique;
  analysisTechniqueNotes: string;
  ishikawaData: IshikawaData;
  fiveWhysData: FiveWhysData;
  ctmData: CTMData;
  identifiedRootCauses: IdentifiedRootCause[];
  plannedActions: PlannedAction[];
  // From Step 4
  validations: Validation[];
  // From Step 5
  finalComments: string;
  isFinalized: boolean;
  rejectionDetails?: RejectionDetails;
  // Metadata
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  empresa?: string;
}

// --- Type for User Action Plans Page ---
export interface ActionPlan {
  id: string;
  accionResumen: string;
  estado: 'Pendiente' | 'En proceso' | 'En Validación' | 'Completado' | 'Rechazado';
  plazoLimite: string;
  asignadoPor: string; 
  validatorName?: string; 
  tituloDetalle: string;
  descripcionDetallada: string;
  responsableDetalle: string;
  codigoRCA: string;
  evidencias: Evidence[];
  userComments?: string;
  userMarkedReadyDate?: string; 
  validationDate?: string; 
  ultimaActualizacion: {
    usuario: string;
    mensaje: string;
    fechaRelativa: string;
  };
  _originalRcaDocId: string;
  _originalActionId: string;
}
