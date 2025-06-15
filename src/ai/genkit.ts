import {genkit, type GenkitConfig} from 'genkit';
// import {googleAI} from '@genkit-ai/google-ai'; // Intentionally removed/commented due to persistent 404 install issues

// Define Genkit configuration
const genkitConfig: GenkitConfig = {
  plugins: [
    // googleAI(), // Intentionally removed/commented
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
  // Even with an empty plugins array, genkit() itself might initialize.
  // However, without model plugins, generate/prompt calls would fail.
  // The catch block below will handle this by mocking 'ai'.
  ai = genkit(genkitConfig);

  // A more robust check might be needed here to see if any usable models were actually configured
  // For now, we rely on the catch block for errors during genkit(genkitConfig) or subsequent AI calls.
  // If genkitConfig is empty and genkit() doesn't throw, but there are no models,
  // calls like ai.generate() would fail later. The current mock structure should handle this.
  const testGenerate = async () => {
    try {
       // Attempt a generate call that would require a model.
       // This is a conceptual test; we don't actually want to make a call here during init.
       // The purpose is to ensure that if genkit initializes but has no models,
       // the existing ai.generate() calls in flows are caught by their own try/catch
       // or by the mock if ai.generate is not even a function.
      if (typeof ai.generate !== 'function') {
        throw new Error("ai.generate is not a function, Genkit likely initialized without model plugins.");
      }
      console.log('[AI Genkit] Genkit initialized. Actual model availability will be tested by flows.');
    } catch (testError) {
      // This path suggests genkit() initialized but no models are available.
      // We will fall through to the main catch block to ensure 'ai' is mocked.
      console.warn('[AI Genkit] Genkit initialized but model plugins might be missing or failed to load. Error during test: ', testError);
      throw testError; // Re-throw to be caught by the outer try/catch, ensuring mock.
    }
  };
  // testGenerate(); // No need to actually run this during init.

  console.log('[AI Genkit] Genkit initialized successfully (or at least genkit() did not throw).');
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
