
'use server';

import { genkit, type GenkitConfig } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';
import { firebase } from '@genkit-ai/firebase';

const apiKey = process.env.GEMINI_API_KEY;

let initialized = false;

if (!initialized) {
    if (!apiKey) {
        console.warn(
            '[AI Genkit] Advertencia: No se encontró la variable de entorno `GEMINI_API_KEY`. ' +
            'La funcionalidad de IA que depende de Genkit será deshabilitada o podría no funcionar. ' +
            'Para producción, configure `GEMINI_API_KEY` como un "secret" en su backend de Firebase App Hosting. ' +
            'Para desarrollo local, añádala a su archivo .env.'
        );
    }
    
    // Configura Genkit usando la clave de API si está disponible.
    // Si la clave no está disponible, el plugin de googleAI podría no funcionar,
    // lo cual es manejado por los flujos individuales.
    genkit({
      plugins: [
        firebase(), // Para almacenamiento de trazas y estados (opcional pero recomendado)
        googleAI({ apiKey: apiKey }), // Puede que no funcione si la clave no está presente
      ],
      flowStateStore: 'firebase',
      traceStore: 'firebase',
      enableTracingAndTelemetry: true,
    });
    
    initialized = true;
}
