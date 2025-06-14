import {type GenkitConfig} from 'genkit'; // Import only the type
// import {googleAI} from '@genkit/google-ai'; // Removed due to install issues

// Define Genkit configuration
const genkitConfig: GenkitConfig = {
  plugins: [
    // googleAI(), // Removed due to install issues
  ],
  // flowStateStore: 'firebase', // Optional: Store flow states in Firestore
  // traceStore: 'firebase',     // Optional: Store traces in Firestore
  // Enable for production logging/tracing.
  // telemetry: {
  //   instrumentation: {
  //     llm: true, // Enable LLM request/response logging
  //     embedding: true, // Enable embedding request logging
  //     retriever: true, // Enable retriever logging
  //   },
  //   logger: firebase(), // Use Firebase for logging telemetry
  // },
  // defaultModel: 'googleai/gemini-1.5-flash-latest', // Optional: set a default model
};

// Mock ai object to prevent runtime errors if genkit isn't fully working
// This mock allows dependent files (like flows) to load without crashing
// when ai.definePrompt or ai.defineFlow are called.
const ai: any = {
  definePrompt: (promptConfig: any, promptFunction?: any) => {
    console.warn(
      `AI.definePrompt for '${promptConfig?.name || 'unknown'}' called, but Genkit is partially disabled. Returning a dummy prompt.`
    );
    return async (input: any) => {
      console.warn(`Dummy prompt for '${promptConfig?.name || 'unknown'}' called with input:`, input);
      if (promptConfig?.name === 'generateRcaInsightsPrompt') {
        return { output: { summary: "[Resumen IA Deshabilitado por problemas de Genkit]" }, usage: {} };
      }
      return { output: null, usage: {} }; // Default dummy response
    };
  },
  defineFlow: (flowConfig: any, flowFunction: any) => {
    console.warn(
      `AI.defineFlow for '${flowConfig?.name || 'unknown'}' called, but Genkit is partially disabled. Returning a dummy flow.`
    );
    return async (input: any) => {
      console.warn(`Dummy flow '${flowConfig?.name || 'unknown'}' called with input:`, input);
      if (flowConfig?.name === 'generateRcaInsightsFlow') {
        return { summary: "[Resumen IA Deshabilitado por problemas de Genkit]" };
      }
      // Fallback for other flows if any
      return Promise.reject(new Error(`Flow ${flowConfig?.name || 'unknown'} is disabled due to Genkit issues.`));
    };
  },
  // Add other ai methods that might be called directly if they exist and cause errors
  // generate: async () => {
  //   console.warn("ai.generate called, but Genkit is partially disabled.");
  //   return { text: () => "[AI Generation Disabled]" }; // Adjust if structure is different
  // }
};
// Original: const ai = genkit(genkitConfig); // This line was causing errors

export {ai, genkitConfig};
