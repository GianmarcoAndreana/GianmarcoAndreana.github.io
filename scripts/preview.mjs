import http from "node:http";
import path from "node:path";
import { readFile, stat } from "node:fs/promises";
import { buildSite, root } from "./build-site.mjs";

const output = path.join(root, ".preview/site");
await buildSite(output);
const types = { ".html": "text/html; charset=utf-8", ".css": "text/css", ".js": "text/javascript", ".svg": "image/svg+xml", ".jpg": "image/jpeg", ".png": "image/png", ".pdf": "application/pdf", ".bib": "text/plain" };
http.createServer(async (request, response) => {
  try {
    let pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    if (pathname.endsWith("/")) pathname += "index.html";
    const file = path.resolve(output, `.${pathname}`);
    if (!file.startsWith(output + path.sep)) { response.writeHead(403).end(); return; }
    try {
      if ((await stat(file)).isDirectory()) { response.writeHead(301, { Location: pathname + "/" }).end(); return; }
    } catch (_) {}
    let data;
    try { data = await readFile(file); }
    catch (_) { data = await readFile(path.join(root, "public", path.relative(output, file))); }
    response.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    response.end(data);
  } catch (_) { response.writeHead(404, { "Content-Type": "text/plain" }).end("Page not found"); }
}).listen(4173, "127.0.0.1", () => console.log("Preview: http://127.0.0.1:4173"));
