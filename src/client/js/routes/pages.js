/**
 * Memoize a function -- calling the same function with the same arguments will return the same result.
 * @param {(...args) => T} cb
 * @returns {(...args) => Promise<T>}
 */
const memo = (cb) => {
  const saved = new Map();

  return async (...args) => {
    const key = args.join(",");

    if (saved.has(key)) return saved.get(key);

    const out = await cb(...args);

    saved.set(key, out);

    return out;
  };
};

/**
 * Fetch a URL and return the response text, memoized.
 * @param {string} url
 * @returns {Promise<string>}
 */
export const fetch = memo(async (url) => {
  const res = await window.fetch(url);

  return res.text();
});

/**
 * Fetch a route's HTML and return a DocumentFragment of its contents.
 * @param {string} name route file name
 * @returns {Promise<DocumentFragment>}
 */
export const fetchDOM = async (name) => {
  const html = await fetch(`/pages/${name}.html`);

  const template = document.createElement("template");
  template.innerHTML = html;

  return template.content;
};

/**
 * Fetch a route's CSS
 * @param {string} name route file name
 * @returns {Promise<string>}
 */
export const fetchCSS = async (name) => fetch(`/styles/pages/${name}.css`);
