import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { dirname, extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const DOCUMENT_URL =
  "https://docs.google.com/document/d/e/2PACX-1vTRxiZK2rLChqVKYyaQNUP_EswluVkO00Qq_il0Ah4a5MbI6GBz9tRTEF1B4GIHOQsPk5JNiXbvJCwb/pub";
const CACHE_TTL_MS = 5 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;
const PORT = Number.parseInt(process.env.PORT || "3000", 10);
const STATIC_ROOT = join(dirname(fileURLToPath(import.meta.url)), "demo");
const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
};

let cachedDocument = null;
let pendingFetch = null;

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);

    if (url.pathname === "/api/google-doc") {
      await serveGoogleDoc(request, response);
      return;
    }

    await serveStatic(url.pathname, response);
  } catch (error) {
    console.error(error);
    send(response, 500, "Error interno del servidor", {
      "Content-Type": "text/plain; charset=utf-8",
    });
  }
});

server.listen(PORT, () => {
  console.log(`Imagen Fantasma disponible en http://localhost:${PORT}`);
});

async function serveGoogleDoc(request, response) {
  let entry;

  try {
    entry = await getPublishedDocument();
  } catch (error) {
    if (!cachedDocument) throw error;
    console.warn("Google Docs no respondió; se servirá la última copia válida.");
    entry = cachedDocument;
  }

  if (request.headers["if-none-match"] === entry.etag) {
    response.writeHead(304, apiHeaders(entry));
    response.end();
    return;
  }

  send(response, 200, entry.html, apiHeaders(entry));
}

async function getPublishedDocument() {
  const now = Date.now();
  if (cachedDocument && now - cachedDocument.fetchedAt < CACHE_TTL_MS) {
    return cachedDocument;
  }

  if (pendingFetch) return pendingFetch;

  pendingFetch = fetch(DOCUMENT_URL, {
    headers: { Accept: "text/html; charset=utf-8" },
    redirect: "follow",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })
    .then(async (response) => {
      if (!response.ok) throw new Error(`Google Docs respondió ${response.status}`);
      const html = await response.text();
      if (!html.includes("doc-content")) {
        throw new Error("La respuesta de Google Docs no contiene el documento.");
      }

      cachedDocument = {
        html,
        fetchedAt: Date.now(),
        etag: `"${createHash("sha256").update(html).digest("base64url")}"`,
      };
      return cachedDocument;
    })
    .finally(() => {
      pendingFetch = null;
    });

  return pendingFetch;
}

function apiHeaders(entry) {
  return {
    "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
    "Content-Type": "text/html; charset=utf-8",
    ETag: entry.etag,
    "X-Content-Type-Options": "nosniff",
  };
}

async function serveStatic(pathname, response) {
  const requestedPath = pathname === "/" ? "/index.html" : pathname;
  const decodedPath = decodeURIComponent(requestedPath);
  const filePath = normalize(join(STATIC_ROOT, decodedPath));

  if (!filePath.startsWith(`${STATIC_ROOT}/`)) {
    send(response, 403, "Acceso denegado", {
      "Content-Type": "text/plain; charset=utf-8",
    });
    return;
  }

  try {
    const fileInfo = await stat(filePath);
    if (!fileInfo.isFile()) throw new Error("Not a file");
    const body = await readFile(filePath);
    send(response, 200, body, {
      "Cache-Control": "no-cache",
      "Content-Type": MIME_TYPES[extname(filePath)] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
    });
  } catch {
    send(response, 404, "No encontrado", {
      "Content-Type": "text/plain; charset=utf-8",
    });
  }
}

function send(response, status, body, headers) {
  response.writeHead(status, headers);
  response.end(body);
}
