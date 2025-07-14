
# Configuración del Cron Job para Recordatorios

Esta aplicación utiliza un sistema de recordatorios por correo electrónico para las tareas (Planes de Acción) que están próximas a vencer. Para que este sistema funcione, es necesario configurar un "cron job" en un servicio externo que llame periódicamente a una URL específica de nuestra aplicación.

## ¿Qué es un Cron Job?

Es una tarea programada que se ejecuta automáticamente en intervalos de tiempo definidos (por ejemplo, una vez al día). En nuestro caso, el cron job simplemente hará una "visita" (una solicitud GET) a una URL de nuestra API.

## URL a la que debe llamar el Cron Job

La URL que debe configurar en el servicio de cron job es:

`https://<SU_DOMINIO_DE_PRODUCCION>/api/cron/enviar-recordatorios`

Reemplace `<SU_DOMINIO_DE_PRODUCCION>` con el dominio real donde está desplegada su aplicación.

## ¿Cómo configurar el Cron Job?

La configuración se realiza fuera de este código, en la plataforma donde tenga desplegada la aplicación (como Vercel) o en un servicio de cron jobs de terceros.

### Opción 1: Usando Vercel (Recomendado si despliega en Vercel)

1.  Vaya a su proyecto en Vercel.
2.  Vaya a la pestaña de "Settings" y luego a "Cron Jobs".
3.  Cree un nuevo Cron Job con la siguiente configuración:
    *   **Schedule:** `0 12 * * *` (Esto significa "todos los días a las 12:00 PM UTC". Puede ajustarlo a su necesidad. Use [crontab.guru](https://crontab.guru/) para ayuda).
    *   **Path:** `/api/cron/enviar-recordatorios` (Vercel añadirá su dominio automáticamente).
    *   **Branch:** `main` (o la rama principal de su proyecto).

### Opción 2: Usando un servicio externo como `cron-job.org`

1.  Regístrese en un servicio gratuito como [cron-job.org](https://cron-job.org/).
2.  Cree un nuevo cron job.
3.  En el campo "URL", pegue la URL completa: `https://<SU_DOMINIO_DE_PRODUCCION>/api/cron/enviar-recordatorios`.
4.  Configure el horario de ejecución (por ejemplo, "todos los días" a una hora específica).
5.  Guarde el cron job.

## Lógica de los Recordatorios

La lógica actual, definida en `src/app/actions.ts` dentro de la función `sendActionReminders`, es la siguiente:

-   El cron job se ejecuta una vez al día.
-   Busca todas las acciones planificadas que **no estén finalizadas ni validadas**.
-   Calcula cuántos días faltan para la fecha de vencimiento.
-   Si faltan **7 días o menos** para que venza una tarea, y no se ha enviado un recordatorio en el día actual, se enviará un correo electrónico al responsable de la tarea.
