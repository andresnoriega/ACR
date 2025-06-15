
'use server';
/**
 * @fileOverview Sugiere posibles causas raíz basadas en la información de análisis proporcionada.
 *
 * - suggestRootCauses - Una función que genera sugerencias de causas raíz.
 * - SuggestRootCausesInput - El tipo de entrada para la función suggestRootCauses.
 * - SuggestRootCausesOutput - El tipo de retorno para la función suggestRootCauses.
 */

import {ai} from '@/ai/genkit';
import { z } from 'zod';
import type { AnalysisTechnique, IshikawaData, FiveWhysData, CTMData } from '@/types/rca'; // Asegúrate de que las rutas y tipos sean correctos

// --- Zod Schemas para los datos de las técnicas ---
// Estos deben coincidir con las definiciones en '@/types/rca' o ser una representación simplificada si es necesario.

const IshikawaCauseSchema = z.object({
  id: z.string(),
  description: z.string(),
});

const IshikawaCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  causes: z.array(IshikawaCauseSchema),
});

const IshikawaDataSchema = z.array(IshikawaCategorySchema);

const FiveWhyEntrySchema = z.object({
  id: z.string(),
  why: z.string(),
  because: z.string(),
});

const FiveWhysDataSchema = z.array(FiveWhyEntrySchema);

const LatentCauseSchema = z.object({
  id: z.string(),
  description: z.string(),
});

const HumanCauseSchema = z.object({
  id: z.string(),
  description: z.string(),
  latentCauses: z.array(LatentCauseSchema),
});

const PhysicalCauseSchema = z.object({
  id: z.string(),
  description: z.string(),
  humanCauses: z.array(HumanCauseSchema),
});

const HypothesisSchema = z.object({
  id: z.string(),
  description: z.string(),
  physicalCauses: z.array(PhysicalCauseSchema),
});

const FailureModeSchema = z.object({
  id: z.string(),
  description: z.string(),
  hypotheses: z.array(HypothesisSchema),
});

const CTMDataSchema = z.array(FailureModeSchema);


// --- Esquema de Entrada ---
const SuggestRootCausesInputSchema = z.object({
  focusEventDescription: z.string().describe('La descripción principal del evento que se está analizando.'),
  analysisTechnique: z.enum(['', 'WhyWhy', 'Ishikawa', 'CTM']).describe('La técnica de análisis principal seleccionada.'),
  analysisTechniqueNotes: z.string().optional().describe('Notas generales o específicas sobre la aplicación de la técnica de análisis.'),
  ishikawaData: IshikawaDataSchema.optional().describe('Datos del diagrama de Ishikawa, si esa fue la técnica utilizada.'),
  fiveWhysData: FiveWhysDataSchema.optional().describe('Datos del análisis de los 5 Porqués, si esa fue la técnica utilizada.'),
  ctmData: CTMDataSchema.optional().describe('Datos del Árbol de Causas (CTM), si esa fue la técnica utilizada.'),
});
export type SuggestRootCausesInput = z.infer<typeof SuggestRootCausesInputSchema>;


// --- Esquema de Salida ---
const SuggestRootCausesOutputSchema = z.object({
  suggestedRootCauses: z.array(z.string().describe("Una causa raíz potencial identificada por la IA.")).describe('Una lista de descripciones de posibles causas raíz.'),
});
export type SuggestRootCausesOutput = z.infer<typeof SuggestRootCausesOutputSchema>;


