/* Relies on SETS from problems.js, loaded first. */
(function () {
  /* ---------- shapes (unit size, centred on 0,0) ---------- */
  function poly(pts) { return "M" + pts.map(function (p) { return p[0].toFixed(3) + " " + p[1].toFixed(3); }).join("L") + "Z"; }
  function reg(n) { var a = []; for (var i = 0; i < n; i++) { var t = -Math.PI / 2 + i * 2 * Math.PI / n; a.push([Math.cos(t), Math.sin(t)]); } return poly(a); }
  function star() { var a = []; for (var i = 0; i < 10; i++) { var r = i % 2 ? 0.45 : 1.1, t = -Math.PI / 2 + i * Math.PI / 5; a.push([r * Math.cos(t), r * Math.sin(t)]); } return poly(a); }
  var SHAPES = {
    circle: "M1 0A1 1 0 1 1 -1 0A1 1 0 1 1 1 0Z",
    ellipse: "M1.3 0A1.3 .65 0 1 1 -1.3 0A1.3 .65 0 1 1 1.3 0Z",
    diamond: "M0 -1.25L.7 0L0 1.25L-.7 0Z",
    heart: "M0 .95C-1.3 -.05 -.85 -1 0 -.35C.85 -1 1.3 -.05 0 .95Z",
    star: star(),
    triangle: "M0 -1L1.05 .8L-1.05 .8Z",
    rectangle: "M-1.25 -.65H1.25V.65H-1.25Z",
    pentagon: reg(5),
    hexagon: reg(6),
    plus: "M-.33 -1H.33V-.33H1V.33H.33V1H-.33V.33H-1V-.33H-.33Z",
    arrow: "M-1.1 -.3H.2V-.8L1.1 0L.2 .8V.3H-1.1Z"
  };
  var COLORS = { yellow: "#f2c200", blue: "#2f6fe0", green: "#2e9e5b", red: "#d84a3a", orange: "#f08a1c", purple: "#8a52c9", pink: "#e0609a", black: "#222222" };

  /* ---------- operations ---------- */
  var OPS = {
    rotate_counterclockwise: { name: "Rotate counterclockwise" },
    rotate_clockwise: { name: "Rotate clockwise" },
    reflect: { name: "Reflect" },
    scale_up: { name: "Scale up" },
    scale_down: { name: "Scale down" },
    shear_horizontal: { name: "Shear horizontal" },
    shear_vertical: { name: "Shear vertical" },
    none: { name: "No change" }
  };
  function parseOp(s) {
    s = s.trim();
    var m = s.match(/^fill\((\w+)\)$/);
    if (m) {
      if (m[1] === "empty") return { type: "none" };
      if (!COLORS[m[1]]) throw new Error("Unknown colour: " + m[1]);
      return { type: "fill", color: m[1] };
    }
    if (!OPS[s] || s === "none") throw new Error("Unknown move: " + s);
    return { type: s };
  }
  function opName(o) { return o.type === "fill" ? "Fill " + o.color : OPS[o.type].name; }
  var SHORT = { rotate_counterclockwise: "Turn left", rotate_clockwise: "Turn right", reflect: "Flip", scale_up: "Grow", scale_down: "Shrink", shear_horizontal: "Slant sideways", shear_vertical: "Slant up", none: "No change" };
  function opShort(o) { return o.type === "fill" ? "Fill " + o.color : SHORT[o.type]; }

  /* steps[k] = [left op, right op] for transform(k+1); steps run one after another */
  function parseSpec(line) {
    var m = line.match(/A=\((\w+),\s*(\w+)\).*?C=\((\w+),\s*(\w+)\)(.*)$/);
    if (!m) throw new Error("Expected: Problem N: A=(shape,shape), C=(shape,shape), transform1=(move,move)");
    var steps = [], re = /transform(\d)=\(((?:[^()]|\([^()]*\))*)\)/g, t;
    while ((t = re.exec(m[5]))) {
      if (+t[1] !== steps.length + 1) throw new Error("Expected transform" + (steps.length + 1) + " next.");
      var parts = t[2].split(/,(?![^(]*\))/);
      if (parts.length !== 2) throw new Error("transform" + t[1] + " needs exactly two moves, one per shape.");
      steps.push([parseOp(parts[0]), parseOp(parts[1])]);
    }
    if (!steps.length) throw new Error("Add transform1=(move,move).");
    [m[1], m[2], m[3], m[4]].forEach(function (s) { if (!SHAPES[s]) throw new Error("Unknown shape: " + s); });
    return { A: [m[1], m[2]], C: [m[3], m[4]], steps: steps };
  }
  function shapeOps(sp, s) { return sp.steps.map(function (st) { return st[s]; }); }

  /* params at progress g (0..1) for one op */
  function params(op, g) {
    var p = { rot: 0, sx: 1, sy: 1, kx: 0, ky: 0, ry: 0, f: 0, color: null };
    switch (op.type) {
      case "rotate_counterclockwise": p.rot = -90 * g; break;
      case "rotate_clockwise": p.rot = 90 * g; break;
      case "reflect": p.sy = Math.cos(Math.PI * g); p.ry = (1 - Math.cos(Math.PI * g)) / 2; break;
      case "scale_up": p.sx = p.sy = 1 + 0.5 * g; break;
      case "scale_down": p.sx = p.sy = 1 - 0.35 * g; break;
      case "shear_horizontal": p.kx = 0.7 * g; break;
      case "shear_vertical": p.ky = 0.7 * g; break;
      case "fill": p.f = g; p.color = COLORS[op.color]; break;
    }
    return p;
  }
  /* several ops on one shape: op k plays during the k-th slice of g */
  function paramsAt(ops, g) {
    var n = ops.length, p = params({ type: "none" }, 0);
    ops.forEach(function (op, k) {
      var q = params(op, Math.min(1, Math.max(0, g * n - k)));
      p.rot += q.rot; p.sx *= q.sx; p.sy *= q.sy; p.kx += q.kx; p.ky += q.ky; p.ry = Math.max(p.ry, q.ry);
      if (q.color) { p.color = q.color; p.f = q.f; }
    });
    return p;
  }

  /* ---------- DOM ---------- */
  var NS = "http://www.w3.org/2000/svg";
  var $ = function (id) { return document.getElementById(id); };
  var R = 11, SLOT = [[27, 70], [73, 70]];
  var stage = $("stage"), inst = [], qmark, dCell, spec, setIdx = 0, specIdx = 0, custom = false;
  function SET() { return SETS[setIdx]; }
  var x = 0, playing = false, raf = 0, phase = "fwd", holdUntil = 0, last = 0, focus = "both";
  var loopOn = true, spd = 1;
  var solved = false, tries = 0, dG = 0;

  function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  var ease = function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };
  function icon(id, cls) { return '<svg class="i' + (cls ? " " + cls : "") + '" aria-hidden="true"><use href="#' + id + '"/></svg>'; }
  function shapeSvg(name) { return '<svg class="shape" viewBox="-1.4 -1.4 2.8 2.8" aria-hidden="true"><path d="' + SHAPES[name] + '"/></svg>'; }
  function opIcon(o) {
    if (o.type === "fill") return '<svg class="i" aria-hidden="true" style="color:' + COLORS[o.color] + '"><use href="#m-fill" fill="currentColor"/></svg>';
    return icon("m-" + o.type);
  }

  function build() {
    stage.innerHTML = ""; inst = [];
    var names = ["A", "B", "C", "D"], caps = ["i-start", "i-flag", "i-pencil", "i-q"], words = ["Start", "After the rule", "Your turn", "Answer"];
    names.forEach(function (n, i) {
      var cell = document.createElement("div");
      cell.className = "cell" + (i === 1 ? " target" : "") + (i === 3 ? " answer" : "");
      var svg = el("svg", { viewBox: "0 0 100 100", role: "img", "aria-label": "Box " + n, "class": "box" });
      var cap = document.createElement("div"); cap.className = "cap";
      cap.innerHTML = '<span><b>' + n + '</b><span class="w">' + words[i] + "</span></span>" + icon(caps[i]);
      cell.appendChild(svg); cell.appendChild(cap); stage.appendChild(cell);
      for (var s = 0; s < 2; s++) {
        var shapeName = i < 2 ? spec.A[s] : spec.C[s];
        var gh = el("g", { "class": "ghost" }, svg);
        el("path", { d: SHAPES[shapeName], "vector-effect": "non-scaling-stroke", "stroke-width": "1.2" }, gh);
        var g = el("g", {}, svg);
        var path = el("path", { d: SHAPES[shapeName], "vector-effect": "non-scaling-stroke", "stroke-width": "1.8", "class": "ink", fill: "none", "stroke-linejoin": "round" }, g);
        inst.push({ panel: n, slot: s, g: g, gh: gh, path: path, ops: shapeOps(spec, s) });
      }
      if (n === "D") {
        dCell = cell; qmark = el("text", { x: 50, y: 50, "class": "qmark" }, svg); qmark.textContent = "?";
        var replay = document.createElement("button");
        replay.className = "dplay"; replay.hidden = true; replay.setAttribute("aria-label", "Animate C to D");
        replay.innerHTML = icon("i-play", "sm"); replay.onclick = animateD;
        cap.appendChild(replay);
      }
    });
    /* hint chip: shape, one icon per step, and the word for the move (colour drops speak for themselves) */
    $("rules").innerHTML = [0, 1].map(function (s) {
      var ops = shapeOps(spec, s).filter(function (o) { return o.type !== "none"; });
      if (!ops.length) ops = [{ type: "none" }];
      var moves = ops.filter(function (o) { return o.type !== "fill"; });
      return '<div class="rchip" role="img" aria-label="' + spec.A[s] + ": " + ops.map(opName).join(", then ") + '">' +
        shapeSvg(spec.A[s]) + ops.map(opIcon).join("") + '<span class="t">' + (moves.length ? moves : ops).map(opShort).join(" + ") + "</span></div>";
    }).join("");
  }

  function place(i, pr, vis) {
    var px = SLOT[i.slot][0], py = SLOT[i.slot][1] - 40 * pr.ry;
    i.g.setAttribute("transform", "translate(" + px + " " + py + ") rotate(" + pr.rot + ") matrix(1 " + pr.ky + " " + pr.kx + " 1 0 0) scale(" + (pr.sx * R) + " " + (pr.sy * R) + ")");
    i.g.style.opacity = vis;
    i.path.setAttribute("fill", pr.color || "none");
    i.path.setAttribute("fill-opacity", pr.f);
  }

  function render() {
    var g = ease(x);
    inst.forEach(function (i) {
      var gv = 0, vis = 1, ghost = false;
      if (i.panel === "A") {
        gv = (focus === "both" || (focus === "left" && i.slot === 0) || (focus === "right" && i.slot === 1)) ? g : 0;
        ghost = gv > 0.01 && gv < 0.99;
      } else if (i.panel === "B") gv = 1;
      else if (i.panel === "D") { gv = dG; vis = solved ? 1 : 0; }
      place(i, paramsAt(i.ops, gv), vis);
      i.gh.style.opacity = ghost ? 0.6 : 0;
      i.gh.setAttribute("transform", "translate(" + SLOT[i.slot][0] + " " + SLOT[i.slot][1] + ") scale(" + R + " " + R + ")");
    });
    qmark.style.opacity = solved ? 0 : 1;
    dCell.classList.toggle("solved", solved);
    dCell.querySelector(".cap > svg").style.display = solved ? "none" : "";
    dCell.querySelector(".dplay").hidden = !solved;
    $("scrub").value = x;
    $("playIcon").setAttribute("href", playing ? "#i-pause" : "#i-play");
    $("playTxt").textContent = playing ? "Pause" : "Play";
  }

  /* ---------- time-based playback: forward, hold, back, hold ---------- */
  function fwdDur() { return 1.7 * (spec.steps.length > 1 ? 1.6 : 1); }
  function frame(now) {
    if (!playing) return;
    var dt = Math.min(0.05, (now - last) / 1000) * spd; last = now;
    if (now < holdUntil) { raf = requestAnimationFrame(frame); return; }
    if (phase === "fwd") {
      x += dt / fwdDur();
      if (x >= 1) { x = 1; if (loopOn) { phase = "back"; holdUntil = now + 900 / spd; } else { playing = false; } }
    } else {
      x -= dt / 1.1;
      if (x <= 0) { x = 0; phase = "fwd"; holdUntil = now + 500 / spd; }
    }
    render();
    if (playing) raf = requestAnimationFrame(frame);
  }
  function start() {
    if (x >= 1) { x = 0; }
    phase = "fwd"; playing = true; holdUntil = 0; last = performance.now();
    cancelAnimationFrame(raf); raf = requestAnimationFrame(frame); render();
  }
  function stop() { playing = false; cancelAnimationFrame(raf); }
  $("play").onclick = function () { if (playing) { stop(); render(); } else start(); };
  $("replay").onclick = function () { stop(); x = 0; render(); start(); };
  $("scrub").oninput = function (e) { stop(); x = parseFloat(e.target.value); render(); };
  $("loop").onclick = function () { loopOn = !loopOn; $("loop").setAttribute("aria-pressed", loopOn); };
  Array.prototype.forEach.call($("speed").children, function (b) {
    b.onclick = function () {
      spd = parseFloat(b.dataset.v);
      Array.prototype.forEach.call($("speed").children, function (o) { o.setAttribute("aria-pressed", o === b); });
    };
  });
  [["f-both", "both"], ["f-left", "left"], ["f-right", "right"]].forEach(function (a) {
    $(a[0]).onclick = function () {
      focus = a[1]; stop(); x = 0;
      ["f-both", "f-left", "f-right"].forEach(function (id) { $(id).setAttribute("aria-pressed", id === a[0]); });
      render(); start();
    };
  });
  function setHint(on) {
    $("rules").hidden = !on;
    $("hintBtn").setAttribute("aria-pressed", on);
    $("hintTxt").textContent = on ? "Hide" : "Hint";
    fitHint();
  }
  /* drop the chip words only when the hint would push Next onto a second line */
  function fitHint() {
    var r = $("rules"); r.classList.remove("tight");
    if (r.hidden) return;
    if ($("nextBtn").getBoundingClientRect().top - $("hintBtn").getBoundingClientRect().top > 2) r.classList.add("tight");
  }
  window.addEventListener("resize", fitHint);
  $("hintBtn").onclick = function () { setHint($("rules").hidden); };

  /* keys: space = play/pause, 1-4 = pick option, left/right = previous/next problem */
  document.addEventListener("keydown", function (e) {
    var tag = (e.target.tagName || "").toLowerCase();
    if (tag === "textarea" || tag === "input" || tag === "select" || $("specDlg").open || $("animView").hidden) return;
    if (e.key >= "1" && e.key <= "4") { var b = $("opts").querySelectorAll(".opt")[+e.key - 1]; if (b) b.click(); return; }
    if (e.key === "ArrowRight") { step(1); return; }
    if (e.key === "ArrowLeft") { step(-1); return; }
    if (e.key === " " && tag !== "button") { e.preventDefault(); $("play").click(); }
  });

  /* ---------- answering ---------- */
  function setResult(state, text) {
    $("pill").className = "pill" + (state === "ok" ? " ok" : state === "bad" ? " bad" : "");
    $("pillIcon").setAttribute("href", state === "ok" ? "#i-check" : state === "bad" ? "#i-x" : state === "eye" ? "#i-eye" : "#i-pointer");
    $("answer").textContent = text;
  }

  /* option boxes in the 727x723 sheet: top-left x, shared top y, box size */
  var OPT_X = [17, 199, 381, 563], OPT_Y = 378, OPT_S = 147, SHEET_W = 727, SHEET_H = 723;
  function buildOptions() {
    var o = $("opts"); o.innerHTML = ""; o.className = "opts";
    OPT_X.forEach(function (px, n) {
      var cell = document.createElement("div"); cell.className = "cell";
      var b = document.createElement("button"); b.className = "opt"; b.setAttribute("aria-label", "Option " + (n + 1));
      b.style.backgroundPosition = (px / (SHEET_W - OPT_S) * 100) + "% " + (OPT_Y / (SHEET_H - OPT_S) * 100) + "%";
      var cap = document.createElement("div"); cap.className = "cap";
      cap.innerHTML = "<span><b>" + (n + 1) + '</b></span><span class="mk"></span>';
      b.onclick = function () { choose(n + 1, b, cell); };
      cell.appendChild(b); cell.appendChild(cap); o.appendChild(cell);
    });
  }
  function choose(n, btn, cell) {
    if (solved || btn.classList.contains("bad")) return;
    tries++;
    var good = n === SET().answers[specIdx];
    btn.classList.add(good ? "good" : "bad");
    cell.classList.add(good ? "good" : "bad");
    cell.querySelector(".cap .mk").innerHTML = icon(good ? "i-check" : "i-x", "sm") + (good ? "Correct" : "Not it");
    if (good) {
      solved = true; $("opts").classList.add("done");
      setResult("ok", tries === 1 ? "Correct · first try" : "Correct · " + tries + " tries");
      dG = 1; render();
      $("nextBtn").classList.add("ready");
    } else {
      setResult("bad", "Try again");
    }
  }
  function animateD() {
    dG = 0; render();
    var t0 = performance.now();
    var f = function (now) { var k = Math.min(1, (now - t0) / (fwdDur() * 1000)); dG = ease(k); render(); if (k < 1) requestAnimationFrame(f); };
    requestAnimationFrame(f);
  }

  /* ---------- problems, modes, spec editor ---------- */
  function resetPuzzle() {
    solved = false; tries = 0; dG = 0;
    if (custom) setResult("eye", "Judge by eye");
    else setResult("idle", "Pick one");
    setHint(false);
    $("nextBtn").classList.remove("ready");
    if (!custom) buildOptions();
  }
  function setErr(msg) {
    $("err").textContent = msg; $("errWrap").hidden = !msg;
    $("spec").classList.toggle("invalid", !!msg);
  }
  function setReveal(on) {
    $("staticAnswer").textContent = on ? SET().answers[specIdx] : "";
    $("staticBadge").hidden = !on;
    $("revealIcon").setAttribute("href", on ? "#i-eyeoff" : "#i-eye");
    $("revealBtn").setAttribute("aria-pressed", on);
    $("revealTxt").textContent = on ? "Hide answer" : "Reveal answer";
  }
  function load(si, idx) {
    var setChanged = si !== setIdx || !$("pick").options.length;
    stop(); setIdx = si; specIdx = idx; custom = false; x = 0;
    var S = SET(), img = S.dir + "problem_" + (idx + 1) + ".png";
    $("spec").value = S.specs[idx]; setErr("");
    spec = parseSpec(S.specs[idx]);
    $("opts").style.setProperty("--img", 'url("' + new URL(img, document.baseURI).href + '")');
    $("staticImg").src = img;
    $("opts").style.visibility = ""; setReveal(false);
    if (setChanged) {
      $("pick").innerHTML = S.specs.map(function (_, i) { return '<option value="' + i + '">Problem ' + (i + 1) + " of " + S.specs.length + "</option>"; }).join("");
      SETS.forEach(function (_, i) { $("set" + i).setAttribute("aria-pressed", i === si); });
    }
    $("pick").value = idx;
    var nx = neighbour(1);
    $("nextN").textContent = nx[0] !== si ? SETS[nx[0]].name : (nx[1] + 1) + "/" + S.specs.length;
    build(); resetPuzzle(); render(); start();
  }
  /* previous/next walk through every set in order and wrap around at the ends */
  function neighbour(d) {
    var flat = [];
    SETS.forEach(function (S, si) { S.specs.forEach(function (_, i) { flat.push([si, i]); }); });
    var at = flat.findIndex(function (p) { return p[0] === setIdx && p[1] === specIdx; });
    return flat[(at + d + flat.length) % flat.length];
  }
  function step(d) { var p = neighbour(d); load(p[0], p[1]); }
  $("pick").onchange = function () { load(setIdx, +$("pick").value); };
  $("prevP").onclick = function () { step(-1); };
  $("nextP").onclick = $("nextBtn").onclick = function () { step(1); };
  SETS.forEach(function (_, i) { $("set" + i).onclick = function () { if (i !== setIdx) load(i, 0); }; });
  function applySpec() {
    var v = $("spec").value.trim();
    try {
      var s2 = parseSpec(v); setErr("");
      stop(); spec = s2; custom = v !== SET().specs[specIdx]; x = 0;
      $("opts").style.visibility = custom ? "hidden" : "";
      build(); resetPuzzle(); render(); start(); renderBuilder();
    } catch (e) { setErr(e.message); }
  }
  $("spec").addEventListener("input", applySpec);

  /* ---------- puzzle builder: click a slot, pick from the palette; writes the same spec line as the text box ---------- */
  /* slot keys: a/c = shapes in A/C, o = step 1 move, p = step 2 move; digit = left (0) or right (1) */
  var active = "a0";
  var SLOT_NAME = { a0: "A · left shape", a1: "A · right shape", o0: "step 1 · left shape", o1: "step 1 · right shape", p0: "step 2 · left shape", p1: "step 2 · right shape", c0: "C · left shape", c1: "C · right shape" };
  var MOVES = ["rotate_counterclockwise", "rotate_clockwise", "reflect", "scale_up", "scale_down", "shear_horizontal", "shear_vertical", "fill(empty)"];
  var NONE = { type: "none" };
  function opKey(o) { return o.type === "fill" ? "fill(" + o.color + ")" : o.type === "none" ? "fill(empty)" : o.type; }
  function stepOps(k) { var st = spec.steps[k[0] === "o" ? 0 : 1]; return st || [NONE, NONE]; }
  function specLine(s) {
    var steps = s.steps.filter(function (st, k) { return k === 0 || st[0].type !== "none" || st[1].type !== "none"; });
    return "Problem " + (specIdx + 1) + ": A=(" + s.A.join(",") + "), C=(" + s.C.join(",") + ")" + steps.map(function (st, k) {
      return ", transform" + (k + 1) + "=(" + opKey(st[0]) + "," + opKey(st[1]) + ")";
    }).join("");
  }
  function cap1(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function resultSvg(name, ops) {
    var p = paramsAt(ops, 1);
    return '<svg class="shape" viewBox="-1.6 -1.6 3.2 3.2" aria-hidden="true"><path transform="rotate(' + p.rot + ") matrix(1 " + p.ky + " " + p.kx + " 1 0 0) scale(" + p.sx + " " + p.sy + ')" d="' + SHAPES[name] + '"' + (p.color ? ' style="fill:' + p.color + '"' : "") + "/></svg>";
  }
  function slotHtml(k) {
    var row = k[0], s = +k[1], body, label, isOp = row === "o" || row === "p";
    if (isOp) { var o = stepOps(k)[s]; body = opIcon(o); label = opShort(o); }
    else { var n = (row === "a" ? spec.A : spec.C)[s]; body = shapeSvg(n); label = cap1(n); }
    return '<button class="slot' + (isOp ? " mv" : "") + '" data-k="' + k + '" aria-pressed="' + (k === active) + '" aria-label="' + SLOT_NAME[k] + ": " + label + '">' +
      body + '<span class="sl">' + label + "</span></button>";
  }
  function outHtml(shapes) {
    return [0, 1].map(function (s) { return '<div class="slot out">' + resultSvg(shapes[s], shapeOps(spec, s)) + "</div>"; }).join("");
  }
  function tile(v, body, label, on) {
    return '<button class="tile" data-v="' + v + '" aria-pressed="' + on + '">' + body + "<span>" + label + "</span></button>";
  }
  function renderBuilder() {
    $("bA").innerHTML = slotHtml("a0") + slotHtml("a1");
    $("bR").innerHTML = slotHtml("o0") + slotHtml("o1");
    $("bR2").innerHTML = slotHtml("p0") + slotHtml("p1");
    $("bC").innerHTML = slotHtml("c0") + slotHtml("c1");
    $("bB").innerHTML = outHtml(spec.A);
    $("bD").innerHTML = outHtml(spec.C);
    var row = active[0], s = +active[1], html, isOp = row === "o" || row === "p";
    if (isOp) {
      var cur = opKey(stepOps(active)[s]);
      html = '<div class="lbl">Moves</div><div class="tiles rows">' + MOVES.map(function (k) { var o = parseOp(k); return tile(k, opIcon(o), opShort(o), k === cur); }).join("") + "</div>" +
        '<div class="lbl">Fill with colour</div><div class="tiles swatches">' + Object.keys(COLORS).map(function (c) {
          return tile("fill(" + c + ")", '<span class="sw" style="background:' + COLORS[c] + '"></span>', cap1(c), "fill(" + c + ")" === cur);
        }).join("") + "</div>";
    } else {
      var curS = (row === "a" ? spec.A : spec.C)[s];
      html = '<div class="lbl">Shapes</div><div class="tiles">' + Object.keys(SHAPES).map(function (n) { return tile(n, shapeSvg(n), cap1(n), n === curS); }).join("") + "</div>";
    }
    $("palette").innerHTML = html;
    $("palHead").innerHTML = icon(isOp ? "i-moves" : "i-shapes", "sm") + "<span>Choosing <b>" + SLOT_NAME[active] + "</b></span>";
    $("specReset").disabled = !custom;
    $("resetTxt").textContent = "Reset to " + SET().name + " · " + (specIdx + 1);
    $("specState").innerHTML = custom ? icon("i-pencil", "sm") + "Custom puzzle" : icon("i-check", "sm") + "Original";
  }
  document.querySelector(".builder").addEventListener("click", function (e) {
    var b = e.target.closest("button.slot"); if (!b) return;
    active = b.dataset.k; renderBuilder();
  });
  $("palette").addEventListener("click", function (e) {
    var t = e.target.closest(".tile"); if (!t) return;
    var row = active[0], s = +active[1];
    var s2 = { A: spec.A.slice(), C: spec.C.slice(), steps: [stepOps("o").slice(), stepOps("p").slice()] };
    if (row === "o" || row === "p") s2.steps[row === "o" ? 0 : 1][s] = parseOp(t.dataset.v);
    else (row === "a" ? s2.A : s2.C)[s] = t.dataset.v;
    $("spec").value = specLine(s2); applySpec();
  });
  $("specReset").onclick = function () { $("spec").value = SET().specs[specIdx]; applySpec(); };
  $("rawToggle").onclick = function () {
    var open = $("rawWrap").hidden;
    $("rawWrap").hidden = !open; $("rawToggle").setAttribute("aria-expanded", open);
  };
  $("specBtn").onclick = function () { renderBuilder(); $("specDlg").showModal(); };
  $("specClose").onclick = $("specDone").onclick = function () { $("specDlg").close(); };
  $("specDlg").addEventListener("click", function (e) { if (e.target === $("specDlg")) $("specDlg").close(); });
  function mode(anim) {
    $("animView").hidden = !anim; $("staticView").hidden = anim;
    $("m-anim").setAttribute("aria-pressed", anim); $("m-static").setAttribute("aria-pressed", !anim);
    if (!anim) stop();
  }
  $("m-anim").onclick = function () { mode(true); };
  $("m-static").onclick = function () { mode(false); };
  $("revealBtn").onclick = function () { setReveal($("staticAnswer").textContent === ""); };

  load(0, 5);
})();
