
'use server';

import sgMail from '@sendgrid/mail';
import { storage } from '@/lib/firebase';
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";


interface EmailPayload {
  to: string;
  subject: string;
  body: string;
  htmlBody?: string;
}

const SPECIAL_TEST_ADDRESS = "TEST_MY_SENDER_ADDRESS";

/**
 * Sends an email using SendGrid.
 * Requires SENDGRID_API_KEY and SENDER_EMAIL_ADDRESS environment variables to be set.
 * @param payload - The email details.
 * @returns Promise<object> - A promise that resolves with a success or error message.
 */
export async function sendEmailAction(payload: EmailPayload): Promise<{ success: boolean; message: string; details?: EmailPayload }> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL_ADDRESS;

  if (!apiKey) {
    console.error("[sendEmailAction] SendGrid API Key (SENDGRID_API_KEY) is not set in environment variables.");
    return {
      success: false,
      message: "Error de configuración: La API Key de SendGrid no está configurada. El correo no fue enviado.",
      details: payload,
    };
  }

  if (!senderEmail) {
    console.error("[sendEmailAction] Sender email address (SENDER_EMAIL_ADDRESS) is not set in environment variables.");
    return {
      success: false,
      message: "Error de configuración: La dirección de correo del remitente no está configurada. El correo no fue enviado.",
      details: payload,
    };
  }

  sgMail.setApiKey(apiKey);

  // Logs para depuración
  console.log(`[sendEmailAction] Debug: payload.to = "${payload.to}", SPECIAL_TEST_ADDRESS = "${SPECIAL_TEST_ADDRESS}"`);
  const isTestAddress = payload.to === SPECIAL_TEST_ADDRESS;
  console.log(`[sendEmailAction] Debug: payload.to === SPECIAL_TEST_ADDRESS is ${isTestAddress}`);

  const recipientEmail = isTestAddress ? senderEmail : payload.to;
  console.log(`[sendEmailAction] Determined recipientEmail: '${recipientEmail}' (Sender for test if used: '${senderEmail}')`);


  const msg = {
    to: recipientEmail,
    from: senderEmail, // Use the environment variable for the 'from' address
    subject: payload.subject,
    text: payload.body,
    html: payload.htmlBody || payload.body, // Fallback to text body if htmlBody is not provided
  };

  console.log(`[sendEmailAction] Attempting to send email via SendGrid to: ${recipientEmail} with subject: "${payload.subject}" from: ${senderEmail}`);

  try {
    await sgMail.send(msg);
    console.log(`[sendEmailAction] Email successfully sent to ${recipientEmail} via SendGrid.`);
    return {
      success: true,
      message: `Correo enviado exitosamente a ${recipientEmail}.`,
      details: payload,
    };
  } catch (error: any) {
    console.error("[sendEmailAction] Error sending email via SendGrid:", error);
    let errorMessage = "Ocurrió un error al enviar el correo.";
    // Check if error.response.body.errors exists and is an array before mapping
    if (error.response && error.response.body && Array.isArray(error.response.body.errors)) {
      errorMessage = error.response.body.errors.map((e: { message: string }) => e.message).join(', ');
      console.error("[sendEmailAction] SendGrid API Error Details:", JSON.stringify(error.response.body.errors));
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


/**
 * Uploads a file to Firebase Storage via a Server Action to bypass client-side CORS issues.
 * @param formData The FormData object containing the file and rcaId.
 * @returns A promise that resolves with the upload result.
 */
export async function uploadFileAction(formData: FormData): Promise<{ success: boolean; url?: string; error?: string }> {
  const file = formData.get('file') as File | null;
  const rcaId = formData.get('rcaId') as string | null;

  if (!file) {
    return { success: false, error: 'No se encontró ningún archivo para subir.' };
  }
  if (!rcaId) {
    return { success: false, error: 'Falta el ID del RCA para la ruta de almacenamiento.' };
  }

  try {
    const fileBuffer = await file.arrayBuffer(); // This is an ArrayBuffer
    const fileRef = storageRef(storage, `evidence/${rcaId}/${Date.now()}-${file.name}`);
    
    // uploadBytes is the correct function for this, it accepts an ArrayBuffer directly.
    const snapshot = await uploadBytes(fileRef, fileBuffer, {
      contentType: file.type
    });
    
    const downloadURL = await getDownloadURL(snapshot.ref);

    return { success: true, url: downloadURL };
  } catch (error: any) {
    console.error('[uploadFileAction] Error uploading file to Firebase Storage:', error);
    
    let errorMessage = "Ocurrió un error desconocido durante la subida.";
    if (error.code) {
        // Provide a more user-friendly message for common errors.
        switch(error.code) {
            case 'storage/unknown':
                errorMessage = "Error de Permisos del Servidor (storage/unknown). La cuenta de servicio de App Hosting probablemente no tiene el rol 'Storage Object Admin' en IAM. Por favor, verifique los permisos en la consola de Google Cloud.";
                break;
            case 'storage/unauthorized':
                errorMessage = "No autorizado. Verifique las reglas de seguridad de Firebase Storage para permitir escrituras desde el servidor.";
                break;
            case 'storage/object-not-found':
                errorMessage = "El objeto no fue encontrado. Esto no debería ocurrir durante una subida.";
                break;
            default:
                errorMessage = `Error de servidor: ${error.code}.`;
        }
    } else if (error.message) {
        errorMessage = error.message;
    }
    
    return { success: false, error: errorMessage };
  }
}
