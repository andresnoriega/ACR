
'use server';
// Este archivo está marcado como 'use server' para asegurar que su contenido,
// especialmente la inicialización de Genkit y la API key, solo se ejecute en el servidor.

import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

// La API Key se lee de las variables de entorno del servidor.
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey && process.env.NODE_ENV !== 'production') {
    console.warn(
        '[AI Genkit] Advertencia: No se encontró la variable de entorno `GEMINI_API_KEY`. ' +
        'La funcionalidad de IA que depende de Genkit será deshabilitada o podría no funcionar. ' +
        'Para producción, configure `GEMINI_API_KEY` como un "secret" en su backend de Firebase App Hosting. ' +
        'Para desarrollo local, añádala a su archivo .env.'
    );
}

// Inicializa Genkit y exporta el objeto `ai` para que otros módulos puedan usarlo.
export const ai = genkit({
  plugins: [
    // El plugin se configura incluso si la API Key no está presente.
    // Los flujos individuales manejarán los errores si se intenta usar la IA sin una clave válida.
    googleAI({ apiKey: apiKey }),
  ],
  // Habilitar el logging puede ser útil para depurar
  // logLevel: 'debug',
});
