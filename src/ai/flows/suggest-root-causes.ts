
'use server';
/**
 * @fileOverview Sugiere posibles causas raíz latentes basadas en la información de análisis proporcionada.
 *
 * - suggestRootCauses - Una función que genera sugerencias de causas raíz latentes.
 * - SuggestRootCausesInput - El tipo de entrada para la función suggestRootCauses.
 * - SuggestRootCausesOutput - El tipo de retorno para la función suggestRootCauses.
 */

import {ai} from '@/ai/genkit';
import { z } from 'zod';
import type { AnalysisTechnique, IshikawaData, CTMData, FiveWhysData, BrainstormIdeaType } from '@/types/rca'; // Asegúrate de que las rutas y tipos sean correctos
import { BRAINSTORM_IDEA_TYPES } from '@/types/rca';

// --- Zod Schemas para los datos de las técnicas ---

const IshikawaCauseSchema = z.object({
  id: z.string(),
  description: z.string(),
  status: z.enum(['pending', 'accepted', 'rejected']).optional().nullable(),
  validationMethod: z.string().optional().nullable(),
});

const IshikawaCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  causes: z.array(IshikawaCauseSchema),
});

const IshikawaDataSchema = z.array(IshikawaCategorySchema).optional().nullable();

const FiveWhysCauseSchema = z.object({
    id: z.string(),
    description: z.string(),
    status: z.enum(['pending', 'accepted', 'rejected']).optional().nullable(),
    validationMethod: z.string().optional().nullable(),
});

const FiveWhysEntrySchema = z.object({
  id: z.string(),
  why: z.string().describe('La pregunta del "porqué".'),
  becauses: z.array(FiveWhysCauseSchema).describe('Las respuestas o "porque".'),
});
const FiveWhysDataSchema = z.array(FiveWhysEntrySchema).optional().nullable();


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

const HypothesisSchema: z.ZodType<any> = z.lazy(() => z.object({
  id: z.string(),
  description: z.string(),
  physicalCauses: z.array(PhysicalCauseSchema).optional(),
  status: z.enum(['pending', 'accepted', 'rejected']).optional(),
  validationMethod: z.string().optional(),
}));

const FailureModeSchema: z.ZodType<any> = z.lazy(() => z.object({
    id: z.string(),
    description: z.string(),
    hypotheses: z.array(HypothesisSchema).optional(),
}));

const CTMDataSchema = z.array(FailureModeSchema).optional().nullable();


// --- Esquema para BrainstormIdea ---
const BrainstormIdeaSchema = z.object({
  type: z.enum(BRAINSTORM_IDEA_TYPES as [BrainstormIdeaType, ...BrainstormIdeaType[]]).or(z.literal('')).describe("Tipo de idea de lluvia de ideas (ej: Humana, Técnica, Organizacional, etc.)"),
  description: z.string().describe("Descripción de la idea de lluvia de ideas."),
});


// --- Esquema de Entrada ---
const SuggestRootCausesInputSchema = z.object({
  focusEventDescription: z.string().describe('La descripción principal del evento que se está analizando.'),
  brainstormingIdeas: z.array(BrainstormIdeaSchema).optional().describe('Lista de ideas de lluvia de ideas iniciales, clasificadas por tipo.'), // Changed from brainstormingNotes
  analysisTechnique: z.enum(['', 'Ishikawa', '5 Por qué', 'CTM']).describe('La técnica de análisis principal seleccionada.'),
  analysisTechniqueNotes: z.string().optional().describe('Notas generales o específicas sobre la aplicación de la técnica de análisis.'),
  ishikawaData: IshikawaDataSchema,
  fiveWhysData: FiveWhysDataSchema,
  ctmData: CTMDataSchema,
});
export type SuggestRootCausesInput = z.infer<typeof SuggestRootCausesInputSchema>;


// --- Esquema de Salida ---
const SuggestRootCausesOutputSchema = z.object({
  suggestedRootCauses: z.array(z.string().describe("Una causa raíz LATENTE potencial identificada por la IA.")).describe('Una lista de descripciones de posibles causas raíz LATENTES.'),
});
export type SuggestRootCausesOutput = z.infer<typeof SuggestRootCausesOutputSchema>;


