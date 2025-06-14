
import genkitModule from 'genkit'; // Changed to default import, renamed for clarity
import type { GenkitConfig } from 'genkit'; // Type import remains named

// Define Genkit configuration
const genkitConfig: GenkitConfig = {
  plugins: [
    // googleAI(), // Temporarily removed due to install issues
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

// Initialize Genkit with the configuration
// Attempt to call 'genkit' as a property of the default imported module
// const ai = genkitModule.genkit(genkitConfig); // Commented out due to persistent errors

// Placeholder for 'ai' object if needed by other parts of the codebase,
// though flows will be disabled.
const ai: any = {
    definePrompt: (config: any) => (input: any) => Promise.resolve({ output: null, usage: {} }),
    defineFlow: (config: any, fn: any) => fn,
    // Add other methods if they are called directly and cause errors
};


export {ai, genkitConfig};
