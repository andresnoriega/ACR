# Configuración del Cron Job para Recordatorios Automáticos

El sistema de recordatorios de la aplicación ahora se ejecuta a través de una ruta de API segura que debe ser activada por un servicio externo de "cron job". Esto asegura que los recordatorios se envíen de manera fiable, independientemente de si los usuarios inician sesión.

## 1. Añadir la Clave Secreta

Primero, añade una clave secreta a tu archivo `.env.local`. Esta clave protegerá la ruta de la API para que solo un servicio autorizado pueda ejecutarla.

Abre tu archivo `.env.local` y añade la siguiente línea, reemplazando `TU_CLAVE_SECRETA_Y_LARGA_AQUI` por una cadena de texto aleatoria y segura que tú inventes (por ejemplo, generada con un gestor de contraseñas).

```
CRON_SECRET="TU_CLAVE_SECRETA_Y_LARGA_AQUI"
```

## 2. Construir la URL del Cron Job

La URL que el servicio externo deberá visitar es la siguiente:

`https://<TU_DOMINIO_PUBLICO>/api/cron/send-reminders?secret=<TU_CLAVE_SECRETA>`

- **Reemplaza `<TU_DOMINIO_PUBLICO>`** con el dominio que está públicamente accesible y apuntando a tu aplicación.
    -   **Opción Recomendada (Dominio Personalizado):** Si has configurado un dominio personalizado (ej: a través de Cloudflare), usa ese dominio. Ejemplo: `mi-app-rca.com`.
    -   **Opción de Respaldo (Dominio de Firebase):** Si no, usa el dominio que Firebase te proporcionó para tu aplicación (ej: `rca-assistant-jk3ja.web.app`).
- **Reemplaza `<TU_CLAVE_SECRETA>`** con la misma clave que pusiste en el archivo `.env.local`.

**Ejemplo con dominio personalizado:**
`https://www.mi-asistente-rca.com/api/cron/send-reminders?secret=MiClaveSuperSegura12345`

**Ejemplo con dominio de Firebase:**
`https://rca-assistant-jk3ja.web.app/api/cron/send-reminders?secret=MiClaveSuperSegura12345`


## 3. Configurar un Servicio de Cron Job Externo

Puedes usar cualquier servicio de cron job. "Cron-Job.org" es una opción popular y gratuita.

1.  **Ve a [Cron-Job.org](https://cron-job.org/) y regístrate.**
2.  **Crea un nuevo "Cronjob":**
    -   **Title:** Ponle un nombre descriptivo, como "Recordatorios Asistente ACR".
    -   **URL:** Pega la URL completa que construiste en el paso anterior.
    -   **Schedule:** Configura cuándo quieres que se ejecute. Para un recordatorio diario, puedes seleccionar "Every day".
3.  **Guarda el Cronjob.**

¡Eso es todo! Ahora, el servicio visitará automáticamente la URL todos los días, y tu aplicación enviará los recordatorios de "Precaución" y "Alerta" según corresponda.
