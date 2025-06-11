
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
