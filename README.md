# Imagen Fantasma

Sitio editorial que obtiene el contenido de un Google Doc publicado y lo
renderiza dentro del efecto visual original de `demo/`.

## Desarrollo

Requiere Node.js 20 o posterior y no tiene dependencias externas.

```bash
npm start
```

El sitio queda disponible en `http://localhost:3000`.

## Contenido y caché

`server.mjs` consulta una URL pública fija de Google Docs mediante
`/api/google-doc`. Conserva la última respuesta válida durante cinco minutos y,
si Google no responde, sirve esa copia en vez de dejar el sitio vacío. El
navegador convierte el HTML a un modelo editorial y solo renderiza headings,
párrafos, listas, enlaces, énfasis e imágenes; no inserta estilos ni clases de
Google Docs.

Para producción, el host debe ejecutar `npm start` como un servicio Node. Las
ediciones publicadas en Google Docs aparecen automáticamente cuando expira la
caché, sin recompilar ni modificar el sitio.
