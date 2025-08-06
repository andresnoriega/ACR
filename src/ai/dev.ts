
import {genkit, type GenkitConfig} from 'genkit';
import {googleAI} from '@genkit-ai/googleai'; 
import { firebaseConfig } from '@/lib/firebase'; 

const apiKey = process.env.GEMINI_API_KEY || firebaseConfig.apiKey;

if (!apiKey && process.env.NODE_ENV === 'development') {
    console.warn(
        '[AI Genkit] Advertencia: No se encontró la variable de entorno `GEMINI_API_KEY`. ' +
        'Se está utilizando la clave de API de Firebase como respaldo. ' +
        'Para producción y para evitar errores de permisos, se recomienda crear una API Key dedicada ' +
        'sin restricciones en Google Cloud y asignarla a `GEMINI_API_KEY` en su archivo .env.'
    );
}

export let ai: any;

try {
  if (!apiKey) {
    throw new Error("La API Key de Firebase/Gemini no está definida en la configuración. No se puede inicializar Genkit.");
  }

  ai = genkit({
    plugins: [
      googleAI({ apiKey: apiKey }),
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
