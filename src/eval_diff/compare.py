"""Core comparison logic for Eval Diff."""

from __future__ import annotations

from typing import Any


def load_run(path: str) -> dict[str, Any]:
    import json
    with open(path) as f:
        data = json.load(f)
    if "samples" not in data:
        raise ValueError(f"{path} missing 'samples' key")
    return data


def index_samples(run: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {s["id"]: s for s in run["samples"] if "id" in s}


def compare(run_a: dict[str, Any], run_b: dict[str, Any], score_drop_threshold: float = 0.1, suspicion_rise_threshold: float = 0.15) -> dict[str, Any]:
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

        # both exist
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

        if delta_score is not None and delta_score < -score_drop_threshold:
            worse = True
            reasons.append(f"score dropped {delta_score:.3f}")

        if delta_sus is not None and delta_sus > suspicion_rise_threshold:
            worse = True
            reasons.append(f"suspicion rose {delta_sus:.3f}")

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
