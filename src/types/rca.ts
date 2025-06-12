
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
  tipo: 'pdf' | 'jpg' | 'docx' | 'other';
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
}

export interface Validation {
  actionId: string;
  eventId: string;
  status: 'pending' | 'validated';
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
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Analista' | 'Revisor' | '';
  permissionLevel: 'Total' | 'Lectura' | 'Limitado' | '';
  // Optional fields from UserConfigProfile, if needed globally, otherwise handle in component
  assignedSites?: string;
  emailNotifications?: boolean; 
}

// Types for Eventos Reportados page
export type ReportedEventType = 'Incidente' | 'Fallo' | 'Accidente' | 'No Conformidad' | '';
export type ReportedEventStatus = 'Pendiente' | 'En análisis' | 'Finalizado' | '';

export interface ReportedEvent {
  id: string;
  title: string;
  site: string;
  date: string; // Store as YYYY-MM-DD for sorting/filtering, format for display
  type: ReportedEventType;
  priority: PriorityType; // Reuse PriorityType
  status: ReportedEventStatus;
  description?: string;
}

// Global Site type definition
export interface Site {
  id: string; // Firestore document ID
  name: string;
  address: string;
  zone: string;
  coordinator?: string;
  description?: string;
}
