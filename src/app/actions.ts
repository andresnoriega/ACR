
'use server';

import sgMail from '@sendgrid/mail';
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
 * Sends an email using SendGrid.
 * Requires SENDGRID_API_KEY and SENDGRID_SENDER_EMAIL environment variables to be set.
 * @param payload - The email details.
 * @returns Promise<object> - A promise that resolves with a success or error message.
 */
export async function sendEmailAction(payload: EmailPayload): Promise<{ success: boolean; message: string; details?: EmailPayload }> {
  const apiKey = process.env.SENDGRID_API_KEY;
  const senderEmail = process.env.SENDGRID_SENDER_EMAIL;

  if (!apiKey || !apiKey.startsWith('SG.')) {
    const errorMessage = "Configuración Incompleta: La API Key de SendGrid (SENDGRID_API_KEY) no está configurada o no es válida en el archivo .env.local. Por favor, añada su clave real para poder enviar correos.";
    console.error(`[sendEmailAction] ${errorMessage}`);
    return {
      success: false,
      message: errorMessage,
      details: payload,
    };
  }

  if (!senderEmail || !senderEmail.includes('@')) {
    const errorMessage = "Configuración Incompleta: El correo del remitente (SENDGRID_SENDER_EMAIL) no está configurado o no es válido en el archivo .env.local. Por favor, añada una dirección que haya verificado en SendGrid.";
    console.error(`[sendEmailAction] ${errorMessage}`);
    return {
      success: false,
      message: errorMessage,
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
    if (error.response && error.response.body && Array.isArray(error.response.body.errors) && error.response.body.errors.length > 0) {
      const firstError = error.response.body.errors[0];
      const apiMessage = firstError.message ? firstError.message.toLowerCase() : '';
      
      if (apiMessage.includes('permission denied') || apiMessage.includes('api key does not have permissions')) {
        errorMessage = "Error de permisos. La API Key de SendGrid no tiene permisos para enviar correos. Verifique los permisos en el panel de SendGrid.";
      } else if (apiMessage.includes('authorization') || error.code === 401) {
        errorMessage = "Error de autenticación. Verifique que la SENDGRID_API_KEY en su archivo .env.local sea correcta y esté activa.";
      } else if (apiMessage.includes('the from address does not match a verified sender')) {
        errorMessage = `La dirección de remitente (${senderEmail}) no está verificada en SendGrid. Por favor, verifíquela como 'Single Sender' o configure la Autenticación de Dominio en su panel de SendGrid.`;
      } else {
        errorMessage = firstError.message || JSON.stringify(firstError);
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


/**
 * Sends reminders for planned actions that are due soon.
 * This function is intended to be called by a cron job.
 */
export async function sendActionReminders() {
  console.log('[CRON] Iniciando trabajo de envío de recordatorios...');
  const today = startOfToday(); // Use startOfToday to ignore time part.
  const rcaAnalysesRef = collection(db, 'rcaAnalyses');
  const usersRef = collection(db, 'users');

  try {
    // This query is more robust. It gets documents where isFinalized is not true.
    // This includes documents where isFinalized is false, null, or doesn't exist.
    const q = query(rcaAnalysesRef, where('isFinalized', '!=', true));
    const rcaSnapshot = await getDocs(q);
    const usersSnapshot = await getDocs(usersRef);
    const users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FullUserProfile));
    const batch = writeBatch(db);
    let remindersSent = 0;

    for (const rcaDoc of rcaSnapshot.docs) {
      const rcaData = rcaDoc.data() as RCAAnalysisDocument;
      if (!rcaData.plannedActions || rcaData.plannedActions.length === 0) {
        continue;
      }

      for (const action of rcaData.plannedActions) {
        if (!action.dueDate || !action.responsible) {
          continue;
        }

        const actionValidation = rcaData.validations?.find(v => v.actionId === action.id);
        if (actionValidation?.status === 'validated' || actionValidation?.status === 'rejected') {
          continue;
        }

        const dueDate = parseISO(action.dueDate);
        const daysUntilDue = differenceInCalendarDays(dueDate, today);
        const lastReminderDate = action.lastReminderSent ? parseISO(action.lastReminderSent) : null;
        const reminderAlreadySentToday = lastReminderDate ? differenceInCalendarDays(today, lastReminderDate) === 0 : false;

        if (daysUntilDue <= 7 && daysUntilDue >= 0 && !reminderAlreadySentToday) {
          const responsibleUser = users.find(u => u.name === action.responsible);
          if (responsibleUser?.email && (responsibleUser.emailNotifications === undefined || responsibleUser.emailNotifications)) {
            console.log(`[CRON] Preparando recordatorio para la acción "${action.description}" (vence en ${daysUntilDue} días)`);
            
            const emailSubject = `Recordatorio de Tarea Próxima a Vencer: ${action.description.substring(0, 30)}...`;
            const emailBody = `Estimado/a ${responsibleUser.name},\n\nEste es un recordatorio de que la siguiente acción planificada está próxima a su fecha límite:\n\nEvento ACR: ${rcaData.eventData.focusEventDescription}\nAcción: ${action.description}\nFecha Límite: ${action.dueDate}\nDías Restantes: ${daysUntilDue}\n\nPor favor, acceda al sistema para actualizar el estado de esta tarea.\n\nSaludos,\nSistema Asistente ACR`;

            await sendEmailAction({
              to: responsibleUser.email,
              subject: emailSubject,
              body: emailBody,
            });

            remindersSent++;
            const actionToUpdate: Partial<PlannedAction> = { lastReminderSent: today.toISOString() };
            const updatedActions = rcaData.plannedActions.map(pa => 
              pa.id === action.id ? { ...pa, ...actionToUpdate } : pa
            );
            
            batch.update(rcaDoc.ref, { plannedActions: updatedActions });
          }
        }
      }
    }

    if (remindersSent > 0) {
      await batch.commit();
      console.log(`[CRON] ¡Éxito! Se enviaron ${remindersSent} recordatorios y se actualizaron en la base de datos.`);
    } else {
      console.log('[CRON] No se encontraron acciones que requieran un recordatorio hoy.');
    }

    return { success: true, remindersSent };
  } catch (error) {
    console.error('[CRON] Error crítico durante la ejecución de sendActionReminders:', error);
    return { success: false, error: (error as Error).message };
  }
}
