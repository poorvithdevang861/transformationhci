# Transformation Animator (Visual Reasoning & Gaze Lab)

A research and experiment platform for studying human visual reasoning with geometric analogy transformations (`A : B :: C : ?`), featuring real-time webcam gaze tracking, 9-point calibration, interactive scanpath & heatmap analytics, and NASA-TLX/SUS evaluation metrics.

---

## 🏗 Modern Modular Architecture

The codebase has been refactored from large monolithic HTML/JS files into a **Clean Feature-Based Architecture** using **Vite + React + TypeScript + Scoped Design Tokens**, coupled with a lightweight **Python experiment backend (`server.py`)**.

### Why This Prevents Monolithic Files (>1,000 Lines)
- **Declarative UI**: Replaces hundreds of lines of imperative DOM mutations (`innerHTML`, `appendChild`, manual event listeners) with small, focused React components.
- **Strict File Bounds**: Every component and module is strictly focused and kept around **50–120 lines**.
- **Single Source of Truth**: Data models, AOI color tags, geometry calculations, and `results.txt` formatting logic are centralized in `src/core/` rather than duplicated across multiple pages.
- **End-to-End Type Safety**: Full TypeScript interfaces for Sessions, Trials, Gaze Points, Fixations, and Survey measures.

---

## 📁 Project Structure

```
├── server.py                        # Streamlined Python backend (API & static file server)
├── results.txt                      # Preserved experiment logs
├── results/                         # Per-participant JSON & TXT logs
├── public/                          # Static assets (images for Set 1 & Set 2)
│   └── img/
├── src/
│   ├── main.tsx                     # Application entry point (~12 lines)
│   ├── App.tsx                      # App navigation & view coordinator (~25 lines)
│   ├── vite-env.d.ts                # TypeScript Vite definitions
│   │
│   ├── core/                        # Pure domain logic (zero framework dependencies)
│   │   ├── geometry/
│   │   │   ├── shapes.ts            # Unit vector SVG shape paths
│   │   │   ├── operations.ts        # Transformations (rotate, shear, reflect, fill)
│   │   │   ├── spec-parser.ts       # Spec parser (A : B :: C : ?)
│   │   │   ├── interpolator.ts      # Animation matrix & interpolation at progress t
│   │   │   └── problems.ts          # Set 1 & Set 2 problem definitions
│   │   ├── gaze/
│   │   │   ├── types.ts             # GazePoint, Fixation, AOI interfaces
│   │   │   ├── aoi-engine.ts        # AOI bounding hit detection & dwell calculations
│   │   │   ├── fixation-detector.ts # I-DT dispersion fixation clustering
│   │   │   └── webgazer-service.ts  # WebGazer webcam coordinator & mouse fallback
│   │   ├── heatmap/
│   │   │   ├── palette.ts           # Color ramp gradient & 256-entry lookup table
│   │   │   ├── heatmap-renderer.ts  # Canvas 2D radial density & alpha accumulation
│   │   │   ├── scanpath-renderer.ts # Chronological saccade lines & fixation bubbles
│   │   │   └── boundary-renderer.ts # Mapped boundary overlays matching diagrams
│   │   └── storage/
│   │       ├── types.ts             # Session, Trial, and Survey interfaces
│   │       ├── results-formatter.ts # Single source of truth for results.txt formatting
│   │       ├── local-store.ts       # LocalStorage session & config persistence
│   │       ├── api-client.ts        # Fetch client for /api/save-results
│   │       └── csv-exporter.ts      # CSV generators for Gaze, Trials, and Sessions
│   │
│   ├── components/common/           # Reusable UI primitives
│   │   ├── Header.tsx               # Top navigation header
│   │   ├── Icon.tsx                 # SVG icon component
│   │   ├── Modal.tsx                # Accessible modal dialog
│   │   ├── SegmentedControl.tsx     # Tab and toggle segmented control
│   │   └── SvgSprite.tsx            # SVG symbol sprite definitions
│   │
│   └── features/                    # Feature views (modularized components)
│       ├── study/                   # Participant study experience
│       │   ├── StudyContainer.tsx   # Study flow state coordinator
│       │   ├── WelcomeStep.tsx      # Consent, mode selection, device detection
│       │   ├── IntroStep.tsx        # Instructions view
│       │   ├── PuzzleTrial.tsx      # Active trial view
│       │   ├── PuzzleFigures.tsx    # SVG figures A, B, C, D renderer
│       │   ├── CandidatePicker.tsx  # Option choices 1–4
│       │   ├── HintPanel.tsx        # Static text or animated hint player
│       │   ├── questionnaires/      # Effort, NASA-TLX, Agency, SUS forms
│       │   └── CompletionStep.tsx   # Results download and summary
│       │
│       ├── eyetracker/              # Eye Tracker & Heatmap Studio
│       │   ├── EyeTrackerStudio.tsx # Studio coordinator
│       │   ├── CameraControlBar.tsx # Camera connect, 9-pt calibration, recording
│       │   ├── CalibrationModal.tsx # Interactive 9-point calibration dots
│       │   ├── StudioViewport.tsx   # Content viewport with canvas overlay
│       │   ├── VisualControls.tsx   # Display mode, opacity, radius sliders
│       │   ├── ScanpathPlayer.tsx   # Fixation replay scrubber & speed controls
│       │   ├── AoiBreakdown.tsx     # Color-coded dwell time cards
│       │   └── ExportBar.tsx        # PNG, CSV, JSON, results.txt exports
│       │
│       ├── researcher/              # Researcher Dashboard
│       │   ├── ResearcherDashboard.tsx # Dashboard coordinator
│       │   ├── KpiCards.tsx         # Executive KPI summary cards
│       │   ├── ConditionTable.tsx   # Static vs Animated performance table
│       │   ├── SessionsTable.tsx    # Participant sessions table
│       │   ├── StudyConfigForm.tsx  # Experiment timings & settings
│       │   └── HeatmapDialog.tsx    # Participant trial heatmap inspector
│       │
│       └── explore/                 # Practice & Puzzle Explorer
│           ├── ExplorerView.tsx     # Explorer coordinator
│           ├── AnimationStage.tsx   # A -> B morphing stage
│           ├── PlaybackBar.tsx      # Play, pause, speed, loop controls
│           ├── OptionSection.tsx    # Option selection & hint feedback
│           └── SpecModal.tsx        # Spec viewer and editor
└── legacy/                          # Backups of the original HTML files
```

---

## 🚀 Running the Project

### 1. Development Mode (with Hot Module Replacement)
```bash
npm run dev
```
Opens at `http://localhost:5173`. Any API calls to `/api/save-results` automatically proxy to the Python backend on `http://localhost:8000`.

### 2. Production Build
```bash
npm run build
```
Builds optimized production assets into `dist/` in under 200ms.

### 3. Local Research Server (Python)
```bash
python3 server.py [PORT]
```
- Default port: `8000` (`http://localhost:8000`)
- Serves the built frontend application.
- Receives participant study data at `/api/save-results`.
- Appends text summaries to `results.txt`.
- Saves individual participant reports and raw JSON to `results/`.
- Endpoint `/api/sessions` lists all saved sessions.
