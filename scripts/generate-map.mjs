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
  { id: "madrid", group: "madrid", name: "Madrid", coordinate: [-3.7038, 40.4168], dx: -12, dy: -22, anchor: "end" },
  { id: "bergamo", group: "bergamo", name: "Bergamo", coordinate: [9.67, 45.695], dx: 22, dy: -29, anchor: "start" },
  { id: "milan", group: "bergamo", name: "Milan", coordinate: [9.19, 45.4642], dx: -26, dy: 28, anchor: "end" },
  { id: "jerusalem", group: "jerusalem", name: "Jerusalem", coordinate: [35.2137, 31.7683], dx: 12, dy: -20, anchor: "start" },
];
// Geographic anchors are projected with the same function as the country outlines.
// Labels are centred on these points rather than offset from arbitrary SVG pixels.
const countryLabels = [
  { name: "SPAIN", country: "Spain", coordinate: [-3.6, 38.7] },
  { name: "FRANCE", country: "France", coordinate: [2.55, 46.7] },
  { name: "ITALY", country: "Italy", coordinate: [13.1, 42.6], angle: 43 },
  { name: "GREECE", country: "Greece", coordinate: [22.1, 39.5] },
  { name: "TÜRKIYE", country: "Turkey", coordinate: [34.5, 39.35] },
  { name: "ALGERIA", country: "Algeria", coordinate: [3, 32.5] },
];
function insideRing([x, y], ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
const labels = countryLabels.map((label) => {
  const feature = data.features.find((feature) => feature.properties.ADMIN === label.country);
  if (!feature) throw new Error(`Country missing from map data: ${label.country}`);
  const areas = feature.geometry.type === "Polygon" ? [feature.geometry.coordinates] : feature.geometry.coordinates;
  if (!areas.some(([outer, ...holes]) => insideRing(label.coordinate, outer) && !holes.some((hole) => insideRing(label.coordinate, hole)))) {
    throw new Error(`Label anchor is outside ${label.country}`);
  }
  return `<text class="map-label" text-anchor="middle" dominant-baseline="middle" data-country="${label.country}" data-longitude="${label.coordinate[0]}" data-latitude="${label.coordinate[1]}" transform="translate(${point(label.coordinate)}) rotate(${label.angle || 0})">${label.name}</text>`;
}).join("\n");
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
];
const shape = '<path d="M12 0 2-2-4-10-7-10-4-2-10-1-13-5-15-5-13 0-15 5-13 5-10 1-4 2-7 10-4 10 2 2Z"/>';
const planes = [
  { route: "madrid-bergamo", transform: "translate(228 204) rotate(-30)", duration: 22, offset: .4 },
  { route: "bergamo-jerusalem", transform: "translate(485 261) rotate(40)", duration: 29, offset: .55 },
  { route: "jerusalem-madrid", transform: "translate(385 322) rotate(-164)", duration: 35, offset: .5 },
];
const nodes = cities.map((city) => {
  const [x, y] = locations[city.id];
  const labelEnd = city.dx + (city.anchor === "end" ? -4 : 4);
  return `<g data-map-node="${city.group}" data-city-marker="${city.id}" data-longitude="${city.coordinate[0]}" data-latitude="${city.coordinate[1]}" transform="translate(${number(x)} ${number(y)})"><circle class="city-ring" r="${city.id === "madrid" ? 16 : 9}"/><path class="city-leader" d="M0 0L${city.dx} ${city.dy + 6}H${labelEnd}"/><circle class="city-dot" r="${city.group === "bergamo" ? 3 : 4.5}"/><text class="city-label" text-anchor="${city.anchor}" x="${labelEnd}" y="${city.dy}">${city.name}</text></g>`;
}).join("\n");
const svg = `<svg class="flight-map" id="flight-map" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 455" role="img" aria-labelledby="flight-map-title flight-map-description">
<title id="flight-map-title">Locations of current and previous academic appointments</title>
<desc id="flight-map-description">City markers show Madrid (ESCP Business School), Bergamo (University of Bergamo), Milan (Bocconi University), and Jerusalem (Hebrew University). Lines and aircraft illustrate connections between academic locations, not scheduled flights. Select a location using the buttons below. Geography: Natural Earth, public domain.</desc>
<defs><clipPath id="map-clip"><rect width="720" height="455"/></clipPath></defs>
<g clip-path="url(#map-clip)">
<path class="graticule" d="${grid.join("")}"/>
${land}
<g aria-hidden="true">${labels}<text class="sea-label" text-anchor="middle" transform="translate(${point([17, 34.5])})">Mediterranean Sea</text></g>
${routes.join("\n")}
${planes.map((plane) => `<g class="plane${plane.secondary ? " secondary" : ""}" data-flight="${plane.route}" data-duration="${plane.duration}" data-offset="${plane.offset}" transform="${plane.transform}">${shape}</g>`).join("\n")}
${nodes}
<g class="map-compass" transform="translate(675 43)" aria-hidden="true"><text x="-3" y="-12">N</text><path d="M0-5 4 10 0 7-4 10Z" fill="currentColor" opacity=".6"/><path d="M0 11v12" stroke="currentColor" stroke-width=".7"/></g>
</g></svg>`;
await mkdir(path.join(root, "site/partials"), { recursive: true });
await writeFile(path.join(root, "site/partials/flight-map.svg"), svg + "\n");
console.log(`Generated map with ${polygons.length} geographical polygons.`);
