
'use server';

import sgMail from '@sendgrid/mail';

interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  htmlBody?: string;
}

const SPECIAL_TEST_ADDRESS = "TEST_MY_SENDER_ADDRESS";

/**
 * Sends an email using SendGrid.
 * Requires SENDGRID_API_KEY and SENDGRID_SENDER_EMAIL environment variables to be set.
 * @param payload - The email details.
 * @returns Promise<object> - A promise that resolves with a success or error message.
 */
export async function sendEmailAction(payload: EmailPayload): Promise<{ success: boolean; message: string; details?: EmailPayload }> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const senderEmail = process.env.SENDGRID_SENDER_EMAIL;

  if (!apiKey || apiKey === 'TU_API_KEY_DE_SENDGRID_AQUI') {
    console.error("[sendEmailAction] SendGrid API Key (SENDGRID_API_KEY) is not set in environment variables or is a placeholder.");
    return {
      success: false,
      message: "Error de configuración: La API Key de SendGrid no está configurada. Por favor, añádala a su archivo .env.",
      details: payload,
    };
  }

  if (!senderEmail || senderEmail === 'tu@email_verificado_en_sendgrid.com') {
    console.error("[sendEmailAction] Sender email address (SENDGRID_SENDER_EMAIL) is not set in environment variables or is a placeholder.");
    return {
      success: false,
      message: "Error de configuración: La dirección de correo del remitente no está configurada. Por favor, añádala a su archivo .env.",
      details: payload,
    };
  }

  sgMail.setApiKey(apiKey);

  const recipientEmail = payload.to === SPECIAL_TEST_ADDRESS ? senderEmail : payload.to;

  const msg = {
    to: recipientEmail,
    from: senderEmail,
    subject: payload.subject,
    text: payload.body,
    html: payload.htmlBody || `<p>${payload.body}</p>`,
  };

  console.log(`[sendEmailAction] Attempting to send email via SendGrid to: ${recipientEmail} with subject: "${payload.subject}" from: ${senderEmail}.`);

  try {
    await sgMail.send(msg);
    console.log(`[sendEmailAction] Email successfully sent to ${recipientEmail} via SendGrid.`);
    return {
      success: true,
      message: `Correo enviado exitosamente a ${recipientEmail}.`,
      details: payload,
    };
  } catch (error: any) {
    console.error("[sendEmailAction] Error sending email via SendGrid:", JSON.stringify(error, null, 2));
    
    let errorMessage = "Ocurrió un error desconocido al enviar el correo.";
    if (error.response && error.response.body && error.response.body.errors) {
      const firstError = error.response.body.errors[0];
      const apiMessage = firstError.message.toLowerCase();
      
      if (apiMessage.includes('permission denied') || apiMessage.includes('api key does not have permissions')) {
        errorMessage = "Error de permisos. La API Key de SendGrid no tiene permisos para enviar correos. Verifique los permisos en el panel de SendGrid.";
      } else if (apiMessage.includes('authorization') || error.code === 401) {
        errorMessage = "Error de autenticación. Verifique que la SENDGRID_API_KEY en su archivo .env sea correcta y esté activa.";
      } else if (apiMessage.includes('the from address does not match a verified sender')) {
        errorMessage = `La dirección de remitente (${senderEmail}) no está verificada en SendGrid. Por favor, verifíquela como 'Single Sender' o configure la Autenticación de Dominio en su panel de SendGrid.`;
      } else {
        errorMessage = firstError.message;
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
