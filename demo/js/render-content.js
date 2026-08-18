export function renderContent(model, container) {
  const fragment = document.createDocumentFragment();
  for (const block of model.blocks) fragment.append(renderBlock(block));
  container.replaceChildren(fragment);
}

function renderBlock(block) {
  if (block.type === "heading") {
    const heading = document.createElement(`h${block.level}`);
    heading.append(renderInline(block.children));
    return heading;
  }

  if (block.type === "paragraph") {
    const paragraph = document.createElement("p");
    paragraph.append(renderInline(block.children));
    return paragraph;
  }

  if (block.type === "list") return renderList(block);

  if (block.type === "image") {
    const figure = document.createElement("figure");
    figure.append(createImage(block));
    if (block.caption) {
      const caption = document.createElement("figcaption");
      caption.textContent = block.caption;
      figure.append(caption);
    }
    return figure;
  }

  throw new Error(`Tipo de bloque desconocido: ${block.type}`);
}

function renderList(block) {
  const list = document.createElement(block.ordered ? "ol" : "ul");
  for (const item of block.items) {
    const listItem = document.createElement("li");
    listItem.append(renderInline(item.children));
    for (const nested of item.lists) listItem.append(renderList(nested));
    list.append(listItem);
  }
  return list;
}

function renderInline(nodes) {
  const fragment = document.createDocumentFragment();

  for (const node of nodes) {
    if (node.type === "break") {
      fragment.append(document.createElement("br"));
      continue;
    }

    if (node.type === "image") {
      fragment.append(createImage(node));
      continue;
    }

    if (node.type === "link") {
      const anchor = document.createElement("a");
      anchor.href = node.href;
      anchor.rel = "noopener noreferrer";
      anchor.append(renderInline(node.children));
      fragment.append(anchor);
      continue;
    }

    let content = document.createTextNode(node.value);
    if (node.italic) {
      const emphasis = document.createElement("em");
      emphasis.append(content);
      content = emphasis;
    }
    if (node.bold) {
      const strong = document.createElement("strong");
      strong.append(content);
      content = strong;
    }
    fragment.append(content);
  }

  return fragment;
}

function createImage(node) {
  const image = document.createElement("img");
  image.src = node.src;
  image.alt = node.alt;
  image.loading = "lazy";
  image.decoding = "async";
  image.referrerPolicy = "no-referrer";
  return image;
}
