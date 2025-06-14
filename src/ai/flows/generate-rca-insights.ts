
'use server';
/**
 * @fileOverview Generates insights and a summary for an RCA process.
 *
 * - generateRcaInsights - A function that generates RCA insights.
 * - GenerateRcaInsightsInput - The input type for the generateRcaInsights function.
 * - GenerateRcaInsightsOutput - The return type for the generateRcaInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

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

export async function generateRcaInsights(input: GenerateRcaInsightsInput): Promise<GenerateRcaInsightsOutput> {
  return generateRcaInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateRcaInsightsPrompt',
  input: {schema: GenerateRcaInsightsInputSchema},
  output: {schema: GenerateRcaInsightsOutputSchema},
  prompt: `
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
  `,
});

const generateRcaInsightsFlow = ai.defineFlow(
  {
    name: 'generateRcaInsightsFlow',
    inputSchema: GenerateRcaInsightsInputSchema,
    outputSchema: GenerateRcaInsightsOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("The AI model did not return an output.");
    }
    return output;
  }
);
