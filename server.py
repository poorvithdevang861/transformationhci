#!/usr/bin/env python3
"""
Transformation Animator - Research & Experiment Local Server
Serves static assets and provides automatic session logging to results.txt and results/.

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
DIST_DIR = os.path.join(WORKSPACE_DIR, "dist")
RESULTS_FILE = os.path.join(WORKSPACE_DIR, "results.txt")
RESULTS_DIR = os.path.join(WORKSPACE_DIR, "results")

os.makedirs(RESULTS_DIR, exist_ok=True)


class ExperimentServer(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        # Serve from dist/ if built, otherwise workspace root
        serve_dir = DIST_DIR if os.path.exists(DIST_DIR) else WORKSPACE_DIR
        super().__init__(*args, directory=serve_dir, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/sessions":
            # Return list of participant session JSONs saved in results/
            # Deduplicate by participant id (keeping latest)
            sessions_by_id = {}
            if os.path.exists(RESULTS_DIR):
                for f in sorted(os.listdir(RESULTS_DIR)):
                    if f.startswith("session_") and f.endswith(".json"):
                        try:
                            with open(os.path.join(RESULTS_DIR, f), "r", encoding="utf-8") as fp:
                                sess = json.load(fp)
                                sid = sess.get("id")
                                if sid:
                                    if f == f"session_{sid}.json" or sid not in sessions_by_id:
                                        sessions_by_id[sid] = sess
                                    elif len(sess.get("trials", [])) >= len(sessions_by_id[sid].get("trials", [])):
                                        sessions_by_id[sid] = sess
                        except Exception:
                            pass
            sessions = list(sessions_by_id.values())
            # Sort newest session to the top
            sessions.sort(key=lambda s: s.get("completedAt") or s.get("createdAt") or "", reverse=True)
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(sessions).encode("utf-8"))
        else:
            # Fallback to SPA index.html for client-side routing or legacy HTML routes
            req_path = os.path.join(self.directory, parsed.path.lstrip("/"))
            if parsed.path in ["/", "/index.html", "/explore.html", "/eyetracker.html", "/researcher.html", "/analytics"] or not os.path.exists(req_path):
                self.path = "/index.html"
            super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path == "/api/save-results":
            content_length = int(self.headers.get("Content-Length", 0))
            post_body = self.rfile.read(content_length)

            try:
                session_payload = json.loads(post_body.decode("utf-8"))
                raw_session = session_payload.get("session") or session_payload
                pid = session_payload.get("id") or raw_session.get("id", "participant")
                trials = raw_session.get("trials", [])
                num_trials = len(trials)
                is_completed = bool(raw_session.get("completedAt"))
                timestamp_str = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")

                formatted_txt = session_payload.get("txt")
                if not formatted_txt:
                    formatted_txt = f"Participant: {pid}\nCompleted: {timestamp_str}\n"

                # 1. Update individual participant canonical JSON in results/
                part_json_file = os.path.join(RESULTS_DIR, f"session_{pid}.json")
                with open(part_json_file, "w", encoding="utf-8") as f:
                    json.dump(raw_session, f, indent=2)

                # 2. Update individual participant canonical TXT in results/
                part_txt_file = os.path.join(RESULTS_DIR, f"results_{pid}.txt")
                with open(part_txt_file, "w", encoding="utf-8") as f:
                    f.write(formatted_txt)

                # 3. If session completed, create timestamped archive copy
                if is_completed:
                    archive_json = os.path.join(RESULTS_DIR, f"session_{pid}_{timestamp_str}.json")
                    with open(archive_json, "w", encoding="utf-8") as f:
                        json.dump(raw_session, f, indent=2)
                    archive_txt = os.path.join(RESULTS_DIR, f"results_{pid}_{timestamp_str}.txt")
                    with open(archive_txt, "w", encoding="utf-8") as f:
                        f.write(formatted_txt)

                # 4. Master results.txt: aggregate all canonical results_*.txt files (newest at the top)
                try:
                    canonical_files = []
                    for fname in os.listdir(RESULTS_DIR):
                        if fname.startswith("results_") and fname.endswith(".txt"):
                            parts = fname[:-4].split("_")
                            if len(parts) == 2:
                                canonical_files.append(fname)

                    # Sort descending by file modification time so newest participants are at top
                    canonical_files.sort(
                        key=lambda fn: os.path.getmtime(os.path.join(RESULTS_DIR, fn)),
                        reverse=True
                    )

                    with open(RESULTS_FILE, "w", encoding="utf-8") as mf:
                        for fname in canonical_files:
                            try:
                                with open(os.path.join(RESULTS_DIR, fname), "r", encoding="utf-8") as pf:
                                    mf.write(pf.read())
                                    mf.write("\n\n")
                            except Exception:
                                pass
                except Exception as e:
                    print(f"[WARN] Error updating master results.txt: {e}")

                last_info = ""
                if num_trials > 0:
                    last_t = trials[-1]
                    last_info = f" | Trial {num_trials}: Choice={last_t.get('choice')} Correct={last_t.get('correct')} Time={last_t.get('timeMs')}ms"

                print(f"[SAVE] Participant {pid}: {num_trials} trial(s) saved{last_info} ({'COMPLETE' if is_completed else 'IN PROGRESS'})")
                response_payload = {
                    "ok": True,
                    "message": "Trial and session saved successfully to results/",
                    "participant": pid,
                    "trialsSaved": num_trials,
                    "completed": is_completed
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
                self.wfile.write(json.dumps({"ok": False, "error": str(e)}).encode("utf-8"))
        elif parsed.path == "/api/clear-sessions":
            # Remove all saved participant files and reset master results.txt
            cleared_count = 0
            if os.path.exists(RESULTS_DIR):
                for f in os.listdir(RESULTS_DIR):
                    try:
                        os.remove(os.path.join(RESULTS_DIR, f))
                        cleared_count += 1
                    except Exception:
                        pass
            if os.path.exists(RESULTS_FILE):
                try:
                    os.remove(RESULTS_FILE)
                except Exception:
                    pass
            print(f"[RESET] Cleared {cleared_count} session files from results/ and removed results.txt")
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"ok": True, "message": "All recorded sessions cleared", "clearedFiles": cleared_count}).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()


if __name__ == "__main__":
    server_address = ("", PORT)
    httpd = http.server.HTTPServer(server_address, ExperimentServer)
    print(f"\n=======================================================")
    print(f" Transformation Animator Server running at:")
    print(f"   http://localhost:{PORT}/                 (All Views: Study, Studio, Explorer, Researcher)")
    print(f" Results will be automatically written to:")
    print(f"   {RESULTS_FILE}")
    print(f"=======================================================\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
        sys.exit(0)
