
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
  detailedFactsSummary: z.string().describe('A summary of the detailed facts (who, what, where, when, how, which/how much).'),
  analysisTechnique: z.string().optional().describe('The primary analysis technique used (e.g., Ishikawa, 5 Whys, CTM).'),
  analysisTechniqueNotes: z.string().optional().describe('Specific notes or findings from the chosen analysis technique.'),
  identifiedRootCauses: z.array(z.string()).describe('A list of the identified root causes.'),
  plannedActionsSummary: z.array(z.string()).describe('A list of summaries for the planned corrective actions.'),
});
export type GenerateRcaInsightsInput = z.infer<typeof GenerateRcaInsightsInputSchema>;

const GenerateRcaInsightsOutputSchema = z.object({
  summary: z.string().describe('A comprehensive summary and insights derived from the RCA data.'),
});
export type GenerateRcaInsightsOutput = z.infer<typeof GenerateRcaInsightsOutputSchema>;

/*
// Temporarily disabled due to Genkit plugin installation issues

const prompt = ai.definePrompt({
  name: 'generateRcaInsightsPrompt',
  input: {schema: GenerateRcaInsightsInputSchema},
  output: {schema: GenerateRcaInsightsOutputSchema},
  prompt: \`
    You are an expert RCA (Root Cause Analysis) analyst. Based on the following information from an RCA process,
    generate a concise and insightful executive summary. This summary should be suitable for inclusion in the "Final Comments"
    section of the RCA report.

    Highlight:
    1.  A brief restatement of the core problem (focus event).
    2.  The most critical root cause(s) identified.
    3.  The key corrective action(s) proposed to address these root causes.
    4.  Any significant learnings or broader implications if apparent from the data.
    5.  Maintain a professional and objective tone.

    Do NOT invent information. Stick to the data provided.
    If a piece of information (like analysis technique notes) is missing or not provided, acknowledge its absence implicitly by not referring to it.

    RCA Data:
    - Event Focus: {{{focusEventDescription}}}
    - Summary of Facts: {{{detailedFactsSummary}}}
    {{#if analysisTechnique}}- Analysis Technique Used: {{{analysisTechnique}}}{{/if}}
    {{#if analysisTechniqueNotes}}- Notes from Analysis Technique: {{{analysisTechniqueNotes}}}{{/if}}
    - Identified Root Causes:
      {{#each identifiedRootCauses}}
      - {{{this}}}
      {{else}}
      - No specific root causes were detailed.
      {{/each}}
    - Planned Corrective Actions:
      {{#each plannedActionsSummary}}
      - {{{this}}}
      {{else}}
      - No specific planned actions were detailed.
      {{/each}}

    Generate the summary below:
  \`,
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
*/

export async function generateRcaInsights(input: GenerateRcaInsightsInput): Promise<GenerateRcaInsightsOutput> {
  try {
    // Check if 'ai' is properly initialized and not the mock (by checking for a unique property of the real ai object if available, or just proceed)
    // A more robust check could be to see if ai.generate is the mocked version.
    if (typeof ai.generate === 'function' && ai.generate.toString().includes("AI is mocked")) {
        console.warn("Genkit 'ai' object is mocked. AI insights disabled.");
        return { summary: "[Resumen IA Deshabilitado por problemas de Genkit]" };
    }

    // If ai.defineFlow was mocked, generateRcaInsightsFlowInternal might not be the actual flow.
    // Instead, we check if the 'ai' object itself seems to be the mock from genkit.ts
    // This section would call the actual flow if it were not disabled.
    // For now, we directly return the disabled message if the mock is detected.
    // const result = await generateRcaInsightsFlowInternal(input);
    // return result;
    
    console.warn("Attempted to call generateRcaInsights, but AI functionality is likely disabled or mocked.");
    return { summary: "[Resumen IA Deshabilitado Temporalmente]" };


  } catch (error) {
    console.error("Error executing generateRcaInsights (AI potentially disabled/mocked):", error);
    let errorMessage = "[Resumen IA no disponible: Error al procesar la solicitud con IA]";
    if (error instanceof Error) {
        errorMessage += ` (${error.message})`;
    }
    return { summary: errorMessage };
  }
}

