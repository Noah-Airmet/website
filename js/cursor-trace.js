/**
 * Cursor-following particle grid background.
 *
 * Self-initializing — include via <script> and it handles everything:
 * creates the canvas, runs the animation loop, and cleans up on unload.
 *
 * Tuning guide (adjust constants below):
 *   Calmer feel  → raise FRICTION (0.90), lower REPULSION_FORCE (0.15)
 *   More active  → lower FRICTION (0.80), raise REPULSION_FORCE (0.35)
 *   Tighter snap → raise SPRING (0.08)
 *   Looser float → lower SPRING (0.03)
 *   Wider reach  → raise INTERACTION_RADIUS (220)
 *   Denser grid  → lower SPACING (35)
 *   Sparser grid → raise SPACING (55)
 */
(function () {
  'use strict';

  // ── Configurable constants ──
  var SPACING            = 45;
  var INTERACTION_RADIUS = 180;
  var REPULSION_FORCE    = 0.25;
  var SPRING             = 0.05;
  var FRICTION           = 0.85;
  var CURSOR_MASK_RADIUS = 50;

  // Visual tuning — adapted for a light editorial palette
  var BG_COLOR           = '#f8f7f4';
  var DOT_BASE_SIZE      = 1.2;
  var DOT_MAX_GROWTH     = 1.0;
  var DOT_BASE_OPACITY   = 0.1;
  var DOT_MAX_OPACITY    = 0.38;
  var ACCENT_THRESHOLD   = 10;
  var GLOW_BLUR          = 6;

  // Both states use the nav hover emphasis color: navy primary (#1a1f36)
  var COLOR_BASE_R   = 26,  COLOR_BASE_G   = 31,  COLOR_BASE_B   = 54;
  var COLOR_ACCENT_R = 26,  COLOR_ACCENT_G = 31,  COLOR_ACCENT_B = 54;

  // ── State ──
  var canvas, ctx, dpr;
  var particles = [];
  var pointer = { x: -1000, y: -1000 };
  var frame = 0;

  function initCanvas() {
    canvas = document.createElement('canvas');
    canvas.id = 'cursor-trace';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.insertBefore(canvas, document.body.firstChild);

    ctx = canvas.getContext('2d', { alpha: false });
    dpr = window.devicePixelRatio || 1;
  }

  function initParticles() {
    particles = [];
    var w = canvas.width / dpr;
    var h = canvas.height / dpr;
    var cols = Math.floor(w / SPACING) + 2;
    var rows = Math.floor(h / SPACING) + 2;
    var offsetX = (w - (cols - 1) * SPACING) / 2;
    var offsetY = (h - (rows - 1) * SPACING) / 2;

    for (var i = 0; i < cols; i++) {
      for (var j = 0; j < rows; j++) {
        var x = offsetX + i * SPACING;
        var y = offsetY + j * SPACING;
        particles.push({ ox: x, oy: y, x: x, y: y, vx: 0, vy: 0 });
      }
    }
  }

  function resize() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    initParticles();
  }

  function onMove(e) {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
  }

  function onLeave() {
    pointer.x = -1000;
    pointer.y = -1000;
  }

  function render() {
    frame = requestAnimationFrame(render);

    var w = canvas.width / dpr;
    var h = canvas.height / dpr;

    ctx.fillStyle = BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    var tX = pointer.x;
    var tY = pointer.y;

    for (var i = 0, len = particles.length; i < len; i++) {
      var p = particles[i];
      var dx = 0, dy = 0, distance = Infinity;

      if (tX !== -1000) {
        dx = p.x - tX;
        dy = p.y - tY;
        distance = Math.sqrt(dx * dx + dy * dy);
      }

      if (distance < INTERACTION_RADIUS) {
        var clamped = Math.max(distance, 30);
        var force = (INTERACTION_RADIUS - clamped) / INTERACTION_RADIUS;
        var angle = Math.atan2(dy, dx);
        p.vx += Math.cos(angle) * force * REPULSION_FORCE * 6;
        p.vy += Math.sin(angle) * force * REPULSION_FORCE * 6;
      }

      p.vx += (p.ox - p.x) * SPRING;
      p.vy += (p.oy - p.y) * SPRING;
      p.vx *= FRICTION;
      p.vy *= FRICTION;
      p.x += p.vx;
      p.y += p.vy;

      var dispX = p.x - p.ox;
      var dispY = p.y - p.oy;
      var displacement = Math.sqrt(dispX * dispX + dispY * dispY);

      var size = DOT_BASE_SIZE;
      var opacity = DOT_BASE_OPACITY;

      if (displacement > 0.5) {
        var intensity = Math.min(displacement / 25, 1);
        size = DOT_BASE_SIZE + intensity * DOT_MAX_GROWTH;
        opacity = DOT_BASE_OPACITY + intensity * (DOT_MAX_OPACITY - DOT_BASE_OPACITY);
      }

      if (distance < CURSOR_MASK_RADIUS) {
        opacity *= distance / CURSOR_MASK_RADIUS;
      }

      var r, g, b;
      if (displacement > ACCENT_THRESHOLD) {
        r = COLOR_ACCENT_R;
        g = COLOR_ACCENT_G;
        b = COLOR_ACCENT_B;
        ctx.shadowBlur = GLOW_BLUR;
        ctx.shadowColor = 'rgba(' + r + ',' + g + ',' + b + ',' + (opacity * 0.4) + ')';
      } else {
        r = COLOR_BASE_R;
        g = COLOR_BASE_G;
        b = COLOR_BASE_B;
        ctx.shadowBlur = 0;
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + opacity + ')';
      ctx.fill();
      ctx.shadowBlur = 0;
    }
  }

  function start() {
    initCanvas();
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseleave', onLeave);
    render();
  }

  function cleanup() {
    cancelAnimationFrame(frame);
    window.removeEventListener('resize', resize);
    window.removeEventListener('mousemove', onMove);
    window.removeEventListener('mouseleave', onLeave);
    if (canvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }

  window.addEventListener('beforeunload', cleanup);
})();
