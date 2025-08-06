
import {genkit, type GenkitConfig} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Este archivo es de SERVIDOR. Lee las variables de entorno del lado del servidor.
// 1. Busca una GEMINI_API_KEY dedicada (mejor práctica para producción).
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey && process.env.NODE_ENV === 'development') {
    console.warn(
        '[AI Genkit] Advertencia: No se encontró la variable de entorno `GEMINI_API_KEY`. ' +
        'La funcionalidad de IA no se inicializará correctamente. ' +
        'Para producción, es crucial crear una API Key dedicada ' +
        'para IA en Google Cloud (con la "Generative Language API" habilitada) y asignarla a `GEMINI_API_KEY` en su entorno de Firebase App Hosting.'
    );
}

// Define Genkit configuration
const genkitConfig: GenkitConfig = {
  plugins: [
    googleAI({apiKey: apiKey}),
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

// Attempt to initialize Genkit, provide a mock if it fails
let aiInstance: any;

function initializeAi() {
    if (aiInstance) {
        return aiInstance;
    }
    try {
      if (!apiKey) {
        throw new Error("La API Key de Gemini (GEMINI_API_KEY) no está definida. La funcionalidad de IA será simulada.");
      }
      
      aiInstance = genkit(genkitConfig);
    
    } catch (error) {
      console.error('[AI Genkit] Error inicializando Genkit. La IA será simulada/deshabilitada:', error);
      
      const aiMockMessage = "La funcionalidad de IA está deshabilitada por un problema de configuración o inicialización.";
      
      aiInstance = {
        isMocked: true, // Flag to easily check if AI is mocked
        defineFlow: (config: any, func: any) => {
          return async (input: any) => {
            console.warn(`Genkit flow '${config.name}' llamado pero la IA está simulada. Input:`, input);
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
            return { error: `Flow '${config.name}' está deshabilitado. ${aiMockMessage}` };
          };
        },
        definePrompt: (config: any) => {
          return async (input: any) => {
            console.warn(`Genkit prompt '${config.name}' llamado pero la IA está simulada. Input:`, input);
            return Promise.resolve({ output: null, usage: {} });
          };
        },
        generate: async (options: any) => {
          console.warn("ai.generate() llamado, pero la IA está simulada. Opciones:", options);
          const mockGenerateResponse = {
            text: () => `[Respuesta IA Deshabilitada] ${aiMockMessage}`,
            output: () => null,
            usage: {},
            toString: () => aiMockMessage,
          };
          
          return Promise.resolve(mockGenerateResponse);
        },
      };
    }
    return aiInstance;
}

export async function getAi() {
    return initializeAi();
}
