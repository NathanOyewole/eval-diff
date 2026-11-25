/* Eval Diff — browser port of src/eval_diff/compare.py */
(function () {
  "use strict";

  var examples = window.EVAL_DIFF_EXAMPLES || {};
  var $ = function (id) { return document.getElementById(id); };

  function stableKey(row) {
    var task = String(row.task || "");
    var snippet = String(row.snippet || row.reason || "").slice(0, 80);
    return sha256(task + "|" + snippet).slice(0, 12);
  }

  function sha256(message) {
    var bytes = [];
    for (var i = 0; i < message.length; i++) {
      var c = message.charCodeAt(i);
      if (c < 0x80) bytes.push(c);
      else if (c < 0x800) bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
      else bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
    var bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (var b = 0; b < 8; b++) bytes.push((bitLen / Math.pow(256, 7 - b)) & 0xff);

    var K = [
      0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
      0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
      0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
      0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
      0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
      0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
      0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
      0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2
    ];
    var H = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
    var rotr = function (x, n) { return (x >>> n) | (x << (32 - n)); };

    for (var off = 0; off < bytes.length; off += 64) {
      var w = new Array(64);
      for (var t = 0; t < 16; t++) {
        w[t] = ((bytes[off + t * 4] << 24) | (bytes[off + t * 4 + 1] << 16) |
                (bytes[off + t * 4 + 2] << 8) | bytes[off + t * 4 + 3]) >>> 0;
      }
      for (t = 16; t < 64; t++) {
        var s0 = rotr(w[t-15],7) ^ rotr(w[t-15],18) ^ (w[t-15] >>> 3);
        var s1 = rotr(w[t-2],17) ^ rotr(w[t-2],19) ^ (w[t-2] >>> 10);
        w[t] = (w[t-16] + s0 + w[t-7] + s1) >>> 0;
      }
      var a=H[0],bb=H[1],c=H[2],d=H[3],e=H[4],f=H[5],g=H[6],h=H[7];
      for (t = 0; t < 64; t++) {
        var S1 = rotr(e,6) ^ rotr(e,11) ^ rotr(e,25);
        var ch = (e & f) ^ (~e & g);
        var temp1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
        var S0 = rotr(a,2) ^ rotr(a,13) ^ rotr(a,22);
        var maj = (a & bb) ^ (a & c) ^ (bb & c);
        var temp2 = (S0 + maj) >>> 0;
        h=g; g=f; f=e; e=(d + temp1) >>> 0; d=c; c=bb; bb=a; a=(temp1 + temp2) >>> 0;
      }
      H = [(H[0]+a)>>>0,(H[1]+bb)>>>0,(H[2]+c)>>>0,(H[3]+d)>>>0,
           (H[4]+e)>>>0,(H[5]+f)>>>0,(H[6]+g)>>>0,(H[7]+h)>>>0];
    }
    return H.map(function (x) { return ("00000000" + x.toString(16)).slice(-8); }).join("");
  }

  function detectFormat(data) {
    if (Array.isArray(data)) return "eval-triage";
    if (data && typeof data === "object") {
      if (data.results && typeof data.results === "object" && "results" in data.results) return "promptfoo";
      if ("samples" in data) return "legacy";
    }
    throw new Error("Could not auto-detect format");
  }

  function normalize(data) {
    var fmt = detectFormat(data);
    var samples = [];
    if (fmt === "eval-triage") {
      data.forEach(function (row) {
        if (!row || typeof row !== "object") return;
        var sid = String(row.sample_id || row.id || "");
        if (!sid || sid === "None") sid = stableKey(row);
        var parsed = row.score_parsed !== false;
        samples.push({
          id: sid,
          score: row.score == null ? null : Number(row.score),
          monitor_suspicion: row.score == null ? null : Number(row.score),
          status: row.below_threshold ? "fail" : (parsed ? "pass" : "unparsed"),
          flags: parsed ? [] : ["unparsed"]
        });
      });
      return { run_id: "eval-triage", samples: samples };
    }
    if (fmt === "promptfoo") {
      (data.results.results || []).forEach(function (r, i) {
        if (!r || typeof r !== "object") return;
        var sid = String(r.id || r.testIdx != null ? r.id || r.testIdx : i);
        var success = r.success !== false;
        samples.push({
          id: sid,
          score: r.score == null ? null : Number(r.score),
          monitor_suspicion: null,
          status: success ? "pass" : "fail",
          flags: success ? [] : ["failed"]
        });
      });
      return { run_id: data.evalId || "promptfoo", samples: samples };
    }
    return data;
  }

  function compare(runA, runB, scoreDrop, suspicionRise) {
    var ai = {}, bi = {};
    (runA.samples || []).forEach(function (s) { if ("id" in s) ai[s.id] = s; });
    (runB.samples || []).forEach(function (s) { if ("id" in s) bi[s.id] = s; });

    var ids = Object.keys(ai).concat(Object.keys(bi)).filter(function (v, i, arr) { return arr.indexOf(v) === i; }).sort();
    var matched = [], regressions = [], onlyA = [], onlyB = [];

    ids.forEach(function (sid) {
      var sa = ai[sid], sb = bi[sid];
      if (sa && !sb) { onlyA.push(sid); return; }
      if (sb && !sa) { onlyB.push(sid); return; }

      var scoreA = sa.score, scoreB = sb.score;
      var susA = sa.monitor_suspicion, susB = sb.monitor_suspicion;
      var statusA = sa.status, statusB = sb.status;
      var flagsA = sa.flags || [], flagsB = sb.flags || [];
      var deltaScore = scoreA != null && scoreB != null ? Number(scoreB) - Number(scoreA) : null;
      var deltaSus = susA != null && susB != null ? Number(susB) - Number(susA) : null;
      var worse = false, reasons = [];

      if (deltaSus != null && deltaSus > suspicionRise) {
        worse = true;
        reasons.push("suspicion rose " + deltaSus.toFixed(3));
      } else if (deltaScore != null && deltaSus == null && deltaScore < -scoreDrop) {
        worse = true;
        reasons.push("score dropped " + deltaScore.toFixed(3));
      }
      if (statusA === "pass" && statusB === "fail") {
        worse = true;
        reasons.push("status flipped pass → fail");
      }
      var newFlags = flagsB.filter(function (f) { return flagsA.indexOf(f) === -1; }).sort();
      if (newFlags.length) {
        worse = true;
        reasons.push("new flags: " + newFlags.join(", "));
      }

      var entry = {
        id: sid, score_a: scoreA, score_b: scoreB, delta_score: deltaScore,
        suspicion_a: susA, suspicion_b: susB, delta_suspicion: deltaSus,
        status_a: statusA, status_b: statusB, new_flags: newFlags,
        worse: worse, reasons: reasons
      };
      matched.push(entry);
      if (worse) regressions.push(entry);
    });

    return {
      run_a_id: runA.run_id || "A", run_b_id: runB.run_id || "B",
      matched: matched, regressions: regressions, only_in_a: onlyA, only_in_b: onlyB,
      summary: { matched: matched.length, regressions: regressions.length, only_a: onlyA.length, only_b: onlyB.length }
    };
  }

  function toMarkdown(result) {
    var s = result.summary;
    var lines = ["# Eval Diff: " + result.run_a_id + " → " + result.run_b_id, "",
      "- Matched samples: " + s.matched, "- Regressions: " + s.regressions,
      "- Only in A: " + s.only_a, "- Only in B: " + s.only_b, ""];
    if (result.regressions.length) {
      lines.push("## Regressions", "");
      result.regressions.forEach(function (r) {
        lines.push("### " + r.id, "");
        lines.push("- Reasons: " + r.reasons.join("; "));
        if (r.delta_score != null) lines.push("- Score: " + r.score_a + " → " + r.score_b + " (Δ " + r.delta_score.toFixed(3) + ")");
        if (r.delta_suspicion != null) lines.push("- Suspicion: " + r.suspicion_a + " → " + r.suspicion_b + " (Δ " + r.delta_suspicion.toFixed(3) + ")");
        lines.push("- Status: " + r.status_a + " → " + r.status_b);
        if (r.new_flags.length) lines.push("- New flags: " + r.new_flags.join(", "));
        lines.push("");
      });
    } else {
      lines.push("No regressions detected.", "");
    }
    if (result.only_in_a.length || result.only_in_b.length) {
      lines.push("## Unmatched", "");
      if (result.only_in_a.length) lines.push("- Only in A: " + result.only_in_a.join(", "));
      if (result.only_in_b.length) lines.push("- Only in B: " + result.only_in_b.join(", "));
      lines.push("");
    }
    return lines.join("\n");
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function render(result) {
    var s = result.summary;
    var html = '<div class="summary">';
    html += '<span class="stat">matched<b>' + s.matched + '</b></span>';
    html += '<span class="stat' + (s.regressions ? ' bad' : '') + '">regressions<b>' + s.regressions + '</b></span>';
    html += '<span class="stat">only A<b>' + s.only_a + '</b></span>';
    html += '<span class="stat">only B<b>' + s.only_b + '</b></span>';
    html += '</div>';

    if (result.regressions.length) {
      result.regressions.forEach(function (r) {
        html += '<div class="regression"><div class="regression-id">' + escapeHtml(r.id) + '</div>';
        html += '<div class="regression-reasons">' + escapeHtml(r.reasons.join("; ")) + '</div>';
        var meta = [];
        if (r.delta_score != null) meta.push("score " + r.score_a + " → " + r.score_b);
        if (r.delta_suspicion != null) meta.push("suspicion " + r.suspicion_a + " → " + r.suspicion_b);
        meta.push("status " + r.status_a + " → " + r.status_b);
        html += '<div class="regression-meta">' + escapeHtml(meta.join(" · ")) + '</div></div>';
      });
    } else {
      html += '<p class="clean">No regressions detected.</p>';
    }

    html += '<div class="result-actions"><button class="copy-btn" id="copy-report">Copy markdown report</button></div>';
    $("result").innerHTML = html;
    $("copy-report").addEventListener("click", function () {
      copyText(toMarkdown(result), this);
    });
  }

  function copyText(text, button) {
    var done = function () {
      var old = button.textContent;
      button.textContent = "Copied";
      setTimeout(function () { button.textContent = old; }, 1200);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done).catch(function () { fallback(); });
    } else {
      fallback();
    }
    function fallback() {
      var ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); done(); } catch (e) { button.textContent = "Copy failed"; }
      document.body.removeChild(ta);
    }
  }

  function loadExample(key) {
    var ex = examples[key];
    if (!ex) return;
    $("run-a").value = JSON.stringify(ex.a, null, 2);
    $("run-b").value = JSON.stringify(ex.b, null, 2);
    $("result").innerHTML = '<p class="result-placeholder">Example loaded. Press Compare runs.</p>';
  }

  function run() {
    var drop = parseFloat($("score-drop").value);
    var rise = parseFloat($("suspicion-rise").value);
    if (!isFinite(drop) || !isFinite(rise)) {
      $("result").innerHTML = '<p class="error">Thresholds must be numbers.</p>';
      return;
    }
    var a, b;
    try { a = JSON.parse($("run-a").value); } catch (e) { $("result").innerHTML = '<p class="error">Baseline JSON is invalid: ' + escapeHtml(e.message) + '</p>'; return; }
    try { b = JSON.parse($("run-b").value); } catch (e) { $("result").innerHTML = '<p class="error">Candidate JSON is invalid: ' + escapeHtml(e.message) + '</p>'; return; }
    try {
      var result = compare(normalize(a), normalize(b), drop, rise);
      render(result);
    } catch (e) {
      $("result").innerHTML = '<p class="error">' + escapeHtml(e.message) + '</p>';
    }
  }

  $("run").addEventListener("click", run);
  $("example").addEventListener("change", function (e) { loadExample(e.target.value); });
  document.querySelectorAll("[data-copy]").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var target = $(btn.getAttribute("data-copy"));
      copyText(target.textContent.trim(), btn);
    });
  });

  loadExample("triage");
})();
