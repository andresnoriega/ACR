
import { NextResponse } from 'next/server';
import { sendActionReminders } from '@/app/actions';

// This forces an API Route to be deployed as a Node.js serverless function.
// This is required for SendGrid's library to work.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * API route to be called by an external cron job service.
 * It triggers the function to send reminders for planned actions.
 * It requires a secret key for security.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret');

  // Read the secret from environment variables and trim it to remove potential whitespaces/quotes.
  const cronSecret = process.env.CRON_SECRET?.trim().replace(/^"(.*)"$/, '$1');

  if (!cronSecret) {
    console.error('[CRON] CRON_SECRET is not set in environment variables. Aborting.');
    return NextResponse.json({ message: 'CRON_SECRET not configured.' }, { status: 500 });
  }

  if (secret !== cronSecret) {
    return NextResponse.json({ message: 'Invalid secret.' }, { status: 401 });
  }

  try {
    const result = await sendActionReminders();
    if (result.success) {
      return NextResponse.json({
        message: 'Cron job executed successfully.',
        remindersSent: result.remindersSent,
      });
    } else {
      // If the function itself caught an error, return a 500
      return NextResponse.json(
        { message: 'Cron job failed during execution.', error: result.error },
        { status: 500 }
      );
    }
  } catch (error) {
    // Catch any unexpected errors during the API route execution
    console.error('[API/CRON] Unexpected error:', error);
    return NextResponse.json(
      { message: 'An unexpected error occurred.', error: (error as Error).message },
      { status: 500 }
    );
  }
}
