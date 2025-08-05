
'use server';
/**
 * @fileOverview Generates insights and a summary for an RCA process.
 *
 * - generateRcaInsights - A function that generates RCA insights.
 * - GenerateRcaInsightsInput - The input type for the generateRcaInsights function.
 * - GenerateRcaInsightsOutput - The return type for the generateRcaInsights function.
 */

import {ai} from '@/ai/genkit';
import { z } from 'zod'; 

const GenerateRcaInsightsInputSchema = z.object({
  focusEventDescription: z.string().describe('The main description of the event being analyzed.'),
  equipo: z.string().optional().describe('El equipo principal involucrado en el evento.'), // Nuevo campo
  detailedFactsSummary: z.string().describe('A summary of the detailed facts (who, what, where, when, how, which/how much).'),
  analysisTechnique: z.string().optional().describe('The primary analysis technique used (e.g., Ishikawa, 5 Whys, CTM).'),
  analysisTechniqueNotes: z.string().optional().describe('Specific notes or findings from the chosen analysis technique.'),
  identifiedRootCauses: z.array(z.string()).describe('A list of the identified root causes.'),
  plannedActionsSummary: z.array(z.string()).describe('A list of summaries for the planned corrective actions.'),
});
export type GenerateRcaInsightsInput = z.infer<typeof GenerateRcaInsightsInputSchema>;

const GenerateRcaInsightsOutputSchema = z.object({
  summary: z.string().describe('A comprehensive summary and insights derived from the RCA data, written in Spanish.'),
});
export type GenerateRcaInsightsOutput = z.infer<typeof GenerateRcaInsightsOutputSchema>;

const prompt = ai.definePrompt({
  name: 'generateRcaInsightsPrompt',
  model: 'googleai/gemini-1.5-pro-latest',
  input: {schema: GenerateRcaInsightsInputSchema},
  output: {schema: GenerateRcaInsightsOutputSchema},
  prompt: `
    Usted es un analista experto en ACR (Análisis de Causa Raíz). Basándose en la siguiente información de un proceso ACR,
    genere un resumen ejecutivo conciso y perspicaz. Este resumen debe ser adecuado para su inclusión en la sección "Comentarios Finales"
    del informe ACR.

    **Importante: El resumen ejecutivo DEBE estar escrito en ESPAÑOL.**

    Destaque:
    1.  Una breve reformulación del problema central (evento foco).
    2.  El equipo involucrado, si se especifica.
    3.  La(s) causa(s) raíz más crítica(s) identificada(s).
    4.  La(s) acción(es) correctiva(s) clave propuesta(s) para abordar estas causas raíz.
    5.  Cualquier aprendizaje significativo o implicación más amplia si se desprende de los datos.
    6.  Mantenga un tono profesional y objetivo.

    NO invente información. Cíñase a los datos proporcionados.
    Si falta una pieza de información (como notas de la técnica de análisis), reconozca su ausencia implícitamente al no referirse a ella.

    Datos del ACR:
    - Evento Foco: {{{focusEventDescription}}}
    {{#if equipo}}- Equipo Involucrado: {{{equipo}}}{{/if}}
    - Resumen de Hechos: {{{detailedFactsSummary}}}
    {{#if analysisTechnique}}- Técnica de Análisis Utilizada: {{{analysisTechnique}}}{{/if}}
    {{#if analysisTechniqueNotes}}- Notas de la Técnica de Análisis: {{{analysisTechniqueNotes}}}{{/if}}
    - Causas Raíz Identificadas:
      {{#each identifiedRootCauses}}
      - {{{this}}}
      {{else}}
      - No se detallaron causas raíz específicas.
      {{/each}}
    - Acciones Correctivas Planificadas:
      {{#each plannedActionsSummary}}
      - {{{this}}}
      {{else}}
      - No se detallaron acciones planificadas específicas.
      {{/each}}

    Genere el resumen a continuación:
  `,
});

const generateRcaInsightsFlowInternal = ai.defineFlow(
  {
    name: 'generateRcaInsightsFlow',
    inputSchema: GenerateRcaInsightsInputSchema,
    outputSchema: GenerateRcaInsightsOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      console.error("The AI model did not return an output for generateRcaInsightsFlow. Input:", input);
      return { summary: "[Resumen IA no disponible: El modelo no generó una respuesta válida]" };
    }
    return output;
  }
);


export async function generateRcaInsights(input: GenerateRcaInsightsInput): Promise<GenerateRcaInsightsOutput> {
  // Check if the AI object is a mock, indicating an initialization issue.
  if (ai.isMocked) {
      console.warn("Genkit 'ai' object is mocked. AI insights will be disabled.");
      return { summary: "[Resumen IA Deshabilitado por problemas de Genkit]" };
  }

  try {
    const result = await generateRcaInsightsFlowInternal(input);
    return result;

  } catch (error) {
    console.error("Error executing generateRcaInsights:", error);
    let errorMessage = "[Resumen IA no disponible: Error al procesar la solicitud con IA]";
    if (error instanceof Error) {
        if (error.message.includes("API key not valid")) {
            errorMessage = "[Resumen IA no disponible: La API Key de Google AI no es válida. Verifique la configuración.]";
        } else if (error.message.includes("model may not exist")) {
            errorMessage = "[Resumen IA no disponible: El modelo configurado no existe o no está disponible.]";
        } else if (error.message.includes("Must supply a `model`")) {
             errorMessage = "[Resumen IA no disponible: Problema con la configuración del modelo o la API Key. Verifique la consola.]";
        } else if (error.message.includes("SERVICE_DISABLED") || error.message.includes("it is disabled")) {
            errorMessage = "[Resumen IA no disponible: La API de Lenguaje Generativo está deshabilitada. Habilítela en la consola de Google Cloud y reintente.]";
        } else {
            errorMessage += ` (${error.message})`;
        }
    }
    return { summary: errorMessage };
  }
}
