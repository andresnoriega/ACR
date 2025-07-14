
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
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
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
        
        // Safely check lastReminderSent
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
