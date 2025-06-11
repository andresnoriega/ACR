
export interface RCAEventData {
  id: string;
  place: string;
  date: string;
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

export interface PlannedAction {
  id: string;
  eventId: string;
  description: string;
  responsible: string;
  dueDate: string;
  // relatedRootCauseIds?: string[]; // Futura mejora para vincular a causas raíz específicas
}

export interface Validation {
  actionId: string; 
  eventId: string; 
  status: 'pending' | 'validated';
}

export type AnalysisTechnique = '' | 'WhyWhy' | 'Ishikawa' | 'CTM';

// Types for Interactive Ishikawa Diagram
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

// Types for Interactive 5 Whys
export interface FiveWhyEntry {
  id: string; 
  why: string; 
  because: string; 
}

export type FiveWhysData = FiveWhyEntry[];

// Types for Interactive CTM (Cause Tree Method)
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

// Types for Detailed Facts in Step 2
export interface DetailedFacts {
  quien: string;
  que: string;
  donde: string;
  cuando: string;
  cualCuanto: string;
  como: string;
}

// Types for Preserved Facts in Step 2
export const PRESERVED_FACT_CATEGORIES = [
  "Partes, Posición, Personas, Papel y Paradigmas",
  "Fotografías o videos del Evento",
  "Datos operacionales (Sensores, Vibraciones, etc.)",
  "Registro mantenimientos y pruebas realizadas",
  "Procedimientos",
  "Entrevistas",
  "PT, AST, OT", // (Permisos de Trabajo, Análisis Seguro de Trabajo, Órdenes de Trabajo)
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
