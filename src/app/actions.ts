
'use server';

import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  htmlBody?: string;
}

const SPECIAL_TEST_ADDRESS = "TEST_MY_SENDER_ADDRESS";

/**
 * Sends an email using MailerSend.
 * Requires MAILERSEND_API_KEY and SENDER_EMAIL_ADDRESS environment variables to be set.
 * @param payload - The email details.
 * @returns Promise<object> - A promise that resolves with a success or error message.
 */
export async function sendEmailAction(payload: EmailPayload): Promise<{ success: boolean; message: string; details?: EmailPayload }> {
  const apiKey = process.env.MAILERSEND_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL_ADDRESS;
  const senderName = "Asistente ACR"; // You can make this an env variable if needed

  if (!apiKey || apiKey === 'TU_API_KEY_DE_MAILERSEND_AQUI') {
    console.error("[sendEmailAction] MailerSend API Key (MAILERSEND_API_KEY) is not set in environment variables or is a placeholder.");
    return {
      success: false,
      message: "Error de configuración: La API Key de MailerSend no está configurada. Por favor, añádala a su archivo .env.",
      details: payload,
    };
  }

  if (!senderEmail || senderEmail === 'tu@email_verificado.com') {
    console.error("[sendEmailAction] Sender email address (SENDER_EMAIL_ADDRESS) is not set in environment variables or is a placeholder.");
    return {
      success: false,
      message: "Error de configuración: La dirección de correo del remitente no está configurada. Por favor, añádala a su archivo .env.",
      details: payload,
    };
  }

  const mailerSend = new MailerSend({ apiKey });

  const isTestAddress = payload.to === SPECIAL_TEST_ADDRESS;
  const recipientEmail = isTestAddress ? senderEmail : payload.to;

  const sentFrom = new Sender(senderEmail, senderName);
  const recipients = [new Recipient(recipientEmail, "Usuario")];

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setSubject(payload.subject)
    .setHtml(payload.htmlBody || `<p>${payload.body}</p>`)
    .setText(payload.body);

  console.log(`[sendEmailAction] Attempting to send email via MailerSend to: ${recipientEmail} with subject: "${payload.subject}" from: ${senderEmail}`);

  try {
    await mailerSend.email.send(emailParams);
    console.log(`[sendEmailAction] Email successfully sent to ${recipientEmail} via MailerSend.`);
    return {
      success: true,
      message: `Correo enviado exitosamente a ${recipientEmail}.`,
      details: payload,
    };
  } catch (error: any) {
    console.error("[sendEmailAction] Error sending email via MailerSend:", error.body || error);
    let errorMessage = "Ocurrió un error desconocido al enviar el correo.";
    
    if (error.body && error.body.message) {
      const apiMessage = error.body.message.toLowerCase();
      
      if (apiMessage.includes('unauthenticated')) {
        errorMessage = "Error de autenticación. Verifique que la MAILERSEND_API_KEY en su archivo .env sea correcta, esté activa y tenga permisos para enviar correos. Asegúrese de que no haya espacios adicionales antes o después de la clave.";
      } else {
        errorMessage = error.body.message;
        if (error.body.errors) {
          const errorDetails = Object.values(error.body.errors).flat().join(', ');
          errorMessage += ` Detalles: ${errorDetails}`;
        }
      }
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      message: `Error al enviar correo: ${errorMessage}`,
      details: payload,
    };
  }
}
