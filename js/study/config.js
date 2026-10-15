/* Study settings. The researcher page can override any of these; overrides are kept in localStorage ("ta-config"). */
var STUDY_DEFAULTS = {
  mainSet: 1,                         /* index into SETS: Set 2 (up to four transformations per question) */
  mainQuestions: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9],
  transferSet: 0,                     /* Set 1: unseen questions, no hints */
  transferQuestions: [1, 3, 4, 9],
  hintWindows: [20, 20, 20, 20],      /* T1..T4 in seconds; hints beyond the last value reuse it */
  animSeconds: 1.6,                   /* one pass of a hint animation at 1x */
  feedback: true                      /* show correct / incorrect after each main question */
};

var STUDY = (function () {
  var cfg = JSON.parse(JSON.stringify(STUDY_DEFAULTS));
  try {
    var saved = JSON.parse(localStorage.getItem("ta-config") || "null");
    if (saved) Object.keys(cfg).forEach(function (k) { if (saved[k] !== undefined) cfg[k] = saved[k]; });
  } catch (e) {}
  return cfg;
})();

function hintWindow(cfg, k) {
  var w = cfg.hintWindows;
  return w[Math.min(k, w.length - 1)];
}
