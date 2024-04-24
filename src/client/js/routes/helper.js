export const app = document.getElementById("app");

export const navbar = document.getElementById("navbar");

/**
 *
 * @param {string | NodeList | array} els Elements to toggle class for
 * @param {string} className
 * @param {boolean | undefined} force
 * @param {Element} parent
 */
export const toggleElementAll = (
  els,
  className,
  force = undefined,
  parent = document,
) => {
  els =
    els instanceof NodeList || Array.isArray(els)
      ? els
      : parent.querySelectorAll(els);

  for (const el of [...els]) {
    el.classList.toggle(className, force);
  }
};

/**
 * Toggle an element's class
 * @param {string | Element} selector DOM selector
 * @param {string} className
 * @param {boolean | undefined} forceShow whether to add or remove the class - if undefined, simply toggles
 * @param {Element} parent
 */
export const toggleElement = (
  selector,
  className,
  force = undefined,
  parent = document,
) => {
  const el =
    typeof selector === "string" ? parent.querySelector(selector) : selector;

  return toggleElementAll([el], className, force, parent);
};

export const setTitle = (title) => {
  document.title = [title, title && " | ", "TutorSwap"]
    .filter(Boolean)
    .join("");
};
