"""Core comparison logic for Eval Diff.

Supports:
- eval-triage JSON export (list of rows with sample_id + score)
- promptfoo-style results (results.results with score + success)
- legacy samples wrapper
"""

from __future__ import annotations

import hashlib
import json
from typing import Any


def load_run(path: str, fmt: str = "auto") -> dict[str, Any]:
    with open(path) as f:
        data = json.load(f)
    return normalize(data, fmt=fmt)


def _stable_key(row: dict[str, Any]) -> str:
    """Fallback key when sample_id is missing or unstable."""
    task = str(row.get("task") or "")
    snippet = str(row.get("snippet") or row.get("reason") or "")[:80]
    raw = f"{task}|{snippet}"
    return hashlib.sha256(raw.encode()).hexdigest()[:12]


def normalize(data: Any, fmt: str = "auto") -> dict[str, Any]:
    """Turn various eval outputs into a common {run_id, samples} shape."""
    if fmt == "auto":
        if isinstance(data, list):
            fmt = "eval-triage"
        elif isinstance(data, dict) and "results" in data and isinstance(data.get("results"), dict):
            fmt = "promptfoo"
        elif isinstance(data, dict) and "samples" in data:
            fmt = "legacy"
        else:
            raise ValueError("Could not auto-detect format")

    if fmt == "eval-triage":
        if not isinstance(data, list):
            raise ValueError("eval-triage format expects a list of rows")
        samples = []
        for i, row in enumerate(data):
            if not isinstance(row, dict):
                continue
            sid = str(row.get("sample_id") or row.get("id") or "")
            if not sid or sid == "None":
                sid = _stable_key(row)
            samples.append({
                "id": sid,
                "score": row.get("score"),
                "monitor_suspicion": row.get("score"),
                "status": "fail" if row.get("below_threshold") else ("pass" if row.get("score_parsed", True) else "unparsed"),
                "flags": ["unparsed"] if not row.get("score_parsed", True) else [],
                "raw": row,
            })
        return {"run_id": "eval-triage", "samples": samples}

    if fmt == "promptfoo":
        if not (isinstance(data, dict) and isinstance(data.get("results"), dict) and "results" in data["results"]):
            raise ValueError("promptfoo format expects results.results")
        samples = []
        for i, r in enumerate(data["results"]["results"]):
            if not isinstance(r, dict):
                continue
            sid = str(r.get("id") or r.get("testIdx", i))
            score = r.get("score")
            success = r.get("success", True)
            samples.append({
                "id": sid,
                "score": score,
                "monitor_suspicion": None,
                "status": "pass" if success else "fail",
                "flags": [] if success else ["failed"],
                "raw": r,
            })
        return {"run_id": data.get("evalId", "promptfoo"), "samples": samples}

    if fmt == "legacy" or (isinstance(data, dict) and "samples" in data):
        return data

    raise ValueError(f"Unrecognized format: {fmt}")


def index_samples(run: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {s["id"]: s for s in run["samples"] if "id" in s}


def compare(
    run_a: dict[str, Any],
    run_b: dict[str, Any],
    score_drop_threshold: float = 0.1,
    suspicion_rise_threshold: float = 0.15,
) -> dict[str, Any]:
    a_idx = index_samples(run_a)
    b_idx = index_samples(run_b)

    matched = []
    regressions = []
    only_a = []
    only_b = []

    all_ids = set(a_idx) | set(b_idx)

    for sid in sorted(all_ids):
        sa = a_idx.get(sid)
        sb = b_idx.get(sid)

        if sa and not sb:
            only_a.append(sid)
            continue
        if sb and not sa:
            only_b.append(sid)
            continue

        score_a = sa.get("score")
        score_b = sb.get("score")
        sus_a = sa.get("monitor_suspicion")
        sus_b = sb.get("monitor_suspicion")
        status_a = sa.get("status")
        status_b = sb.get("status")
        flags_a = set(sa.get("flags") or [])
        flags_b = set(sb.get("flags") or [])

        delta_score = None
        if score_a is not None and score_b is not None:
            delta_score = score_b - score_a

        delta_sus = None
        if sus_a is not None and sus_b is not None:
            delta_sus = sus_b - sus_a

        worse = False
        reasons = []

        if delta_sus is not None and delta_sus > suspicion_rise_threshold:
            worse = True
            reasons.append(f"suspicion rose {delta_sus:.3f}")
        elif delta_score is not None and delta_sus is None and delta_score < -score_drop_threshold:
            worse = True
            reasons.append(f"score dropped {delta_score:.3f}")

        if status_a == "pass" and status_b == "fail":
            worse = True
            reasons.append("status flipped pass → fail")

        new_flags = flags_b - flags_a
        if new_flags:
            worse = True
            reasons.append(f"new flags: {', '.join(sorted(new_flags))}")

        entry = {
            "id": sid,
            "score_a": score_a,
            "score_b": score_b,
            "delta_score": delta_score,
            "suspicion_a": sus_a,
            "suspicion_b": sus_b,
            "delta_suspicion": delta_sus,
            "status_a": status_a,
            "status_b": status_b,
            "new_flags": sorted(new_flags),
            "worse": worse,
            "reasons": reasons,
        }
        matched.append(entry)
        if worse:
            regressions.append(entry)

    return {
        "run_a_id": run_a.get("run_id", "A"),
        "run_b_id": run_b.get("run_id", "B"),
        "matched": matched,
        "regressions": regressions,
        "only_in_a": only_a,
        "only_in_b": only_b,
        "summary": {
            "matched": len(matched),
            "regressions": len(regressions),
            "only_a": len(only_a),
            "only_b": len(only_b),
        },
    }


def to_markdown(result: dict[str, Any]) -> str:
    s = result["summary"]
    lines = [
        f"# Eval Diff: {result['run_a_id']} → {result['run_b_id']}",
        "",
        f"- Matched samples: {s['matched']}",
        f"- Regressions: {s['regressions']}",
        f"- Only in A: {s['only_a']}",
        f"- Only in B: {s['only_b']}",
        "",
    ]

    if result["regressions"]:
        lines.append("## Regressions")
        lines.append("")
        for r in result["regressions"]:
            lines.append(f"### {r['id']}")
            lines.append("")
            lines.append(f"- Reasons: {'; '.join(r['reasons'])}")
            if r["delta_score"] is not None:
                lines.append(f"- Score: {r['score_a']} → {r['score_b']} (Δ {r['delta_score']:.3f})")
            if r["delta_suspicion"] is not None:
                lines.append(f"- Suspicion: {r['suspicion_a']} → {r['suspicion_b']} (Δ {r['delta_suspicion']:.3f})")
            lines.append(f"- Status: {r['status_a']} → {r['status_b']}")
            if r["new_flags"]:
                lines.append(f"- New flags: {', '.join(r['new_flags'])}")
            lines.append("")
    else:
        lines.append("No regressions detected.")
        lines.append("")

    if result["only_in_a"] or result["only_in_b"]:
        lines.append("## Unmatched")
        lines.append("")
        if result["only_in_a"]:
            lines.append(f"- Only in A: {', '.join(result['only_in_a'])}")
        if result["only_in_b"]:
            lines.append(f"- Only in B: {', '.join(result['only_in_b'])}")
        lines.append("")

    return "\n".join(lines)
