import { cp, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const root = fileURLToPath(new URL("../", import.meta.url));
const pages = [
  { name: "home", url: "/", title: "Gianmarco Andreana · Operations Research & Transportation Economics", description: "Assistant Professor at ESCP Business School, Madrid. Exploring aviation, competition and electricity markets through operations research and game theory." },
  { name: "career", url: "/career/", title: "Career · Gianmarco Andreana", description: "Academic appointments, teaching and education at ESCP Business School, Bocconi, the University of Bergamo and the Hebrew University of Jerusalem." },
  { name: "research", url: "/research/", title: "Research · Gianmarco Andreana", description: "Publications on aviation, airline competition, airport capacity and environmental externalities, alongside research interests in electricity markets." },
  { name: "accomplishments", url: "/accomplishments/", title: "Accomplishments · Gianmarco Andreana", description: "Research awards, grants and academic milestones in transportation economics and operations research." },
  { name: "contacts", url: "/contacts/", title: "Contacts · Gianmarco Andreana", description: "Get in touch with Gianmarco Andreana at ESCP Business School in Madrid for research, academic collaboration and teaching inquiries." },
];
const escape = (value) => String(value).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

export async function buildSite(output = path.join(root, "public")) {
  const layout = await readFile(path.join(root, "site/layout.html"), "utf8");
  await mkdir(output, { recursive: true });
  await cp(path.join(root, "static"), output, { recursive: true });
  // Keep every citation available in standalone previews as well as Hugo builds.
  const publications = await readdir(path.join(root, "content/publication"), { withFileTypes: true });
  for (const publication of publications.filter((entry) => entry.isDirectory())) {
    const destination = path.join(output, "publication", publication.name.toLowerCase());
    await mkdir(destination, { recursive: true });
    await cp(path.join(root, "content/publication", publication.name, "cite.bib"), path.join(destination, "cite.bib"));
  }
  for (const page of pages) {
    let body = await readFile(path.join(root, `site/pages/${page.name}.html`), "utf8");
    if (page.name === "home") {
      body = body.replace("{{flight_map}}", await readFile(path.join(root, "site/partials/flight-map.svg"), "utf8"));
    }
    const fields = {
      ...page, page: page.name, body, year: new Date().getUTCFullYear(),
      extra_head: page.name === "home" ? '<script src="/js/flight-map.js" defer></script>' : "",
      ...Object.fromEntries(pages.map((item) => [`active_${item.name}`, item === page ? 'aria-current="page"' : ""])),
    };
    const html = layout.replace(/\{\{([a-z_]+)\}\}/g, (_, key) => {
      if (!(key in fields)) throw new Error(`Unknown layout field: ${key}`);
      return ["body", "extra_head"].includes(key) || key.startsWith("active_") ? fields[key] : escape(fields[key]);
    });
    const destination = path.join(output, page.url, "index.html");
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, html);
  }
  console.log(`Built ${pages.length} pages in ${path.relative(root, output)}.`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const index = process.argv.indexOf("--out-dir");
  await buildSite(index === -1 ? undefined : path.resolve(process.argv[index + 1]));
}
