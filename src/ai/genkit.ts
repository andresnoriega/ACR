
import {genkit, type GenkitConfig} from 'genkit';
import {googleAI} from '@genkit-ai/googleai'; 

// Prioritize a dedicated GEMINI_API_KEY from environment variables for server-side use.
// Fallback to the public Firebase API key if it's not set. This is a safe fallback.
const apiKey = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

if (!apiKey && process.env.NODE_ENV === 'development') {
    console.warn(
        '[AI Genkit] Advertencia: No se encontró la variable de entorno `GEMINI_API_KEY` o `NEXT_PUBLIC_FIREBASE_API_KEY`. ' +
        'La funcionalidad de IA generativa no funcionará. Se recomienda crear una clave de API dedicada para GenAI en Google Cloud.'
    );
}

// Define Genkit configuration
const genkitConfig: GenkitConfig = {
  plugins: [
    googleAI({apiKey: apiKey}), // Use the determined API key
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
  // Check if an API key is available before initializing Genkit
  if (!apiKey) {
    throw new Error("La API Key de Gemini/Firebase no está definida en la configuración. No se puede inicializar Genkit.");
  }
  
  ai = genkit(genkitConfig);

  // Test if ai.generate is actually available after initialization
  const testGenerate = async () => {
    try {
      if (typeof ai.generate !== 'function') {
        throw new Error("ai.generate is not a function, Genkit likely initialized without model plugins or googleAI failed.");
      }
    } catch (testError) {
      console.warn('[AI Genkit] Genkit initialized but model plugins might be missing or failed to load. Error during test: ', testError);
      throw testError; // Re-throw to fall into the main catch block
    }
  };
  
  console.log('[AI Genkit] Genkit initialization attempted with plugins.');

} catch (error) {
  console.error('[AI Genkit] Error initializing Genkit or no model plugins available:', error);
  console.warn('[AI Genkit] AI functionality will be mocked/disabled.');
  
  const aiMockMessage = "AI functionality is disabled due to a Genkit configuration or initialization issue.";
  
  ai = {
    isMocked: true, // Add a flag to easily check if AI is mocked
    defineFlow: (config: any, func: any) => {
      // Return a function that immediately returns a mocked "disabled" response,
      // conforming to the expected output schema of the flows.
      return async (input: any) => {
        console.warn(`Genkit flow '${config.name}' called but AI is mocked. Input:`, input);
        if (config.name === 'generateRcaInsightsFlow') {
          return { summary: `[Resumen IA Deshabilitado] ${aiMockMessage}` };
        }
        if (config.name === 'suggestRootCausesFlow' || config.name === 'suggestLatentRootCausesFlow') {
          return { suggestedLatentCauses: [`[Sugerencias IA Deshabilitadas] ${aiMockMessage}`] };
        }
         if (config.name === 'paraphrasePhenomenonFlow') {
          return { paraphrasedText: `[IA Deshabilitada] ${aiMockMessage}` };
        }
        if (config.name === 'generateTagsForFileFlow') {
          return { tags: [`tag-ia-deshabilitada`] };
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
      
      return Promise.resolve(mockGenerateResponse);
    },
  };
}
