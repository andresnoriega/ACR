'use server';
import { generateRCAInsights, type GenerateRCAInsightsInput, type GenerateRCAInsightsOutput } from '@/ai/flows/generate-rca-insights';

export async function getAIInsightsAction(input: GenerateRCAInsightsInput): Promise<GenerateRCAInsightsOutput | { error: string }> {
  try {
    const insights = await generateRCAInsights(input);
    return insights;
  } catch (error) {
    console.error("Error generating AI insights:", error);
    return { error: "Failed to generate AI insights. Please try again." };
  }
}
