import { GazePoint, GazeSessionResult } from './types';
import { detectFixations } from './fixation-detector';
import { computeAoiMetrics, getElementAoiKey, extractDomBoundaries } from './aoi-engine';

const WEBGAZER_CDN = 'https://cdn.jsdelivr.net/npm/webgazer@3.5.3/dist/webgazer.min.js';

type GazeCallback = (pt: { x: number; y: number }) => void;

class WebGazerService {
  private isCameraActive = false;
  private isRecording = false;
  private isMouseFallback = false;
  private recordedSamples: GazePoint[] = [];
  private recordingStartTime = 0;
  private activeGazeListeners: Set<GazeCallback> = new Set();
  private mouseHandler: ((e: MouseEvent) => void) | null = null;
  private dotEl: HTMLDivElement | null = null;
  private showDot = false;

  public async connectCamera(): Promise<{ camera: boolean; message: string }> {
    try {
      await this.loadScript(WEBGAZER_CDN);
      const wg = (window as unknown as { webgazer: any }).webgazer;
      if (!wg) throw new Error('WebGazer missing on window');

      wg.params.showVideoPreview = false;
      wg.params.showGazeDot = false;
      wg.setGazeListener((data: any) => {
        if (!data) return;
        this.emitGaze(data.x, data.y);
      });

      await wg.begin();
      this.isCameraActive = true;
      this.isMouseFallback = false;
      return { camera: true, message: 'Webcam connected and active.' };
    } catch (err) {
      console.warn('WebGazer unavailable, activating mouse simulation fallback:', err);
      this.enableMouseFallback();
      return { camera: false, message: 'Camera unavailable. Running in Mouse simulation mode.' };
    }
  }

  private enableMouseFallback() {
    this.isMouseFallback = true;
    if (!this.mouseHandler) {
      this.mouseHandler = (e: MouseEvent) => this.emitGaze(e.clientX, e.clientY);
      window.addEventListener('mousemove', this.mouseHandler);
    }
  }

  public subscribe(cb: GazeCallback): () => void {
    this.activeGazeListeners.add(cb);
    return () => this.activeGazeListeners.delete(cb);
  }

  private emitGaze(x: number, y: number) {
    if (this.showDot) this.updateDot(x, y);
    this.activeGazeListeners.forEach((fn) => fn({ x, y }));

    if (this.isRecording) {
      const el = document.elementFromPoint(x, y);
      const target = getElementAoiKey(el);
      this.recordedSamples.push({
        t: Math.round(performance.now() - this.recordingStartTime),
        x: Math.round(x),
        y: Math.round(y),
        target
      });
    }
  }

  public startRecording() {
    this.recordedSamples = [];
    this.recordingStartTime = performance.now();
    this.isRecording = true;
    if (!this.isCameraActive && !this.isMouseFallback) {
      this.enableMouseFallback();
    }
  }

  public stopRecording(rootViewport?: HTMLElement | null): GazeSessionResult {
    this.isRecording = false;
    const duration = Math.round(performance.now() - this.recordingStartTime);
    const fixations = detectFixations(this.recordedSamples);
    const aoiMetrics = computeAoiMetrics(this.recordedSamples, fixations, duration);
    const boundaries = extractDomBoundaries(rootViewport ?? document.body);

    return {
      samples: [...this.recordedSamples],
      fixations,
      aoiMetrics,
      boundaries,
      durationMs: duration
    };
  }

  public setShowGazeDot(show: boolean) {
    this.showDot = show;
    if (!show && this.dotEl) this.dotEl.style.display = 'none';
  }

  private updateDot(x: number, y: number) {
    if (!this.dotEl) {
      this.dotEl = document.createElement('div');
      this.dotEl.style.cssText =
        'position:fixed;width:16px;height:16px;border-radius:50%;background:rgba(255,64,85,0.85);border:2px solid #fff;pointer-events:none;z-index:99999;transform:translate(-50%,-50%);transition:transform 0.05s ease-out;';
      document.body.appendChild(this.dotEl);
    }
    this.dotEl.style.display = 'block';
    this.dotEl.style.left = x + 'px';
    this.dotEl.style.top = y + 'px';
  }

  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if ((window as unknown as { webgazer?: any }).webgazer) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('Script load error: ' + src));
      document.head.appendChild(s);
    });
  }

  public get isActive() { return this.isCameraActive; }
  public get isFallback() { return this.isMouseFallback; }
}

export const gazeTracker = new WebGazerService();
