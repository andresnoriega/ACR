'use server';
/**
 * @fileOverview Suggests potential latent root causes based on validated findings from various analysis techniques.
 *
 * - suggestLatentRootCauses - The main function to generate suggestions.
 * - SuggestLatentRootCausesInput - The input type for the function.
 * - SuggestLatentRootCausesOutput - The return type for the function.
 */

import { ai } from '@/ai/dev';
import {z} from 'zod';


// --- Ishikawa Schemas ---
const IshikawaCauseSchema = z.object({
  id: z.string(),
  description: z.string(),
  status: z.enum(['pending', 'accepted', 'rejected']).optional(),
  validationMethod: z.string().optional(),
});

const IshikawaCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  causes: z.array(IshikawaCauseSchema),
});

const IshikawaDataSchema = z.array(IshikawaCategorySchema).optional();

// --- 5 Whys Schemas ---
const FiveWhysCauseSchema = z.object({
  id: z.string(),
  description: z.string(),
  status: z.enum(['pending', 'accepted', 'rejected']).optional(),
  validationMethod: z.string().optional(),
});

const FiveWhysEntrySchema = z.object({
  id: z.string(),
  why: z.string(),
  becauses: z.array(FiveWhysCauseSchema),
});

const FiveWhysDataSchema = z.array(FiveWhysEntrySchema).optional();

// --- CTM Schemas ---
const CtmLatentCauseSchema = z.object({
  id: z.string(),
  description: z.string(),
});

const CtmHumanCauseSchema = z.object({
  id: z.string(),
  description: z.string(),
  latentCauses: z.array(CtmLatentCauseSchema),
});

const CtmPhysicalCauseSchema = z.object({
  id: z.string(),
  description: z.string(),
  humanCauses: z.array(CtmHumanCauseSchema),
});

const CtmHypothesisSchema = z.object({
  id: z.string(),
  description: z.string(),
  physicalCauses: z.array(CtmPhysicalCauseSchema).optional(),
  status: z.enum(['pending', 'accepted', 'rejected']).optional(),
  validationMethod: z.string().optional(),
});

const CtmFailureModeSchema = z.object({
  id: z.string(),
  description: z.string(),
  hypotheses: z.array(CtmHypothesisSchema),
});

const CTMDataSchema = z.array(CtmFailureModeSchema).optional();


// --- Main Input/Output Schemas ---
const SuggestLatentRootCausesInputSchema = z.object({
  focusEventDescription: z.string().describe('The main event being analyzed.'),
  analysisTechnique: z.string().describe('The name of the analysis technique used (e.g., Ishikawa, 5 Whys, CTM).'),
  ishikawaData: IshikawaDataSchema.describe('Data from the Ishikawa diagram analysis.'),
  fiveWhysData: FiveWhysDataSchema.describe('Data from the 5 Whys analysis.'),
  ctmData: CTMDataSchema.describe('Data from the Causal Tree Mapping (CTM) analysis.'),
  existingRootCauses: z.array(z.string()).optional().describe('A list of already identified root causes to avoid suggesting duplicates.'),
});
export type SuggestLatentRootCausesInput = z.infer<typeof SuggestLatentRootCausesInputSchema>;


const SuggestLatentRootCausesOutputSchema = z.object({
  suggestedLatentCauses: z.array(z.string()).describe('An array of strings, each being a suggested latent root cause.'),
});
export type SuggestLatentRootCausesOutput = z.infer<typeof SuggestLatentRootCausesOutputSchema>;


