# Eval Diff — Changelog

## Website and Pages deployment, 25 November 2026

Added a public website for Eval Diff.

- `web/` — dependency-free static landing page with an in-browser diff playground.
- The playground ports `normalize` / `compare` / `to_markdown` from the CLI and bundles the three example pairs, so visitors can load an example and see the same regressions the CLI reports.
- Responsive dark design documented in `DESIGN.md`.
- `.github/workflows/pages.yml` publishes `web/` to GitHub Pages on every push to `main`.
- `README.md` documents the site, local preview, and deploy path.

Verified in a headless browser at 375px, 768px and 1280px; the playground output matches the CLI for all three bundled examples. No CLI behaviour or comparison logic changed.
