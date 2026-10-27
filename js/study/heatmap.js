/* Gaze Heatmap & Scanpath Engine
   High-performance pure Canvas 2D engine for rendering dwell-time heatmaps,
   fixation scanpaths, and computing Area-of-Interest (AOI) metrics.
   Zero external dependencies. Works on both live web pages and reconstructed SVG/DOM layouts. */
var HeatmapEngine = (function () {
  'use strict';

  /* Default color palette from cool cyan to hot red */
  var DEFAULT_GRADIENT = [
    { stop: 0.0, r: 0,   g: 100, b: 255, a: 0.0 },
    { stop: 0.2, r: 0,   g: 210, b: 255, a: 0.4 },
    { stop: 0.45, r: 40,  g: 240, b: 120, a: 0.65 },
    { stop: 0.7, r: 255, g: 220, b: 0,   a: 0.82 },
    { stop: 0.88, r: 255, g: 100, b: 20,  a: 0.92 },
    { stop: 1.0, r: 255, g: 30,  b: 60,  a: 0.98 }
  ];

  /* Build 256-entry RGBA lookup table for color mapping */
  function buildPalette(gradient) {
    var grad = gradient || DEFAULT_GRADIENT;
    var canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 1;
    var ctx = canvas.getContext('2d');
    var linear = ctx.createLinearGradient(0, 0, 256, 0);
    grad.forEach(function (g) {
      linear.addColorStop(g.stop, 'rgba(' + g.r + ',' + g.g + ',' + g.b + ',' + g.a + ')');
    });
    ctx.fillStyle = linear;
    ctx.fillRect(0, 0, 256, 1);
    return ctx.getImageData(0, 0, 256, 1).data;
  }

  var paletteCache = buildPalette(DEFAULT_GRADIENT);

  /* Identification by Dispersion Threshold (I-DT)
     Groups consecutive raw gaze samples into stable fixations. */
  function computeFixations(samples, options) {
    if (!samples || !samples.length) return [];
    var opts = options || {};
    var maxDispersion = opts.maxDispersion || 45; // max pixel distance to stay in same fixation
    var minDuration = opts.minDuration || 100;     // min duration (ms) for a fixation
    var fixations = [];
    var currentGroup = [];

    for (var i = 0; i < samples.length; i++) {
      var pt = samples[i];
      if (currentGroup.length === 0) {
        currentGroup.push(pt);
        continue;
      }
      // Calculate bounding box of current group including candidate point
      var xs = currentGroup.map(function (p) { return p.x; }).concat(pt.x);
      var ys = currentGroup.map(function (p) { return p.y; }).concat(pt.y);
      var minX = Math.min.apply(null, xs), maxX = Math.max.apply(null, xs);
      var minY = Math.min.apply(null, ys), maxY = Math.max.apply(null, ys);
      var dispersion = (maxX - minX) + (maxY - minY);

      if (dispersion <= maxDispersion) {
        currentGroup.push(pt);
      } else {
        // End current fixation if duration >= minDuration
        var t0 = currentGroup[0].t;
        var t1 = currentGroup[currentGroup.length - 1].t;
        var duration = Math.max(30, t1 - t0);
        if (duration >= minDuration || currentGroup.length >= 3) {
          var meanX = xs.slice(0, -1).reduce(function (a, b) { return a + b; }, 0) / (xs.length - 1);
          var meanY = ys.slice(0, -1).reduce(function (a, b) { return a + b; }, 0) / (ys.length - 1);
          fixations.push({
            id: fixations.length + 1,
            x: Math.round(meanX),
            y: Math.round(meanY),
            t: t0,
            duration: duration,
            samplesCount: currentGroup.length,
            target: currentGroup[0].target || null
          });
        }
        currentGroup = [pt];
      }
    }

    if (currentGroup.length >= 2) {
      var lastT0 = currentGroup[0].t;
      var lastT1 = currentGroup[currentGroup.length - 1].t;
      var lastDur = Math.max(30, lastT1 - lastT0);
      var lastXs = currentGroup.map(function (p) { return p.x; });
      var lastYs = currentGroup.map(function (p) { return p.y; });
      fixations.push({
        id: fixations.length + 1,
        x: Math.round(lastXs.reduce(function (a, b) { return a + b; }, 0) / lastXs.length),
        y: Math.round(lastYs.reduce(function (a, b) { return a + b; }, 0) / lastYs.length),
        t: lastT0,
        duration: lastDur,
        samplesCount: currentGroup.length,
        target: currentGroup[0].target || null
      });
    }

    return fixations;
  }

  /* Compute Area of Interest (AOI) Dwell Times */
  function computeAOIMetrics(samples, aoiDefinitions) {
    var metrics = {};
    if (!aoiDefinitions) return metrics;

    var aoiKeys = Object.keys(aoiDefinitions);
    aoiKeys.forEach(function (key) {
      metrics[key] = {
        name: aoiDefinitions[key].name || key,
        dwellTimeMs: 0,
        fixationsCount: 0,
        ttffMs: null, // Time to First Fixation
        samplesCount: 0,
        pctTotal: 0
      };
    });
    metrics.other = {
      name: 'Other',
      dwellTimeMs: 0,
      fixationsCount: 0,
      ttffMs: null,
      samplesCount: 0,
      pctTotal: 0
    };

    if (!samples || !samples.length) return metrics;

    var totalTime = samples[samples.length - 1].t - samples[0].t;
    if (totalTime <= 0) totalTime = 1;

    for (var i = 0; i < samples.length; i++) {
      var s = samples[i];
      var nextT = i < samples.length - 1 ? samples[i + 1].t : s.t + 33;
      var dt = Math.min(100, Math.max(10, nextT - s.t));
      var matchedKey = null;

      for (var k = 0; k < aoiKeys.length; k++) {
        var aoi = aoiDefinitions[aoiKeys[k]];
        if (aoi.bounds) {
          var b = aoi.bounds;
          if (s.x >= b.x && s.x <= b.x + b.width && s.y >= b.y && s.y <= b.y + b.height) {
            matchedKey = aoiKeys[k];
            break;
          }
        } else if (aoi.target && s.target === aoi.target) {
          matchedKey = aoiKeys[k];
          break;
        }
      }

      var bucket = matchedKey ? metrics[matchedKey] : metrics.other;
      bucket.dwellTimeMs += dt;
      bucket.samplesCount++;
      if (bucket.ttffMs === null) {
        bucket.ttffMs = s.t;
      }
    }

    var totalDwell = 0;
    Object.keys(metrics).forEach(function (k) { totalDwell += metrics[k].dwellTimeMs; });
    if (totalDwell > 0) {
      Object.keys(metrics).forEach(function (k) {
        metrics[k].pctTotal = Math.round((metrics[k].dwellTimeMs / totalDwell) * 100);
      });
    }

    return metrics;
  }

  /* Render Dwell-Time Heatmap onto a <canvas> */
  function renderHeatmap(canvas, pointsOrFixations, options) {
    if (!canvas) return;
    var opts = options || {};
    var width = opts.width || canvas.width;
    var height = opts.height || canvas.height;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    var ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, width, height);

    if (!pointsOrFixations || !pointsOrFixations.length) return;

    var radius = opts.radius || 36;
    var opacity = opts.opacity != null ? opts.opacity : 0.82;
    var minDwell = opts.minDwell || 0;
    var maxDwell = opts.maxDwell || 1800; // saturation dwell time in ms

    // Offscreen canvas for grayscale/alpha accumulation
    var offCanvas = document.createElement('canvas');
    offCanvas.width = width;
    offCanvas.height = height;
    var offCtx = offCanvas.getContext('2d');

    // Create reusable radial brush
    var brushCanvas = document.createElement('canvas');
    var brushRadius = radius * 2;
    brushCanvas.width = brushRadius * 2;
    brushCanvas.height = brushRadius * 2;
    var brushCtx = brushCanvas.getContext('2d');
    var grad = brushCtx.createRadialGradient(brushRadius, brushRadius, 0, brushRadius, brushRadius, brushRadius);
    grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    brushCtx.fillStyle = grad;
    brushCtx.fillRect(0, 0, brushRadius * 2, brushRadius * 2);

    // Draw each point scaled by dwell time
    pointsOrFixations.forEach(function (pt) {
      var dwell = pt.duration != null ? pt.duration : (pt.dwell != null ? pt.dwell : 50);
      if (dwell < minDwell) return;

      var weight = Math.min(1.0, Math.max(0.12, dwell / maxDwell));
      offCtx.globalAlpha = weight * 0.7;
      offCtx.drawImage(
        brushCanvas,
        pt.x - brushRadius,
        pt.y - brushRadius,
        brushRadius * 2,
        brushRadius * 2
      );
    });

    // Colorize alpha intensity via palette lookup
    var imgData = offCtx.getImageData(0, 0, width, height);
    var pixels = imgData.data;
    var palette = opts.palette || paletteCache;

    for (var i = 0, len = pixels.length; i < len; i += 4) {
      var alpha = pixels[i + 3];
      if (alpha > 0) {
        var palIdx = alpha * 4;
        pixels[i]     = palette[palIdx];     // Red
        pixels[i + 1] = palette[palIdx + 1]; // Green
        pixels[i + 2] = palette[palIdx + 2]; // Blue
        pixels[i + 3] = Math.round(alpha * opacity); // Alpha
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }

  /* Render Scanpath (Fixation Bubbles + Saccade Vectors) */
  function renderScanpath(canvas, fixations, options) {
    if (!canvas) return;
    var opts = options || {};
    var width = opts.width || canvas.width;
    var height = opts.height || canvas.height;
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;

    var ctx = canvas.getContext('2d');
    if (!opts.keepHeatmap) {
      ctx.clearRect(0, 0, width, height);
    }

    if (!fixations || !fixations.length) return;

    var maxStep = opts.maxStep != null ? opts.maxStep : fixations.length;
    var activeFixations = fixations.slice(0, maxStep);
    if (!activeFixations.length) return;

    // Draw Saccade Connecting Lines
    ctx.save();
    ctx.strokeStyle = opts.saccadeColor || 'rgba(165, 151, 255, 0.75)';
    ctx.lineWidth = opts.lineWidth || 2.5;
    ctx.setLineDash([4, 3]);

    ctx.beginPath();
    ctx.moveTo(activeFixations[0].x, activeFixations[0].y);
    for (var i = 1; i < activeFixations.length; i++) {
      ctx.lineTo(activeFixations[i].x, activeFixations[i].y);
    }
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // Draw direction arrows on saccades
    for (var j = 1; j < activeFixations.length; j++) {
      var p0 = activeFixations[j - 1], p1 = activeFixations[j];
      var angle = Math.atan2(p1.y - p0.y, p1.x - p0.x);
      var midX = (p0.x + p1.x) / 2, midY = (p0.y + p1.y) / 2;
      drawArrowHead(ctx, midX, midY, angle, 9, opts.saccadeColor || 'rgba(199, 155, 255, 0.9)');
    }

    // Draw Fixation Circles (sized by duration)
    activeFixations.forEach(function (f, idx) {
      var dur = f.duration || 100;
      // Radius scale: min 14px, max 36px
      var r = Math.min(36, Math.max(13, 11 + Math.sqrt(dur) * 0.65));
      var isLatest = (idx === activeFixations.length - 1);

      // Outer glow / pulse if latest
      if (isLatest) {
        ctx.beginPath();
        ctx.arc(f.x, f.y, r + 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 230, 0, 0.35)';
        ctx.fill();
      }

      // Circle fill
      ctx.beginPath();
      ctx.arc(f.x, f.y, r, 0, Math.PI * 2);
      ctx.fillStyle = isLatest ? '#ffea00' : 'rgba(21, 21, 30, 0.88)';
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = isLatest ? '#ff4055' : 'rgba(165, 151, 255, 0.95)';
      ctx.stroke();

      // Number badge
      ctx.fillStyle = isLatest ? '#0b0b10' : '#f4f1ea';
      ctx.font = 'bold ' + (r > 18 ? '13px' : '11px') + ' "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(f.id || (idx + 1)), f.x, f.y);

      // Small duration sublabel underneath if big enough
      if (opts.showDwell && dur >= 150) {
        ctx.font = '10px "Public Sans", sans-serif';
        ctx.fillStyle = 'rgba(244, 241, 234, 0.8)';
        ctx.fillText(Math.round(dur) + 'ms', f.x, f.y + r + 11);
      }
    });

    ctx.restore();
  }

  function drawArrowHead(ctx, x, y, angle, size, color) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-size, -size / 2);
    ctx.lineTo(-size, size / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  return {
    computeFixations: computeFixations,
    computeAOIMetrics: computeAOIMetrics,
    renderHeatmap: renderHeatmap,
    renderScanpath: renderScanpath,
    buildPalette: buildPalette
  };
})();
