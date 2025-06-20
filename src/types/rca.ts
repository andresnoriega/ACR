
export type EventType = 'Incidente' | 'Accidente' | 'Falla de Equipo' | 'No Conformidad' | 'Evento Operacional' | '';
export type PriorityType = 'Alta' | 'Media' | 'Baja' | '';

export interface RCAEventData {
  id: string;
  place: string;
  equipo: string; // Nuevo campo
  date: string;
  eventType: EventType;
  priority: PriorityType;
  focusEventDescription: string;
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
  tipo: 'pdf' | 'jpg' | 'jpeg' | 'png' | 'doc' | 'docx' | 'other'; // Added 'jpeg', 'png', 'doc'
  comment?: string; // Nuevo campo para comentario de evidencia
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
  status: 'pending' | 'validated' | 'rejected'; // Added 'rejected'
  validatedAt?: string; // ISO string
  rejectionReason?: string; // New field for rejection reason
  rejectedAt?: string; // ISO string, when it was rejected
}

export type AnalysisTechnique = '' | 'WhyWhy' | 'Ishikawa' | 'CTM';

export interface IshikawaCause {
  id: string;
  description: string;
}

export interface IshikawaCategory {
  id: string;
  name: string;
  causes: IshikawaCause[];
}

export type IshikawaData = IshikawaCategory[];

export interface FiveWhyEntry {
  id: string;
  why: string;
  because: string;
}

export type FiveWhysData = FiveWhyEntry[];

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
  physicalCauses: PhysicalCause[];
}

export interface FailureMode {
  id: string;
  description: string;
  hypotheses: Hypothesis[];
}

export type CTMData = FailureMode[];

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
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  category: PreservedFactCategory | '';
  description: string;
  uploadDate: string;
}

export interface FullUserProfile {
  id: string; // This will be the Firebase Auth UID
  name: string;
  email: string; // Should match Firebase Auth email
  role: 'Admin' | 'Analista' | 'Revisor' | 'Super User' | 'Usuario Pendiente' | '';
  permissionLevel: 'Total' | 'Lectura' | 'Limitado' | '';
  assignedSites?: string;
  emailNotifications?: boolean;
  empresa?: string; // New field for company
}

// Types for Eventos Reportados page
export type ReportedEventType = 'Incidente' | 'Fallo de Equipo' | 'Accidente' | 'No Conformidad' | 'Evento Operacional' | '';
export type ReportedEventStatus = 'Pendiente' | 'En análisis' | 'En validación' | 'Finalizado' | 'Rechazado' | '';


export interface ReportedEvent {
  id: string;
  title: string;
  site: string;
  equipo?: string; // Nuevo campo
  date: string;
  type: ReportedEventType;
  priority: PriorityType;
  status: ReportedEventStatus;
  description?: string;
  createdAt?: string; // ISO string
  updatedAt?: string; // ISO string
}

export interface Site {
  id: string;
  name: string;
  address: string;
  country: string;
  coordinator?: string;
  description?: string;
  empresa?: string; // New field for company
}

export interface RejectionDetails {
  reason: string;
  rejectedBy: string;
  rejectedAt: string; // ISO string
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
  id: number; // Using Date.now() which is a number
  description: string;
  datetime: string; // "YYYY-MM-DDTHH:MM" format for datetime-local input
}

// Document structure for an RCA Analysis in Firestore
export interface RCAAnalysisDocument {
  // From Step 1
  eventData: RCAEventData;
  immediateActions: ImmediateAction[];
  // From Step 2
  projectLeader: string;
  detailedFacts: DetailedFacts;
  analysisDetails: string;
  preservedFacts: PreservedFact[];
  // From Step 3
  timelineEvents?: TimelineEvent[]; // New field for timeline
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
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  createdBy?: string; // User NAME who created the analysis document
}
