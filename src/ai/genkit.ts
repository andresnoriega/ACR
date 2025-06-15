import {genkit, type GenkitConfig} from 'genkit';
// import {googleAI} from '@genkit/google-ai'; // Deshabilitado debido a problemas de instalación

// Define Genkit configuration
const genkitConfig: GenkitConfig = {
  plugins: [
    // googleAI(), // Deshabilitado temporalmente
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
  ai = genkit(genkitConfig);
  console.log('[AI Genkit] Genkit initialized successfully (potentially without model plugins).');
} catch (error) {
  console.error('[AI Genkit] Error initializing Genkit:', error);
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