// --- Prompt de Genkit ---
const suggestRootCausesPrompt = ai.definePrompt({
  name: 'suggestRootCausesPrompt',
  model: 'googleai/gemini-1.5-flash-latest', 
  input: { schema: SuggestRootCausesInputSchema },
  output: { schema: SuggestRootCausesOutputSchema },
  prompt: `
    Eres un experto analista de ACR (Análisis de Causa Raíz) especializado en identificar **causas latentes**.
    Las causas latentes son condiciones subyacentes, problemas sistémicos, factores organizacionales o culturales que permitieron que las causas más directas (físicas, humanas) ocurrieran o tuvieran impacto.
    
    Basado en la siguiente información, tu tarea es **inferir y sugerir una lista de posibles CAUSAS LATENTES**.
    No te limites a repetir la información de las causas físicas o humanas ya detalladas en las técnicas. Profundiza y busca los factores sistémicos.
    Sé conciso y directo en tus sugerencias de causas latentes.

    Evento Foco:
    {{{focusEventDescription}}}

    {{#if brainstormingIdeas}}
    Lluvia de Ideas Inicial (Clasificada):
    {{#each brainstormingIdeas}}
      - Tipo: {{this.type}} - Descripción: {{this.description}}
    {{else}}
      - No se proporcionaron ideas iniciales.
    {{/each}}
    {{/if}}

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
    Datos del Diagrama de Ishikawa (causas directas):
    {{#each ishikawaData}}
      Categoría: {{this.name}}
      {{#each this.causes}}
        - Causa directa: {{this.description}}
      {{/each}}
    {{/each}}
    {{/if}}
    
    {{#if fiveWhysData}}
    Datos de los 5 Porqués (cadena causal):
    {{#each fiveWhysData}}
      - ¿Por qué?: {{this.why}}
      {{#each this.becauses}}
        - Porque: {{this.description}}
      {{/each}}
    {{/each}}
    {{/if}}

    {{#if ctmData}}
    Datos del Árbol de Causas (CTM) (desglose de fallas a causas directas):
    {{#each ctmData}}
      Modo de Falla: {{this.description}}
      {{#each this.hypotheses}}
        - Hipótesis: {{this.description}}
        {{#each this.physicalCauses}}
          -- Causa Física: {{this.description}}
          {{#each this.humanCauses}}
            --- Causa Humana: {{this.description}}
            {{#each this.latentCauses}}
              ---- Causa Latente (ya identificada por el usuario): {{this.description}}
            {{/each}}
          {{/each}}
        {{/each}}
      {{/each}}
    {{/each}}
    {{/if}}

    Considera toda la información anterior, especialmente las causas directas y humanas, y las ideas de la lluvia de ideas.
    Ahora, genera una lista de posibles **CAUSAS LATENTES** que podrían haber contribuido al evento.
    Cada causa latente debe ser una descripción clara y accionable de un problema sistémico u organizacional.
    No repitas las causas latentes que el usuario ya pudo haber identificado en el CTM. Busca nuevas perspectivas.
    Evita parafrasear las entradas; en su lugar, infiere las condiciones subyacentes.
    Ejemplos de causas latentes: "Procedimientos de capacitación insuficientes", "Cultura de seguridad deficiente", "Falta de supervisión adecuada", "Presión de producción excesiva", "Diseño de sistema propenso a errores".
    Devuelve SOLO un array de strings con las causas latentes sugeridas.
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
    let hasSufficientInput = false;
    if (input.brainstormingIdeas && input.brainstormingIdeas.length > 0 && input.brainstormingIdeas.some(idea => idea.description.trim().length > 5)) { // Check for meaningful brainstorming ideas
        hasSufficientInput = true;
    }
    if (input.analysisTechnique === 'Ishikawa' && input.ishikawaData && input.ishikawaData.length > 0 && input.ishikawaData.some(cat => cat.causes.length > 0)) {
        hasSufficientInput = true;
    }
    if (input.analysisTechnique === '5 Por qué' && input.fiveWhysData && input.fiveWhysData.length > 0 && input.fiveWhysData.some(e => e.becauses && e.becauses.some(b => b.description.trim().length > 5))) {
        hasSufficientInput = true;
    }
    if (input.analysisTechnique === 'CTM' && input.ctmData && input.ctmData.length > 0 && input.ctmData.some(fm => (fm.description && fm.description.trim()) || (fm.hypotheses && fm.hypotheses.length > 0 && fm.hypotheses.some(h => h.description && h.description.trim())))) {
        hasSufficientInput = true;
    }
    if (input.analysisTechniqueNotes && input.analysisTechniqueNotes.trim().length > 10) { 
        hasSufficientInput = true;
    }


    if (!hasSufficientInput) {
      return { suggestedRootCauses: ["[Sugerencia IA no disponible: Se requiere más información del análisis o de la lluvia de ideas para generar sugerencias.]"] };
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
  // Check if the AI object is a mock, indicating an initialization issue.
  if (ai.isMocked) {
      console.warn("Genkit 'ai' object is mocked. AI root cause suggestions will be disabled.");
      return { suggestedRootCauses: ["[Sugerencias IA Deshabilitadas por problemas de Genkit]"] };
  }

  try {
    const result = await suggestRootCausesFlowInternal(input);
    return result;

  } catch (error) {
    console.error("Error executing suggestRootCauses:", error);
    let errorMessage = "[Sugerencia IA no disponible: Error al procesar la solicitud con IA]";
    if (error instanceof Error) {
        if (error.message.includes("API key not valid")) {
            errorMessage = "[Sugerencia IA no disponible: La API Key de Google AI no es válida. Verifique la configuración.]";
        } else if (error.message.includes("model may not exist")) {
            errorMessage = "[Sugerencia IA no disponible: El modelo configurado no existe o no está disponible.]";
        } else if (error.message.includes("Must supply a `model`")) {
            errorMessage = "[Sugerencia IA no disponible: Problema con la configuración del modelo o la API Key. Verifique la consola.]";
        } else {
            errorMessage += ` (${error.message})`;
        }
    }
    return { suggestedRootCauses: [errorMessage] };
  }
}

    
