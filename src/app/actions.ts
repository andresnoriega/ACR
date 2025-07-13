
'use server';

import sgMail from '@sendgrid/mail';
import { db } from '@/lib/firebase';
import { collection, getDocs, writeBatch, doc } from 'firebase/firestore';
import type { RCAAnalysisDocument, FullUserProfile } from '@/types/rca';
import { differenceInCalendarDays, startOfToday } from 'date-fns';

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

  if (!apiKey || apiKey === 'TU_API_KEY_DE_SENDGRID_AQUI' || !apiKey.startsWith('SG.')) {
    const errorMessage = "Error de configuración: La API Key de SendGrid (SENDGRID_API_KEY) no está configurada, es un placeholder o no es válida. Debe empezar con 'SG.'. Por favor, añádala a su archivo .env.local.";
    console.error(`[sendEmailAction] ${errorMessage}`);
    return {
      success: false,
      message: errorMessage,
      details: payload,
    };
  }

  if (!senderEmail || senderEmail === 'tu@email_verificado_en_sendgrid.com' || !senderEmail.includes('@')) {
    const errorMessage = "Error de configuración: La dirección de correo del remitente (SENDGRID_SENDER_EMAIL) no es válida o es un placeholder. Por favor, añada una dirección que haya verificado como 'Single Sender' en su cuenta de SendGrid a su archivo .env.local.";
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
 * Checks for pending action plans and sends email reminders.
 * This is the core logic for the CRON job.
 * @returns A promise with the number of actions checked and reminders sent.
 */
export async function sendActionReminders(): Promise<{ actionsChecked: number, remindersSent: number, errors: string[] }> {
  console.log('[CRON] Starting action reminder check...');
  const today = startOfToday();
  const todayStr = today.toISOString().split('T')[0];
  let actionsChecked = 0;
  let remindersSent = 0;
  const errors: string[] = [];

  try {
    const usersSnapshot = await getDocs(collection(db, "users"));
    const userMap = new Map<string, FullUserProfile>();
    usersSnapshot.forEach(userDoc => {
      const userData = { id: userDoc.id, ...userDoc.data() } as FullUserProfile;
      if (userData.name) {
        userMap.set(userData.name, userData);
      }
    });

    const rcaSnapshot = await getDocs(collection(db, "rcaAnalyses"));
    const batch = writeBatch(db);
    let batchHasWrites = false;

    // Use a for...of loop to handle async operations correctly inside the loop.
    for (const rcaDoc of rcaSnapshot.docs) {
      const rcaData = rcaDoc.data() as RCAAnalysisDocument;
      let actionsModified = false;

      // Skip documents that are finalized or have no actions.
      if (rcaData.isFinalized || !rcaData.plannedActions || rcaData.plannedActions.length === 0) {
        continue;
      }
      
      const updatedActions = await Promise.all(rcaData.plannedActions.map(async (action) => {
        actionsChecked++;
        const validation = rcaData.validations?.find(v => v.actionId === action.id);
        const isCompleted = validation?.status === 'validated';
        const isRejected = validation?.status === 'rejected';

        let currentStateForEmail: string;
        if (isCompleted) {
            currentStateForEmail = 'Validado';
        } else if (isRejected) {
            currentStateForEmail = 'Rechazado';
        } else if (action.markedAsReadyAt) {
            currentStateForEmail = 'En Validación';
        } else if (action.evidencias && action.evidencias.length > 0) {
            currentStateForEmail = 'En Proceso';
        } else {
            currentStateForEmail = 'Pendiente';
        }
        
        // A reminder is needed if the action is NOT yet validated.
        if (isCompleted || !action.dueDate || action.lastReminderSent === todayStr) {
          return action; // No reminder needed today.
        }
        
        try {
          const dueDate = new Date(action.dueDate);
          const daysUntilDue = differenceInCalendarDays(dueDate, today);

          let reminderType: 'Precaución' | 'Alerta' | null = null;
          // Send "Alerta" if due today or overdue
          if (daysUntilDue <= 0) {
            reminderType = 'Alerta';
          // Send "Precaución" if due within 7 days
          } else if (daysUntilDue <= 7) {
            reminderType = 'Precaución';
          }

          if (reminderType) {
            const responsibleUser = userMap.get(action.responsible);
            // Check if user exists, has an email, and notifications are enabled
            if (responsibleUser?.email && (responsibleUser.emailNotifications === undefined || responsibleUser.emailNotifications)) {
              console.log(`[CRON] Preparing ${reminderType} reminder for action "${action.description.substring(0, 20)}..." to ${responsibleUser.email}`);
              
              const subject = `Recordatorio de ${reminderType}: Tarea ACR Pendiente - ${rcaData.eventData.focusEventDescription.substring(0,30)}...`;
              const htmlBody = `
                <p>Estimado/a ${action.responsible},</p>
                <p>Este es un recordatorio sobre su tarea pendiente para el evento ACR <strong>"${rcaData.eventData.focusEventDescription}"</strong>.</p>
                <ul>
                  <li><strong>Tarea:</strong> ${action.description}</li>
                  <li><strong>Fecha Límite:</strong> ${action.dueDate}</li>
                  <li><strong>Estado Actual:</strong> ${currentStateForEmail}</li>
                </ul>
                <p><strong>${reminderType === 'Alerta' ? '¡ATENCIÓN! La fecha límite para esta tarea ha llegado o ya pasó.' : 'Esta tarea vence en 7 días o menos.'}</strong></p>
                <p>Por favor, acceda al sistema para actualizar su estado y adjuntar las evidencias correspondientes.</p>
                <br/>
                <p>Saludos,</p>
                <p><strong>Sistema Asistente ACR</strong></p>
              `;

              const emailResult = await sendEmailAction({
                to: responsibleUser.email,
                subject: subject,
                body: `Este es un recordatorio para su tarea: ${action.description}. Fecha límite: ${action.dueDate}.`,
                htmlBody: htmlBody,
              });

              if (emailResult.success) {
                remindersSent++;
                actionsModified = true;
                return { ...action, lastReminderSent: todayStr };
              } else {
                errors.push(`Failed to send email to ${responsibleUser.email} for action ${action.id}: ${emailResult.message}`);
                console.error(`[CRON] Email sending failed: ${emailResult.message}`);
              }
            } else {
               console.log(`[CRON] Skipping reminder for action ${action.id}: Responsible user '${action.responsible}' not found, has no email, or notifications are disabled.`);
            }
          }
        } catch (e: any) {
            const errorMessage = `[CRON] Error processing date for action ${action.id}: ${e.message}`;
            console.error(errorMessage, e);
            errors.push(errorMessage);
        }
        return action; // Return original action if no reminder was sent or an error occurred.
      }));

      if (actionsModified) {
        batch.update(doc(db, "rcaAnalyses", rcaDoc.id), { plannedActions: updatedActions });
        batchHasWrites = true;
      }
    }

    if (batchHasWrites) {
      await batch.commit();
      console.log('[CRON] Batch commit successful. Reminder states updated.');
    }

    console.log(`[CRON] Reminder check finished. Checked: ${actionsChecked}, Sent: ${remindersSent}, Errors: ${errors.length}`);
    return { actionsChecked, remindersSent, errors };
  } catch (error: any) {
    console.error("[CRON] Critical error during reminder check:", error);
    return { actionsChecked: 0, remindersSent: 0, errors: [`Critical error: ${error.message}`] };
  }
}
