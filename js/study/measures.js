/* Questionnaire content and widgets: per-question effort (1-9), NASA-TLX (raw, 0-100), sense of agency (1-7), SUS (1-5). */
var Measures = (function () {
  var EFFORT = { q: "How much mental effort did this question take?", lo: "Very, very low", hi: "Very, very high" };

  var TLX = [
    { key: "mental", title: "Mental demand", q: "How mentally demanding was the task?", lo: "Very low", hi: "Very high" },
    { key: "physical", title: "Physical demand", q: "How physically demanding was the task?", lo: "Very low", hi: "Very high" },
    { key: "temporal", title: "Temporal demand", q: "How hurried or rushed was the pace of the task?", lo: "Very low", hi: "Very high" },
    { key: "performance", title: "Performance", q: "How successful were you in doing what you were asked to do?", lo: "Perfect", hi: "Failure" },
    { key: "effort", title: "Effort", q: "How hard did you have to work to reach your level of performance?", lo: "Very low", hi: "Very high" },
    { key: "frustration", title: "Frustration", q: "How insecure, discouraged, irritated, stressed or annoyed were you?", lo: "Very low", hi: "Very high" }
  ];

  var AGENCY = [
    { q: "I felt in control of the hints.", reverse: false },
    { q: "I could go through the hints at my own pace.", reverse: false },
    { q: "The hints responded the way I expected when I used the controls.", reverse: false },
    { q: "The hints seemed to happen to me rather than being directed by me.", reverse: true },
    { q: "The hints helped me understand the transformations.", reverse: false }
  ];
  var AGENCY_LABELS = ["Strongly disagree", "Strongly agree"];

  var SUS = [
    "I think that I would like to use this website frequently.",
    "I found the website unnecessarily complex.",
    "I thought the website was easy to use.",
    "I think that I would need the support of a technical person to be able to use this website.",
    "I found the various functions in this website were well integrated.",
    "I thought there was too much inconsistency in this website.",
    "I would imagine that most people would learn to use this website very quickly.",
    "I found the website very cumbersome to use.",
    "I felt very confident using the website.",
    "I needed to learn a lot of things before I could get going with this website."
  ];
  var SUS_LABELS = ["Strongly disagree", "Strongly agree"];

  /* A row of numbered buttons (radio group) with labelled ends. onPick(value) fires on every choice. */
  function scale(name, n, lo, hi, value, onPick) {
    var wrap = document.createElement("div");
    wrap.className = "scale";
    wrap.setAttribute("role", "radiogroup");
    wrap.setAttribute("aria-label", name);
    wrap.style.setProperty("--n", n);
    var row = document.createElement("div"); row.className = "scale-row";
    for (var v = 1; v <= n; v++) {
      var b = document.createElement("button");
      b.type = "button"; b.textContent = v; b.dataset.v = v;
      b.setAttribute("role", "radio"); b.setAttribute("aria-checked", value === v);
      b.setAttribute("aria-label", v + (v === 1 ? " · " + lo : v === n ? " · " + hi : ""));
      row.appendChild(b);
    }
    row.addEventListener("click", function (e) {
      var b = e.target.closest("button"); if (!b) return;
      Array.prototype.forEach.call(row.children, function (o) { o.setAttribute("aria-checked", o === b); });
      onPick(+b.dataset.v);
    });
    var ends = document.createElement("div"); ends.className = "scale-ends";
    ends.innerHTML = "<span>" + lo + "</span><span>" + hi + "</span>";
    wrap.appendChild(row); wrap.appendChild(ends);
    return wrap;
  }

  /* 0-100 slider in steps of 5 that counts as answered only once it has been moved */
  function slider(name, lo, hi, onPick) {
    var wrap = document.createElement("div"); wrap.className = "tlx-slider untouched";
    wrap.innerHTML = '<input type="range" min="0" max="100" step="5" value="50" aria-label="' + name + '">' +
      '<div class="ticks" aria-hidden="true">' + new Array(21).join("<i></i>") + "<i></i></div>" +
      '<div class="scale-ends"><span>' + lo + '</span><output>Drag to answer</output><span>' + hi + "</span></div>";
    var input = wrap.querySelector("input"), out = wrap.querySelector("output");
    function pick() { wrap.classList.remove("untouched"); out.textContent = input.value; onPick(+input.value); }
    input.addEventListener("input", pick);
    input.addEventListener("pointerdown", function () { setTimeout(pick, 0); });
    return wrap;
  }

  return { EFFORT: EFFORT, TLX: TLX, AGENCY: AGENCY, AGENCY_LABELS: AGENCY_LABELS, SUS: SUS, SUS_LABELS: SUS_LABELS, scale: scale, slider: slider };
})();
