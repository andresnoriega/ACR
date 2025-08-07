
import {genkit, type GenkitConfig} from 'genkit';
import {googleAI} from '@genkit-ai/googleai'; 

// Initialize Genkit without an API key.
// The key will be provided at runtime by the server actions.
export let ai: any;

try {
  ai = genkit({
    plugins: [
      googleAI(), // Initialize without a key.
    ],
  });

} catch (error) {
  console.error('[AI Genkit] Error initializing Genkit:', error);
  
  const aiMockMessage = "AI functionality is disabled due to a Genkit configuration or initialization issue.";
  
  ai = {
    isMocked: true,
    defineFlow: (config: any, func: any) => {
      return async (input: any) => {
        console.warn(`Genkit flow '${config.name}' called but AI is mocked. Input:`, input);
        if (config.name === 'generateRcaInsightsFlow') {
          return { summary: `[Resumen IA Deshabilitado] ${aiMockMessage}` };
        }
        if (config.name === 'suggestLatentRootCausesFlow') {
          return { suggestedLatentCauses: [`[Sugerencias IA Deshabilitadas] ${aiMockMessage}`] };
        }
         if (config.name === 'paraphrasePhenomenonFlow') {
          return { paraphrasedText: `[IA Deshabilitada] ${aiMockMessage}` };
        }
        return { error: `Flow '${config.name}' is disabled. ${aiMockMessage}` };
      };
    },
    definePrompt: (config: any) => {
      return async (input: any) => {
        console.warn(`Genkit prompt '${config.name}' called but AI is mocked. Input:`, input);
        return Promise.resolve({ output: null, usage: {} });
      };
    },
    generate: async (options: any) => {
      console.warn("ai.generate() called, but AI is mocked. Options:", options);
      return Promise.resolve({
        text: () => `[Respuesta IA Deshabilitada] ${aiMockMessage}`,
        output: () => null,
        usage: {},
      });
    },
  };
}