const prompt = ai.definePrompt({
  name: 'suggestLatentRootCausesPrompt',
  model: 'googleai/gemini-1.5-pro-latest',
  input: { schema: SuggestLatentRootCausesInputSchema },
  output: { schema: SuggestLatentRootCausesOutputSchema },
  prompt: `
    Eres un experto de clase mundial en Análisis de Causa Raíz (ACR), especializado en identificar causas raíz latentes (sistémicas, organizacionales, de gestión).
    Tu tarea es analizar los hallazgos de una investigación de un incidente y sugerir de 2 a 4 posibles causas raíz latentes que podrían haber contribuido al evento.

    **Importante**:
    1.  Las sugerencias deben ser **causas latentes**, no causas físicas directas o errores humanos simples. Piensa en sistemas, procedimientos, cultura, gestión, diseño, etc.
    2.  Las sugerencias deben estar escritas en **español**.
    3.  No sugieras causas que ya han sido identificadas por el usuario.
    4.  Basa tus sugerencias ÚNICAMENTE en la información validada proporcionada. No inventes detalles.

    **Información del Evento:**
    -   **Evento Foco:** {{{focusEventDescription}}}
    -   **Técnica de Análisis Utilizada:** {{{analysisTechnique}}}

    **Hallazgos Validados de la Investigación (Usa esta información como base principal):**

    {{#if ishikawaData}}
    -   **Causas Validadas de Ishikawa:**
        {{#each ishikawaData}}
            {{#if this.causes.length}}
            **Categoría {{this.name}}:**
                {{#each this.causes}}
                - {{{this.description}}}
                {{/each}}
            {{/if}}
        {{/each}}
    {{/if}}

    {{#if fiveWhysData}}
    -   **Causas Validadas de 5 Porqués:**
        {{#each fiveWhysData}}
            {{#if this.becauses.length}}
            **Análisis para "{{this.why}}":**
                {{#each this.becauses}}
                - Causa validada: {{{this.description}}}
                {{/each}}
            {{/if}}
        {{/each}}
    {{/if}}

    {{#if ctmData}}
    -   **Causas Latentes de Hipótesis Validadas en CTM:**
        {{#each ctmData}}
            {{#if this.hypotheses.length}}
            **Modo de Falla: {{this.description}}**
                {{#each this.hypotheses}}
                    {{#each this.physicalCauses}}
                        {{#each this.humanCauses}}
                            {{#each this.latentCauses}}
                            - {{{this.description}}}
                            {{/each}}
                        {{/each}}
                    {{/each}}
                {{/each}}
            {{/if}}
        {{/each}}
    {{/if}}

    {{#if existingRootCauses}}
    **Causas Raíz Ya Identificadas (No las repitas):**
    {{#each existingRootCauses}}
    - {{{this}}}
    {{/each}}
    {{/if}}

    Ahora, basándote en la información validada anterior, genera tus sugerencias de causas raíz latentes.
  `,
});

const suggestLatentRootCausesFlow = ai.defineFlow(
  {
    name: 'suggestLatentRootCausesFlow',
    inputSchema: SuggestLatentRootCausesInputSchema,
    outputSchema: SuggestLatentRootCausesOutputSchema,
  },
  async (input) => {
    
    // Pre-filter data to only include accepted items
    const filteredIshikawa = input.ishikawaData?.map(cat => ({
      ...cat,
      causes: cat.causes.filter(c => c.status === 'accepted')
    })).filter(cat => cat.causes.length > 0);

    const filtered5Whys = input.fiveWhysData?.map(entry => ({
      ...entry,
      becauses: entry.becauses.filter(b => b.status === 'accepted')
    })).filter(entry => entry.becauses.length > 0);

    const filteredCtm = input.ctmData?.map(fm => ({
      ...fm,
      hypotheses: fm.hypotheses.filter(h => h.status === 'accepted')
    })).filter(fm => fm.hypotheses.length > 0);

    const hasValidatedData = 
        (filteredIshikawa && filteredIshikawa.length > 0) ||
        (filtered5Whys && filtered5Whys.length > 0) ||
        (filteredCtm && filteredCtm.length > 0);

    if (!hasValidatedData) {
        return { suggestedLatentCauses: ["No hay suficientes causas validadas en la técnica seleccionada para generar sugerencias con IA. Por favor, valide algunas causas primero."] };
    }
    
    // Create a new input object for the prompt with only the filtered data
    const promptInput = {
      ...input,
      ishikawaData: filteredIshikawa,
      fiveWhysData: filtered5Whys,
      ctmData: filteredCtm,
    };
    
    const { output } = await prompt(promptInput);

    if (!output || !output.suggestedLatentCauses || output.suggestedLatentCauses.length === 0) {
      return { suggestedLatentCauses: ["La IA no generó nuevas sugerencias o hubo un error. Intente de nuevo o revise los datos de entrada."] };
    }
    return output;
  }
);


export async function suggestLatentRootCauses(input: SuggestLatentRootCausesInput): Promise<SuggestLatentRootCausesOutput> {
  try {
    const result = await suggestLatentRootCausesFlow(input);
    return result;
  } catch (error) {
    console.error("Error executing suggestLatentRootCauses:", error);
    let errorMessage = "Error al procesar la solicitud con IA.";
    if (error instanceof Error) {
        if (error.message.includes("API_KEY_SERVICE_BLOCKED") || error.message.includes("SERVICE_DISABLED") || error.message.includes("it is disabled")) {
            errorMessage = "[IA no disponible] La API de Lenguaje Generativo está deshabilitada. Habilítela en Google Cloud y reintente.";
        } else {
             errorMessage += ` (${error.message})`;
        }
    }
    return { suggestedLatentCauses: [`[Sugerencias IA no disponibles] ${errorMessage}`] };
  }
}
