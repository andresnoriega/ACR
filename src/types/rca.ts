
export interface RCAEventData {
  id: string;
  place: string;
  date: string;
  focusEventDescription: string;
}

export interface ImmediateAction {
  id: string;
  description: string;
  responsible: string;
  dueDate: string;
}

export interface PlannedAction {
  id: string;
  eventId: string;
  description: string;
  responsible: string;
  dueDate: string;
}

export interface Validation {
  actionId: string; // Corresponds to PlannedAction.id
  status: 'pending' | 'validated';
}

export interface AIInsights {
  summary: string;
  potentialRootCauses: string;
  recommendations: string;
}

export type AnalysisTechnique = '' | 'WhyWhy' | 'Ishikawa' | 'CTM';

// Types for Interactive Ishikawa Diagram
export interface IshikawaCause {
  id: string; // Unique ID for React key, e.g., 'cause-timestamp-random'
  description: string;
}

export interface IshikawaCategory {
  id: string; // e.g., 'measurement', 'machinery'
  name: string; // e.g., 'Medición', 'Maquinaria'
  causes: IshikawaCause[];
}

export type IshikawaData = IshikawaCategory[];

// Types for Interactive 5 Whys
export interface FiveWhyEntry {
  id: string; // Unique ID for React key
  why: string; // The "Why?" question
  because: string; // The "Because..." answer/reason
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
