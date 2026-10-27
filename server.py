#!/usr/bin/env python3
"""
Transformation Animator - Research & Experiment Local Server
Serves static assets and provides automatic session logging to results.txt.

Usage:
    python3 server.py [PORT]
Default port is 8000.
"""

import http.server
import json
import os
import sys
import datetime
from urllib.parse import urlparse

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
WORKSPACE_DIR = os.path.dirname(os.path.abspath(__file__))
RESULTS_FILE = os.path.join(WORKSPACE_DIR, "results.txt")
RESULTS_DIR = os.path.join(WORKSPACE_DIR, "results")

os.makedirs(RESULTS_DIR, exist_ok=True)


def format_session_txt(s):
    sep = "=" * 82
    sub_sep = "-" * 82

    def pad(val, length, right=False):
        val = str(val if val is not None else "")
        if len(val) >= length:
            return val
        diff = length - len(val)
        return (" " * diff + val) if right else (val + " " * diff)

    lines = []
    lines.append(sep)
    lines.append("TRANSFORMATION ANIMATOR - EXPERIMENT SESSION RESULTS (PROGRESS & EYE GAZE)")
    lines.append(sep)
    lines.append(f"Participant ID     : {s.get('id', 'unknown')}")
    lines.append(f"Started At         : {s.get('createdAt', '')}")
    completed_at = s.get("completedAt")
    lines.append(f"Completed At       : {completed_at if completed_at else 'IN PROGRESS / PARTIAL'}")
    lines.append(f"Status             : {'COMPLETE' if completed_at else 'PARTIAL / IN PROGRESS'}")
    lines.append(f"Hint Condition     : {s.get('mode', 'animation').upper()}")

    device = s.get("device", {})
    d_type = device.get("type", "unknown")
    d_w = device.get("w", "?")
    d_h = device.get("h", "?")
    d_touch = "yes" if device.get("touch") else "no"
    lines.append(f"Device / Display   : {d_type} ({d_w}x{d_h}, touch: {d_touch})")
    lines.append(f"Eye Tracking       : {'ACTIVE (WebGazer)' if s.get('eyeTracking') else 'None'}")
    lines.append(sep)
    lines.append("")

    # Aggregate boundary dwell times
    trials = s.get("trials", [])
    boundary_totals = {
        "figA": {"name": "Figure A", "tag": "[Red]", "dwell_ms": 0, "fix": 0},
        "figB": {"name": "Figure B", "tag": "[Blue]", "dwell_ms": 0, "fix": 0},
        "figC": {"name": "Figure C", "tag": "[Orange]", "dwell_ms": 0, "fix": 0},
        "chooseD": {"name": "Choose D (Candidates Area)", "tag": "[Yellow]", "dwell_ms": 0, "fix": 0},
        "option1": {"name": "  - Option 1", "tag": "[Purple]", "dwell_ms": 0, "fix": 0},
        "option2": {"name": "  - Option 2", "tag": "[Purple]", "dwell_ms": 0, "fix": 0},
        "option3": {"name": "  - Option 3", "tag": "[Purple]", "dwell_ms": 0, "fix": 0},
        "option4": {"name": "  - Option 4", "tag": "[Purple]", "dwell_ms": 0, "fix": 0},
        "hints": {"name": "Hints Panel", "tag": "[Green]", "dwell_ms": 0, "fix": 0},
        "other": {"name": "Outside Mapped Boundaries", "tag": "[Gray]", "dwell_ms": 0, "fix": 0},
    }

    correct_count = 0
    total_time_ms = 0
    total_hints = 0

    for t in trials:
        if t.get("correct"):
            correct_count += 1
        total_time_ms += t.get("timeMs", 0)
        total_hints += t.get("hintsUsed", 0)

        aoi = t.get("aoi", {})
        for k in boundary_totals:
            if k in aoi:
                boundary_totals[k]["dwell_ms"] += aoi[k].get("dwellTimeMs", 0)
                boundary_totals[k]["fix"] += aoi[k].get("fixationsCount", 0)

    n_trials = len(trials)
    acc_pct = (correct_count / n_trials * 100) if n_trials > 0 else 0
    mean_time_s = (total_time_ms / n_trials / 1000) if n_trials > 0 else 0
    mean_hints = (total_hints / n_trials) if n_trials > 0 else 0

    lines.append("EXECUTIVE PERFORMANCE SUMMARY")
    lines.append(sub_sep)
    lines.append(f"Main Puzzles Solved    : {n_trials}")
    lines.append(f"Main Accuracy          : {acc_pct:.1f}% ({correct_count}/{n_trials})")
    lines.append(f"Mean Solving Time      : {mean_time_s:.2f} seconds")
    lines.append(f"Mean Hints Used        : {mean_hints:.2f}")

    q = s.get("questionnaire", {})
    if q:
        lines.append(f"Overall Mental Effort  : {q.get('effort', '–')} / 9 (Paas Scale)")
        lines.append(f"NASA-TLX Workload Raw  : {q.get('tlx_mental', '–')} / 100")
    lines.append("")

    primary_sum = (
        boundary_totals["figA"]["dwell_ms"]
        + boundary_totals["figB"]["dwell_ms"]
        + boundary_totals["figC"]["dwell_ms"]
        + boundary_totals["chooseD"]["dwell_ms"]
        + boundary_totals["hints"]["dwell_ms"]
        + boundary_totals["other"]["dwell_ms"]
    )

    lines.append("1. CUMULATIVE EYE GAZE ACROSS MAPPED BOUNDARIES")
    lines.append(sub_sep)
    lines.append(
        pad("Mapped Boundary Zone", 32)
        + pad("Color Tag", 12)
        + pad("Dwell (s)", 14, True)
        + pad("% Gaze", 12, True)
        + pad("Fixations", 12, True)
    )
    lines.append("-" * 82)

    for k, item in boundary_totals.items():
        sec = f"{item['dwell_ms'] / 1000:.2f} s"
        pct_val = f"{(item['dwell_ms'] / primary_sum * 100):.1f}%" if primary_sum > 0 else "0.0%"
        lines.append(
            pad(item["name"], 32)
            + pad(item["tag"], 12)
            + pad(sec, 14, True)
            + pad(pct_val, 12, True)
            + pad(str(item["fix"]), 12, True)
        )

    lines.append("-" * 82)
    lines.append(
        pad("TOTAL GAZE TRACKED", 44)
        + pad(f"{primary_sum / 1000:.2f} s", 14, True)
        + pad("100.0%", 12, True)
    )
    lines.append("")

    lines.append("2. PUZZLE-BY-PUZZLE PERFORMANCE & EYE GAZE BREAKDOWN")
    lines.append(sub_sep)
    for t in trials:
        n_num = t.get("n", 1)
        res_str = "CORRECT" if t.get("correct") else "INCORRECT"
        choice = t.get("choice", "–")
        ans = t.get("answer", "–")
        t_sec = f"{t.get('timeMs', 0) / 1000:.2f} s"
        h_used = t.get("hintsUsed", 0)

        lines.append(f"[Puzzle {n_num}] Result: {res_str} (Choice: Option {choice}, Answer: Option {ans})")
        lines.append(f"  Solving Time: {t_sec} | Hints Used: {h_used}")

        aoi = t.get("aoi")
        if aoi:
            lines.append("  Eye Gaze Over Mapped Boundaries:")
            order = [
                ("figA", "Figure A [Red]"),
                ("figB", "Figure B [Blue]"),
                ("figC", "Figure C [Orange]"),
                ("chooseD", "Choose D Candidates Area [Yellow]"),
                ("option1", "  - Option 1 [Purple]"),
                ("option2", "  - Option 2 [Purple]"),
                ("option3", "  - Option 3 [Purple]"),
                ("option4", "  - Option 4 [Purple]" + (" [CHOSEN]" if choice == 4 else "")),
                ("hints", "Hints Panel [Green]"),
                ("other", "Outside Mapped Boundaries [Gray]"),
            ]
            for key, label in order:
                if key in aoi:
                    a = aoi[key]
                    sec_str = f"{a.get('dwellTimeMs', 0) / 1000:.2f}s"
                    pct_str = f"{a.get('pctTotal', 0)}%"
                    ttff = a.get("ttffMs")
                    tt_str = f"{ttff / 1000:.2f}s" if ttff is not None else "–"
                    lines.append(
                        f"    • {pad(label, 36)}: {pad(sec_str, 8, True)} ({pad(pct_str, 5, True)}) | TTFF: {tt_str}"
                    )
        else:
            lines.append("  (No gaze recorded for this puzzle)")
        lines.append("")

    # Questionnaire Details
    if q:
        lines.append("3. POST-STUDY SURVEY & WORKLOAD RATINGS")
        lines.append(sub_sep)
        for qk, qv in q.items():
            lines.append(f"  {pad(qk, 25)}: {qv}")
        lines.append("")

    lines.append("=" * 82)
    lines.append("\n")
    return "\n".join(lines)


