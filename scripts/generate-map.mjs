// Source: Natural Earth, 1:110m Admin 0 countries (public domain).
// https://www.naturalearthdata.com/about/terms-of-use/
// Rebuild: node scripts/generate-map.mjs path/to/ne_110m_admin_0_countries.geojson
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
if (!process.argv[2]) throw new Error("Supply the Natural Earth countries GeoJSON file.");
const data = JSON.parse(await readFile(process.argv[2], "utf8"));
const mercator = (latitude) => Math.log(Math.tan(Math.PI / 4 + Math.max(-85, Math.min(85, latitude)) * Math.PI / 360));
const project = ([longitude, latitude]) => [(longitude + 18) * 720 / 63, 235 + (mercator(43) - mercator(latitude)) * 720 / 63 * 180 / Math.PI];
const number = (value) => value.toFixed(1);
const point = (coordinate) => project(coordinate).map(number).join(" ");
const intersects = (polygon) => {
  const ring = polygon[0];
  const xs = ring.map((p) => p[0]);
  const ys = ring.map((p) => p[1]);
  return Math.max(...xs) > -18 && Math.min(...xs) < 45 && Math.max(...ys) > 27 && Math.min(...ys) < 57;
};
const polygons = data.features.flatMap(({ geometry }) => geometry.type === "Polygon" ? [geometry.coordinates] : geometry.type === "MultiPolygon" ? geometry.coordinates : []).filter(intersects);
const land = polygons.map((polygon) => `<path class="land" d="${polygon.map((ring) => "M" + ring.map(point).join("L") + "Z").join("")}"/>`).join("\n");
const grid = [];
for (let longitude = -20; longitude <= 50; longitude += 10) grid.push(`M${point([longitude, 60])}L${point([longitude, 20])}`);
for (let latitude = 25; latitude <= 60; latitude += 5) grid.push(`M${point([-20, latitude])}L${point([50, latitude])}`);
const cities = [
  { id: "madrid", name: "Madrid", code: "MAD", coordinate: [-3.7038, 40.4168], dx: -25, dy: 30 },
  { id: "bergamo", name: "Bergamo / Milan", code: "BGY / LIN", coordinate: [9.67, 45.695], dx: -38, dy: -27 },
  { id: "jerusalem", name: "Jerusalem", code: "TLV · gateway", coordinate: [35.2137, 31.7683], dx: -12, dy: 30 },
];
const locations = Object.fromEntries(cities.map((city) => [city.id, project(city.coordinate)]));
function route(id, from, to, bend, secondary = false) {
  const a = Array.isArray(from) ? project(from) : locations[from];
  const b = Array.isArray(to) ? project(to) : locations[to];
  const c = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2 - bend];
  return `<path id="route-${id}" class="route${secondary ? " secondary" : ""}" data-connects="${from} ${to}" d="M${a.map(number).join(" ")}Q${c.map(number).join(" ")} ${b.map(number).join(" ")}"/>`;
}
const routes = [
  route("madrid-bergamo", "madrid", "bergamo", 80),
  route("bergamo-jerusalem", "bergamo", "jerusalem", 110),
  route("jerusalem-madrid", "jerusalem", "madrid", 25),
  route("london", [-.12, 51.5], "madrid", 30, true),
  route("paris", [2.35, 48.86], "bergamo", 24, true),
  route("vienna", [16.37, 48.2], "jerusalem", 42, true),
  route("athens", [23.73, 37.98], "bergamo", 50, true),
];
const shape = '<path d="M12 0 2-2-4-10-7-10-4-2-10-1-13-5-15-5-13 0-15 5-13 5-10 1-4 2-7 10-4 10 2 2Z"/>';
const planes = [
  { route: "madrid-bergamo", transform: "translate(228 204) rotate(-30)", duration: 22, offset: .4 },
  { route: "bergamo-jerusalem", transform: "translate(485 261) rotate(40)", duration: 29, offset: .55 },
  { route: "jerusalem-madrid", transform: "translate(385 322) rotate(-164)", duration: 35, offset: .5 },
  { route: "london", transform: "translate(189 160) rotate(110) scale(.65)", duration: 27, offset: .3, secondary: true },
];
const nodes = cities.map((city) => {
  const [x, y] = locations[city.id];
  return `<g data-map-node="${city.id}" transform="translate(${number(x)} ${number(y)})"><circle class="city-ring" r="14"/><circle class="city-dot" r="5"/><text class="city-label" x="${city.dx}" y="${city.dy}">${city.name}</text><text class="city-code" x="${city.dx}" y="${city.dy + 13}">${city.code}</text></g>`;
}).join("\n");
const svg = `<svg class="flight-map" id="flight-map" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 455" role="img" aria-labelledby="flight-map-title flight-map-description">
<title id="flight-map-title">An academic journey across Europe and the Mediterranean</title>
<desc id="flight-map-description">Aircraft follow illustrative routes between Madrid, Bergamo and Milan, and Jerusalem. Madrid is the current base at ESCP Business School. Bergamo and Milan represent the University of Bergamo and Bocconi; Jerusalem represents the Hebrew University. TLV is the airport gateway to Jerusalem. Select a location using the buttons below. Geography: Natural Earth, public domain.</desc>
<defs><clipPath id="map-clip"><rect width="720" height="455"/></clipPath></defs>
<g clip-path="url(#map-clip)">
<path class="graticule" d="${grid.join("")}"/>
${land}
<g aria-hidden="true"><text class="map-label" x="235" y="177">FRANCE</text><text class="map-label" x="348" y="259" transform="rotate(42 348 259)">ITALY</text><text class="map-label" x="451" y="289">GREECE</text><text class="map-label" x="574" y="257">TÜRKIYE</text><text class="map-label" x="187" y="431">NORTH AFRICA</text><text class="sea-label" x="320" y="366" transform="rotate(7 320 366)">Mediterranean Sea</text></g>
${routes.join("\n")}
${planes.map((plane) => `<g class="plane${plane.secondary ? " secondary" : ""}" data-flight="${plane.route}" data-duration="${plane.duration}" data-offset="${plane.offset}" transform="${plane.transform}">${shape}</g>`).join("\n")}
${nodes}
<g class="map-compass" transform="translate(675 43)" aria-hidden="true"><text x="-3" y="-12">N</text><path d="M0-5 4 10 0 7-4 10Z" fill="currentColor" opacity=".6"/><path d="M0 11v12" stroke="currentColor" stroke-width=".7"/></g>
</g></svg>`;
await mkdir(path.join(root, "site/partials"), { recursive: true });
await writeFile(path.join(root, "site/partials/flight-map.svg"), svg + "\n");
console.log(`Generated map with ${polygons.length} geographical polygons.`);
