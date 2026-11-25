# Gianmarco Andreana — academic website

The website has five pages: Home, Career, Research, Accomplishments, and Contacts.
The existing Hugo publication and post archives are preserved.

## Preview locally

With Node.js 18 or later installed:

```sh
node scripts/preview.mjs
```

Open <http://127.0.0.1:4173>. Restart the preview after editing a page to rebuild it.
The preview uses existing files in `public/` for legacy publication and post links.

## Edit the website

- Page content: `site/pages/`
- Shared navigation, metadata, and footer: `site/layout.html`
- Styles: `static/css/site.css`
- Navigation, theme, search, and citations: `static/js/site.js`
- Aircraft animation and city selection: `static/js/flight-map.js`
- Map geography: `site/partials/flight-map.svg`
- Portrait, journal covers, and CV: `static/`
- Legacy academic content: `content/`

`node scripts/build-site.mjs` copies static assets and builds the five pages into
`public/`. Use `--out-dir <directory>` to build elsewhere.

Run `node scripts/check-site.mjs` after building to check local assets, page links,
and anchors. For a preview build, use `node scripts/check-site.mjs .preview/site`.
The short top-level pages in `content/` register the new URLs with Hugo’s sitemap
and search index; their full designs come from `site/pages/`.

GitHub Actions first builds the Hugo archives, then builds the new pages into the
same output directory before deploying. The Netlify configuration uses the same
sequence. No frontend packages, API keys, or live map service are needed.

## Map data

The map uses [Natural Earth](https://www.naturalearthdata.com/) 1:110m country
geometry, which is [in the public domain](https://www.naturalearthdata.com/about/terms-of-use/).
Routes illustrate academic connections rather than scheduled flights. TLV is shown
as the airport gateway for Jerusalem; the location marker represents the city.

To regenerate the SVG, download `ne_110m_admin_0_countries.geojson` from the
[Natural Earth repository](https://github.com/nvkelso/natural-earth-vector/tree/master/geojson),
then run:

```sh
node scripts/generate-map.mjs path/to/ne_110m_admin_0_countries.geojson
```
