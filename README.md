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

GitHub Actions vuelve a obtener el documento y despliega `demo/` en GitHub Pages
cada cinco minutos. Cada consulta evita reutilizar una versión en caché, tanto
de Google Docs como del navegador. También puede ejecutarse manualmente desde la
pestaña Actions. El horario de GitHub puede sufrir demoras cuando hay alta
demanda, pero las ediciones no requieren modificar ni volver a subir el código.

GitHub Pages es un sitio estático, por lo que no puede recibir una notificación
directa al editar un Google Doc. Para actualización inmediata por cada edición
se debe conectar un webhook de Google Drive a un servicio con credenciales (por
ejemplo, un Worker) que inicie el despliegue; la configuración de ese servicio
requiere acceso al proyecto de Google y al repositorio.
