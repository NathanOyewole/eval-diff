"""CLI for Eval Diff."""

from __future__ import annotations

import sys
from pathlib import Path

import click

from eval_diff.compare import compare, load_run, to_markdown


@click.command()
@click.argument("run_a", type=click.Path(exists=True))
@click.argument("run_b", type=click.Path(exists=True))
@click.option("--score-drop", default=0.1, show_default=True, help="Score drop that counts as regression.")
@click.option("--suspicion-rise", default=0.15, show_default=True, help="Suspicion rise that counts as regression.")
@click.option("--markdown", "-m", type=click.Path(), help="Write markdown report to this path.")
@click.option("--fail-on-regression", is_flag=True, help="Exit non-zero if any regressions found.")
def main(run_a: str, run_b: str, score_drop: float, suspicion_rise: float, markdown: str | None, fail_on_regression: bool) -> None:
    """Compare two eval runs and report regressions.

    RUN_A is the baseline. RUN_B is the candidate.
    """
    a = load_run(run_a)
    b = load_run(run_b)
    result = compare(a, b, score_drop_threshold=score_drop, suspicion_rise_threshold=suspicion_rise)

    s = result["summary"]
    click.echo(f"Matched: {s['matched']}  Regressions: {s['regressions']}  Only A: {s['only_a']}  Only B: {s['only_b']}")

    if result["regressions"]:
        click.echo("\nRegressions:")
        for r in result["regressions"]:
            click.echo(f"  {r['id']}: {'; '.join(r['reasons'])}")

    if markdown:
        Path(markdown).write_text(to_markdown(result))
        click.echo(f"\nWrote markdown → {markdown}")

    if fail_on_regression and result["regressions"]:
        sys.exit(1)


if __name__ == "__main__":
    main()
