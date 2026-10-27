/* GazeTracker: Webcam-based in-browser eye tracker using WebGazer.js.
   Handles camera initialization, 9-point calibration, real-time gaze prediction,
   AOI detection, and trial recording. Supports graceful simulation/fallback if no camera. */
var GazeTracker = (function () {
  'use strict';

  var WEBGAZER_CDN = 'https://cdn.jsdelivr.net/npm/webgazer@3.5.3/dist/webgazer.min.js';

  var state = {
    initialized: false,
    calibrating: false,
    calibrated: false,
    recording: false,
    cameraReady: false,
    simulated: false,
    showGazeDot: false,
    gazeX: 0,
    gazeY: 0,
    lastSampleTime: 0,
    smoothingAlpha: 0.35 // Exponential Moving Average smoothing
  };

  var trialBuffer = [];
  var trialStart = 0;
  var gazeListeners = [];
  var gazeDotEl = null;

  /* Check browser webcam support */
  function isSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
  }

  /* Dynamically load WebGazer script if needed */
  function loadWebGazerScript() {
    return new Promise(function (resolve, reject) {
      if (window.webgazer) return resolve(window.webgazer);
      var script = document.createElement('script');
      script.src = WEBGAZER_CDN;
      script.async = true;
      script.onload = function () {
        if (window.webgazer) resolve(window.webgazer);
        else reject(new Error('WebGazer loaded but not found on window.'));
      };
      script.onerror = function () {
        reject(new Error('Failed to load WebGazer from CDN.'));
      };
      document.head.appendChild(script);
    });
  }

  /* Initialize WebGazer and request webcam */
  function init(options) {
    var opts = options || {};
    return new Promise(function (resolve) {
      if (state.initialized) {
        if (opts.onReady) opts.onReady({ camera: state.cameraReady, simulated: state.simulated });
        return resolve(true);
      }

      // Create live gaze dot indicator element
      createGazeDot();

      var timedOut = false;
      var timer = setTimeout(function () {
        timedOut = true;
        console.warn('Webcam initialization timed out; falling back to simulation mode.');
        enableSimulationMode();
        if (opts.onReady) opts.onReady({ camera: false, simulated: true });
        resolve(false);
      }, 2500);

      loadWebGazerScript().then(function (wg) {
        // Configure WebGazer
        wg.setRegression('ridge')
          .setTracker('TFFacemesh')
          .setGazeListener(onGazeSample);

        // Hide default webgazer canvas/video overlays until needed
        wg.showVideoPreview(false)
          .showPredictionPoints(false);

        wg.begin().then(function () {
          if (timedOut) return;
          clearTimeout(timer);
          state.initialized = true;
          state.cameraReady = true;
          if (opts.onReady) opts.onReady({ camera: true });
          resolve(true);
        }).catch(function (err) {
          if (timedOut) return;
          clearTimeout(timer);
          console.warn('Webcam initialization failed or denied:', err);
          enableSimulationMode();
          if (opts.onReady) opts.onReady({ camera: false, simulated: true, error: err });
          resolve(false);
        });
      }).catch(function (err) {
        if (timedOut) return;
        clearTimeout(timer);
        console.warn('WebGazer script loading failed:', err);
        enableSimulationMode();
        if (opts.onReady) opts.onReady({ camera: false, simulated: true, error: err });
        resolve(false);
      });
    });
  }

  /* Fallback simulation mode using mouse coordinates as gaze approximation */
  function enableSimulationMode() {
    state.initialized = true;
    state.simulated = true;
    state.cameraReady = false;
    window.addEventListener('mousemove', function (e) {
      onGazeSample({ x: e.clientX, y: e.clientY }, performance.now());
    });
  }

  /* Central gaze listener */
  function onGazeSample(data, elapsedTime) {
    if (!data) return;

    var rawX = data.x;
    var rawY = data.y;

    // Apply Exponential Moving Average (EMA) smoothing to eliminate micro-jitter
    if (state.gazeX === 0 && state.gazeY === 0) {
      state.gazeX = rawX;
      state.gazeY = rawY;
    } else {
      state.gazeX = state.gazeX + state.smoothingAlpha * (rawX - state.gazeX);
      state.gazeY = state.gazeY + state.smoothingAlpha * (rawY - state.gazeY);
    }

    var gx = Math.round(state.gazeX);
    var gy = Math.round(state.gazeY);

    // Update floating gaze dot if enabled
    if (gazeDotEl && state.showGazeDot) {
      gazeDotEl.style.transform = 'translate3d(' + (gx - 12) + 'px,' + (gy - 12) + 'px,0)';
      gazeDotEl.style.display = 'block';
    } else if (gazeDotEl) {
      gazeDotEl.style.display = 'none';
    }

    // Determine target element under gaze (Area of Interest)
    var aoi = detectAOI(gx, gy);

    // If recording a trial, buffer the sample
    if (state.recording) {
      var now = performance.now();
      // Cap sampling rate at ~30Hz (every 33ms) to keep data lightweight
      if (now - state.lastSampleTime >= 30) {
        state.lastSampleTime = now;
        trialBuffer.push({
          t: Math.round(now - trialStart),
          x: gx,
          y: gy,
          target: aoi
        });
      }
    }

    // Notify registered listeners
    for (var i = 0; i < gazeListeners.length; i++) {
      gazeListeners[i]({ x: gx, y: gy, target: aoi, elapsed: elapsedTime });
    }
  }

  /* Detect Area of Interest (AOI) from point */
  function detectAOI(x, y) {
    if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) return 'off-screen';
    var el = document.elementFromPoint(x, y);
    if (!el) return 'background';

    // Check for puzzle figures
    var fig = el.closest('.fig');
    if (fig) {
      var fcap = fig.querySelector('.flab') || fig.querySelector('.cap b');
      return fcap ? 'fig-' + fcap.textContent.trim() : 'figure';
    }
    // Check for answer options
    var opt = el.closest('.opt');
    if (opt) {
      var ocap = opt.querySelector('.lbl') || opt.querySelector('.cap b');
      return ocap ? 'option-' + ocap.textContent.trim() : 'option';
    }
    // Check for hint panel / player
    if (el.closest('.hpanel') || el.closest('.hint-root')) {
      return 'hint';
    }
    // Check for confirm/action bar
    if (el.closest('.qfoot') || el.closest('.sbar')) {
      return 'navigation';
    }
    return el.tagName.toLowerCase();
  }

  /* Create live visual gaze dot */
  function createGazeDot() {
    if (gazeDotEl) return;
    gazeDotEl = document.createElement('div');
    gazeDotEl.id = 'ta-live-gaze-dot';
    gazeDotEl.style.cssText =
      'position:fixed;top:0;left:0;width:24px;height:24px;border-radius:50%;' +
      'background:radial-gradient(circle, rgba(255, 64, 85, 0.9) 20%, rgba(165, 151, 255, 0.5) 60%, transparent 100%);' +
      'box-shadow:0 0 14px rgba(255, 64, 85, 0.8), inset 0 0 4px #fff;' +
      'pointer-events:none;z-index:99999;display:none;transition:transform 0.04s ease-out;';
    document.body.appendChild(gazeDotEl);
  }

  /* Toggle live gaze dot on screen */
  function setShowGazeDot(show) {
    state.showGazeDot = !!show;
    if (gazeDotEl) gazeDotEl.style.display = state.showGazeDot ? 'block' : 'none';
  }

  /* Start recording gaze for a trial */
  function startRecording() {
    trialBuffer = [];
    trialStart = performance.now();
    state.lastSampleTime = trialStart;
    state.recording = true;
  }

  /* Stop recording and return structured gaze data + fixations + AOI stats */
  function stopRecording() {
    state.recording = false;
    var samples = trialBuffer.slice();
    trialBuffer = [];

    // Calculate fixations using I-DT
    var fixations = HeatmapEngine.computeFixations(samples);

    // Compute AOI summary metrics
    var aoiSummary = HeatmapEngine.computeAOIMetrics(samples, {
      figA: { target: 'fig-A', name: 'Figure A' },
      figB: { target: 'fig-B', name: 'Figure B' },
      figC: { target: 'fig-C', name: 'Figure C' },
      option1: { target: 'option-1', name: 'Option 1' },
      option2: { target: 'option-2', name: 'Option 2' },
      option3: { target: 'option-3', name: 'Option 3' },
      option4: { target: 'option-4', name: 'Option 4' },
      hints: { target: 'hint', name: 'Hints' }
    });

    return {
      samples: samples,
      fixations: fixations,
      aoiMetrics: aoiSummary,
      sampleCount: samples.length,
      fixationCount: fixations.length
    };
  }

  /* Add temporary listener */
  function addGazeListener(fn) {
    if (typeof fn === 'function') gazeListeners.push(fn);
  }
  function removeGazeListener(fn) {
    gazeListeners = gazeListeners.filter(function (l) { return l !== fn; });
  }

  /* 9-Point Calibration Module */
  function createCalibrationModal(container, onComplete) {
    var modal = document.createElement('div');
    modal.className = 'gaze-calib-modal';
    modal.innerHTML =
      '<div class="gaze-calib-head">' +
        '<div class="eyebrow">Laptop Camera Eye Tracking</div>' +
        '<h3 class="ptitle">Webcam Eye-Tracker Calibration</h3>' +
        '<p class="meta wrap">Follow each yellow dot with your eyes and click each dot 5 times until it turns green.</p>' +
      '</div>' +
      '<div class="gaze-calib-field" id="gazeCalibField"></div>' +
      '<div class="gaze-calib-foot edge">' +
        '<div class="l meta" id="gazeCalibStatus">Click dot 1 of 9</div>' +
        '<div class="r">' +
          '<button type="button" class="ibtn tb" id="gazeSkipBtn">Skip Calibration</button>' +
        '</div>' +
      '</div>';

    var parent = container || document.body;
    parent.appendChild(modal);

    var field = modal.querySelector('#gazeCalibField');
    var status = modal.querySelector('#gazeCalibStatus');
    var skipBtn = modal.querySelector('#gazeSkipBtn');

    // 9 Calibration Point Coordinates (% of width and height)
    var points = [
      { x: 10, y: 10 }, { x: 50, y: 10 }, { x: 90, y: 10 },
      { x: 10, y: 50 }, { x: 50, y: 50 }, { x: 90, y: 50 },
      { x: 10, y: 88 }, { x: 50, y: 88 }, { x: 90, y: 88 }
    ];

    var clicksNeeded = 5;
    var currentPointIdx = 0;
    var currentClicks = 0;

    function renderActivePoint() {
      field.innerHTML = '';
      if (currentPointIdx >= points.length) {
        // Calibration Finished
        status.innerHTML = '<span class="pill ok">Calibration complete! Eye tracking active.</span>';
        state.calibrated = true;
        setTimeout(function () {
          if (modal.parentNode) modal.parentNode.removeChild(modal);
          if (onComplete) onComplete(true);
        }, 800);
        return;
      }

      var pt = points[currentPointIdx];
      var dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'gaze-calib-dot';
      dot.style.left = pt.x + '%';
      dot.style.top = pt.y + '%';
      dot.innerHTML = '<span class="count">' + (clicksNeeded - currentClicks) + '</span>';
      dot.setAttribute('aria-label', 'Calibration point ' + (currentPointIdx + 1));

      dot.onclick = function (e) {
        currentClicks++;
        var rect = dot.getBoundingClientRect();
        var cx = rect.left + rect.width / 2;
        var cy = rect.top + rect.height / 2;

        // Feed click position to WebGazer ridge regression
        if (window.webgazer && window.webgazer.recordScreenPosition) {
          window.webgazer.recordScreenPosition(cx, cy, 'click');
        }

        if (currentClicks >= clicksNeeded) {
          dot.classList.add('done');
          currentPointIdx++;
          currentClicks = 0;
          status.textContent = 'Dot ' + Math.min(points.length, currentPointIdx + 1) + ' of ' + points.length;
          setTimeout(renderActivePoint, 200);
        } else {
          dot.querySelector('.count').textContent = (clicksNeeded - currentClicks);
          dot.style.transform = 'translate(-50%, -50%) scale(' + (1 + currentClicks * 0.12) + ')';
        }
      };

      field.appendChild(dot);
      status.textContent = 'Dot ' + (currentPointIdx + 1) + ' of ' + points.length + ' (' + (clicksNeeded - currentClicks) + ' clicks remaining)';
    }

    skipBtn.onclick = function () {
      if (modal.parentNode) modal.parentNode.removeChild(modal);
      state.calibrated = false;
      if (onComplete) onComplete(false);
    };

    renderActivePoint();
  }

  return {
    init: init,
    isSupported: isSupported,
    setShowGazeDot: setShowGazeDot,
    startRecording: startRecording,
    stopRecording: stopRecording,
    addGazeListener: addGazeListener,
    removeGazeListener: removeGazeListener,
    createCalibrationModal: createCalibrationModal,
    getState: function () { return Object.assign({}, state); }
  };
})();
