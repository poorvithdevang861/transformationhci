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
    gazeRows: gazeRows, download: download
  };
})();
