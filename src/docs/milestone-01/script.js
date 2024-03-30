/* - **DOM Access**:
- **Dynamic DOM Updates**:
- **Event-Driven Trigger**: */
document.addEventListener("DOMContentLoaded", () => {
  const contentSections = document.querySelectorAll("main section");

  for (const section of contentSections) {
    const h2 = section.querySelector("h2");
    const content = section.querySelector(".content");

    if (!content) continue;
    
    h2.addEventListener("mouseover", () => {
      const counter = document.createElement("span");
      const length = content.innerText
        .split(/\s+(?:-\s+)?/)
        .filter(Boolean).length;

      counter.classList.add("word-count");
      counter.innerText = `${length} words`;
      h2.append(counter);

      h2.addEventListener("mouseout", () => {
        counter.remove();
      }, { once: true });
    });
  }
  
  // smooth scroll
  const links = document.querySelectorAll("#navbar a");
  
  for (const link of links) {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const section = document.querySelector(
        `section${link.getAttribute("href")}`,
      );
      section.scrollIntoView({ behavior: "smooth" });
      return false;
    });
  }
});
