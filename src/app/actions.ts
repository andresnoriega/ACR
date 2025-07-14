'use server';

import { db } from '@/lib/firebase';
import { collection, getDocs, writeBatch, doc, query, updateDoc, where } from 'firebase/firestore';
import type { RCAAnalysisDocument, FullUserProfile, PlannedAction } from '@/types/rca';
import { differenceInCalendarDays, startOfToday, parseISO } from 'date-fns';

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  htmlBody?: string;
}

const SPECIAL_TEST_ADDRESS = "TEST_MY_SENDER_ADDRESS";

/**
 * Sends an email using SendGrid's fetch API.
 * Requires SENDGRID_API_KEY and SENDGRID_SENDER_EMAIL environment variables to be set.
 * @param payload - The email details.
 * @returns Promise<object> - A promise that resolves with a success or error message.
 */
export async function sendEmailAction(payload: EmailPayload): Promise<{ success: boolean; message: string; details?: EmailPayload }> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const senderEmail = process.env.SENDGRID_SENDER_EMAIL;

  if (!apiKey || !apiKey.startsWith('SG.')) {
    const errorMessage = "Configuración Incompleta: La API Key de SendGrid (SENDGRID_API_KEY) no está configurada o no es válida. Por favor, añada su clave real para poder enviar correos.";
    console.error(`[sendEmailAction] ${errorMessage}`);
    return {
      success: false,
      message: errorMessage,
      details: payload,
    };
  }

  if (!senderEmail || !senderEmail.includes('@')) {
    const errorMessage = "Configuración Incompleta: El correo del remitente (SENDGRID_SENDER_EMAIL) no está configurado o no es válido. Por favor, añada una dirección que haya verificado en SendGrid.";
    console.error(`[sendEmailAction] ${errorMessage}`);
    return {
      success: false,
      message: errorMessage,
      details: payload,
    };
  }
  
  const recipientEmail = payload.to === SPECIAL_TEST_ADDRESS ? senderEmail : payload.to;

  const emailData = {
    personalizations: [{ to: [{ email: recipientEmail }] }],
    from: { email: senderEmail },
    subject: payload.subject,
    content: [
      { type: 'text/plain', value: payload.body },
      { type: 'text/html', value: payload.htmlBody || `<p>${payload.body}</p>` },
    ],
  };

  console.log(`[sendEmailAction] Attempting to send email via SendGrid API to: ${recipientEmail} with subject: "${payload.subject}" from: ${senderEmail}.`);

  try {
    const response = await fetch('https://api/sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(emailData),
    });

    if (response.ok) {
      console.log(`[sendEmailAction] Email successfully sent to ${recipientEmail} via SendGrid API.`);
      return {
        success: true,
        message: `Correo enviado exitosamente a ${recipientEmail}.`,
        details: payload,
      };
    } else {
      const errorBody = await response.json();
      console.error("[sendEmailAction] Error sending email via SendGrid API:", JSON.stringify(errorBody, null, 2));
      const firstError = errorBody.errors && errorBody.errors[0] ? errorBody.errors[0].message : 'Error desconocido de la API.';
      return {
        success: false,
        message: `Error de SendGrid: ${firstError}`,
        details: payload,
      };
    }
  } catch (error: any) {
    console.error("[sendEmailAction] Critical fetch error sending email:", error);
    return {
      success: false,
      message: `Error crítico de red al contactar SendGrid: ${error.message}`,
      details: payload,
    };
  }
}
