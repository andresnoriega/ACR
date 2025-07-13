
import { NextResponse } from 'next/server';
import { sendActionReminders } from '@/app/actions';

// This is crucial for compatibility with libraries like @sendgrid/mail
// that rely on Node.js APIs not available in the default Edge Runtime.
export const runtime = 'nodejs';

// This API route is public but protected by a secret key.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  // 1. Validate the secret key from environment variables.
  if (process.env.CRON_SECRET !== secret) {
    return NextResponse.json({ message: 'Error: Clave secreta no válida.' }, { status: 401 });
  }

  // 2. If the secret is valid, run the reminder function.
  try {
    const result = await sendActionReminders();
    return NextResponse.json({
      message: 'Proceso de recordatorios ejecutado.',
      ...result
    }, { status: 200 });
  } catch (error) {
    console.error('[CRON JOB API] Error al ejecutar sendActionReminders:', error);
    return NextResponse.json({ message: 'Error interno del servidor al procesar los recordatorios.' }, { status: 500 });
  }
}
