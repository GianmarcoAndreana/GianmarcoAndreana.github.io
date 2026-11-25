// Integration check: generated pages must have valid local assets and anchors.
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { root } from "./build-site.mjs";

const output = path.resolve(process.argv[2] || path.join(root, "public"));
const pages = ["/", "/career/", "/research/", "/accomplishments/", "/contacts/"];
const issues = [];
let links = 0;
for (const page of pages) {
  const html = await readFile(path.join(output, page, "index.html"), "utf8");
  if (html.includes("{{")) issues.push(`${page}: unresolved template`);
  if ((html.match(/<h1(?:\s|>)/g) || []).length !== 1) issues.push(`${page}: expected one main heading`);
  if ((html.match(/aria-current="page"/g) || []).length !== 1) issues.push(`${page}: expected one active navigation link`);
  for (const [, raw] of html.matchAll(/(?:href|src)="([^"<>]+)"/g)) {
    if (!raw.startsWith("/") && !raw.startsWith("#")) continue;
    links++;
    const url = new URL(raw, `https://example.com${page}`);
    const filename = url.pathname.endsWith("/") ? url.pathname + "index.html" : url.pathname;
    const file = path.join(output, filename);
    try {
      await stat(file);
      if (url.hash && filename.endsWith(".html")) {
        const target = url.pathname === page ? html : await readFile(file, "utf8");
        if (!target.includes(`id="${url.hash.slice(1)}"`)) issues.push(`${page}: missing anchor ${raw}`);
      }
    } catch (_) { issues.push(`${page}: missing local resource ${raw}`); }
  }
}
if (issues.length) { console.error(issues.join("\n")); process.exitCode = 1; }
else console.log(`Checked ${pages.length} pages and ${links} local links/assets; all resolve.`);
