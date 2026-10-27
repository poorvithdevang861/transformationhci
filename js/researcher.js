/* Researcher dashboard: summaries, per-session table, CSV / JSON export and import,
   interactive Eye-Tracking Heatmap & Scanpath explorer, study settings. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  function pct(v) { return v == null ? "–" : Math.round(v * 100) + "%"; }
  function num(v, d) { return v == null ? "–" : v.toFixed(d == null ? 1 : d); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function stamp() { return new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-"); }

  document.querySelector(".note").textContent = "Data lives in this browser only (localStorage). Export after each session, or collect the participants' downloaded JSON files and import them here.";

  /* State for modal heatmap explorer */
  var curSession = null;
  var curTrial = null;
  var curViewMode = "heatmap";
  var replayInterval = null;

  /* ---------- tables ---------- */
  function render() {
    var list = Store.all().sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
    var sums = list.map(Store.summarise), done = sums.filter(function (m) { return m.status === "complete"; });
    var eyeCount = list.filter(function (s) { return s.eyeTracking || (s.trials || []).some(function (t) { return t.gaze && t.gaze.length; }); }).length;

    function kpi(label, value) { return '<div class="kpi"><b>' + value + "</b><span>" + label + "</span></div>"; }
    $("kpis").innerHTML =
      kpi("sessions", list.length) + kpi("complete", done.length) +
      kpi("eye-tracked", eyeCount) +
      kpi("mean SUS", num(Store.mean(done.map(function (m) { return m.sus; })), 0)) +
      kpi("mean raw TLX", num(Store.mean(done.map(function (m) { return m.tlx; })), 0)) +
      kpi("transfer acc.", pct(Store.mean(sums.map(function (m) { return m.transferAcc; }))));

    // Per-condition metrics including hint gaze dwell times
    var groups = byConditionWithGaze(list);
    $("condTable").innerHTML = "<thead><tr><th>Condition</th><th>Trials</th><th>Accuracy</th><th>Mean time</th><th>Mean effort (1–9)</th><th>Mean hints</th><th>Hint Gaze Dwell</th><th>% Gaze on Hints</th></tr></thead><tbody>" +
      (groups.length ? groups.map(function (g) {
        return '<tr><td><span class="tag ' + g.condition + '">' + g.condition + "</span></td><td>" + g.trials + "</td><td>" + pct(g.accuracy) + "</td><td>" + num(g.meanTimeS) + " s</td><td>" + num(g.meanEffort) + "</td><td>" + num(g.meanHints) + "</td><td>" + (g.meanHintGazeS != null ? num(g.meanHintGazeS) + " s" : "–") + "</td><td>" + (g.pctHintGaze != null ? pct(g.pctHintGaze) : "–") + "</td></tr>";
      }).join("") : '<tr><td colspan="8" class="empty">No answered puzzles yet.</td></tr>') + "</tbody>";

    $("sessTable").innerHTML = "<thead><tr><th>Participant</th><th>Started</th><th>Mode</th><th>Device</th><th>Status</th><th>Puzzles</th><th>Accuracy</th><th>Effort</th><th>Transfer</th><th>TLX</th><th>SUS</th><th>Eye Tracking</th><th></th></tr></thead><tbody>" +
      (list.length ? list.map(function (s, i) {
        var m = sums[i];
        var hasGaze = s.eyeTracking || (s.trials || []).some(function (t) { return t.gaze && t.gaze.length; });
        return "<tr><td class='mono'>" + esc(s.id) + "</td><td>" + new Date(s.createdAt).toLocaleString() + "</td><td>" + esc(s.mode) + "</td><td>" + esc(m.device) +           <td><span class="tag ' + m.status + '">' + m.status + "</span></td><td>" + m.mainDone + " / " + (s.config ? s.config.mainQuestions.length : "?") + "</td>" +
          "<td>" + pct(m.accuracy) + "</td><td>" + (m.meanEffort != null ? num(m.meanEffort, 1) : "–") + "</td><td>" + pct(m.transferAcc) + "</td><td>" + num(m.tlx, 0) + "</td><td>" + num(m.sus, 1) + "</td>" +
          '<td>' + (hasGaze ? '<button type="button" class="ibtn tb" data-heat="' + i + '" style="color:#ff8576;font-size:0.76rem;padding:0 8px;height:30px;"><svg class="i sm" aria-hidden="true"><use href="#i-eye"/></svg>View Heatmaps</button>' : '<span class="meta" style="color:var(--faint);">No gaze</span>') + '</td>' +
          '<td class="act">' +
          '<button class="ibtn" data-txt="' + i + '" aria-label="Download results.txt for ' + esc(s.id) + '" title="Download results.txt"><svg class="i sm" aria-hidden="true"><use href="#i-download"/></svg></button>' +
          '<button class="ibtn" data-dl="' + i + '" aria-label="Download JSON for ' + esc(s.id) + '" title="Download JSON"><svg class="i sm" aria-hidden="true"><use href="#i-code"/></svg></button>' +
          '<button class="ibtn" data-rm="' + i + '" aria-label="Delete ' + esc(s.id) + '" title="Delete session"><svg class="i sm" aria-hidden="true"><use href="#i-trash"/></svg></button></td></tr>';
      }).join("") : '<tr><td colspan="13" class="empty">No sessions yet. Run the study from the home page.</td></tr>') + "</tbody>";

    $("sessTable").onclick = function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.dataset.txt != null) { var s = list[+b.dataset.txt]; Store.downloadResultsTxt(s); }
      if (b.dataset.dl != null) { var s = list[+b.dataset.dl]; Store.download("ta-" + s.id + ".json", JSON.stringify(s, null, 2), "application/json"); }
      if (b.dataset.rm != null) { var r = list[+b.dataset.rm]; if (confirm("Delete session " + r.id + "? This cannot be undone.")) { Store.remove(r.id, r.createdAt); render(); } }
      if (b.dataset.heat != null) { openHeatmapDialog(list[+b.dataset.heat]); }
    };

    $("exResultsTxt").onclick = function () { Store.downloadAllResultsTxt(); };
    var gazeTotalRows = Store.gazeRows(list);
    $("exGaze").disabled = !gazeTotalRows.length;
    ["exResultsTxt", "exTrials", "exSessions", "exJson", "clearAll"].forEach(function (id) { $(id).disabled = !list.length; });.length; });
  }

  /* Compute per-condition metrics with gaze dwell stats */
  function byConditionWithGaze(list) {
    var groups = {};
    list.forEach(function (s) {
      (s.trials || []).forEach(function (t) {
        if (t.choice == null) return;
        var g = groups[t.condition] || (groups[t.condition] = { n: 0, correct: [], time: [], effort: [], hints: [], hintGazeS: [], pctHintGaze: [] });
        g.n++;
        g.correct.push(t.correct ? 1 : 0);
        g.time.push(t.timeMs / 1000);
        var eff = t.effort != null ? t.effort : s.overallEffort;
        if (eff != null) g.effort.push(eff);
        g.hints.push(t.hintsUsed);

        if (t.aoi && t.aoi.hints) {
          var hSec = t.aoi.hints.dwellTimeMs / 1000;
          g.hintGazeS.push(hSec);
          g.pctHintGaze.push(t.aoi.hints.pctTotal / 100);
        }
      });
    });

    return Object.keys(groups).map(function (k) {
      var g = groups[k];
      return {
        condition: k,
        trials: g.n,
        accuracy: Store.mean(g.correct),
        meanTimeS: Store.mean(g.time),
        meanEffort: Store.mean(g.effort),
        meanHints: Store.mean(g.hints),
        meanHintGazeS: Store.mean(g.hintGazeS),
        pctHintGaze: Store.mean(g.pctHintGaze)
      };
    });
  }

  /* ---------- export / import ---------- */
  $("exGaze").onclick = function () {
    var rows = Store.gazeRows(Store.all());
    Store.download("ta-gaze-" + stamp() + ".csv", Store.toCsv(rows), "text/csv");
  };
  $("exTrials").onclick = function () { Store.download("ta-trials-" + stamp() + ".csv", Store.toCsv(Store.trialRows(Store.all())), "text/csv"); };
  $("exSessions").onclick = function () { Store.download("ta-sessions-" + stamp() + ".csv", Store.toCsv(Store.sessionRows(Store.all())), "text/csv"); };
  $("exJson").onclick = function () { Store.download("ta-all-" + stamp() + ".json", JSON.stringify(Store.all(), null, 2), "application/json"); };
  $("clearAll").onclick = function () { if (confirm("Delete every session stored in this browser? Export first if you need the data.")) { Store.clear(); render(); } };
  $("imFile").onchange = function () {
    var files = Array.prototype.slice.call(this.files), got = [];
    Promise.all(files.map(function (f) { return f.text(); })).then(function (texts) {
      texts.forEach(function (t) { try { var d = JSON.parse(t); got = got.concat(Array.isArray(d) ? d : [d]); } catch (e) {} });
      Store.importMany(got);
      $("imFile").value = "";
      render();
      alert("Imported " + got.length + " session" + (got.length === 1 ? "" : "s") + ".");
    });
  };
  $("imFile").multiple = true;

  /* ---------- Heatmap Explorer Modal ---------- */
  var mCanvas = $("modalHeatmapCanvas");
  var mPanel = $("heatViewPanel");

  function openHeatmapDialog(session) {
    curSession = session;
    $("heatDlgTitle").textContent = "Gaze Heatmaps · Participant " + session.id;
    $("heatDlgEyebrow").textContent = "Session started " + new Date(session.createdAt).toLocaleDateString() + " · Mode: " + session.mode;

    var allTrials = (session.trials || []).concat(session.transfer || []);
    var seg = $("heatTrialSeg");
    seg.innerHTML = "";

    allTrials.forEach(function (t, i) {
      var isTr = i >= (session.trials || []).length;
      var hasGaze = t.gaze && t.gaze.length > 0;
      var b = document.createElement("button");
      b.type = "button";
      b.className = "t";
      b.style.fontSize = "0.78rem";
      b.style.padding = "4px 10px";
      b.innerHTML = (isTr ? "Transfer " + t.n : "P" + t.n) + (hasGaze ? ' <span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:#ff4055;margin-left:4px;"></span>' : "");
      b.onclick = function () {
        seg.querySelectorAll("button").forEach(function (btn) { btn.setAttribute("aria-pressed", btn === b); });
        selectModalTrial(t, isTr);
      };
      seg.appendChild(b);
    });

    $("heatDlg").showModal();
    if (allTrials.length) {
      seg.children[0].click();
    }
  }

  $("closeHeatDlg").onclick = function () {
    if (replayInterval) { clearInterval(replayInterval); replayInterval = null; }
    $("heatDlg").close();
  };

  function selectModalTrial(t, isTransfer) {
    curTrial = t;
    if (replayInterval) { clearInterval(replayInterval); replayInterval = null; $("mPlayBtn").innerHTML = '<svg class="i sm"><use href="#i-play"/></svg>'; }

    // Reconstruct puzzle visuals in modalPuzzleContent
    var set = SETS[t.set != null ? t.set : STUDY.mainSet];
    var spec = TA.parseSpec(set.specs[t.idx]);
    var cnt = $("modalPuzzleContent");
    cnt.innerHTML =
      '<div class="eyebrow" style="margin-bottom:6px;">' + (isTransfer ? "Transfer Puzzle " + t.n : "Main Puzzle " + t.n + " (" + t.condition + " hints)") + "</div>" +
      '<div class="figs svg" id="mFigs" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:14px;"></div>' +
      '<div class="choose" data-aoi="choose-d" style="padding:10px;border-radius:14px;background:var(--sunken);">' +
        '<div class="lbl" style="margin-bottom:6px;">Answer Candidates (Chosen: Option ' + (t.choice != null ? t.choice : "–") + ")</div>" +
        '<div class="opts4" id="mOpts" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;"></div>' +
      '</div>';

    // Figures A, B, C, D
    var figsEl = cnt.querySelector("#mFigs");
    figsEl.className = "figs svg";
    figsEl.innerHTML = ["A", "B", "C", "D"].map(function (L) {
      return '<div class="fig' + (L === "B" ? " target" : L === "D" ? " answer" : "") + '" data-aoi="fig-' + L + '"><svg class="box" viewBox="0 0 100 100" role="img" aria-label="Figure ' + L + '"></svg><span class="flab">' + L + "</span></div>";
    }).join("");
    var svgs = figsEl.querySelectorAll("svg");
    [0, 1, 2].forEach(function (i) {
      var f = TA.figure(svgs[i], i < 2 ? spec.A : spec.C);
      [0, 1].forEach(function (s) { f.place(s, i === 1 ? TA.paramsAt(TA.shapeOps(spec, s), 1) : TA.params(TA.NONE, 0)); });
    });
    var qm = TA.el("text", { x: 50, y: 50, "class": "qmark" }, svgs[3]); qm.textContent = "?";

    // Options
    var optsEl = cnt.querySelector("#mOpts");
    optsEl.innerHTML = "";
    optsEl.style.setProperty("--img", TA.sheetUrl(set, t.idx));
    [0, 1, 2, 3].forEach(function (n) {
      var cell = document.createElement("div"); cell.className = "cell";
      cell.setAttribute("data-aoi", "option-" + (n + 1));
      if (n === 3 || t.choice === n + 1) cell.classList.add("boundary-option-4");
      var b = document.createElement("button");
      b.className = "opt" + (t.choice === n + 1 ? (t.correct ? " good" : " bad") : "");
      b.type = "button";
      b.style.backgroundPosition = TA.optionCropPosition(n);
      if (t.choice === n + 1) b.setAttribute("aria-checked", "true");
      var cap = document.createElement("div"); cap.className = "cap";
      cap.innerHTML = "<span><b>" + (n + 1) + '</b></span><span class="mk">' + (t.choice === n + 1 ? (t.correct ? "Answer" : "Picked") : "") + "</span>";
      cell.appendChild(b); cell.appendChild(cap); optsEl.appendChild(cell);
    });

    // Populate AOI list
    renderModalAOI(t.aoi || (t.gaze ? HeatmapEngine.computeFixations(t.gaze) : null));

    // Scrubber setup
    var fixCount = (t.fixations && t.fixations.length) || (t.gaze ? HeatmapEngine.computeFixations(t.gaze).length : 0);
    $("mReplayScrubber").max = fixCount;
    $("mReplayScrubber").value = fixCount;
    $("mReplayText").textContent = fixCount + "/" + fixCount;

    setTimeout(redrawModalHeatmap, 60);
  }

  function renderModalAOI(aoiMetrics) {
    var list = $("mAoiList");
    list.innerHTML = "";
    if (!aoiMetrics) {
      list.innerHTML = '<div class="meta" style="color:var(--faint);">No gaze samples recorded for this trial.</div>';
      return;
    }
    var keys = Object.keys(aoiMetrics).filter(function (k) { return aoiMetrics[k].dwellTimeMs > 0; });
    keys.sort(function (a, b) { return aoiMetrics[b].dwellTimeMs - aoiMetrics[a].dwellTimeMs; });

    keys.forEach(function (k) {
      var m = aoiMetrics[k];
      var sec = (m.dwellTimeMs / 1000).toFixed(1);
      var swatchColor = m.color || (k === 'figA' ? '#ff4055' : k === 'figB' ? '#3b82f6' : k === 'figC' ? '#ff9800' : k === 'chooseD' ? '#facc15' : k.indexOf('option') === 0 ? '#a855f7' : k === 'hints' ? '#22c55e' : '#94a3b8');
      var item = document.createElement("div");
      item.className = "aoi-item";
      item.innerHTML =
        '<div class="aoi-header"><span class="aoi-badge"><span class="aoi-swatch" style="background:' + swatchColor + ';"></span>' + m.name + (m.boundaryTag ? ' ' + m.boundaryTag : '') + '</span><span style="font-family:var(--f-mono);color:var(--accent);">' + sec + 's (' + m.pctTotal + '%)</span></div>' +
        '<div class="aoi-bar-track"><div class="aoi-bar-fill" style="background:' + swatchColor + ';width:' + m.pctTotal + '%;"></div></div>';
      list.appendChild(item);
    });

    if (!list.children.length) {
      list.innerHTML = '<div class="meta" style="color:var(--faint);">Gaze distributed across canvas.</div>';
    }
  }

  function redrawModalHeatmap() {
    if (!curTrial) return;
    var rect = mPanel.getBoundingClientRect();
    mCanvas.width = Math.round(rect.width);
    mCanvas.height = Math.round(rect.height);

    var cnt = $("modalPuzzleContent");
    var showBoundaries = $("mShowBoundaries") && $("mShowBoundaries").checked;
    if (cnt) {
      if (showBoundaries) cnt.classList.add("show-mapped-boundaries");
      else cnt.classList.remove("show-mapped-boundaries");
    }

    var ctx = mCanvas.getContext("2d");
    ctx.clearRect(0, 0, mCanvas.width, mCanvas.height);

    var samples = curTrial.gaze;
    if (!samples || !samples.length) return;

    var fixations = curTrial.fixations || HeatmapEngine.computeFixations(samples);
    var opacity = +$("mOpacSlider").value / 100;
    var radius = +$("mRadSlider").value;
    var scrubStep = +$("mReplayScrubber").value || fixations.length;

    // Adjust coordinates relative to modal panel
    var pRect = mPanel.getBoundingClientRect();
    var adjustedFixations = fixations.map(function (f) {
      return { id: f.id, t: f.t, x: Math.min(mCanvas.width - 10, Math.max(10, f.x - pRect.left)), y: Math.min(mCanvas.height - 10, Math.max(10, f.y - pRect.top)), duration: f.duration, target: f.target };
    });

    if (curViewMode === "heatmap" || curViewMode === "both") {
      HeatmapEngine.renderHeatmap(mCanvas, adjustedFixations, {
        width: mCanvas.width, height: mCanvas.height, radius: radius, opacity: opacity
      });
    }

    if (curViewMode === "scanpath" || curViewMode === "both") {
      HeatmapEngine.renderScanpath(mCanvas, adjustedFixations, {
        width: mCanvas.width, height: mCanvas.height, maxStep: scrubStep, showDwell: true, keepHeatmap: (curViewMode === "both")
      });
    }
  }

  // Modal controls
  $("mModeSeg").addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b) return;
    curViewMode = b.dataset.mode;
    $("mModeSeg").querySelectorAll("button").forEach(function (btn) { btn.setAttribute("aria-pressed", btn === b); });
    redrawModalHeatmap();
  });
  $("mOpacSlider").oninput = function () { $("mOpacVal").textContent = this.value + "%"; redrawModalHeatmap(); };
  $("mRadSlider").oninput = function () { $("mRadVal").textContent = this.value + "px"; redrawModalHeatmap(); };
  $("mReplayScrubber").oninput = function () { $("mReplayText").textContent = this.value + "/" + this.max; redrawModalHeatmap(); };

  $("mPlayBtn").onclick = function () {
    if (replayInterval) {
      clearInterval(replayInterval);
      replayInterval = null;
      $("mPlayBtn").innerHTML = '<svg class="i sm"><use href="#i-play"/></svg>';
      return;
    }
    if (!curTrial || !curTrial.gaze) return;
    var fixations = curTrial.fixations || HeatmapEngine.computeFixations(curTrial.gaze);
    if (!fixations.length) return;

    $("mPlayBtn").innerHTML = '<svg class="i sm"><use href="#i-pause"/></svg>';
    if (+$("mReplayScrubber").value >= fixations.length) { $("mReplayScrubber").value = 0; }

    replayInterval = setInterval(function () {
      var cur = +$("mReplayScrubber").value;
      if (cur >= fixations.length) {
        clearInterval(replayInterval);
        replayInterval = null;
        $("mPlayBtn").innerHTML = '<svg class="i sm"><use href="#i-play"/></svg>';
      } else {
        $("mReplayScrubber").value = cur + 1;
        $("mReplayText").textContent = (cur + 1) + "/" + fixations.length;
        redrawModalHeatmap();
      }
    }, 400);
  };

  if ($("mShowBoundaries")) {
    $("mShowBoundaries").onchange = function () {
      redrawModalHeatmap();
    };
  }

  $("mDlTxt").onclick = function () {
    if (!curSession || !curTrial) return;
    var lines = [];
    var sep = "=".repeat(78);
    lines.push(sep);
    lines.push("TRIAL EYE GAZE & BEHAVIORAL LOG · PARTICIPANT " + curSession.id);
    lines.push("Puzzle: " + curTrial.n + " | Condition: " + (curTrial.condition || "transfer") + " | Answer: " + curTrial.answer + " | Choice: " + (curTrial.choice != null ? curTrial.choice : "–") + " (" + (curTrial.correct ? "CORRECT" : "WRONG") + ")");
    lines.push("Solving Time: " + (curTrial.timeMs != null ? (curTrial.timeMs / 1000).toFixed(2) + "s" : "–"));
    lines.push(sep);
    lines.push("\nEYE GAZE ATTENTION OVER MAPPED BOUNDARIES:");
    if (curTrial.aoi) {
      Object.keys(curTrial.aoi).forEach(function (k) {
        var a = curTrial.aoi[k];
        lines.push("  • " + (a.name || k) + (a.boundaryTag ? " " + a.boundaryTag : "") + ": " + (a.dwellTimeMs / 1000).toFixed(2) + "s (" + a.pctTotal + "%) | Fixations: " + (a.fixationsCount || 0));
      });
    }
    if (curTrial.gaze && curTrial.gaze.length) {
      lines.push("\nRAW GAZE SAMPLES (t_ms, x, y, mapped_boundary):");
      curTrial.gaze.forEach(function (g) {
        lines.push("  " + g.t + "ms, " + g.x + ", " + g.y + ", " + (g.target || "outside"));
      });
    }
    lines.push("\n" + sep);
    Store.download("trial-p" + curTrial.n + "-" + curSession.id + ".txt", lines.join("\n"), "text/plain");
  };

  $("mDlPng").onclick = function () {
    if (!curTrial || !curTrial.gaze) return;
    var link = document.createElement("a");
    link.download = "heatmap-" + (curSession ? curSession.id : "trial") + "-P" + curTrial.n + ".png";
    link.href = mCanvas.toDataURL("image/png");
    link.click();
  };

  /* ---------- settings ---------- */
  var cfg;
  function paintCfg() {
    $("windows").innerHTML = [0, 1, 2, 3].map(function (k) {
      return '<label><span>T' + (k + 1) + '</span><input type="number" min="5" max="120" step="1" data-w="' + k + '" value="' + (cfg.hintWindows[k] != null ? cfg.hintWindows[k] : cfg.hintWindows[cfg.hintWindows.length - 1]) + '"></label>';
    }).join("");
    $("animS").value = cfg.animSeconds;
    $("fb").checked = !!cfg.feedback;
    picker("mainPick", "mainLbl", cfg.mainSet, cfg.mainQuestions, "Main puzzles (with hints) · ");
    picker("trPick", "trLbl", cfg.transferSet, cfg.transferQuestions, "Transfer puzzles (no hints) · ");
  }
  function picker(id, lblId, setIdx, chosen, label) {
    var set = SETS[setIdx];
    $(lblId).textContent = label + set.name;
    $(id).innerHTML = set.specs.map(function (line, i) {
      var n = TA.hintsFor(TA.parseSpec(line)).length;
      return '<label class="qp"><input type="checkbox" value="' + i + '"' + (chosen.indexOf(i) >= 0 ? " checked" : "") + "><span>Q" + (i + 1) + "</span><em>" + n + " hint" + (n === 1 ? "" : "s") + "</em></label>";
    }).join("");
  }
  function picked(id) { return Array.prototype.map.call($(id).querySelectorAll("input:checked"), function (i) { return +i.value; }); }
  function load() {
    cfg = JSON.parse(JSON.stringify(STUDY));
    paintCfg();
    $("cfgState").textContent = localStorage.getItem("ta-config") ? "Custom settings in use" : "Using defaults";
  }
  $("cfgSave").onclick = function () {
    var w = Array.prototype.map.call($("windows").querySelectorAll("input"), function (i) { return Math.max(5, Math.min(120, +i.value || 20)); });
    var main = picked("mainPick"), tr = picked("trPick");
    if (!main.length) { $("cfgState").textContent = "Pick at least one main puzzle."; return; }
    var next = { mainSet: cfg.mainSet, mainQuestions: main, transferSet: cfg.transferSet, transferQuestions: tr, hintWindows: w, animSeconds: Math.max(0.6, Math.min(5, +$("animS").value || 1.6)), feedback: $("fb").checked };
    localStorage.setItem("ta-config", JSON.stringify(next));
    Object.keys(next).forEach(function (k) { STUDY[k] = next[k]; });
    load();
    $("cfgState").textContent = "Saved · applies to new sessions";
  };
  $("cfgReset").onclick = function () {
    localStorage.removeItem("ta-config");
    Object.keys(STUDY_DEFAULTS).forEach(function (k) { STUDY[k] = JSON.parse(JSON.stringify(STUDY_DEFAULTS[k])); });
    load();
    $("cfgState").textContent = "Back to defaults";
  };

  load();
  render();
})();
