
'use server';

import {genkit, type GenkitConfig} from 'genkit';
import {googleAI} from '@genkit-ai/googleai';

// Este archivo es de SERVIDOR. Lee las variables de entorno del lado del servidor.

let aiInstance: any;

// Esta función inicializará Genkit solo cuando se necesite,
// y solo si la GEMINI_API_KEY está presente.
function initializeAi() {
    // Si ya está inicializado (incluso si está mockeado), lo retornamos.
    if (aiInstance) {
        return aiInstance;
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      console.error('[AI Genkit] Error Crítico: La variable de entorno `GEMINI_API_KEY` no está definida. La funcionalidad de IA será simulada/deshabilitada.');
      const aiMockMessage = "[Resumen IA no disponible: La variable de entorno GEMINI_API_KEY no está configurada. Por favor, configure la clave en los secretos del backend de Firebase App Hosting.]";
      
      aiInstance = {
        isMocked: true, // Flag para identificar fácilmente que la IA está simulada
        defineFlow: (config: any, func: any) => {
          return async (input: any) => {
            console.warn(`Genkit flow '${config.name}' llamado pero la IA está simulada. Input:`, input);
            if (config.name.includes('generateRcaInsights')) {
              return { summary: aiMockMessage };
            }
            if (config.name.includes('suggestLatentRootCauses')) {
              return { suggestedLatentCauses: [aiMockMessage] };
            }
             if (config.name.includes('paraphrasePhenomenon')) {
              return { paraphrasedText: aiMockMessage };
            }
            return { error: `Flow '${config.name}' está deshabilitado. ${aiMockMessage}` };
          };
        },
        definePrompt: (config: any) => async (input: any) => {
            console.warn(`Genkit prompt '${config.name}' llamado pero la IA está simulada. Input:`, input);
            return Promise.resolve({ output: null, usage: {} });
        },
        generate: async (options: any) => {
          console.warn("ai.generate() llamado, pero la IA está simulada. Opciones:", options);
          return Promise.resolve({
            text: () => aiMockMessage,
            output: () => null,
            usage: {},
            toString: () => aiMockMessage,
          });
        },
      };
      
      return aiInstance;
    }

    // Si la clave existe, intentamos inicializar Genkit.
    try {
      const genkitConfig: GenkitConfig = {
        plugins: [
          googleAI({apiKey: apiKey}),
        ],
      };
      aiInstance = genkit(genkitConfig);
    } catch (error) {
        console.error('[AI Genkit] Error al inicializar Genkit con la API Key. La IA será simulada/deshabilitada:', error);
        // Aquí podrías reutilizar el mock de arriba si la inicialización falla por otra razón.
        // Por simplicidad, asumimos que el error principal será la clave faltante.
    }
    
    return aiInstance;
}

export async function getAi() {
    return initializeAi();
}
