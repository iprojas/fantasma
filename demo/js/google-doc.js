const BLOCK_TAGS = new Set([
  "H1",
  "H2",
  "H3",
  "H4",
  "H5",
  "H6",
  "P",
  "UL",
  "OL",
  "FIGURE",
]);

/**
 * Converts Google's published HTML into a presentation-free content model.
 * Google class rules are read only to recover semantic bold/italic marks; none
 * of those styles or classes are copied into the rendered page.
 */
export function parseGoogleDoc(html) {
  const source = new DOMParser().parseFromString(html, "text/html");
  const root = source.querySelector("#contents .doc-content, .doc-content");

  if (!root) {
    throw new Error("El documento publicado no contiene contenido reconocible.");
  }

  const classMarks = readClassMarks(source);
  const blocks = parseBlockChildren(root, classMarks);

  if (blocks.length === 0) {
    throw new Error("El documento publicado está vacío.");
  }

  return {
    title: source.title?.trim() || "Documento",
    blocks,
  };
}

function parseBlockChildren(parent, classMarks) {
  const blocks = [];

  for (const element of parent.children) {
    const parsed = parseBlock(element, classMarks);
    if (Array.isArray(parsed)) blocks.push(...parsed);
    else if (parsed) blocks.push(parsed);
  }

  return blocks;
}

function parseBlock(element, classMarks) {
  if (/^H[1-6]$/.test(element.tagName)) {
    return {
      type: "heading",
      level: Number(element.tagName.slice(1)),
      children: parseInlineChildren(element, classMarks),
    };
  }

  if (element.tagName === "P") {
    const children = parseInlineChildren(element, classMarks);
    return hasVisibleContent(children) ? { type: "paragraph", children } : null;
  }

  if (element.tagName === "UL" || element.tagName === "OL") {
    return parseList(element, classMarks);
  }

  if (element.tagName === "FIGURE") {
    const image = element.querySelector("img");
    return image ? parseImageBlock(image, element.querySelector("figcaption")) : null;
  }

  if (element.tagName === "IMG") return parseImageBlock(element);

  // Google may add layout wrappers. Walk them without carrying their styling.
  const directBlocks = [...element.children].some((child) =>
    BLOCK_TAGS.has(child.tagName),
  );
  if (directBlocks) return parseBlockChildren(element, classMarks);

  const children = parseInlineChildren(element, classMarks);
  return hasVisibleContent(children) ? { type: "paragraph", children } : null;
}

function parseList(list, classMarks) {
  const items = [...list.children]
    .filter((child) => child.tagName === "LI")
    .map((item) => {
      const nestedLists = [...item.children].filter(
        (child) => child.tagName === "UL" || child.tagName === "OL",
      );
      const inlineSource = item.cloneNode(true);
      inlineSource.querySelectorAll("ul, ol").forEach((nested) => nested.remove());

      return {
        children: parseInlineChildren(inlineSource, classMarks),
        lists: nestedLists.map((nested) => parseList(nested, classMarks)),
      };
    });

  return items.length
    ? { type: "list", ordered: list.tagName === "OL", items }
    : null;
}

function parseInlineChildren(parent, classMarks, inherited = {}) {
  const nodes = [];
  for (const child of parent.childNodes) {
    nodes.push(...parseInline(child, classMarks, inherited));
  }
  return mergeTextNodes(nodes);
}

function parseInline(node, classMarks, inherited) {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.nodeValue
      ? [{ type: "text", value: node.nodeValue, ...inherited }]
      : [];
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return [];

  if (node.tagName === "BR") return [{ type: "break" }];

  if (node.tagName === "IMG") {
    const src = safeUrl(node.getAttribute("src"), { image: true });
    return src
      ? [{ type: "image", src, alt: node.getAttribute("alt")?.trim() || "" }]
      : [];
  }

  const marks = marksForElement(node, classMarks, inherited);
  const children = parseInlineChildren(node, classMarks, marks);

  if (node.tagName === "A") {
    const href = normalizeGoogleRedirect(node.getAttribute("href"));
    return href ? [{ type: "link", href, children }] : children;
  }

  return children;
}

function marksForElement(element, classMarks, inherited) {
  const declarations = `${element.getAttribute("style") || ""} ${[
    ...element.classList,
  ]
    .map((name) => classMarks.get(name) || "")
    .join(" ")}`;

  return {
    ...(inherited.bold ||
    ["B", "STRONG"].includes(element.tagName) ||
    /font-weight\s*:\s*(?:bold|[6-9]00)/i.test(declarations)
      ? { bold: true }
      : {}),
    ...(inherited.italic ||
    ["I", "EM"].includes(element.tagName) ||
    /font-style\s*:\s*italic/i.test(declarations)
      ? { italic: true }
      : {}),
  };
}

function readClassMarks(source) {
  const rules = new Map();
  const css = [...source.querySelectorAll("#contents style, .doc-content style")]
    .map((style) => style.textContent || "")
    .join("\n");
  const pattern = /\.([_a-zA-Z][\w-]*)\s*\{([^}]*)\}/g;
  let match;

  while ((match = pattern.exec(css))) rules.set(match[1], match[2]);
  return rules;
}

function parseImageBlock(image, caption) {
  const src = safeUrl(image.getAttribute("src"), { image: true });
  if (!src) return null;

  return {
    type: "image",
    src,
    alt: image.getAttribute("alt")?.trim() || "",
    caption: caption?.textContent?.trim() || "",
  };
}

function normalizeGoogleRedirect(value) {
  const url = safeUrl(value);
  if (!url) return null;

  try {
    const parsed = new URL(url, window.location.origin);
    if (parsed.hostname === "www.google.com" && parsed.pathname === "/url") {
      return safeUrl(parsed.searchParams.get("q"));
    }
  } catch {
    return null;
  }

  return url;
}

function safeUrl(value, { image = false } = {}) {
  if (!value) return null;

  try {
    const url = new URL(value, window.location.origin);
    const allowed = image ? ["https:"] : ["http:", "https:", "mailto:"];
    return allowed.includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function hasVisibleContent(nodes) {
  return nodes.some(
    (node) =>
      node.type === "image" ||
      node.type === "break" ||
      (node.type === "text" && node.value.trim()) ||
      (node.type === "link" && hasVisibleContent(node.children)),
  );
}

function mergeTextNodes(nodes) {
  return nodes.reduce((result, node) => {
    const previous = result.at(-1);
    if (
      node.type === "text" &&
      previous?.type === "text" &&
      Boolean(node.bold) === Boolean(previous.bold) &&
      Boolean(node.italic) === Boolean(previous.italic)
    ) {
      previous.value += node.value;
    } else {
      result.push(node);
    }
    return result;
  }, []);
}
