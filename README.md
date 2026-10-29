# Eval Diff

Compare two eval runs and show what got worse.

Takes two JSON files (same shape eval-triage already exports), matches samples by `id`, and reports score drops, suspicion rises, status flips, and new flags.

## Install

```bash
cd eval-diff
pip install -e .
```

## Usage

```bash
eval-diff examples/run_a.json examples/run_b.json
```

Write a markdown report and fail the command if anything regressed:

```bash
eval-diff examples/run_a.json examples/run_b.json -m report.md --fail-on-regression
```

## Expected JSON shape

```json
{
  "run_id": "baseline",
  "samples": [
    {
      "id": "s1",
      "score": 0.92,
      "monitor_suspicion": 0.11,
      "status": "pass",
      "flags": []
    }
  ]
}
```

Fields are optional. Missing fields are skipped.

## Thresholds

- `--score-drop` (default 0.1): score decrease that counts as a regression
- `--suspicion-rise` (default 0.15): suspicion increase that counts as a regression

## What counts as a regression

- Score dropped more than the threshold
- Monitor suspicion rose more than the threshold
- Status flipped from pass → fail
- New flags appeared

That’s the whole tool for v1.
