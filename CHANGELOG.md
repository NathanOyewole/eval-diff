# Eval Diff — Changelog

## Ory domain verification, 25 November 2026

- Added `docs/.well-known/ory-verify.txt` with the Ory verification token for the Eval Diff site.
- Added `docs/.nojekyll` so GitHub Pages serves the `.well-known` directory.
- Added `<meta name="ory-verify">` to `docs/index.html` as a fallback verification method.
- `README.md` documents the verification path.

## Website and Pages deployment, 25 November 2026

Added a public website for Eval Diff.

- `docs/` — dependency-free static landing page with an in-browser diff playground.
- The playground ports `normalize` / `compare` / `to_markdown` from the CLI and bundles the three example pairs, so visitors can load an example and see the same regressions the CLI reports.
- Responsive dark design documented in `DESIGN.md`.
- GitHub Pages publishes `docs/` from `main` on every push.
- `README.md` documents the site at `https://nathanoyewole.github.io/eval-diff/`, local preview, and deploy path.

Verified in a headless browser at 375px, 768px and 1280px; the playground output matches the CLI for all three bundled examples. No CLI behaviour or comparison logic changed.

## Favicon, 25 November 2026

- Added `docs/favicon.svg`: dark rounded square with two opposing teal chevrons (`><`), matching the site's brand mark and `DESIGN.md` tokens.
- Added `favicon.ico` (16–256px) and `apple-touch-icon.png` (180px) generated from the same geometry.
- Wired SVG, ICO and Apple touch icon into `docs/index.html`, plus a `theme-color` meta tag.

The 16px variant was checked at pixel level: the chevrons stay separated, reading as `><` rather than merging into an X. No page layout or CLI logic changed.
