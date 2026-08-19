# Imagen Fantasma

Sitio editorial que obtiene el contenido de un Google Doc publicado y lo
renderiza dentro del efecto visual original de `demo/`.

## Desarrollo

Requiere Node.js 20 o posterior y no tiene dependencias externas.

```bash
npm run build
npm start
```

El sitio queda disponible en `http://localhost:3000`.

## Contenido y publicación

`npm run build` consulta una URL pública fija de Google Docs y genera
`demo/google-doc.html`. El navegador convierte ese HTML a un modelo editorial y
solo renderiza headings, párrafos, listas, enlaces, énfasis e imágenes; no
inserta estilos ni clases de Google Docs.

GitHub Actions obtiene el documento y despliega `demo/` cuando hay un push al
sitio, se ejecuta manualmente desde la pestaña Actions o lo solicita el Apps
Script de `apps-script/Code.gs`. Cada consulta evita reutilizar una versión en
caché, tanto de Google Docs como del navegador.

### Actualizar al editar el Google Doc

Google Docs no proporciona un trigger de edición para Apps Script. El script
incluido revisa el documento una vez por minuto y, cuando detecta que dejó de
cambiar durante 90 segundos, inicia un único despliegue en GitHub.

1. Crea un proyecto en [Apps Script](https://script.google.com/), pega el
   contenido de `apps-script/Code.gs` y guarda.
2. En **Configuración del proyecto → Propiedades de secuencia de comandos**,
   agrega:
   - `DOC_ID`: el identificador entre `/d/` y `/edit` en la URL del documento.
   - `GITHUB_OWNER`: `iprojas`.
   - `GITHUB_REPO`: `fantasma`.
   - `GITHUB_TOKEN`: token fine-grained de GitHub (ver abajo).
   - `GITHUB_REF`: `main` (opcional).
3. Ejecuta `testConfiguration` una vez y concede los permisos solicitados.
4. Ejecuta `install` una vez. Esto crea el disparador de un minuto; no hace
   falta volver a ejecutarlo.

Para `GITHUB_TOKEN`, crea un **fine-grained personal access token** en GitHub,
restringido al repositorio `iprojas/fantasma`, con el permiso de repositorio
**Actions: Read and write**. No uses un token clásico ni le concedas permisos
adicionales. El token se guarda solo en las propiedades del proyecto de Apps
Script; no lo pegues en el código ni en el documento. Conserva ese proyecto sin
colaboradores, pues sus editores pueden modificar el script que usa el token.
