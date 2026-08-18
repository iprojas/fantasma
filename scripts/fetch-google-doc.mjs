import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DOCUMENT_URL =
  "https://docs.google.com/document/d/e/2PACX-1vTRxiZK2rLChqVKYyaQNUP_EswluVkO00Qq_il0Ah4a5MbI6GBz9tRTEF1B4GIHOQsPk5JNiXbvJCwb/pub";
const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = join(projectRoot, "demo", "google-doc.html");

// Google caches published documents for several minutes. A unique query string
// makes each deployment request a fresh published version instead of reusing a
// previously cached response.
const documentUrl = new URL(DOCUMENT_URL);
documentUrl.searchParams.set("cacheBust", Date.now().toString());

const response = await fetch(documentUrl, {
  headers: { Accept: "text/html; charset=utf-8" },
  cache: "no-store",
  redirect: "follow",
  signal: AbortSignal.timeout(15_000),
});

if (!response.ok) {
  throw new Error(`Google Docs respondió ${response.status}.`);
}

const html = await response.text();
if (!html.includes("doc-content")) {
  throw new Error("La respuesta de Google Docs no contiene el documento publicado.");
}

await mkdir(dirname(outputPath), { recursive: true });
await writeFile(outputPath, html, "utf8");
console.log(`Documento actualizado: ${outputPath} (${html.length} caracteres)`);
