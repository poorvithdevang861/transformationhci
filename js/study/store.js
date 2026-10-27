/* Session storage (localStorage "ta-sessions") plus the summaries and CSV/JSON exports used by the researcher page.
   Sessions are saved after every step, so a partly finished session is never lost. */
var Store = (function () {
  var KEY = "ta-sessions";

  function all() { try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch (e) { return []; } }
  function writeAll(list) { localStorage.setItem(KEY, JSON.stringify(list)); }
  function save(session) {
    var list = all(), i = list.findIndex(function (s) { return s.id === session.id && s.createdAt === session.createdAt; });
    if (i < 0) list.push(session); else list[i] = session;
    writeAll(list);
  }
  function remove(id, createdAt) { writeAll(all().filter(function (s) { return !(s.id === id && s.createdAt === createdAt); })); }
  function clear() { writeAll([]); }
  function importMany(list) {
    var cur = all();
    list.forEach(function (s) {
      if (!s || !s.id || !s.createdAt) return;
      var i = cur.findIndex(function (c) { return c.id === s.id && c.createdAt === s.createdAt; });
      if (i < 0) cur.push(s); else cur[i] = s;
    });
    writeAll(cur);
    return cur.length;
  }

  /* ---------- scoring ---------- */
  /* SUS: odd items score (x-1), even items (5-x); sum x 2.5 gives 0..100 */
  function susScore(items) {
    if (!items || items.length !== 10 || items.some(function (v) { return v == null; })) return null;
    return items.reduce(function (sum, v, i) { return sum + (i % 2 === 0 ? v - 1 : 5 - v); }, 0) * 2.5;
  }
  /* Raw TLX: mean of the six 0..100 subscales */
  var TLX_KEYS = ["mental", "physical", "temporal", "performance", "effort", "frustration"];
  function tlxRaw(t) {
    if (!t) return null;
    var v = TLX_KEYS.map(function (k) { return t[k]; });
    if (v.some(function (x) { return x == null; })) return null;
    return v.reduce(function (a, b) { return a + b; }, 0) / v.length;
  }
  /* Agency: mean of the 1..7 items, reverse-scored items flipped */
  function agencyMean(a) {
    if (!a || !a.items) return null;
    var v = a.items.map(function (x, i) { return x == null ? null : (a.reverse && a.reverse[i] ? 8 - x : x); });
    if (v.some(function (x) { return x == null; })) return null;
    return v.reduce(function (s, x) { return s + x; }, 0) / v.length;
  }
  function mean(arr) { arr = arr.filter(function (x) { return x != null && !isNaN(x); }); return arr.length ? arr.reduce(function (a, b) { return a + b; }, 0) / arr.length : null; }

  function summarise(s) {
    var main = s.trials || [], tr = s.transfer || [];
    var ids = [];
    tr.forEach(function (t) { (t.identify || []).forEach(function (q) { ids.push(q.correct ? 1 : 0); }); });
    return {
      id: s.id, createdAt: s.createdAt, mode: s.mode, device: s.device && s.device.type,
      eyeTracking: !!s.eyeTracking,
      gazeRecorded: (main.concat(tr)).some(function (t) { return t.gaze && t.gaze.length > 0; }),
      status: s.completedAt ? "complete" : "partial",
      mainDone: main.filter(function (t) { return t.choice != null; }).length,
      accuracy: mean(main.map(function (t) { return t.choice == null ? null : (t.correct ? 1 : 0); })),
      meanTimeS: mean(main.map(function (t) { return t.timeMs == null ? null : t.timeMs / 1000; })),
      meanHints: mean(main.map(function (t) { return t.choice == null ? null : t.hintsUsed; })),
      meanEffort: s.overallEffort != null ? s.overallEffort : mean(main.map(function (t) { return t.effort; })),
      overallEffort: s.overallEffort,
      transferAcc: mean(tr.map(function (t) { return t.choice == null ? null : (t.correct ? 1 : 0); })),
      identifyAcc: mean(ids),
      tlx: tlxRaw(s.tlx),
      agency: agencyMean(s.agency),
      sus: s.sus ? s.sus.score : null
    };
  }

  /* per-condition numbers from main trials (works for Randomise sessions, where each trial has its own condition) */
  function byCondition(list) {
    var groups = {};
    list.forEach(function (s) {
      (s.trials || []).forEach(function (t) {
        if (t.choice == null) return;
        var g = groups[t.condition] || (groups[t.condition] = { n: 0, correct: [], time: [], effort: [], hints: [] });
        g.n++; g.correct.push(t.correct ? 1 : 0); g.time.push(t.timeMs / 1000); g.effort.push(t.effort); g.hints.push(t.hintsUsed);
      });
    });
    return Object.keys(groups).map(function (k) {
      var g = groups[k];
      return { condition: k, trials: g.n, accuracy: mean(g.correct), meanTimeS: mean(g.time), meanEffort: mean(g.effort), meanHints: mean(g.hints) };
    });
  }

  /* ---------- CSV ---------- */
  function csvCell(v) {
    if (v == null) return "";
    v = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }
  function toCsv(rows) {
    if (!rows.length) return "";
    var cols = [];
    rows.forEach(function (r) { Object.keys(r).forEach(function (k) { if (cols.indexOf(k) < 0) cols.push(k); }); });
    return cols.join(",") + "\n" + rows.map(function (r) { return cols.map(function (c) { return csvCell(r[c]); }).join(","); }).join("\n") + "\n";
  }
  function trialRows(list) {
    var rows = [];
    list.forEach(function (s) {
      (s.trials || []).forEach(function (t) {
        var r = {
          participant: s.id, session_start: s.createdAt, mode: s.mode, device: s.device && s.device.type, phase: "main",
          order: t.n, set: t.set + 1, question: t.idx + 1, condition: t.condition, orientation: t.orientation,
          choice: t.choice, answer: t.answer, correct: t.correct == null ? null : (t.correct ? 1 : 0), time_s: t.timeMs == null ? null : (t.timeMs / 1000).toFixed(2),
          effort_1to9: t.effort, hints_available: t.hintsAvailable, hints_used: t.hintsUsed, first_hint_s: t.firstHintMs == null ? null : (t.firstHintMs / 1000).toFixed(2),
          answer_changes: t.answerChanges
        };
        (t.hintTimeMs || []).forEach(function (ms, k) { r["time_T" + (k + 1) + "_s"] = (ms / 1000).toFixed(2); });
        Object.keys(t.controls || {}).forEach(function (k) { r["n_" + k] = t.controls[k]; });
        rows.push(r);
      });
      (s.transfer || []).forEach(function (t) {
        var r = {
          participant: s.id, session_start: s.createdAt, mode: s.mode, device: s.device && s.device.type, phase: "transfer",
          order: t.n, set: t.set + 1, question: t.idx + 1, condition: "none", orientation: t.orientation,
          choice: t.choice, answer: t.answer, correct: t.correct == null ? null : (t.correct ? 1 : 0), time_s: t.timeMs == null ? null : (t.timeMs / 1000).toFixed(2),
          identify_time_s: t.identifyMs == null ? null : (t.identifyMs / 1000).toFixed(2)
        };
        (t.identify || []).forEach(function (q, k) { r["identify" + (k + 1) + "_shape"] = q.shape; r["identify" + (k + 1) + "_answer"] = q.answer; r["identify" + (k + 1) + "_truth"] = q.truth; r["identify" + (k + 1) + "_correct"] = q.correct ? 1 : 0; });
        rows.push(r);
      });
    });
    return rows;
  }
  function sessionRows(list) {
    return list.map(function (s) {
      var m = summarise(s), r = {
        participant: s.id, session_start: s.createdAt, completed_at: s.completedAt, mode: s.mode,
        device: s.device && s.device.type, screen: s.device ? s.device.w + "x" + s.device.h : null, touch: s.device && s.device.touch ? 1 : 0,
        main_done: m.mainDone, main_accuracy: m.accuracy, mean_time_s: m.meanTimeS, mean_hints: m.meanHints,
        overall_effort_1to9: s.overallEffort != null ? s.overallEffort : m.meanEffort,
        transfer_accuracy: m.transferAcc, identify_accuracy: m.identifyAcc, tlx_raw: m.tlx, agency_mean: m.agency, sus_score: m.sus,
        hint_windows_s: (s.config && s.config.hintWindows || []).join("/")
      };
      Store.TLX_KEYS.forEach(function (k) { r["tlx_" + k] = s.tlx ? s.tlx[k] : null; });
      ((s.agency && s.agency.items) || []).forEach(function (v, i) { r["agency_" + (i + 1)] = v; });
      ((s.sus && s.sus.items) || []).forEach(function (v, i) { r["sus_" + (i + 1)] = v; });
      r.comments = s.comments || null;
      return r;
    });
  }

  function gazeRows(list) {
    var rows = [];
    list.forEach(function (s) {
      (s.trials || []).forEach(function (t) {
        if (!t.gaze || !t.gaze.length) return;
        t.gaze.forEach(function (g) {
          rows.push({
            participant: s.id, mode: s.mode, phase: "main",
            puzzle_order: t.n, question_idx: t.idx + 1, condition: t.condition,
            timestamp_ms: g.t, x: g.x, y: g.y, aoi: g.target || ""
          });
        });
      });
      (s.transfer || []).forEach(function (t) {
        if (!t.gaze || !t.gaze.length) return;
        t.gaze.forEach(function (g) {
          rows.push({
            participant: s.id, mode: s.mode, phase: "transfer",
            puzzle_order: t.n, question_idx: t.idx + 1, condition: "none",
            timestamp_ms: g.t, x: g.x, y: g.y, aoi: g.target || ""
          });
        });
      });
    });
    return rows;
  }

  /* ---------- results.txt formatting for eye-gaze and study progress ---------- */
  function pad(str, len, alignRight) {
    str = String(str == null ? "" : str);
    while (str.length < len) {
      str = alignRight ? (" " + str) : (str + " ");
    }
    return str;
  }

  function formatSessionResultsTxt(s) {
    if (!s) return "";
    var m = summarise(s);
    var sep = "=".repeat(82);
    var subSep = "-".repeat(82);
    var lines = [];

    lines.push(sep);
    lines.push("TRANSFORMATION ANIMATOR - EXPERIMENT SESSION RESULTS (PROGRESS & EYE GAZE)");
    lines.push(sep);
    lines.push("Participant ID     : " + s.id);
    lines.push("Started At         : " + new Date(s.createdAt).toLocaleString() + " (" + s.createdAt + ")");
    lines.push("Completed At       : " + (s.completedAt ? new Date(s.completedAt).toLocaleString() + " (" + s.completedAt + ")" : "IN PROGRESS / PARTIAL"));
    lines.push("Status             : " + (s.completedAt ? "COMPLETE" : "PARTIAL / IN PROGRESS"));
    lines.push("Hint Condition     : " + (s.mode || "animation").toUpperCase());
    lines.push("Device / Display   : " + ((s.device && s.device.type) || "unknown") + " (" + ((s.device && s.device.w) || "?") + "x" + ((s.device && s.device.h) || "?") + ", touch: " + (s.device && s.device.touch ? "yes" : "no") + ")");
    lines.push("Eye Tracking       : " + (s.eyeTracking ? "ACTIVE (Laptop Webcam WebGazer)" : "None"));
    lines.push(sep);
    lines.push("");

    // Performance Summary
    lines.push("EXECUTIVE SUMMARY");
    lines.push(subSep);
    lines.push("Main Puzzles Solved    : " + m.mainDone + " of " + (s.config ? s.config.mainQuestions.length : (s.trials ? s.trials.length : 10)));
    lines.push("Main Accuracy          : " + (m.accuracy != null ? (m.accuracy * 100).toFixed(1) + "%" : "–"));
    lines.push("Mean Solving Time      : " + (m.meanTimeS != null ? m.meanTimeS.toFixed(2) + " seconds" : "–"));
    lines.push("Mean Hints Used        : " + (m.meanHints != null ? m.meanHints.toFixed(2) : "–"));
    if (m.transferAcc != null) {
      lines.push("Transfer Accuracy      : " + (m.transferAcc * 100).toFixed(1) + "%");
      lines.push("Identify Trans. Acc.   : " + (m.identifyAcc != null ? (m.identifyAcc * 100).toFixed(1) + "%" : "N/A"));
    }
    lines.push("Overall Mental Effort  : " + (m.meanEffort != null ? m.meanEffort.toFixed(1) + " / 9" : "–"));
    lines.push("NASA-TLX Workload Raw  : " + (m.tlx != null ? m.tlx.toFixed(1) + " / 100" : "–"));
    lines.push("Sense of Agency Score  : " + (m.agency != null ? m.agency.toFixed(2) + " / 7" : "–"));
    lines.push("System Usability (SUS) : " + (m.sus != null ? m.sus.toFixed(1) + " / 100" : "–"));
    lines.push("");

    // Cumulative Mapped Boundaries Eye Gaze Attention Table
    var trials = s.trials || [];
    var boundaryTotals = {
      figA: { name: "Figure A", tag: "[Red]", dwellMs: 0, fix: 0 },
      figB: { name: "Figure B", tag: "[Blue]", dwellMs: 0, fix: 0 },
      figC: { name: "Figure C", tag: "[Orange]", dwellMs: 0, fix: 0 },
      chooseD: { name: "Choose D (Candidates Area)", tag: "[Yellow]", dwellMs: 0, fix: 0 },
      option1: { name: "  - Option 1", tag: "[Purple]", dwellMs: 0, fix: 0 },
      option2: { name: "  - Option 2", tag: "[Purple]", dwellMs: 0, fix: 0 },
      option3: { name: "  - Option 3", tag: "[Purple]", dwellMs: 0, fix: 0 },
      option4: { name: "  - Option 4", tag: "[Purple]", dwellMs: 0, fix: 0 },
      hints: { name: "Hints Panel", tag: "[Green]", dwellMs: 0, fix: 0 },
      other: { name: "Outside Mapped Boundaries", tag: "[Gray]", dwellMs: 0, fix: 0 }
    };

    trials.forEach(function (t) {
      if (!t.aoi) return;
      Object.keys(boundaryTotals).forEach(function (k) {
        if (t.aoi[k]) {
          boundaryTotals[k].dwellMs += (t.aoi[k].dwellTimeMs || 0);
          boundaryTotals[k].fix += (t.aoi[k].fixationsCount || 0);
        }
      });
    });

    var primaryDwellSum = boundaryTotals.figA.dwellMs + boundaryTotals.figB.dwellMs + boundaryTotals.figC.dwellMs + boundaryTotals.chooseD.dwellMs + boundaryTotals.hints.dwellMs + boundaryTotals.other.dwellMs;

    lines.push("1. CUMULATIVE EYE GAZE ACROSS MAPPED BOUNDARIES (ALL MAIN PUZZLES)");
    lines.push(subSep);
    lines.push(pad("Mapped Boundary Zone", 30) + pad("Color Tag", 12) + pad("Dwell (s)", 14, true) + pad("% Gaze", 12, true) + pad("Fixations", 12, true));
    lines.push("-".repeat(82));

    Object.keys(boundaryTotals).forEach(function (k) {
      var item = boundaryTotals[k];
      var sec = (item.dwellMs / 1000).toFixed(2) + " s";
      var pctVal = primaryDwellSum > 0 ? ((item.dwellMs / primaryDwellSum) * 100).toFixed(1) + "%" : "0.0%";
      lines.push(pad(item.name, 30) + pad(item.tag, 12) + pad(sec, 14, true) + pad(pctVal, 12, true) + pad(String(item.fix), 12, true));
    });
    lines.push("-".repeat(82));
    lines.push(pad("TOTAL GAZE TRACKED", 42) + pad((primaryDwellSum / 1000).toFixed(2) + " s", 14, true) + pad("100.0%", 12, true));
    lines.push("");

    // Detailed Puzzle-by-Puzzle Logs
    lines.push("2. PUZZLE-BY-PUZZLE PERFORMANCE & EYE GAZE BREAKDOWN");
    lines.push(subSep);

    if (trials.length) {
      trials.forEach(function (t) {
        lines.push("[Puzzle " + t.n + "] Set " + ((t.set != null ? t.set : 0) + 1) + ", Question " + ((t.idx != null ? t.idx : 0) + 1) + " | Condition: " + (t.condition || "standard"));
        lines.push("  Result: " + (t.choice != null ? (t.correct ? "CORRECT" : "INCORRECT") : "UNANSWERED") + " (Participant Choice: Option " + (t.choice != null ? t.choice : "–") + ", Answer: Option " + t.answer + ")");
        lines.push("  Solving Time: " + (t.timeMs != null ? (t.timeMs / 1000).toFixed(2) + " s" : "–") + " | Hints Used: " + (t.hintsUsed != null ? t.hintsUsed : 0) + " / " + (t.hintsAvailable != null ? t.hintsAvailable : 4) + " | First Hint: " + (t.firstHintMs != null ? (t.firstHintMs / 1000).toFixed(2) + " s" : "None"));

        if (t.aoi) {
          lines.push("  Eye Gaze Over Mapped Boundaries:");
          function row(label, key) {
            var a = t.aoi[key];
            if (!a) return;
            var s = (a.dwellTimeMs / 1000).toFixed(2) + "s";
            var p = a.pctTotal + "%";
            var tt = a.ttffMs != null ? (a.ttffMs / 1000).toFixed(2) + "s" : "–";
            lines.push("    • " + pad(label, 32) + ": " + pad(s, 9, true) + " (" + pad(p, 5, true) + ") | TTFF: " + tt);
          }
          row("Figure A [Red]", "figA");
          row("Figure B [Blue]", "figB");
          row("Figure C [Orange]", "figC");
          row("Choose D Candidates Area [Yellow]", "chooseD");
          row("  - Option 1 [Purple]", "option1");
          row("  - Option 2 [Purple]", "option2");
          row("  - Option 3 [Purple]", "option3");
          row("  - Option 4 [Purple]" + (t.choice === 4 ? " [CHOSEN]" : ""), "option4");
          row("Hints Panel [Green]", "hints");
          row("Outside Mapped Boundaries", "other");
        } else {
          lines.push("  (No gaze recorded for this puzzle)");
        }
        lines.push("");
      });
    } else {
      lines.push("No puzzle trials recorded yet.");
      lines.push("");
    }

    // Transfer Test Section
    if (s.transfer && s.transfer.length) {
      lines.push("3. PART 2 · TRANSFER TEST (NEW PUZZLES, NO HINTS)");
      lines.push(subSep);
      s.transfer.forEach(function (tr) {
        lines.push("Transfer Puzzle " + tr.n + ": Option " + (tr.choice != null ? tr.choice : "–") + " (Answer: Option " + tr.answer + ") -> " + (tr.correct ? "CORRECT" : "INCORRECT") + " in " + (tr.timeMs != null ? (tr.timeMs / 1000).toFixed(2) + " s" : "–"));
        if (tr.identify && tr.identify.length) {
          tr.identify.forEach(function (id) {
            lines.push("    - " + (id.slot === 0 ? "Left" : "Right") + " shape (" + id.shape + ") -> Selected: " + id.answer + " (Truth: " + id.truth + ") [" + (id.correct ? "CORRECT" : "WRONG") + "]");
          });
        }
      });
      lines.push("");
    }

    // Questionnaire Responses
    var qNum = (s.transfer && s.transfer.length) ? "4" : "3";
    lines.push(qNum + ". SUBJECTIVE MEASURES & QUESTIONNAIRE RATINGS");
    lines.push(subSep);
    lines.push("Overall Mental Effort (1 to 9) : " + (s.overallEffort != null ? s.overallEffort + " / 9" : "–"));

    if (s.tlx) {
      lines.push("NASA-TLX Workload Scores (0 to 100):");
      lines.push("  - Mental Demand      : " + (s.tlx.mental != null ? s.tlx.mental : "–"));
      lines.push("  - Physical Demand    : " + (s.tlx.physical != null ? s.tlx.physical : "–"));
      lines.push("  - Temporal Demand    : " + (s.tlx.temporal != null ? s.tlx.temporal : "–"));
      lines.push("  - Performance        : " + (s.tlx.performance != null ? s.tlx.performance : "–"));
      lines.push("  - Effort             : " + (s.tlx.effort != null ? s.tlx.effort : "–"));
      lines.push("  - Frustration        : " + (s.tlx.frustration != null ? s.tlx.frustration : "–"));
      lines.push("  - Raw Mean Workload  : " + (m.tlx != null ? m.tlx.toFixed(1) : "–"));
    }

    if (s.agency && s.agency.items) {
      lines.push("Sense of Agency (1 to 7 Likert Items):");
      s.agency.items.forEach(function (val, idx) {
        lines.push("  Item " + (idx + 1) + ": " + (val != null ? val : "–"));
      });
      lines.push("  - Mean Agency Score  : " + (m.agency != null ? m.agency.toFixed(2) : "–"));
    }

    if (s.sus && s.sus.items) {
      lines.push("System Usability Scale (SUS) (1 to 5 Items):");
      s.sus.items.forEach(function (val, idx) {
        lines.push("  Item " + (idx + 1) + ": " + (val != null ? val : "–"));
      });
      lines.push("  - Calculated SUS Score: " + (m.sus != null ? m.sus.toFixed(1) + " / 100" : "–"));
    }

    if (s.comments) {
      lines.push("Participant Comments / Feedback:");
      lines.push("  \"" + s.comments.replace(/\n/g, "\n   ") + "\"");
    }

    lines.push("");
    lines.push(sep);
    lines.push("END OF SESSION REPORT · TRANSFORMATION ANIMATOR");
    lines.push(sep);

    return lines.join("\n") + "\n";
  }

  function formatAllSessionsResultsTxt(list) {
    if (!list || !list.length) return "TRANSFORMATION ANIMATOR - NO SESSIONS RECORDED YET\n";
    var lines = [];
    var sep = "=".repeat(92);
    lines.push(sep);
    lines.push("TRANSFORMATION ANIMATOR - ALL EXPERIMENT SESSIONS MASTER LOG (RESULTS.TXT)");
    lines.push("Export Generated: " + new Date().toLocaleString() + " | Total Sessions: " + list.length);
    lines.push(sep);
    lines.push("");

    // Sessions overview table
    lines.push("SESSIONS OVERVIEW TABLE");
    lines.push("-".repeat(92));
    lines.push(pad("ID", 10) + pad("Started", 20) + pad("Mode", 12) + pad("Status", 10) + pad("Puzzles", 10) + pad("Accuracy", 10) + pad("Mean Time", 10) + pad("SUS", 10));
    lines.push("-".repeat(92));

    list.forEach(function (s) {
      var m = summarise(s);
      lines.push(
        pad(s.id, 10) +
        pad(new Date(s.createdAt).toLocaleDateString(), 20) +
        pad(s.mode, 12) +
        pad(m.status, 10) +
        pad(m.mainDone + "/10", 10) +
        pad(m.accuracy != null ? (m.accuracy * 100).toFixed(0) + "%" : "–", 10) +
        pad(m.meanTimeS != null ? m.meanTimeS.toFixed(1) + "s" : "–", 10) +
        pad(m.sus != null ? m.sus.toFixed(0) : "–", 10)
      );
    });
    lines.push("-".repeat(92));
    lines.push("");

    // Per-condition summary
    var conds = byCondition(list);
    if (conds.length) {
      lines.push("PER-CONDITION ACCURACY & TIMING COMPARISON");
      lines.push("-".repeat(92));
      lines.push(pad("Condition", 15) + pad("Trials", 10) + pad("Accuracy", 14) + pad("Mean Time (s)", 16) + pad("Mean Hints", 14) + pad("Effort (1-9)", 14));
      lines.push("-".repeat(92));
      conds.forEach(function (c) {
        lines.push(
          pad(c.condition, 15) +
          pad(String(c.trials), 10) +
          pad(c.accuracy != null ? (c.accuracy * 100).toFixed(1) + "%" : "–", 14) +
          pad(c.meanTimeS != null ? c.meanTimeS.toFixed(1) + "s" : "–", 16) +
          pad(c.meanHints != null ? c.meanHints.toFixed(2) : "–", 14) +
          pad(c.meanEffort != null ? c.meanEffort.toFixed(1) : "–", 14)
        );
      });
      lines.push("-".repeat(92));
      lines.push("");
    }

    // Detailed per-session reports
    lines.push("INDIVIDUAL SESSION DETAILED REPORTS");
    lines.push(sep);
    list.forEach(function (s, idx) {
      lines.push("\n### SESSION " + (idx + 1) + " OF " + list.length + " (PARTICIPANT: " + s.id + ") ###\n");
      lines.push(formatSessionResultsTxt(s));
    });

    return lines.join("\n");
  }

  function downloadResultsTxt(session) {
    if (!session) return;
    var filename = "results-" + (session.id || "session") + ".txt";
    download(filename, formatSessionResultsTxt(session), "text/plain");
  }

  function downloadAllResultsTxt() {
    var filename = "results.txt";
    download(filename, formatAllSessionsResultsTxt(all()), "text/plain");
  }

  function download(name, text, type) {
    var a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([text], { type: type || "text/plain" }));
    a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  return {
    all: all, save: save, remove: remove, clear: clear, importMany: importMany,
    TLX_KEYS: TLX_KEYS, susScore: susScore, tlxRaw: tlxRaw, agencyMean: agencyMean, mean: mean,
    summarise: summarise, byCondition: byCondition, toCsv: toCsv, trialRows: trialRows, sessionRows: sessionRows,
    gazeRows: gazeRows, download: download,
    formatSessionResultsTxt: formatSessionResultsTxt,
    formatAllSessionsResultsTxt: formatAllSessionsResultsTxt,
    downloadResultsTxt: downloadResultsTxt,
    downloadAllResultsTxt: downloadAllResultsTxt
  };
})();
