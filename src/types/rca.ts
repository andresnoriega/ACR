
export type EventType = 'Incidente' | 'Accidente' | 'Falla' | 'No Conformidad' | '';
export type PriorityType = 'Alta' | 'Media' | 'Baja' | '';

export interface RCAEventData {
  id: string;
  place: string;
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
  status: 'pending' | 'validated';
  validatedAt?: string; // ISO string, new field
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
  role: 'Admin' | 'Analista' | 'Revisor' | 'Super User' | '';
  permissionLevel: 'Total' | 'Lectura' | 'Limitado' | '';
  // password field should NOT be stored here if using Firebase Auth.
  // Firebase Auth handles passwords securely.
  // password?: string; // REMOVE this if using Firebase Auth and storing profile in Firestore
  assignedSites?: string;
  emailNotifications?: boolean;
}

// Types for Eventos Reportados page
export type ReportedEventType = 'Incidente' | 'Fallo' | 'Accidente' | 'No Conformidad' | '';
export type ReportedEventStatus = 'Pendiente' | 'En análisis' | 'En validación' | 'Finalizado' | 'Rechazado' | '';


export interface ReportedEvent {
  id: string;
  title: string;
  site: string;
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
  country: string; // Changed from zone to country
  coordinator?: string;
  description?: string;
}

export interface RejectionDetails {
  reason: string;
  rejectedBy: string;
  rejectedAt: string; // ISO string
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
  rejectionDetails?: RejectionDetails; // Nuevo campo
  // Metadata
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  createdBy?: string; // User ID (Firebase UID) or name
}
