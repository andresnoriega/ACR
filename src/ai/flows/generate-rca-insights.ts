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
});
export type GenerateRCAInsightsInput = z.infer<typeof GenerateRCAInsightsInputSchema>;

const GenerateRCAInsightsOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the event and its context.'),
  potentialRootCauses: z.string().describe('A list of potential root causes identified from the analysis.'),
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

Provide a concise summary of the event, a list of potential root causes, and recommendations to address these causes and prevent similar events in the future.
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
