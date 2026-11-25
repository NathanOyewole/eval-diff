# Eval Diff

Compare two eval runs and show what got worse.

**Website:** https://nathanoyewole.me/eval-diff/ — landing page with an in-browser diff playground. Runs entirely client-side; no data is uploaded.

## Website

The site lives in [`web/`](web/) as dependency-free HTML/CSS/JS. It ports the CLI comparison logic so visitors can paste two runs or load a bundled example and see regressions without installing anything.

Preview locally:

```bash
cd web
python3 -m http.server 8000
# open http://localhost:8000
```

Deploy: `.github/workflows/pages.yml` publishes `web/` to GitHub Pages on every push to `main`. Design tokens are documented in [`DESIGN.md`](DESIGN.md).

Supports:
- **eval-triage** JSON export (flat list of rows with `sample_id` + `score`)
- **promptfoo**-style results (`results.results` with `score` + `success`)
- Simple samples wrapper (legacy)

## Install

```bash
cd eval-diff
pip install -e .
```

## Usage

```bash
# auto-detect (default)
eval-diff examples/eval_triage_a.json examples/eval_triage_b.json

# force format
eval-diff run_a.json run_b.json --format promptfoo

# markdown + fail CI
eval-diff examples/eval_triage_a.json examples/eval_triage_b.json -m report.md --fail-on-regression
```

## Matching

1. Primary: `sample_id` (or `id`)
2. Fallback: stable hash of `task` + first 80 chars of `snippet`/`reason` when ID is missing

Use `--format auto|eval-triage|promptfoo|legacy` to skip guessing.

## eval-triage shape

```json
[
  {
    "sample_id": "s1",
    "score": 0.11,
    "score_parsed": true,
    "task": "control-task",
    "snippet": "bash(ls)",
    "reason": "low",
    "below_threshold": false
  }
]
```

In eval-triage the `score` is the monitor suspicion score. A rise counts as a regression.

## Thresholds

- `--score-drop` (default 0.1): quality-score drop that counts as regression (promptfoo-style)
- `--suspicion-rise` (default 0.15): suspicion rise that counts as regression (eval-triage)

## What counts as a regression

- Suspicion rose more than the threshold (eval-triage)
- Quality score dropped more than the threshold (promptfoo)
- Status flipped from pass → fail
- New flags appeared

That’s the whole tool for v1.
