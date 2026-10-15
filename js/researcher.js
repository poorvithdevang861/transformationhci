/* Researcher dashboard: summaries, per-session table, CSV / JSON export and import, study settings (localStorage "ta-config"). */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  function pct(v) { return v == null ? "–" : Math.round(v * 100) + "%"; }
  function num(v, d) { return v == null ? "–" : v.toFixed(d == null ? 1 : d); }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }
  function stamp() { return new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-"); }

  document.querySelector(".note").textContent = "Data lives in this browser only (localStorage). Export after each session, or collect the participants' downloaded JSON files and import them here.";

  /* ---------- tables ---------- */
  function render() {
    var list = Store.all().sort(function (a, b) { return a.createdAt < b.createdAt ? 1 : -1; });
    var sums = list.map(Store.summarise), done = sums.filter(function (m) { return m.status === "complete"; });
    function kpi(label, value) { return '<div class="kpi"><b>' + value + "</b><span>" + label + "</span></div>"; }
    $("kpis").innerHTML =
      kpi("sessions", list.length) + kpi("complete", done.length) +
      kpi("mean SUS", num(Store.mean(done.map(function (m) { return m.sus; })), 0)) +
      kpi("mean raw TLX", num(Store.mean(done.map(function (m) { return m.tlx; })), 0)) +
      kpi("mean agency (1–7)", num(Store.mean(done.map(function (m) { return m.agency; })))) +
      kpi("transfer accuracy", pct(Store.mean(sums.map(function (m) { return m.transferAcc; }))));

    var groups = Store.byCondition(list);
    $("condTable").innerHTML = "<thead><tr><th>Condition</th><th>Trials</th><th>Accuracy</th><th>Mean time</th><th>Mean effort (1–9)</th><th>Mean hints</th></tr></thead><tbody>" +
      (groups.length ? groups.map(function (g) {
        return '<tr><td><span class="tag ' + g.condition + '">' + g.condition + "</span></td><td>" + g.trials + "</td><td>" + pct(g.accuracy) + "</td><td>" + num(g.meanTimeS) + " s</td><td>" + num(g.meanEffort) + "</td><td>" + num(g.meanHints) + "</td></tr>";
      }).join("") : '<tr><td colspan="6" class="empty">No answered puzzles yet.</td></tr>') + "</tbody>";

    $("sessTable").innerHTML = "<thead><tr><th>Participant</th><th>Started</th><th>Mode</th><th>Device</th><th>Status</th><th>Puzzles</th><th>Accuracy</th><th>Transfer</th><th>Identify</th><th>TLX</th><th>Agency</th><th>SUS</th><th></th></tr></thead><tbody>" +
      (list.length ? list.map(function (s, i) {
        var m = sums[i];
        return "<tr><td class='mono'>" + esc(s.id) + "</td><td>" + new Date(s.createdAt).toLocaleString() + "</td><td>" + esc(s.mode) + "</td><td>" + esc(m.device) + "</td>" +
          '<td><span class="tag ' + m.status + '">' + m.status + "</span></td><td>" + m.mainDone + " / " + (s.config ? s.config.mainQuestions.length : "?") + "</td>" +
          "<td>" + pct(m.accuracy) + "</td><td>" + pct(m.transferAcc) + "</td><td>" + pct(m.identifyAcc) + "</td><td>" + num(m.tlx, 0) + "</td><td>" + num(m.agency) + "</td><td>" + num(m.sus, 1) + "</td>" +
          '<td class="act"><button class="ibtn" data-dl="' + i + '" aria-label="Download ' + esc(s.id) + '"><svg class="i sm" aria-hidden="true"><use href="#i-download"/></svg></button>' +
          '<button class="ibtn" data-rm="' + i + '" aria-label="Delete ' + esc(s.id) + '"><svg class="i sm" aria-hidden="true"><use href="#i-trash"/></svg></button></td></tr>';
      }).join("") : '<tr><td colspan="13" class="empty">No sessions yet. Run the study from the home page.</td></tr>') + "</tbody>";

    $("sessTable").onclick = function (e) {
      var b = e.target.closest("button"); if (!b) return;
      if (b.dataset.dl != null) { var s = list[+b.dataset.dl]; Store.download("ta-" + s.id + ".json", JSON.stringify(s, null, 2), "application/json"); }
      if (b.dataset.rm != null) { var r = list[+b.dataset.rm]; if (confirm("Delete session " + r.id + "? This cannot be undone.")) { Store.remove(r.id, r.createdAt); render(); } }
    };
    ["exTrials", "exSessions", "exJson", "clearAll"].forEach(function (id) { $(id).disabled = !list.length; });
  }

  /* ---------- export / import ---------- */
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
