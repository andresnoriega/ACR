
import { NextResponse } from 'next/server';
import { sendActionReminders } from '@/app/actions';

// This forces the an API Route to be deployed as a Node.js serverless function.
// This is required for SendGrid's library to work.
export const runtime = 'nodejs';

/**
 * API route to be called by an external cron job service.
 * It triggers the function to send reminders for planned actions.
 */
export async function GET() {
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
