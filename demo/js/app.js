import { parseGoogleDoc } from "./google-doc.js";
import { renderContent } from "./render-content.js";

const container = document.querySelector("#container");
const content = document.querySelector("#content");

loadDocument();

async function loadDocument() {
  try {
    const response = await fetch("/api/google-doc", {
      headers: { Accept: "text/html" },
    });

    if (!response.ok) {
      throw new Error(`No se pudo cargar el documento (${response.status}).`);
    }

    const model = parseGoogleDoc(await response.text());
    renderContent(model, content);
    document.title = model.title;
    container.removeAttribute("aria-busy");
  } catch (error) {
    console.error(error);
    const message = document.createElement("p");
    message.className = "error-message";
    message.textContent =
      "No fue posible cargar el contenido. Intenta nuevamente en unos minutos.";
    content.replaceChildren(message);
    container.removeAttribute("aria-busy");
  }
}
