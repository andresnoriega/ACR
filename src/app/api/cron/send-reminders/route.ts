// /src/app/api/cron/send-reminders/route.ts
import { NextResponse } from 'next/server';
import { sendActionReminders } from '@/app/actions';

// Export a named function for the GET method
export async function GET(request: Request) {
  // 1. Extract secret from query parameters
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  // 2. Validate the secret key
  if (secret !== process.env.CRON_SECRET) {
    // Use NextResponse for API responses
    return NextResponse.json({ message: 'Error: Clave secreta no válida.' }, { status: 401 });
  }

  // 3. If secret is valid, run the reminder function
  try {
    const result = await sendActionReminders();
    // Return a success response
    return NextResponse.json({
      message: 'Proceso de recordatorios ejecutado.',
      ...result
    }, { status: 200 });
  } catch (error) {
    console.error('[CRON JOB API] Error al ejecutar sendActionReminders:', error);
    // Return an error response
    return NextResponse.json({ message: 'Error interno del servidor al procesar los recordatorios.' }, { status: 500 });
  }
}
