
'use server';

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  htmlBody?: string;
}

/**
 * Simulates sending an email by logging the details to the server console.
 * In a production environment, this action would integrate with an email service provider.
 * @param payload - The email details.
 * @returns Promise<object> - A promise that resolves with a success or error message.
 */
export async function sendEmailAction(payload: EmailPayload): Promise<{ success: boolean; message: string; details?: EmailPayload }> {
  console.log("--- Simulating Email Send ---");
  console.log("To:", payload.to);
  console.log("Subject:", payload.subject);
  console.log("Body (text):", payload.body);
  if (payload.htmlBody) {
    console.log("Body (HTML):", payload.htmlBody.substring(0, 200) + (payload.htmlBody.length > 200 ? "..." : ""));
  }
  console.log("-----------------------------");

  // Simulate a network delay or processing time
  await new Promise(resolve => setTimeout(resolve, 500));

  // In a real scenario, you'd check the response from your email provider
  const simulatedSuccess = true; 

  if (simulatedSuccess) {
    return { 
      success: true, 
      message: `Email simulation: Successfully processed email to ${payload.to} with subject "${payload.subject}".`,
      details: payload 
    };
  } else {
    return { 
      success: false, 
      message: `Email simulation: Failed to process email to ${payload.to}.`,
      details: payload 
    };
  }
}
