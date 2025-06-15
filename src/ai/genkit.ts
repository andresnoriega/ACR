import {genkit, type GenkitConfig} from 'genkit';
// import {googleAI} from '@genkit/google-ai'; // Removido temporalmente por problemas de instalación

// Define Genkit configuration
const genkitConfig: GenkitConfig = {
  plugins: [
    // googleAI(), // Removido temporalmente
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
const ai = genkit(genkitConfig);

export {ai, genkitConfig};
