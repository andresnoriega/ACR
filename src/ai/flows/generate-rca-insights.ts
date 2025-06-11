
// src/ai/flows/generate-rca-insights.ts
'use server';

/**
 * @fileOverview Generates insightful summaries and potential root causes using a generative AI tool.
 *
 * - generateRCAInsights - A function that handles the generation of RCA insights.
 * - GenerateRCAInsightsInput - The input type for the generateRCAInsights function.
 * - GenerateRCAInsightsOutput - The return type for the generateRCAInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateRCAInsightsInputSchema = z.object({
  facts: z.string().describe('A detailed description of the facts related to the event.'),
  analysis: z.string().describe('The analysis performed, including techniques used and findings.'),
  userDefinedRootCause: z.string().optional().describe('The root cause identified by the user, if any. The AI should consider, validate, or contrast this with its own findings.'),
});
export type GenerateRCAInsightsInput = z.infer<typeof GenerateRCAInsightsInputSchema>;

const GenerateRCAInsightsOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the event and its context.'),
  potentialRootCauses: z.string().describe('A list of potential root causes identified from the analysis, considering user input if provided.'),
  recommendations: z.string().describe('Recommendations for addressing the root causes and preventing recurrence.'),
});
export type GenerateRCAInsightsOutput = z.infer<typeof GenerateRCAInsightsOutputSchema>;

export async function generateRCAInsights(input: GenerateRCAInsightsInput): Promise<GenerateRCAInsightsOutput> {
  return generateRCAInsightsFlow(input);
}

const generateRCAInsightsPrompt = ai.definePrompt({
  name: 'generateRCAInsightsPrompt',
  input: {schema: GenerateRCAInsightsInputSchema},
  output: {schema: GenerateRCAInsightsOutputSchema},
  prompt: `You are an expert Root Cause Analysis (RCA) assistant. Given the facts and analysis of an event, you will generate a summary, identify potential root causes, and provide recommendations.

Facts: {{{facts}}}
Analysis: {{{analysis}}}

{{#if userDefinedRootCause}}
The user has also identified the following as a potential root cause: "{{{userDefinedRootCause}}}"
Please consider this in your analysis and recommendations. You can validate, expand upon, or contrast it with your findings.
{{/if}}

Provide a concise summary of the event, a list of potential root causes (considering the user's input if provided), and recommendations to address these causes and prevent similar events in the future.
`,
});

const generateRCAInsightsFlow = ai.defineFlow(
  {
    name: 'generateRCAInsightsFlow',
    inputSchema: GenerateRCAInsightsInputSchema,
    outputSchema: GenerateRCAInsightsOutputSchema,
  },
  async input => {
    const {output} = await generateRCAInsightsPrompt(input);
    return output!;
  }
);

