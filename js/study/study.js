/* Study flow: welcome (consent & camera setup) -> how animated hints work -> main puzzles with animated hints & eye tracking -> transfer test -> questionnaires (Overall Effort, NASA-TLX, Agency, SUS) -> completion.
   Relies on TA (engine.js), SETS (problems.js), STUDY (config.js), Store, Measures, HintPlayer, GazeTracker, and HeatmapEngine. */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };

  // Replace {icon-...} placeholders
  [document.querySelector(".shell")].filter(Boolean).forEach(function (root) {
    root.innerHTML = root.innerHTML.replace(/\{icon-([\w-]+)\}/g, function (_, id) { return TA.icon("i-" + id); });
  });

  var S = null, mode = "animation", device = detectDevice();
  var trial = null, player = null, picked = null, tStart = 0, step = 0;
  var MAIN = STUDY.mainQuestions.length, TOTAL = MAIN + 4;

  /* ---------- helpers ---------- */
  function detectDevice() {
    var coarse = window.matchMedia("(pointer: coarse)").matches, s = Math.min(screen.width, screen.height);
    if (coarse && s < 600) return "phone";
    if (coarse) return "tablet";
    return "laptop";
  }
  function orientation() { return innerWidth >= innerHeight ? "landscape" : "portrait"; }
  function newId() {
    var a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", s = "P-";
    for (var i = 0; i < 5; i++) s += a[Math.floor(Math.random() * a.length)];
    return s;
  }
  /* small seeded PRNG so a participant's Randomise order can be reproduced from their ID */
  function seeded(str) {
    var h = 1779033703 ^ str.length;
    for (var i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
    return function () {
      h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909);
      return ((h ^= h >>> 16) >>> 0) / 4294967296;
    };
  }
  function shuffle(a, rnd) { for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(rnd() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; } return a; }

  /* Conditions: static (all text), animation (all animated), randomise (balanced mix) */
  function conditionsFor(m, n, id) {
    if (m === "static") return Array(n).fill("static");
    if (m === "animation") return Array(n).fill("animated");
    var rnd = seeded(id + "|conditions"), a = [];
    for (var i = 0; i < n; i++) a.push(i % 2 ? "animated" : "static");
    if (n % 2 && rnd() < 0.5) a[n - 1] = "animated";
    return shuffle(a, rnd);
  }
  function show(id) {
    document.querySelectorAll(".screen").forEach(function (s) { s.hidden = s.id !== id; });
    window.scrollTo(0, 0);
  }
  function setProgress(label, cond) {
    $("progress").hidden = !label;
    if (label) {
      $("progressTxt").textContent = label;
      $("progressBar").style.width = Math.round(step / TOTAL * 100) + "%";
    }
    $("condChip").hidden = !cond;
    if (cond) {
      $("condChip").className = "cond " + cond;
      $("condChip").innerHTML = TA.icon(cond === "animated" ? "i-anim" : "i-text", "sm") + (cond === "animated" ? "Animated hints" : "Text hints");
    }
  }
  function save() {
    Store.save(S);
    trySaveToServer(S);
  }

  function trySaveToServer(session) {
    if (!session) return;
    try {
      fetch("/api/save-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: session.id,
          createdAt: session.createdAt,
          completedAt: session.completedAt,
          txt: Store.formatSessionResultsTxt(session),
          session: session
        })
      }).catch(function () {});
    } catch (e) {}
  }

  /* ---------- 1 · welcome & consent ---------- */
  $("nMain").textContent = MAIN + (MAIN === 1 ? " puzzle" : " puzzles") + " with hints";
  if ($("nTransfer")) $("nTransfer").textContent = "";
  if ($("stepTransfer")) $("stepTransfer").hidden = true;
  $("pid").value = newId();

  function paintDevice() {
    document.querySelectorAll("#deviceSeg button").forEach(function (b) {
      b.setAttribute("aria-pressed", b.dataset.device === device);
    });
  }
  paintDevice();
  $("deviceSeg").addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (b) { device = b.dataset.device; paintDevice(); }
  });

  // Default mode is animation, user can pick Static or Randomise
  var mode = "animation";
  document.querySelector(".modes").addEventListener("click", function (e) {
    var b = e.target.closest(".mode");
    if (!b) return;
    mode = b.dataset.mode;
    document.querySelectorAll(".mode").forEach(function (m) {
      m.setAttribute("aria-checked", m === b);
    });
    canStart();
  });

  function canStart() {
    $("startBtn").disabled = !(mode && $("consent").checked && $("pid").value.trim());
  }
  $("consent").addEventListener("change", canStart);
  $("consent").addEventListener("click", canStart);
  $("consent").addEventListener("input", canStart);
  $("pid").addEventListener("input", canStart);
  canStart();

  $("startBtn").onclick = function () {
    var id = $("pid").value.trim();
    S = {
      id: id, createdAt: new Date().toISOString(), completedAt: null, mode: mode, consent: true,
      eyeTracking: true,
      overallEffort: null,
      device: { type: device, detected: detectDevice(), w: screen.width, h: screen.height, vw: innerWidth, vh: innerHeight, touch: navigator.maxTouchPoints > 0, ua: navigator.userAgent },
      config: JSON.parse(JSON.stringify(STUDY)),
      conditions: conditionsFor(mode, MAIN, id),
      trials: [], transfer: [], tlx: null, agency: null, sus: null, comments: ""
    };
    save();
    window.addEventListener("beforeunload", guard);

    // Proceed immediately to instructions! Never block or stall the participant!
    intro();

    // Start laptop camera eye tracking in background
    if (window.GazeTracker) {
      GazeTracker.init().catch(function (e) {
        console.warn("GazeTracker init warning:", e);
      });
    }
  };

  function guard(e) {
    if (S && !S.completedAt) { e.preventDefault(); e.returnValue = ""; }
  }

  /* ---------- 2 · instructions for the chosen mode ---------- */
  function intro() {
    var w = STUDY.hintWindows[0];
    var common = [
      ["i-bulb", "Stuck? Tap <b>Show hint</b>. Each hint shows <b>one transformation</b>, in order."],
      ["i-clock", "Each hint has a time window (about " + w + " s). When it ends, the next hint appears."],
      ["i-check", "Pick D and <b>confirm</b>. The study measures your answers and eye gaze visual attention."]
    ];
    var ctrl = {
      static: ["i-text", "Hints are written steps. You can <b>pause the timer</b>, go <b>back</b> or <b>skip ahead</b>."],
      animation: ["i-anim", "Hints animate on figure A. Use <b>play / pause</b>, <b>replay</b>, <b>previous / next</b> and <b>speed</b>."],
      randomise: ["i-shuffle", "Some puzzles have <b>text hints</b>, others <b>animated hints</b>. The badge at the top tells you which."]
    }[mode || "animation"];
    $("introTitle").textContent = {
      static: "Text hints, one step at a time",
      animation: "Animated hints, one step at a time",
      randomise: "A mix of text and animated hints"
    }[mode || "animation"];
    $("introList").innerHTML = [common[0], ctrl, common[1], common[2]].map(function (r) { return "<li>" + TA.icon(r[0]) + "<span>" + r[1] + "</span></li>"; }).join("");
    $("introMeta").innerHTML = TA.icon("i-user", "sm") + S.id + " · " + TA.cap1(device);
    setProgress("Getting started", null);
    show("sIntro");
  }
  $("beginBtn").onclick = function () { startTrial(0); };

  /* ---------- shared question rendering ---------- */
  function figuresSvg(root, spec) {
    root.className = "figs svg";
    root.innerHTML = ["A", "B", "C", "D"].map(function (L) {
      return '<div class="fig' + (L === "B" ? " target" : L === "D" ? " answer" : "") + '" data-aoi="fig-' + L + '"><svg class="box" viewBox="0 0 100 100" role="img" aria-label="Figure ' + L + '"></svg><span class="flab">' + L + "</span></div>";
    }).join("");
    var svgs = root.querySelectorAll("svg");
    [0, 1, 2].forEach(function (i) {
      var f = TA.figure(svgs[i], i < 2 ? spec.A : spec.C);
      [0, 1].forEach(function (s) { f.place(s, i === 1 ? TA.paramsAt(TA.shapeOps(spec, s), 1) : TA.params(TA.NONE, 0)); });
    });
    var qm = TA.el("text", { x: 50, y: 50, "class": "qmark" }, svgs[3]); qm.textContent = "?";
  }

  function figuresImage(root, set, idx) {
    root.className = "figs img";
    root.innerHTML = '<div class="sheet-top" role="img" aria-label="Figures A, B and C, and the missing figure D"></div>';
    root.firstChild.style.setProperty("--img", TA.sheetUrl(set, idx));
  }

  function options(root, set, idx, onPick) {
    root.innerHTML = "";
    root.style.setProperty("--img", TA.sheetUrl(set, idx));
    [0, 1, 2, 3].forEach(function (n) {
      var cell = document.createElement("div"); cell.className = "cell";
      cell.setAttribute("data-aoi", "option-" + (n + 1));
      var b = document.createElement("button"); b.className = "opt"; b.type = "button";
      b.setAttribute("role", "radio"); b.setAttribute("aria-checked", "false"); b.setAttribute("aria-label", "Option " + (n + 1));
      b.style.backgroundPosition = TA.optionCropPosition(n);
      var cap = document.createElement("div"); cap.className = "cap";
      cap.innerHTML = "<span><b>" + (n + 1) + '</b></span><span class="mk"></span>';
      b.onclick = function () {
        root.querySelectorAll(".opt").forEach(function (o) { o.setAttribute("aria-checked", o === b); });
        onPick(n + 1);
      };
      cell.appendChild(b); cell.appendChild(cap); root.appendChild(cell);
    });
  }

  function markOptions(root, choice, answer, reveal) {
    root.classList.add("done");
    root.querySelectorAll(".cell").forEach(function (cell, n) {
      var v = n + 1, b = cell.querySelector(".opt");
      if (v === choice) { b.classList.add(v === answer ? "good" : "bad"); cell.classList.add(v === answer ? "good" : "bad"); }
      if (reveal && v === answer && v !== choice) { b.classList.add("good"); cell.classList.add("good"); }
      if (reveal && v === answer) cell.querySelector(".mk").innerHTML = TA.icon("i-check", "sm") + "Answer";
    });
  }

  /* ---------- 3 · main puzzles with animated hints & gaze recording ---------- */
  function startTrial(n) {
    var set = SETS[STUDY.mainSet], idx = STUDY.mainQuestions[n], spec = TA.parseSpec(set.specs[idx]), cond = S.conditions[n];
    trial = {
      n: n + 1, set: STUDY.mainSet, idx: idx, condition: cond, orientation: orientation(), startedAt: new Date().toISOString(),
      answer: set.answers[idx], choice: null, correct: null, timeMs: null, effort: null,
      hintsAvailable: TA.hintsFor(spec).length, hintsUsed: 0, hintTimeMs: [], windowMs: [], firstHintMs: null, controls: {}, answerChanges: 0, events: []
    };
    S.trials[n] = trial; save();
    step = n;
    picked = null; tStart = performance.now();
    $("qEyebrow").textContent = "Puzzle " + (n + 1) + " of " + MAIN;
    if (cond === "animated") figuresSvg($("figs"), spec); else figuresImage($("figs"), set, idx);
    $("qopts").className = "opts4";
    options($("qopts"), set, idx, function (v) {
      if (picked != null && picked !== v) trial.answerChanges++;
      picked = v; logEvent("select", { v: v });
      $("qPickState").innerHTML = TA.icon("i-pointer", "sm") + "Option " + v + " selected";
      $("confirmBtn").disabled = false;
    });
    $("qPickState").innerHTML = TA.icon("i-pointer", "sm") + "Tap an option";
    $("confirmBtn").disabled = true;
    $("hTitle").textContent = cond === "animated" ? "Animated, one transformation at a time" : "Written, one transformation at a time";
    document.querySelector(".hpanel").className = "panel hpanel " + cond;

    if (player) player.destroy();
    player = new HintPlayer($("hintRoot"), { spec: spec, condition: cond, windows: STUDY.hintWindows, animSeconds: STUDY.animSeconds, onEvent: logEvent });
    setProgress("Puzzle " + (n + 1) + " of " + MAIN, cond);
    show("sQuestion");

    // Start recording eye gaze for this puzzle
    if (S && S.eyeTracking && window.GazeTracker) {
      GazeTracker.startRecording();
    }
  }

  function logEvent(type, data) {
    if (!trial) return;
    var ev = { t: Math.round(performance.now() - tStart), e: type };
    for (var k in data) ev[k] = data[k];
    trial.events.push(ev);
  }

  $("confirmBtn").onclick = function () {
    if (picked == null) return;

    // Stop and save gaze data for this puzzle
    if (S && S.eyeTracking && window.GazeTracker) {
      var gazeResult = GazeTracker.stopRecording();
      trial.gaze = gazeResult.samples;
      trial.fixations = gazeResult.fixations;
      trial.aoi = gazeResult.aoiMetrics;
      trial.boundaries = gazeResult.boundaries;
    }

    var stats = player.finish();
    trial.choice = picked; trial.correct = picked === trial.answer;
    trial.timeMs = Math.round(performance.now() - tStart);
    trial.hintsUsed = stats.hintsUsed; trial.hintTimeMs = stats.hintTimeMs; trial.windowMs = stats.windowMs;
    trial.firstHintMs = stats.firstHintMs; trial.controls = stats.controls;
    logEvent("confirm", { v: picked });
    save();

    markOptions($("qopts"), picked, trial.answer, STUDY.feedback);
    $("confirmBtn").disabled = true;

    // Advance directly to next puzzle or questionnaire
    setTimeout(function () {
      if (trial.n < MAIN) {
        startTrial(trial.n);
      } else {
        trial = null;
        effortScreen();
      }
    }, STUDY.feedback ? 1200 : 250);
  };

  /* ---------- 4.1 · Overall Mental Effort ---------- */
  function effortScreen() {
    step = MAIN;
    $("overallEffortScale").innerHTML = "";
    $("overallEffortScale").appendChild(
      Measures.scale("Overall mental effort", 9, Measures.EFFORT.lo, Measures.EFFORT.hi, S.overallEffort, function (val) {
        S.overallEffort = val;
        save();
        $("effortNext").disabled = false;
        $("effortMeta").innerHTML = TA.icon("i-check", "sm") + "Rating " + val + " of 9 selected";
      })
    );
    $("effortNext").disabled = S.overallEffort == null;
    setProgress("Survey 1 of 4", null);
    show("sEffort");
  }
  $("effortNext").onclick = function () { tlx(); };

  /* ---------- 4.2 · NASA-TLX Workload ---------- */
  function tlx() {
    step = MAIN + 1;
    S.tlx = {};
    var list = $("tlxList"); list.innerHTML = "";
    Measures.TLX.forEach(function (it) {
      var row = document.createElement("div"); row.className = "qitem";
      row.innerHTML = '<div class="qtext"><b>' + it.title + "</b><span>" + it.q + "</span></div>";
      row.appendChild(Measures.slider(it.title, it.lo, it.hi, function (v) { S.tlx[it.key] = v; save(); tlxCheck(); }));
      list.appendChild(row);
    });
    tlxCheck();
    setProgress("Survey 2 of 4", null);
    show("sTLX");
  }

  function tlxCheck() {
    var left = Measures.TLX.filter(function (it) { return S.tlx[it.key] == null; }).length;
    $("tlxLeft").textContent = left ? left + " left" : "All answered";
    $("tlxNext").disabled = left > 0;
  }
  $("tlxNext").onclick = function () { S.tlx.raw = Store.tlxRaw(S.tlx); save(); agency(); };

  /* ---------- 4.3 · Sense of Agency ---------- */
  function likertList(listId, items, n, lo, hi, store, check) {
    var list = $(listId); list.innerHTML = "";
    items.forEach(function (text, i) {
      var row = document.createElement("div"); row.className = "qitem";
      row.innerHTML = '<div class="qtext"><span class="qn">' + (i + 1) + "</span><span>" + text + "</span></div>";
      row.appendChild(Measures.scale(text, n, lo, hi, null, function (v) { store[i] = v; save(); check(); }));
      list.appendChild(row);
    });
    check();
  }

  function agency() {
    step = MAIN + 2;
    S.agency = { items: Measures.AGENCY.map(function () { return null; }), reverse: Measures.AGENCY.map(function (a) { return a.reverse; }), text: Measures.AGENCY.map(function (a) { return a.q; }) };
    likertList("agencyList", Measures.AGENCY.map(function (a) { return a.q; }), 7, Measures.AGENCY_LABELS[0], Measures.AGENCY_LABELS[1], S.agency.items, function () {
      var left = S.agency.items.filter(function (v) { return v == null; }).length;
      $("agencyLeft").textContent = left ? left + " left" : "All answered";
      $("agencyNext").disabled = left > 0;
    });
    setProgress("Survey 3 of 4", null);
    show("sAgency");
  }
  $("agencyNext").onclick = function () { S.agency.mean = Store.agencyMean(S.agency); save(); sus(); };

  /* ---------- 4.4 · System Usability Scale (SUS) ---------- */
  function sus() {
    step = MAIN + 3;
    S.sus = { items: Measures.SUS.map(function () { return null; }), score: null };
    likertList("susList", Measures.SUS, 5, Measures.SUS_LABELS[0], Measures.SUS_LABELS[1], S.sus.items, function () {
      var left = S.sus.items.filter(function (v) { return v == null; }).length;
      $("susLeft").textContent = left ? left + " left" : "All answered";
      $("susNext").disabled = left > 0;
    });
    setProgress("Survey 4 of 4", null);
    show("sSUS");
  }
  $("susNext").onclick = function () {
    S.sus.score = Store.susScore(S.sus.items);
    S.comments = $("comments").value.trim();
    S.completedAt = new Date().toISOString();
    save();
    done();
  };

  /* ---------- 6 · done (auto-export results.txt & summary card) ---------- */
  function done() {
    step = TOTAL;
    setProgress("Complete", null);
    window.removeEventListener("beforeunload", guard);
    show("sDone");

    // Automatically trigger results.txt download upon session completion!
    try {
      Store.downloadResultsTxt(S);
    } catch (e) {
      console.warn("Auto-download results.txt error:", e);
    }

    renderDoneScreen();
  }

  function renderDoneScreen() {
    var dlResultsBtn = $("dlResultsBtn");
    if (dlResultsBtn) {
      dlResultsBtn.onclick = function () { Store.downloadResultsTxt(S); };
    }
    var dlJsonBtn = $("dlJsonBtn");
    if (dlJsonBtn) {
      dlJsonBtn.onclick = function () { Store.download("session-" + S.id + ".json", JSON.stringify(S, null, 2), "application/json"); };
    }

    var card = $("doneSummaryCard");
    if (card && S) {
      var m = Store.summarise(S);
      var totals = { figA: 0, figB: 0, figC: 0, chooseD: 0, hints: 0, other: 0 };
      (S.trials || []).forEach(function (t) {
        if (!t.aoi) return;
        if (t.aoi.figA) totals.figA += (t.aoi.figA.dwellTimeMs || 0);
        if (t.aoi.figB) totals.figB += (t.aoi.figB.dwellTimeMs || 0);
        if (t.aoi.figC) totals.figC += (t.aoi.figC.dwellTimeMs || 0);
        if (t.aoi.chooseD) totals.chooseD += (t.aoi.chooseD.dwellTimeMs || 0);
        if (t.aoi.hints) totals.hints += (t.aoi.hints.dwellTimeMs || 0);
        if (t.aoi.other) totals.other += (t.aoi.other.dwellTimeMs || 0);
      });
      var totSec = (totals.figA + totals.figB + totals.figC + totals.chooseD + totals.hints + totals.other) / 1000;
      function p(ms) { return totSec > 0 ? Math.round((ms / 1000 / totSec) * 100) + "%" : "0%"; }

      card.innerHTML =
        '<div class="eyebrow" style="margin-bottom:8px;">Session Eye Gaze & Progress Summary</div>' +
        '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;text-align:center;margin-bottom:16px;">' +
          '<div style="background:var(--panel);padding:10px;border-radius:10px;border:1px solid var(--line);"><div style="font-size:1.3rem;font-weight:700;color:var(--accent);">' + m.mainDone + '/10</div><div style="font-size:0.75rem;color:var(--muted);">Answered</div></div>' +
          '<div style="background:var(--panel);padding:10px;border-radius:10px;border:1px solid var(--line);"><div style="font-size:1.3rem;font-weight:700;color:var(--ok);">' + (m.accuracy != null ? (m.accuracy * 100).toFixed(0) + "%" : "–") + '</div><div style="font-size:0.75rem;color:var(--muted);">Accuracy</div></div>' +
          '<div style="background:var(--panel);padding:10px;border-radius:10px;border:1px solid var(--line);"><div style="font-size:1.3rem;font-weight:700;color:var(--ink);">' + (m.meanTimeS != null ? m.meanTimeS.toFixed(1) + "s" : "–") + '</div><div style="font-size:0.75rem;color:var(--muted);">Mean Time</div></div>' +
        '</div>' +
        '<div class="lbl" style="margin-bottom:8px;font-size:0.8rem;">Gaze Attention by Mapped Boundary:</div>' +
        '<div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;font-size:0.8rem;">' +
          '<div style="display:flex;align-items:center;gap:6px;"><span style="width:10px;height:10px;border-radius:50%;background:#ff4055;flex:none;"></span>Figure A [Red]: <b>' + (totals.figA / 1000).toFixed(1) + 's (' + p(totals.figA) + ')</b></div>' +
          '<div style="display:flex;align-items:center;gap:6px;"><span style="width:10px;height:10px;border-radius:50%;background:#3b82f6;flex:none;"></span>Figure B [Blue]: <b>' + (totals.figB / 1000).toFixed(1) + 's (' + p(totals.figB) + ')</b></div>' +
          '<div style="display:flex;align-items:center;gap:6px;"><span style="width:10px;height:10px;border-radius:50%;background:#ff9800;flex:none;"></span>Figure C [Orange]: <b>' + (totals.figC / 1000).toFixed(1) + 's (' + p(totals.figC) + ')</b></div>' +
          '<div style="display:flex;align-items:center;gap:6px;"><span style="width:10px;height:10px;border-radius:50%;background:#facc15;flex:none;"></span>Choose D [Yellow]: <b>' + (totals.chooseD / 1000).toFixed(1) + 's (' + p(totals.chooseD) + ')</b></div>' +
          '<div style="display:flex;align-items:center;gap:6px;grid-column:span 2;"><span style="width:10px;height:10px;border-radius:50%;background:#22c55e;flex:none;"></span>Hints Panel [Green]: <b>' + (totals.hints / 1000).toFixed(1) + 's (' + p(totals.hints) + ')</b></div>' +
        '</div>';
    }
  }

  $("againBtn").onclick = function () { location.reload(); };

  /* Keyboard shortcuts: 1-4 pick an option, Enter confirms */
  document.addEventListener("keydown", function (e) {
    if (/input|textarea|select/i.test(e.target.tagName)) return;
    var onQ = !$("sQuestion").hidden;
    if (!onQ) return;
    var root = $("qopts");
    if (e.key >= "1" && e.key <= "4" && !root.classList.contains("done")) {
      var b = root.querySelectorAll(".opt")[+e.key - 1];
      if (b) b.click();
    }
    if (e.key === "Enter") {
      var c = $("confirmBtn");
      if (!c.disabled) { e.preventDefault(); c.click(); }
    }
  });
})();
