
'use server';

// Este archivo centraliza todas las acciones de servidor,
// especialmente las que invocan los flujos de IA de Genkit.

import { generateRcaInsights, type GenerateRcaInsightsInput, type GenerateRcaInsightsOutput } from '@/ai/flows/generate-rca-insights';
import { paraphrasePhenomenon, type ParaphrasePhenomenonInput, type ParaphrasePhenomenonOutput } from '@/ai/flows/paraphrase-phenomenon';
import { suggestLatentRootCauses, type SuggestLatentRootCausesInput, type SuggestLatentRootCausesOutput } from '@/ai/flows/suggest-root-causes';
import { sendEmailAction as sendEmail } from '@/lib/sendgrid';

/**
 * Server Action to generate RCA insights.
 */
export async function generateRcaInsightsAction(input: GenerateRcaInsightsInput): Promise<GenerateRcaInsightsOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { summary: "[IA no disponible: La API Key de Gemini no está configurada en el backend.]" };
  }
  return generateRcaInsights(input);
}

/**
 * Server Action to paraphrase a phenomenon.
 */
export async function paraphrasePhenomenonAction(input: ParaphrasePhenomenonInput): Promise<ParaphrasePhenomenonOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
   if (!apiKey) {
    return { paraphrasedText: "[IA no disponible: La API Key de Gemini no está configurada en el backend.]" };
  }
  return paraphrasePhenomenon(input);
}

/**
 * Server Action to suggest latent root causes.
 */
export async function suggestLatentRootCausesAction(input: SuggestLatentRootCausesInput): Promise<SuggestLatentRootCausesOutput> {
  const apiKey = process.env.GEMINI_API_KEY;
   if (!apiKey) {
    return { suggestedLatentCauses: ["[IA no disponible: La API Key de Gemini no está configurada en el backend.]"] };
  }
  return suggestLatentRootCauses(input);
}

/**
 * Server Action to send an email.
 * @param payload - The email details.
 * @returns A promise that resolves with a success or error message.
 */
export async function sendEmailAction(payload: {
  to: string;
  subject: string;
  body: string;
  htmlBody?: string;
}): Promise<{ success: boolean; message: string }> {
  // You can add extra validation or logging here if needed
  return sendEmail(payload);
}
