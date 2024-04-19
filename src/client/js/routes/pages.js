const memo = (cb) => {
  const saved = new Map();

  return async (...args) => {
    const key = args.join(",");

    if (saved.has(key))
      return saved.get(key);

    const out = await cb(...args);

    saved.set(key, out);

    return out;
  };
};

export const fetch = memo(async (name) => {
  const res = await window.fetch(`/pages/${name}.html`);

  return res.text();
});

export const fetchDOM = async (name) => {
  const html = await fetch(name);

  const template = document.createElement("template");
  template.innerHTML = html;

  return template.content;
};

export const registerCustomComponents = (name, xml) => {
  const templates = [...xml.querySelectorAll("template") ];

  for (const template of templates) {
    const key = `${name}-${template.id}`;

    if (customElements.get(key))
      continue;

    console.debug(`[pages] registering custom element <${key}>`);

    customElements.define(
        key, class extends HTMLElement {
          constructor() {
            super();

            const shadowRoot = this.attachShadow({mode : "open"});

            shadowRoot.appendChild(template.content.cloneNode(true));
          }
        },
    );
  }
};
