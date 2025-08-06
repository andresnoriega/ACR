
'use server';
/**
 * @fileOverview Paraphrases a structured phenomenon description into a fluid text.
 *
 * - paraphrasePhenomenon - A function that generates a fluid text from structured facts.
 * - ParaphrasePhenomenonInput - The input type for the paraphrasePhenomenon function.
 * - ParaphrasePhenomenonOutput - The return type for the paraphrasePhenomenon function.
 */

import { getAi } from '@/ai/genkit';
import {z} from 'zod';

const aiPromise = getAi();

const ParaphrasePhenomenonInputSchema = z.object({
  quien: z.string().optional().describe('Quién estuvo involucrado.'),
  que: z.string().optional().describe('Qué ocurrió.'),
  donde: z.string().optional().describe('Dónde ocurrió.'),
  cuando: z.string().optional().describe('Cuándo ocurrió (fecha y hora).'),
  cualCuanto: z.string().optional().describe('Cuál fue el impacto o tendencia.'),
  como: z.string().optional().describe('Cómo ocurrió la desviación.'),
});
export type ParaphrasePhenomenonInput = z.infer<typeof ParaphrasePhenomenonInputSchema>;

const ParaphrasePhenomenonOutputSchema = z.object({
  paraphrasedText: z.string().describe('El texto parafraseado y fluido del fenómeno.'),
});
export type ParaphrasePhenomenonOutput = z.infer<typeof ParaphrasePhenomenonOutputSchema>;

const promptPromise = aiPromise.then(ai => ai.definePrompt({
  name: 'paraphrasePhenomenonPrompt',
  model: 'googleai/gemini-1.5-pro-latest',
  input: {schema: ParaphrasePhenomenonInputSchema},
  output: {schema: ParaphrasePhenomenonOutputSchema},
  prompt: `
    Eres un experto en redacción técnica y análisis de incidentes.
    Tu tarea es tomar los siguientes datos estructurados de un evento y combinarlos en un único párrafo coherente, fluido y profesional en español.
    El párrafo debe describir el fenómeno de manera clara y concisa, como si fuera parte de un informe técnico. No uses viñetas.
    
    Datos del evento:
    - Desviación (Cómo): {{{como}}}
    - Evento (Qué): {{{que}}}
    - Lugar (Dónde): {{{donde}}}
    - Fecha y Hora (Cuándo): {{{cuando}}}
    - Impacto/Tendencia (Cuál/Cuánto): {{{cualCuanto}}}
    - Involucrados (Quién): {{{quien}}}

    Genera un único párrafo que integre esta información de forma natural.
  `,
}));

const paraphrasePhenomenonFlowPromise = aiPromise.then(ai => ai.defineFlow(
  {
    name: 'paraphrasePhenomenonFlow',
    inputSchema: ParaphrasePhenomenonInputSchema,
    outputSchema: ParaphrasePhenomenonOutputSchema,
  },
  async (input) => {
    const prompt = await promptPromise;
    const {output} = await prompt(input);
    if (!output) {
      return { paraphrasedText: "[IA no disponible: No se generó respuesta]" };
    }
    return output;
  }
));

export async function paraphrasePhenomenon(input: ParaphrasePhenomenonInput): Promise<ParaphrasePhenomenonOutput> {
  const ai = await aiPromise;
  if (ai.isMocked) {
    console.warn("Genkit 'ai' object is mocked. AI functionality will be disabled.");
    return { paraphrasedText: "[IA Deshabilitada por problemas de Genkit]" };
  }
  
  try {
    const paraphrasePhenomenonFlow = await paraphrasePhenomenonFlowPromise;
    const result = await paraphrasePhenomenonFlow(input);
    return result;
  } catch (error) {
    console.error("Error executing paraphrasePhenomenon:", error);
    let errorMessage = "[IA no disponible: Error al procesar la solicitud]";
    if (error instanceof Error) {
        if (error.message.includes("SERVICE_DISABLED") || error.message.includes("it is disabled")) {
          errorMessage = "[IA no disponible: La API de Lenguaje Generativo está deshabilitada. Habilítela en la consola de Google Cloud y reintente.]";
        } else {
          errorMessage += ` (${error.message})`;
        }
    }
    return { paraphrasedText: errorMessage };
  }
}
