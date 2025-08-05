import {genkit, type GenkitConfig} from 'genkit';
import {googleAI} from '@genkit-ai/googleai'; // Corrected import
import { firebaseConfig } from '@/lib/firebase'; // Importar la configuración de firebase

// Define Genkit configuration
const genkitConfig: GenkitConfig = {
  plugins: [
    googleAI({apiKey: firebaseConfig.apiKey}), // Usar la misma API key que el resto de la app
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
// Attempt to initialize Genkit, provide a mock if it fails
export let ai: any;
try {
  // Check if genkitConfig.plugins is empty or if googleAI is not available (it should be if import worked)
  if (!genkitConfig.plugins || genkitConfig.plugins.length === 0 || typeof googleAI !== 'function') {
    console.warn('[AI Genkit] No Genkit plugins are configured, or googleAI plugin is unavailable. AI functionality will be mocked/disabled.');
    throw new Error("No Genkit plugins configured or googleAI unavailable."); // Force fallback to mock
  }
  
  ai = genkit(genkitConfig);

  // Test if ai.generate is actually available after initialization
  const testGenerate = async () => {
    try {
      if (typeof ai.generate !== 'function') {
        throw new Error("ai.generate is not a function, Genkit likely initialized without model plugins or googleAI failed.");
      }
      // console.log('[AI Genkit] Genkit initialized. Actual model availability will be tested by flows.');
    } catch (testError) {
      console.warn('[AI Genkit] Genkit initialized but model plugins might be missing or failed to load. Error during test: ', testError);
      throw testError; // Re-throw to fall into the main catch block
    }
  };
  
  // It's better to not call testGenerate() here as it might involve async operations
  // that are not ideal during module initialization. The presence of ai.generate
  // can be checked by the flows themselves.
  console.log('[AI Genkit] Genkit initialization attempted with plugins.');

} catch (error) {
  console.error('[AI Genkit] Error initializing Genkit or no model plugins available:', error);
  console.warn('[AI Genkit] AI functionality will be mocked/disabled.');
  
  const aiMockMessage = "AI functionality is disabled due to a Genkit configuration or initialization issue.";
  
  ai = {
    defineFlow: (config: any, func: any) => {
      // Return a function that immediately returns a mocked "disabled" response,
      // conforming to the expected output schema of the flows.
      return async (input: any) => {
        console.warn(`Genkit flow '${config.name}' called but AI is mocked. Input:`, input);
        if (config.name === 'generateRcaInsightsFlow') {
          return { summary: `[Resumen IA Deshabilitado] ${aiMockMessage}` };
        }
        if (config.name === 'suggestRootCausesFlow') {
          return { suggestedRootCauses: [`[Sugerencias IA Deshabilitadas] ${aiMockMessage}`] };
        }
        // Generic fallback for other potential flows
        return { error: `Flow '${config.name}' is disabled. ${aiMockMessage}` };
      };
    },
    definePrompt: (config: any) => {
      // This mock returns a function that simulates a prompt call but resolves to a null output.
      // This prevents crashes in flows that call a prompt and expect a response object.
      return async (input: any) => {
        console.warn(`Genkit prompt '${config.name}' called but AI is mocked. Input:`, input);
        return Promise.resolve({ output: null, usage: {} });
      };
    },
    generate: async (options: any) => {
      console.warn("ai.generate() called, but AI is mocked. Options:", options);
      // The mock needs to return a structure that flows can destructure or call methods on.
      const mockGenerateResponse = {
        text: () => `[Respuesta IA Deshabilitada] ${aiMockMessage}`,
        output: () => null,
        usage: {},
        toString: () => aiMockMessage, // For easy debugging
      };
      // Adding this to the object itself for cases where it's not a function call
      (mockGenerateResponse as any).summary = `[Resumen IA Deshabilitado] ${aiMockMessage}`;
      (mockGenerateResponse as any).suggestedRootCauses = [`[Sugerencias IA Deshabilitadas] ${aiMockMessage}`];
      
      return Promise.resolve(mockGenerateResponse);
    },
    // Add a simple property to allow easy checking if the AI is mocked
    isMocked: true, 
  };
}
