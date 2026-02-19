export function qs(selector, root = document) {
  return root.querySelector(selector);
}

export function createEl(tag, { className, text } = {}) {
  const element = document.createElement(tag);
  if (className) {
    element.className = className;
  }
  if (typeof text === 'string') {
    element.textContent = text;
  }
  return element;
}
