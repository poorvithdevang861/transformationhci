/* Study flow: welcome -> how hints work -> main puzzles with timed hints -> transfer test -> NASA-TLX -> agency -> SUS -> done.
   Relies on TA (engine.js), SETS (problems.js), STUDY (config.js), Store, Measures and HintPlayer. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  [document.querySelector(".shell"), $("afterDlg")].forEach(function (root) {
    root.innerHTML = root.innerHTML.replace(/\{icon-([\w-]+)\}/g, function (_, id) { return TA.icon("i-" + id); });
  });

  var S = null, mode = null, device = detectDevice();
  var trial = null, player = null, picked = null, tStart = 0, step = 0;
  var MAIN = STUDY.mainQuestions.length, TRANSFER = STUDY.transferQuestions.length, TOTAL = MAIN + TRANSFER + 3;

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
  /* Randomise: half static, half animated (odd counts split at random), in a shuffled order */
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
  function save() { Store.save(S); }

  /* ---------- 1 · welcome ---------- */
  $("nMain").textContent = MAIN + (MAIN === 1 ? " puzzle" : " puzzles") + " with hints";
  $("nTransfer").textContent = TRANSFER + (TRANSFER === 1 ? " new puzzle" : " new puzzles") + ", no hints";
  $("stepTransfer").hidden = !TRANSFER;
  $("tlxIntro").textContent = "Think about the " + MAIN + " puzzles with hints. Drag each slider.";
  $("pid").value = newId();
  function paintDevice() {
    document.querySelectorAll("#deviceSeg button").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.device === device); });
  }
  paintDevice();
  $("deviceSeg").addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) { device = b.dataset.device; paintDevice(); } });
  document.querySelector(".modes").addEventListener("click", function (e) {
    var b = e.target.closest(".mode"); if (!b) return;
    mode = b.dataset.mode;
    document.querySelectorAll(".mode").forEach(function (m) { m.setAttribute("aria-checked", m === b); });
    canStart();
  });
  function canStart() { $("startBtn").disabled = !(mode && $("consent").checked && $("pid").value.trim()); }
  $("consent").addEventListener("change", canStart);
  $("pid").addEventListener("input", canStart);

  $("startBtn").onclick = function () {
    var id = $("pid").value.trim();
    S = {
      id: id, createdAt: new Date().toISOString(), completedAt: null, mode: mode, consent: true,
      device: { type: device, detected: detectDevice(), w: screen.width, h: screen.height, vw: innerWidth, vh: innerHeight, touch: navigator.maxTouchPoints > 0, ua: navigator.userAgent },
      config: JSON.parse(JSON.stringify(STUDY)),
      conditions: conditionsFor(mode, MAIN, id),
      trials: [], transfer: [], tlx: null, agency: null, sus: null, comments: ""
    };
    save();
    window.addEventListener("beforeunload", guard);
    intro();
  };
  function guard(e) { if (S && !S.completedAt) { e.preventDefault(); e.returnValue = ""; } }

  /* ---------- 2 · how hints work ---------- */
  function intro() {
    var w = STUDY.hintWindows[0];
    var common = [
      ["i-bulb", "Stuck? Tap <b>Show hint</b>. Each hint shows <b>one transformation</b>, in order."],
      ["i-clock", "Each hint has a time window (about " + w + " s). When it ends, the next hint appears. The timeline marks T1, T2, T3…"],
      ["i-check", "Pick D and <b>confirm</b>. After each puzzle you rate how much effort it took."]
    ];
    var ctrl = {
      static: ["i-text", "Hints are written steps. You can <b>pause the timer</b>, go <b>back</b> or <b>skip ahead</b>."],
      animation: ["i-anim", "Hints animate on figure A. Use <b>play / pause</b>, <b>replay</b>, <b>previous / next</b> and <b>speed</b>."],
      randomise: ["i-shuffle", "Some puzzles have <b>text hints</b>, others <b>animated hints</b>. The badge at the top tells you which."]
    }[mode];
    $("introTitle").textContent = { static: "Text hints, one step at a time", animation: "Animated hints, one step at a time", randomise: "A mix of text and animated hints" }[mode];
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
      return '<div class="fig' + (L === "B" ? " target" : L === "D" ? " answer" : "") + '"><svg class="box" viewBox="0 0 100 100" role="img" aria-label="Figure ' + L + '"></svg><span class="flab">' + L + "</span></div>";
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

  /* ---------- 3 · main puzzles ---------- */
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
  }
  function logEvent(type, data) {
    if (!trial) return;
    var ev = { t: Math.round(performance.now() - tStart), e: type };
    for (var k in data) ev[k] = data[k];
    trial.events.push(ev);
  }
  $("confirmBtn").onclick = function () {
    if (picked == null) return;
    var stats = player.finish();
    trial.choice = picked; trial.correct = picked === trial.answer;
    trial.timeMs = Math.round(performance.now() - tStart);
    trial.hintsUsed = stats.hintsUsed; trial.hintTimeMs = stats.hintTimeMs; trial.windowMs = stats.windowMs;
    trial.firstHintMs = stats.firstHintMs; trial.controls = stats.controls;
    logEvent("confirm", { v: picked });
    save();
    markOptions($("qopts"), picked, trial.answer, STUDY.feedback);
    $("confirmBtn").disabled = true;
    after();
  };

  function after() {
    var v = $("verdict");
    if (STUDY.feedback) {
      v.className = "verdict " + (trial.correct ? "ok" : "bad");
      v.innerHTML = TA.icon(trial.correct ? "i-check" : "i-x") + "<div><b>" + (trial.correct ? "Correct" : "Not quite") + "</b><span>" +
        (trial.correct ? "Option " + trial.answer + " completes the pattern." : "The answer was option " + trial.answer + ".") + "</span></div>";
    } else {
      v.className = "verdict";
      v.innerHTML = TA.icon("i-check") + "<div><b>Answer saved</b><span>Option " + trial.choice + ".</span></div>";
    }
    $("afterTitle").textContent = Measures.EFFORT.q;
    $("effortScale").innerHTML = "";
    $("effortScale").appendChild(Measures.scale("Mental effort", 9, Measures.EFFORT.lo, Measures.EFFORT.hi, null, function (val) {
      trial.effort = val; save();
      $("afterNext").disabled = false;
    }));
    $("afterNext").disabled = true;
    $("afterNext").innerHTML = (trial.n < MAIN ? "Next puzzle" : "Continue") + TA.icon("i-arrow");
    $("afterMeta").textContent = "Puzzle " + trial.n + " of " + MAIN;
    $("afterDlg").showModal();
  }
  $("afterDlg").addEventListener("cancel", function (e) { e.preventDefault(); });
  $("afterNext").onclick = function () {
    $("afterDlg").close();
    if (trial.n < MAIN) startTrial(trial.n);
    else if (TRANSFER) { trial = null; step = MAIN; setProgress("Part 2", null); show("sTransferIntro"); }
    else { trial = null; tlx(); }
  };

  /* ---------- 4 · transfer test ---------- */
  var tr = null, tPicked = null, tPhase = "choose", tIds = [];
  $("transferBtn").onclick = function () { startTransfer(0); };
  function startTransfer(k) {
    var set = SETS[STUDY.transferSet], idx = STUDY.transferQuestions[k], spec = TA.parseSpec(set.specs[idx]);
    tr = { n: k + 1, set: STUDY.transferSet, idx: idx, orientation: orientation(), startedAt: new Date().toISOString(), answer: set.answers[idx], choice: null, correct: null, timeMs: null, identify: [], spec: set.specs[idx] };
    S.transfer[k] = tr; save();
    step = MAIN + k;
    tPicked = null; tPhase = "choose"; tStart = performance.now();
    $("tEyebrow").textContent = "New puzzle " + (k + 1) + " of " + TRANSFER + " · no hints";
    $("tTitle").textContent = "Which figure completes A : B :: C : ?";
    figuresImage($("tfigs"), set, idx);
    $("topts").className = "opts4";
    options($("topts"), set, idx, function (v) {
      tPicked = v;
      $("tPickState").innerHTML = TA.icon("i-pointer", "sm") + "Option " + v + " selected";
      $("tConfirm").disabled = false;
    });
    $("tChoose").hidden = false; $("tIdentify").hidden = true;
    $("tPickState").innerHTML = TA.icon("i-pointer", "sm") + "Tap an option";
    $("tConfirm").innerHTML = TA.icon("i-check") + "Confirm answer";
    $("tConfirm").disabled = true;
    tIds = identifyPrompts(spec, set.specs[idx]);
    setProgress("New puzzle " + (k + 1) + " of " + TRANSFER, null);
    show("sTransfer");
  }
  /* one "what happened?" prompt per transformation; three distractors of the same kind (move vs fill) */
  function identifyPrompts(spec, seed) {
    var rnd = seeded(S.id + "|" + seed), moves = Object.keys(TA.OPS).filter(function (k) { return k !== "none"; });
    return TA.hintsFor(spec).map(function (h) {
      var truth = TA.opKey(h.op), pool;
      if (h.op.type === "fill") pool = Object.keys(TA.COLORS).map(function (c) { return "fill(" + c + ")"; });
      else pool = moves.slice();
      pool = shuffle(pool.filter(function (k) { return k !== truth; }), rnd).slice(0, 3);
      return { slot: h.slot, shape: h.shape, truth: truth, choices: shuffle(pool.concat([truth]), rnd), answer: null };
    });
  }
  function paintIdentify() {
    $("tIdentify").innerHTML = '<div class="lbl">What happened from A to B?</div>' + tIds.map(function (p, i) {
      return '<div class="idq"><div class="idq-h">' + TA.shapeSvg(p.shape) + "<span><b>" + (p.slot === 0 ? "Left shape" : "Right shape") + "</b> (" + p.shape + ")</span></div>" +
        '<div class="idq-opts" role="radiogroup" aria-label="' + (p.slot === 0 ? "Left" : "Right") + ' shape transformation">' + p.choices.map(function (c) {
          var op = TA.parseOp(c);
          return '<button type="button" role="radio" data-i="' + i + '" data-v="' + c + '" aria-checked="' + (p.answer === c) + '">' + TA.opIcon(op) + "<span>" + TA.opName(op) + "</span></button>";
        }).join("") + "</div></div>";
    }).join("");
  }
  $("tIdentify").addEventListener("click", function (e) {
    var b = e.target.closest("button[data-i]"); if (!b) return;
    tIds[+b.dataset.i].answer = b.dataset.v;
    paintIdentify();
    var left = tIds.filter(function (p) { return !p.answer; }).length;
    $("tPickState").innerHTML = left ? TA.icon("i-pointer", "sm") + left + " left to answer" : TA.icon("i-check", "sm") + "All answered";
    $("tConfirm").disabled = left > 0;
  });
  $("tConfirm").onclick = function () {
    if (tPhase === "choose") {
      tr.choice = tPicked; tr.correct = tPicked === tr.answer; tr.timeMs = Math.round(performance.now() - tStart);
      save();
      $("topts").classList.add("done");
      if (tIds.length) {
        tPhase = "identify";
        $("tChoose").hidden = true; $("tIdentify").hidden = false;
        $("tTitle").textContent = "Name the transformation";
        paintIdentify();
        $("tPickState").innerHTML = TA.icon("i-pointer", "sm") + tIds.length + " left to answer";
        $("tConfirm").innerHTML = (tr.n < TRANSFER ? "Next puzzle" : "Continue") + TA.icon("i-arrow");
        $("tConfirm").disabled = true;
        return;
      }
    }
    tr.identify = tIds.map(function (p) { return { slot: p.slot, shape: p.shape, truth: p.truth, answer: p.answer, choices: p.choices, correct: p.answer === p.truth }; });
    tr.identifyMs = Math.round(performance.now() - tStart) - tr.timeMs;
    save();
    if (tr.n < TRANSFER) startTransfer(tr.n); else tlx();
  };

  /* ---------- 5 · questionnaires ---------- */
  function tlx() {
    step = MAIN + TRANSFER;
    S.tlx = {};
    var list = $("tlxList"); list.innerHTML = "";
    Measures.TLX.forEach(function (it) {
      var row = document.createElement("div"); row.className = "qitem";
      row.innerHTML = '<div class="qtext"><b>' + it.title + "</b><span>" + it.q + "</span></div>";
      row.appendChild(Measures.slider(it.title, it.lo, it.hi, function (v) { S.tlx[it.key] = v; save(); tlxCheck(); }));
      list.appendChild(row);
    });
    tlxCheck();
    setProgress("Questionnaire 1 of 3", null);
    show("sTLX");
  }
  function tlxCheck() {
    var left = Measures.TLX.filter(function (it) { return S.tlx[it.key] == null; }).length;
    $("tlxLeft").textContent = left ? left + " left" : "All answered";
    $("tlxNext").disabled = left > 0;
  }
  $("tlxNext").onclick = function () { S.tlx.raw = Store.tlxRaw(S.tlx); save(); agency(); };

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
    step = MAIN + TRANSFER + 1;
    S.agency = { items: Measures.AGENCY.map(function () { return null; }), reverse: Measures.AGENCY.map(function (a) { return a.reverse; }), text: Measures.AGENCY.map(function (a) { return a.q; }) };
    likertList("agencyList", Measures.AGENCY.map(function (a) { return a.q; }), 7, Measures.AGENCY_LABELS[0], Measures.AGENCY_LABELS[1], S.agency.items, function () {
      var left = S.agency.items.filter(function (v) { return v == null; }).length;
      $("agencyLeft").textContent = left ? left + " left" : "All answered";
      $("agencyNext").disabled = left > 0;
    });
    setProgress("Questionnaire 2 of 3", null);
    show("sAgency");
  }
  $("agencyNext").onclick = function () { S.agency.mean = Store.agencyMean(S.agency); save(); sus(); };

  function sus() {
    step = MAIN + TRANSFER + 2;
    S.sus = { items: Measures.SUS.map(function () { return null; }), score: null };
    likertList("susList", Measures.SUS, 5, Measures.SUS_LABELS[0], Measures.SUS_LABELS[1], S.sus.items, function () {
      var left = S.sus.items.filter(function (v) { return v == null; }).length;
      $("susLeft").textContent = left ? left + " left" : "All answered";
      $("susNext").disabled = left > 0;
    });
    setProgress("Questionnaire 3 of 3", null);
    show("sSUS");
  }
  $("susNext").onclick = function () {
    S.sus.score = Store.susScore(S.sus.items);
    S.comments = $("comments").value.trim();
    S.completedAt = new Date().toISOString();
    save();
    done();
  };

  /* ---------- 6 · done ---------- */
  function done() {
    step = TOTAL;
    var m = Store.summarise(S);
    function stat(label, value) { return '<div class="stat"><b>' + value + "</b><span>" + label + "</span></div>"; }
    $("doneStats").innerHTML =
      stat("puzzles correct", S.trials.filter(function (t) { return t.correct; }).length + " / " + MAIN) +
      stat("average time", m.meanTimeS == null ? "–" : Math.round(m.meanTimeS) + " s") +
      stat("hints per puzzle", m.meanHints == null ? "–" : m.meanHints.toFixed(1)) +
      stat("new puzzles correct", S.transfer.filter(function (t) { return t.correct; }).length + " / " + TRANSFER);
    setProgress("Done", null);
    window.removeEventListener("beforeunload", guard);
    show("sDone");
  }
  $("dlMine").onclick = function () { Store.download("ta-" + S.id + ".json", JSON.stringify(S, null, 2), "application/json"); };
  $("againBtn").onclick = function () { location.reload(); };

  /* keys: 1-4 pick an option, Enter confirms */
  document.addEventListener("keydown", function (e) {
    if ($("afterDlg").open || /input|textarea|select/i.test(e.target.tagName)) return;
    var onQ = !$("sQuestion").hidden, onT = !$("sTransfer").hidden && tPhase === "choose";
    if (!onQ && !onT) return;
    var root = onQ ? $("qopts") : $("topts");
    if (e.key >= "1" && e.key <= "4" && !root.classList.contains("done")) { var b = root.querySelectorAll(".opt")[+e.key - 1]; if (b) b.click(); }
    if (e.key === "Enter") { var c = onQ ? $("confirmBtn") : $("tConfirm"); if (!c.disabled) { e.preventDefault(); c.click(); } }
  });
})();
