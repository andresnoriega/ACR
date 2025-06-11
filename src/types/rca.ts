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
