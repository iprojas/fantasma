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
cada cinco minutos. También puede ejecutarse manualmente desde la pestaña
Actions. El horario de GitHub puede sufrir demoras cuando hay alta demanda, pero
las ediciones no requieren modificar ni volver a subir el código.
