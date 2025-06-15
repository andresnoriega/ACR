import {genkit, type GenkitConfig} from 'genkit';
import {googleAI} from '@genkit-ai/googleai'; // Corrected import

// Define Genkit configuration
const genkitConfig: GenkitConfig = {
  plugins: [
    googleAI(), // Use the imported googleAI plugin
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
let ai: any;
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
  ai = {
    defineFlow: (config: any, func: any) => {
      console.warn(`Genkit flow '${config.name}' called but AI is mocked. Input will be passed to the mock function.`);
      return async (input: any) => {
        if (config.name === 'generateRcaInsightsFlow') {
          // Specific mock for generateRcaInsightsFlow to return the disabled message
          return { summary: "[Resumen IA Deshabilitado por problemas de Genkit]" };
        }
        // For other flows, attempt to call the original function if it doesn't rely on 'ai'
        try {
            return await func(input);
        } catch(flowError) {
            console.error(`Error in mocked flow '${config.name}':`, flowError);
            // Return a generic error for other flows if they fail
            return { error: `AI functionality for flow '${config.name}' is disabled due to Genkit initialization issues.` };
        }
      };
    },
    definePrompt: (config: any) => {
      console.warn(`Genkit prompt '${config.name}' called but AI is mocked.`);
      // Return a function that mimics the prompt call structure but returns a non-functional response.
      return async (input: any) => { 
        console.warn(`Genkit prompt '${config.name}' received input:`, input);
        // The prompt function usually returns a promise that resolves to an object
        // with an 'output' property (among others like 'usage').
        // Here we resolve to an object where 'output' is explicitly null.
        return Promise.resolve({ output: null, usage: {} }); 
      };
    },
    generate: async (options: any) => {
        console.warn("ai.generate() called, but AI is mocked. Options:", options);
        // Mimic the structure of a generate response, ensuring text() and output() are functions.
        return Promise.resolve({
            text: () => "[Respuesta IA Deshabilitada por problemas de Genkit]",
            output: () => null, // Return null as the output
            usage: {}, // Include an empty usage object
        });
    }
    // Add other Genkit ai object methods here if they are called elsewhere and cause errors
  };
}


export {ai, genkitConfig};
