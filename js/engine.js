/* Shared engine: shapes, transformations, spec parsing, hint sequencing and small SVG helpers. Exposes window.TA. */
var TA = (function () {
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
    rotate_counterclockwise: { name: "Rotate counterclockwise", short: "Turn left", say: "Turn it 90° counterclockwise (to the left)." },
    rotate_clockwise: { name: "Rotate clockwise", short: "Turn right", say: "Turn it 90° clockwise (to the right)." },
    reflect: { name: "Reflect", short: "Flip", say: "Reflect it top to bottom, like a mirror on a horizontal line." },
    scale_up: { name: "Scale up", short: "Grow", say: "Make it bigger, keeping its shape." },
    scale_down: { name: "Scale down", short: "Shrink", say: "Make it smaller, keeping its shape." },
    shear_horizontal: { name: "Shear horizontal", short: "Slant sideways", say: "Slant it sideways: the top slides over while the bottom stays put." },
    shear_vertical: { name: "Shear vertical", short: "Slant up", say: "Slant it vertically: one side slides up while the other stays put." },
    none: { name: "No change", short: "No change", say: "Leave it as it is." }
  };
  var NONE = { type: "none" };
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
  function opShort(o) { return o.type === "fill" ? "Fill " + o.color : OPS[o.type].short; }
  function opSay(o) { return o.type === "fill" ? "Fill it with " + o.color + "." : OPS[o.type].say; }
  function opKey(o) { return o.type === "fill" ? "fill(" + o.color + ")" : o.type === "none" ? "fill(empty)" : o.type; }

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

  /* One hint per real transformation, in a fixed order (step by step, left shape before right).
     Static and animated hints both use this list, so the two modes show the same thing in the same order. */
  function hintsFor(sp) {
    var out = [];
    sp.steps.forEach(function (st, k) {
      [0, 1].forEach(function (s) {
        if (st[s].type !== "none") out.push({ step: k, slot: s, op: st[s], shape: sp.A[s] });
      });
    });
    return out;
  }

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
  /* several ops on one shape, each at its own progress */
  function paramsWith(ops, progress) {
    var p = params(NONE, 0);
    ops.forEach(function (op, k) {
      var q = params(op, progress[k]);
      p.rot += q.rot; p.sx *= q.sx; p.sy *= q.sy; p.kx += q.kx; p.ky += q.ky; p.ry = Math.max(p.ry, q.ry);
      if (q.color) { p.color = q.color; p.f = q.f; }
    });
    return p;
  }
  /* several ops on one shape played in sequence: op k plays during the k-th slice of g */
  function paramsAt(ops, g) {
    var n = ops.length;
    return paramsWith(ops, ops.map(function (_, k) { return Math.min(1, Math.max(0, g * n - k)); }));
  }

  /* ---------- small DOM / SVG helpers ---------- */
  var NS = "http://www.w3.org/2000/svg";
  function el(tag, attrs, parent) { var e = document.createElementNS(NS, tag); for (var k in attrs) e.setAttribute(k, attrs[k]); if (parent) parent.appendChild(e); return e; }
  function ease(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
  function icon(id, cls) { return '<svg class="i' + (cls ? " " + cls : "") + '" aria-hidden="true"><use href="#' + id + '"/></svg>'; }
  function shapeSvg(name) { return '<svg class="shape" viewBox="-1.4 -1.4 2.8 2.8" aria-hidden="true"><path d="' + SHAPES[name] + '"/></svg>'; }
  function opIcon(o) {
    if (o.type === "fill") return '<svg class="i" aria-hidden="true" style="color:' + COLORS[o.color] + '"><use href="#m-fill" fill="currentColor"/></svg>';
    return icon("m-" + o.type);
  }
  function cap1(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function xform(p) { return "rotate(" + p.rot + ") matrix(1 " + p.ky + " " + p.kx + " 1 0 0) scale(" + p.sx + " " + p.sy + ")"; }
  function resultSvg(name, ops) {
    var p = paramsAt(ops, 1);
    return '<svg class="shape" viewBox="-1.6 -1.6 3.2 3.2" aria-hidden="true"><path transform="' + xform(p) + '" d="' + SHAPES[name] + '"' + (p.color ? ' style="fill:' + p.color + '"' : "") + "/></svg>";
  }

  /* A two-shape figure in a 100x100 box, shapes sitting on a common baseline like the problem sheets.
     figure(svg) returns { set(paramsLeft, paramsRight, opacity) } to move the shapes. */
  var R = 11, SLOT = [[27, 70], [73, 70]];
  function figure(svg, names, opts) {
    opts = opts || {};
    var parts = [0, 1].map(function (s) {
      var gh = opts.ghost ? el("g", { "class": "ghost" }, svg) : null;
      if (gh) {
        el("path", { d: SHAPES[names[s]], "vector-effect": "non-scaling-stroke", "stroke-width": "1.2" }, gh);
        gh.setAttribute("transform", "translate(" + SLOT[s][0] + " " + SLOT[s][1] + ") scale(" + R + ")");
      }
      var g = el("g", {}, svg);
      var path = el("path", { d: SHAPES[names[s]], "vector-effect": "non-scaling-stroke", "stroke-width": "1.8", "class": "ink", fill: "none", "stroke-linejoin": "round" }, g);
      return { g: g, gh: gh, path: path };
    });
    function place(s, p, vis) {
      var o = parts[s], px = SLOT[s][0], py = SLOT[s][1] - 40 * p.ry;
      o.g.setAttribute("transform", "translate(" + px + " " + py + ") rotate(" + p.rot + ") matrix(1 " + p.ky + " " + p.kx + " 1 0 0) scale(" + (p.sx * R) + " " + (p.sy * R) + ")");
      o.g.style.opacity = vis == null ? 1 : vis;
      o.path.setAttribute("fill", p.color || "none");
      o.path.setAttribute("fill-opacity", p.f);
    }
    return {
      parts: parts,
      place: place,
      ghost: function (s, on) { if (parts[s].gh) parts[s].gh.style.opacity = on ? 0.6 : 0; }
    };
  }

  /* ---------- problem sheet geometry (727x723 images) ---------- */
  var SHEET = { W: 727, H: 723, OPT_X: [17, 199, 381, 563], OPT_Y: 378, S: 147, TOP_H: 290 };
  function optionCropPosition(n) {
    return (SHEET.OPT_X[n] / (SHEET.W - SHEET.S) * 100) + "% " + (SHEET.OPT_Y / (SHEET.H - SHEET.S) * 100) + "%";
  }
  function sheetUrl(set, idx) {
    return 'url("' + new URL(set.dir + "problem_" + (idx + 1) + ".png", document.baseURI).href + '")';
  }

  return {
    SHAPES: SHAPES, COLORS: COLORS, OPS: OPS, NONE: NONE,
    parseOp: parseOp, opName: opName, opShort: opShort, opSay: opSay, opKey: opKey,
    parseSpec: parseSpec, shapeOps: shapeOps, hintsFor: hintsFor,
    params: params, paramsWith: paramsWith, paramsAt: paramsAt,
    NS: NS, el: el, ease: ease, icon: icon, shapeSvg: shapeSvg, opIcon: opIcon, cap1: cap1, resultSvg: resultSvg,
    R: R, SLOT: SLOT, figure: figure,
    SHEET: SHEET, optionCropPosition: optionCropPosition, sheetUrl: sheetUrl
  };
})();