// --- Prompt de Genkit ---
const suggestRootCausesPrompt = ai.definePrompt({
  name: 'suggestRootCausesPrompt',
  model: 'googleai/gemini-1.5-flash-latest', // Asegúrate que este modelo esté disponible y configurado
  input: { schema: SuggestRootCausesInputSchema },
  output: { schema: SuggestRootCausesOutputSchema },
  prompt: `
    Eres un experto analista de RCA (Análisis de Causa Raíz).
    Basado en la siguiente información, sugiere una lista de posibles causas raíz.
    Sé conciso y directo en tus sugerencias.

    Evento Foco:
    {{{focusEventDescription}}}

    {{#if analysisTechnique}}
    Técnica de Análisis Utilizada: {{{analysisTechnique}}}
      {{#if analysisTechniqueNotes}}
      Notas sobre la Técnica: {{{analysisTechniqueNotes}}}
      {{/if}}
    {{else}}
    No se seleccionó una técnica de análisis específica, pero pueden existir notas generales.
      {{#if analysisTechniqueNotes}}
      Notas Generales del Análisis: {{{analysisTechniqueNotes}}}
      {{/if}}
    {{/if}}

    {{#if ishikawaData}}
    Datos del Diagrama de Ishikawa:
    {{#each ishikawaData}}
      Categoría: {{this.name}}
      {{#each this.causes}}
        - Causa: {{this.description}}
      {{/each}}
    {{/each}}
    {{/if}}

    {{#if fiveWhysData}}
    Datos del Análisis de los 5 Porqués:
    {{#each fiveWhysData}}
      {{this.why}} -> Porque: {{this.because}}
    {{/each}}
    {{/if}}

    {{#if ctmData}}
    Datos del Árbol de Causas (CTM):
    {{#each ctmData}}
      Modo de Falla: {{this.description}}
      {{#each this.hypotheses}}
        - Hipótesis: {{this.description}}
        {{#each this.physicalCauses}}
          -- Causa Física: {{this.description}}
          {{#each this.humanCauses}}
            --- Causa Humana: {{this.description}}
            {{#each this.latentCauses}}
              ---- Causa Latente: {{this.description}}
            {{/each}}
          {{/each}}
        {{/each}}
      {{/each}}
    {{/each}}
    {{/if}}

    Considera toda la información anterior. Ahora, genera una lista de posibles causas raíz.
    Cada causa raíz debe ser una descripción clara y accionable.
    Devuelve SOLO un array de strings con las causas raíz sugeridas.
  `,
});


// --- Flujo de Genkit ---
const suggestRootCausesFlowInternal = ai.defineFlow(
  {
    name: 'suggestRootCausesFlow',
    inputSchema: SuggestRootCausesInputSchema,
    outputSchema: SuggestRootCausesOutputSchema,
  },
  async (input) => {
    // Validar que al menos uno de los datos de técnica esté presente si la técnica está seleccionada
    if (input.analysisTechnique === 'Ishikawa' && (!input.ishikawaData || input.ishikawaData.length === 0)) {
      return { suggestedRootCauses: ["[Sugerencia IA no disponible: Faltan datos para Ishikawa.]"] };
    }
    if (input.analysisTechnique === 'WhyWhy' && (!input.fiveWhysData || input.fiveWhysData.length === 0)) {
       return { suggestedRootCauses: ["[Sugerencia IA no disponible: Faltan datos para 5 Porqués.]"] };
    }
     if (input.analysisTechnique === 'CTM' && (!input.ctmData || input.ctmData.length === 0)) {
       return { suggestedRootCauses: ["[Sugerencia IA no disponible: Faltan datos para CTM.]"] };
    }

    const { output } = await suggestRootCausesPrompt(input);
    if (!output || !output.suggestedRootCauses) {
      console.error("La IA no devolvió una salida válida para suggestRootCausesFlow. Input:", input);
      return { suggestedRootCauses: ["[Sugerencia IA no disponible: El modelo no generó una respuesta válida.]"] };
    }
    return output;
  }
);

// --- Función Exportada ---
export async function suggestRootCauses(input: SuggestRootCausesInput): Promise<SuggestRootCausesOutput> {
   try {
    // Simple check if ai.generate might be mocked (can be more sophisticated)
    if (typeof ai.generate === 'function' && ai.generate.toString().includes("AI is mocked")) {
        console.warn("Genkit 'ai' object is mocked. AI root cause suggestions will be disabled.");
        return { suggestedRootCauses: ["[Sugerencias IA Deshabilitadas por problemas de Genkit]"] };
    }
    
    const result = await suggestRootCausesFlowInternal(input);
    return result;

  } catch (error) {
    console.error("Error executing suggestRootCauses:", error);
    let errorMessage = "[Sugerencia IA no disponible: Error al procesar la solicitud con IA]";
    if (error instanceof Error) {
        errorMessage += ` (${error.message})`;
    }
     if (error instanceof Error && (error.message.includes("API key not valid") || error.message.includes("model may not exist") || error.message.includes("Must supply a `model`"))) {
        errorMessage = `[Sugerencia IA no disponible: Problema con la configuración del modelo o API Key. Verifique la consola.] (${error.message})`;
    }
    return { suggestedRootCauses: [errorMessage] };
  }
}
