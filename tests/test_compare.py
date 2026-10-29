from eval_diff.compare import compare, load_run, to_markdown


def test_compare_detects_regression(tmp_path):
    a = tmp_path / "a.json"
    b = tmp_path / "b.json"
    a.write_text(open("examples/run_a.json").read())
    b.write_text(open("examples/run_b.json").read())

    result = compare(load_run(str(a)), load_run(str(b)))
    assert result["summary"]["regressions"] == 2  # s2 and s3
    assert any(r["id"] == "s2" for r in result["regressions"])
    md = to_markdown(result)
    assert "Regressions" in md
    assert "s2" in md
