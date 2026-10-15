/* Timed hints. Each transformation in the question is one hint, shown inside its own time window T1..Tn.
   When the newest hint's window runs out the next one appears; the participant can pause, replay, step back or skip ahead.
   Animated hints play the transformation on figure A; static hints describe the same transformation in words.
   new HintPlayer(root, { spec, condition: "animated" | "static", windows: [s...], animSeconds, onEvent(type, data) }) */
function HintPlayer(root, o) {
  var hints = TA.hintsFor(o.spec), n = hints.length, animated = o.condition === "animated";
  var front = -1, view = -1, paused = false, done = false, speed = 1, raf = 0, last = 0;
  var elapsed = hints.map(function () { return 0; }), dwell = hints.map(function () { return 0; });
  var x = 0, hold = 0, firstHintMs = null, t0 = performance.now();
  var controls = { play: 0, pause: 0, replay: 0, prev: 0, next: 0, jump: 0, speed: 0, auto: 0 };
  var fig, goal, stageSvg;

  function T(k) { return hintWindow({ hintWindows: o.windows }, k) * 1000; }
  function side(s) { return s === 0 ? "Left shape" : "Right shape"; }
  function emit(type, data) { if (o.onEvent) o.onEvent(type, data || {}); }

  /* ---------- markup ---------- */
  root.innerHTML =
    '<div class="hint-empty">' +
      '<div class="hint-badge">' + TA.icon("i-bulb") + "</div>" +
      '<div class="hint-copy"><b>' + (n ? n + (n === 1 ? " hint" : " hints") + " available" : "No hints for this question") + "</b>" +
      "<span>" + (n ? "Each hint shows one transformation for up to " + Math.round(T(0) / 1000) + " s." : "") + "</span></div>" +
      (n ? '<button class="ibtn tb hintgo" data-act="start">' + TA.icon("i-bulb") + "Show hint 1</button>" : "") +
    "</div>" +
    '<div class="hint-live" hidden>' +
      '<div class="hint-head">' +
        '<div><div class="eyebrow hstep"></div><div class="hname"></div></div>' +
        '<div class="hleft meta" aria-live="off"></div>' +
      "</div>" +
      (animated
        ? '<div class="hint-stage"><div class="hfig"><svg class="box" viewBox="0 0 100 100" role="img" aria-label="Figure A, animated hint"></svg><span class="lbl">A</span></div>' +
          TA.icon("i-arrow") + '<div class="hfig goal"><svg class="box" viewBox="0 0 100 100" role="img" aria-label="Figure B, the goal"></svg><span class="lbl">Goal · B</span></div></div>'
        : '<div class="hint-text"><p class="hsay"></p><p class="hwhich meta"></p></div>') +
      '<div class="tl" role="group" aria-label="Hint timeline"></div>' +
      '<div class="hint-ctrl">' +
        '<div class="seg-btns">' +
          '<button class="ibtn" data-act="prev" aria-label="Previous hint">' + TA.icon("i-prev") + "</button>" +
          (animated
            ? '<button class="ibtn tb primary" data-act="toggle"><svg class="i" aria-hidden="true"><use class="pp-icon" href="#i-pause"/></svg><span class="pp-txt">Pause</span></button>' +
              '<button class="ibtn" data-act="replay" aria-label="Replay hint">' + TA.icon("i-replay") + "</button>"
            : '<button class="ibtn tb" data-act="toggle"><svg class="i" aria-hidden="true"><use class="pp-icon" href="#i-pause"/></svg><span class="pp-txt">Pause timer</span></button>') +
          '<button class="ibtn tb" data-act="next"><span class="nx-txt">Next hint</span>' + TA.icon("i-s1") + "</button>" +
        "</div>" +
        (animated
          ? '<div class="seg speed" role="group" aria-label="Speed">' +
              '<button class="t" data-speed="0.5" aria-pressed="false" aria-label="Half speed">0.5×</button>' +
              '<button class="t" data-speed="1" aria-pressed="true" aria-label="Normal speed">1×</button>' +
              '<button class="t" data-speed="1.5" aria-pressed="false" aria-label="Fast">1.5×</button></div>'
          : "") +
      "</div>" +
    "</div>";
  var q = function (s) { return root.querySelector(s); };

  if (animated) {
    stageSvg = q(".hint-stage .hfig:not(.goal) svg");
    fig = TA.figure(stageSvg, o.spec.A, { ghost: true });
    goal = TA.figure(q(".hint-stage .goal svg"), o.spec.A);
    [0, 1].forEach(function (s) { goal.place(s, TA.paramsAt(TA.shapeOps(o.spec, s), 1)); });
  }
  q(".tl").innerHTML = hints.map(function (h, k) {
    return '<button class="seg-t" data-k="' + k + '" style="flex-grow:' + T(k) + '" disabled aria-label="Hint ' + (k + 1) + '">' +
      '<span class="bar"><i></i></span><span class="tl-l">T' + (k + 1) + "<em>" + Math.round(T(k) / 1000) + "s</em></span></button>";
  }).join("");

  /* ---------- state changes ---------- */
  function reveal(k, how) {
    if (k >= n) return;
    if (front < 0) { firstHintMs = performance.now() - t0; q(".hint-empty").hidden = true; q(".hint-live").hidden = false; loop(); }
    front = Math.max(front, k);
    show(k, how);
  }
  function show(k, how) {
    view = k; x = 0; hold = 250;
    if (how === "auto") controls.auto++;
    emit("hint", { k: k + 1, how: how });
    paint();
  }
  function setPaused(p, how) {
    paused = p;
    if (how) { controls[p ? "pause" : "play"]++; emit(p ? "pause" : "play", { k: view + 1 }); }
    paint();
  }

  /* ---------- per-frame clock: window time for the newest hint, dwell time for the one on screen, animation ---------- */
  function loop() {
    last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(function tick(now) {
      var dt = now - last; last = now;
      if (dt > 1000 || document.hidden) dt = 0;
      if (!done && view >= 0) {
        dwell[view] += dt;
        if (!paused && view === front && elapsed[front] < T(front)) {
          elapsed[front] += dt;
          if (elapsed[front] >= T(front)) { elapsed[front] = T(front); if (front < n - 1) reveal(front + 1, "auto"); }
        }
        if (animated && !paused) {
          if (hold > 0) { hold -= dt * speed; if (hold <= 0 && x >= 1) { x = 0; hold = 350; } }
          else { x += dt * speed / (o.animSeconds * 1000); if (x >= 1) { x = 1; hold = 900; } }
        }
        paintClock();
      }
      raf = requestAnimationFrame(tick);
    });
  }

  /* ---------- painting ---------- */
  function paint() {
    if (view < 0) return;
    var h = hints[view];
    q(".hstep").textContent = "Hint " + (view + 1) + " of " + n + " · T" + (view + 1);
    q(".hname").innerHTML = TA.opIcon(h.op) + "<span><b>" + side(h.slot) + "</b> · " + TA.opName(h.op) + "</span>";
    if (!animated) {
      q(".hsay").innerHTML = "<b>" + side(h.slot) + " (" + h.shape + "):</b> " + TA.opSay(h.op);
      q(".hwhich").textContent = h.step > 0 ? "This happens after the earlier change to the same shape." : "";
    }
    q('[data-act="prev"]').disabled = view === 0;
    q('[data-act="next"]').disabled = view >= n - 1;
    q(".nx-txt").textContent = view >= n - 1 ? "Last hint" : "Hint " + (view + 2);
    q('[data-act="next"]').setAttribute("aria-label", view >= n - 1 ? "This is the last hint" : (view < front ? "Go to hint " : "Show hint ") + (view + 2) + " now");
    q(".pp-icon").setAttribute("href", paused ? "#i-play" : "#i-pause");
    q(".pp-txt").textContent = animated ? (paused ? "Play" : "Pause") : (paused ? "Resume timer" : "Pause timer");
    Array.prototype.forEach.call(q(".tl").children, function (b, k) {
      b.disabled = k > front;
      b.classList.toggle("on", k === view);
      b.setAttribute("aria-current", k === view ? "step" : "false");
    });
    paintClock();
  }
  function paintClock() {
    Array.prototype.forEach.call(q(".tl").children, function (b, k) { b.querySelector(".bar i").style.width = (elapsed[k] / T(k) * 100) + "%"; });
    var left = q(".hleft");
    if (view === front && elapsed[front] < T(front)) {
      var s = Math.ceil((T(front) - elapsed[front]) / 1000);
      left.innerHTML = TA.icon("i-clock", "sm") + (paused ? "Paused · " : "") + s + " s" + (front < n - 1 ? " to next hint" : " left");
    } else left.innerHTML = view < front ? TA.icon("i-prev", "sm") + "Earlier hint" : TA.icon("i-check", "sm") + "All hints shown";
    if (animated) paintStage();
  }
  function paintStage() {
    var h = hints[view], g = TA.ease(x);
    [0, 1].forEach(function (s) {
      var ops = TA.shapeOps(o.spec, s);
      var prog = ops.map(function (op, j) {
        var at = hints.findIndex(function (hh) { return hh.step === j && hh.slot === s; });
        if (at < 0) return 0;
        return at < view ? 1 : at === view ? g : 0;
      });
      fig.place(s, TA.paramsWith(ops, prog), s === h.slot ? 1 : 0.35);
      fig.ghost(s, s === h.slot && g > 0.01 && g < 0.99);
    });
  }

  /* ---------- controls ---------- */
  root.addEventListener("click", function (e) {
    var b = e.target.closest("button"); if (!b || b.disabled) return;
    var act = b.dataset.act;
    if (act === "start") reveal(0, "request");
    else if (act === "prev" && view > 0) { controls.prev++; emit("prev", { to: view }); show(view - 1, "prev"); }
    else if (act === "next" && view < n - 1) {
      controls.next++; emit("next", { to: view + 2 });
      if (view < front) show(view + 1, "next"); else reveal(view + 1, "skip");
    }
    else if (act === "toggle") setPaused(!paused, true);
    else if (act === "replay") { controls.replay++; emit("replay", { k: view + 1 }); x = 0; hold = 250; if (paused) setPaused(false); }
    else if (b.dataset.speed) {
      speed = +b.dataset.speed; controls.speed++; emit("speed", { v: speed });
      Array.prototype.forEach.call(b.parentNode.children, function (c) { c.setAttribute("aria-pressed", c === b); });
    }
    else if (b.dataset.k != null && +b.dataset.k !== view) { controls.jump++; emit("jump", { to: +b.dataset.k + 1 }); show(+b.dataset.k, "jump"); }
  });

  return {
    count: n,
    finish: function () {
      done = true; cancelAnimationFrame(raf);
      root.querySelectorAll("button").forEach(function (b) { b.disabled = true; });
      return { hintsUsed: front + 1, hintTimeMs: dwell.map(Math.round), windowMs: elapsed.map(Math.round), firstHintMs: firstHintMs == null ? null : Math.round(firstHintMs), controls: controls };
    },
    destroy: function () { done = true; cancelAnimationFrame(raf); }
  };
}
