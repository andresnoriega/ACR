# Firebase Studio

This is a NextJS starter in Firebase Studio.

To get started, take a look at src/app/page.tsx.

---

## Despliegue en Firebase App Hosting

Para desplegar tu aplicación usando Firebase App Hosting, necesitas subir tu código a un repositorio de GitHub. Si tu repositorio está vacío, sigue estos pasos desde la terminal en la carpeta de tu proyecto.

**1. Inicializa Git (si aún no lo has hecho):**

```bash
git init
git add .
git commit -m "Initial commit"
```

**2. Conecta tu repositorio local al de GitHub:**

Reemplaza `YOUR_GITHUB_USERNAME` y `YOUR_REPOSITORY_NAME` con los tuyos.

```bash
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/YOUR_REPOSITORY_NAME.git
```

**3. Sube el código a GitHub:**

Esto creará la rama `main` en tu repositorio de GitHub.

```bash
git branch -M main
git push -u origin main
```

**4. Vuelve a Firebase:**

Después de ejecutar estos comandos, vuelve a la consola de Firebase, actualiza la página y ahora deberías poder seleccionar la rama `main` sin problemas.