class ExperimentServer(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS for local testing
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/save-results":
            content_length = int(self.headers.get("Content-Length", 0))
            post_body = self.rfile.read(content_length)

            try:
                session_payload = json.loads(post_body.decode("utf-8"))
                raw_session = session_payload.get("session") or session_payload
                pid = session_payload.get("id") or raw_session.get("id", "participant")
                timestamp_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

                # Format text report (use client generated or server generated)
                formatted_txt = session_payload.get("txt") or format_session_txt(raw_session)

                # 1. Append to master results.txt
                with open(RESULTS_FILE, "a", encoding="utf-8") as f:
                    f.write(formatted_txt)

                # 2. Save per-participant text report in results/
                part_txt_file = os.path.join(RESULTS_DIR, f"results_{pid}_{timestamp_str}.txt")
                with open(part_txt_file, "w", encoding="utf-8") as f:
                    f.write(formatted_txt)

                # 3. Save raw session JSON in results/
                part_json_file = os.path.join(RESULTS_DIR, f"session_{pid}_{timestamp_str}.json")
                with open(part_json_file, "w", encoding="utf-8") as f:
                    json.dump(raw_session, f, indent=2)

                print(f"[SUCCESS] Progress and eye-gaze saved for participant {pid} -> {RESULTS_FILE}")
                response_payload = {
                    "ok": True,
                    "message": "Session saved successfully to results.txt and results/",
                    "participantId": pid,
                    "resultsFile": RESULTS_FILE,
                }
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps(response_payload).encode("utf-8"))

            except Exception as e:
                print(f"[ERROR] Failed to save results: {e}")
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                err_payload = {"ok": False, "error": str(e)}
                self.wfile.write(json.dumps(err_payload).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()


if __name__ == "__main__":
    server_address = ("", PORT)
    httpd = http.server.HTTPServer(server_address, ExperimentServer)
    print(f"\n=======================================================")
    print(f" Transformation Animator Server running at:")
    print(f"   http://localhost:{PORT}/index.html        (Main Study)")
    print(f"   http://localhost:{PORT}/eyetracker.html   (Eye Tracker Lab)")
    print(f"   http://localhost:{PORT}/researcher.html   (Researcher Dashboard)")
    print(f" Results will be automatically written to:")
    print(f"   {RESULTS_FILE}")
    print(f"=======================================================\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        sys.exit(0)
