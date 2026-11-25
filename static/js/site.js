document.documentElement.classList.add("js");

const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".main-nav");
function closeMenu() {
  navigation.classList.remove("is-open");
  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Open navigation");
}
menuButton.addEventListener("click", () => {
  const open = navigation.classList.toggle("is-open");
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && navigation.classList.contains("is-open")) {
    closeMenu();
    menuButton.focus();
  }
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".site-header")) closeMenu();
});
navigation.querySelectorAll("a").forEach((link) => link.addEventListener("click", closeMenu));
matchMedia("(min-width: 641px)").addEventListener("change", closeMenu);

const themeButton = document.querySelector(".theme-toggle");
function syncThemeButton() {
  const dark = document.documentElement.dataset.theme === "dark";
  themeButton.setAttribute("aria-label", `Switch to ${dark ? "light" : "dark"} theme`);
  themeButton.setAttribute("aria-pressed", String(dark));
}
syncThemeButton();
themeButton.addEventListener("click", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = next;
  try { localStorage.setItem("theme", next); } catch (_) {}
  syncThemeButton();
});

// Keep the old one-page links useful after the sections move to their own pages.
if (document.body.dataset.page === "home") {
  const legacy = { "#career": "/career/", "#research": "/research/", "#publications": "/research/", "#awards": "/accomplishments/", "#accomplishments": "/accomplishments/", "#contact": "/contacts/", "#posts": "/post/", "#talks": "/event/" };
  if (legacy[location.hash]) location.replace(legacy[location.hash]);
}

const searchInput = document.getElementById("publication-search");
if (searchInput) {
  searchInput.closest("label").hidden = false;
  const papers = [...document.querySelectorAll(".pub")];
  const normalize = (text) => text.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const searchText = papers.map((paper) => normalize(paper.textContent));
  searchInput.addEventListener("input", () => {
    const terms = normalize(searchInput.value.trim()).split(/\s+/).filter(Boolean);
    let count = 0;
    papers.forEach((paper, index) => {
      paper.hidden = !terms.every((term) => searchText[index].includes(term));
      if (!paper.hidden) count++;
    });
    document.getElementById("publication-count").textContent = `${count} ${count === 1 ? "paper" : "papers"}`;
    document.querySelector(".no-results").hidden = count !== 0;
  });
}

const citationDialog = document.getElementById("citation-dialog");
if (citationDialog && typeof citationDialog.showModal === "function") {
  const citationText = document.getElementById("citation-text");
  const citationStatus = document.getElementById("citation-status");
  document.querySelectorAll("[data-cite]").forEach((button) => {
    button.hidden = false;
    button.addEventListener("click", () => {
      citationText.textContent = button.dataset.cite;
      citationStatus.textContent = "";
      citationDialog.showModal();
    });
  });
  document.getElementById("citation-close").addEventListener("click", () => citationDialog.close());
  citationDialog.addEventListener("click", (event) => {
    const box = citationDialog.getBoundingClientRect();
    if (event.target === citationDialog && (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom)) citationDialog.close();
  });
  document.getElementById("citation-copy").addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(citationText.textContent);
      citationStatus.textContent = "Citation copied.";
    } catch (_) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(citationText);
      selection.removeAllRanges();
      selection.addRange(range);
      citationStatus.textContent = "The citation is selected. Use your device’s copy command to copy it.";
    }
  });
}

const emailButton = document.getElementById("copy-email");
if (emailButton && navigator.clipboard) {
  emailButton.hidden = false;
  emailButton.addEventListener("click", async () => {
    const status = document.getElementById("email-status");
    try {
      await navigator.clipboard.writeText("gandreana@escp.eu");
      status.textContent = "Email address copied.";
    } catch (_) { status.textContent = "Please select and copy the email address above."; }
  });
}
