(function () {
  'use strict';

  var reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  if (reducedMotion || !finePointer || window.innerWidth < 760) return;

  var canvas = document.createElement('canvas');
  canvas.className = 'ambient-field';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.prepend(canvas);

  var ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) {
    canvas.remove();
    return;
  }

  var dpr = 1;
  var width = 0;
  var height = 0;
  var points = [];
  var raf = 0;
  var needsFrame = false;
  var presence = 0;
  var motion = 0;
  var pointer = {
    active: false,
    x: -1000,
    y: -1000,
    sx: -1000,
    sy: -1000,
    vx: 0,
    vy: 0,
    lastX: -1000,
    lastY: -1000,
    lastMove: 0
  };
  var moveCount = 0;

  function rand(seed) {
    var x = Math.sin(seed * 12.9898) * 43758.5453;
    return x - Math.floor(x);
  }

  function buildField() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.6);
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    var spacing = width > 1180 ? 46 : 42;
    var cols = Math.ceil(width / spacing) + 2;
    var rows = Math.ceil(height / spacing) + 2;
    points = [];

    for (var y = -1; y < rows; y += 1) {
      for (var x = -1; x < cols; x += 1) {
        var seed = (x + 31) * 97 + (y + 43) * 131;
        var px = x * spacing + (rand(seed) - 0.5) * 8;
        var py = y * spacing + (rand(seed + 7) - 0.5) * 8;

        points.push({
          baseX: px,
          baseY: py,
          x: px,
          y: py,
          vx: 0,
          vy: 0,
          phase: rand(seed + 17) * Math.PI * 2
        });
      }
    }

    draw(0);
  }

  function schedule() {
    if (!raf) raf = window.requestAnimationFrame(tick);
  }

  function wake() {
    needsFrame = true;
    schedule();
  }

  function onPointerMove(event) {
    var now = performance.now();

    pointer.active = true;
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    moveCount += 1;
    canvas.dataset.motion = String(moveCount);

    if (pointer.lastMove) {
      pointer.vx = pointer.x - pointer.lastX;
      pointer.vy = pointer.y - pointer.lastY;
      motion = Math.min(1, motion + Math.min(1, Math.hypot(pointer.vx, pointer.vy) / 32) * 0.45 + 0.04);
    } else {
      pointer.sx = pointer.x;
      pointer.sy = pointer.y;
      motion = 0.18;
    }

    pointer.lastX = pointer.x;
    pointer.lastY = pointer.y;
    pointer.lastMove = now;
    wake();
  }

  function onPointerLeave() {
    pointer.active = false;
    wake();
  }

  function draw(maxEnergy) {
    ctx.clearRect(0, 0, width, height);

    if (maxEnergy < 0.01 && presence < 0.01) return;

    var now = performance.now();
    var pointerGlow = presence;
    var gradient = null;

    if (pointerGlow > 0) {
      gradient = ctx.createRadialGradient(pointer.sx, pointer.sy, 0, pointer.sx, pointer.sy, 340);
      gradient.addColorStop(0, 'rgba(40, 111, 108, ' + (0.115 * pointerGlow).toFixed(3) + ')');
      gradient.addColorStop(0.42, 'rgba(40, 111, 108, ' + (0.045 * pointerGlow).toFixed(3) + ')');
      gradient.addColorStop(1, 'rgba(40, 111, 108, 0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    }

    for (var i = 0; i < points.length; i += 1) {
      var p = points[i];
      var dx = p.x - p.baseX;
      var dy = p.y - p.baseY;
      var pdx = p.x - pointer.sx;
      var pdy = p.y - pointer.sy;
      var pointerDistance = Math.hypot(pdx, pdy);
      var nearPointer = pointerGlow > 0 && pointerDistance < 330
        ? Math.pow(1 - pointerDistance / 330, 2) * pointerGlow
        : 0;
      var energy = Math.min(1, Math.hypot(dx, dy) / 28);
      var pulse = 0.55 + Math.sin(now * 0.0014 + p.phase) * 0.45;
      var alpha = energy * 0.1 + nearPointer * (0.035 + pulse * 0.032);

      if (alpha < 0.004 && energy < 0.08) continue;

      if (energy > 0.08) {
        ctx.beginPath();
        ctx.moveTo(p.baseX, p.baseY);
        ctx.lineTo(p.x, p.y);
        ctx.strokeStyle = 'rgba(23, 32, 51, ' + Math.min(0.09, energy * 0.06).toFixed(3) + ')';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, 0.95 + energy * 0.9 + nearPointer * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(23, 32, 51, ' + alpha.toFixed(3) + ')';
      ctx.fill();
    }
  }

  function tick() {
    raf = 0;

    var targetPresence = pointer.active ? 1 : 0;
    var presenceEase = targetPresence > presence ? 0.075 : 0.045;
    presence += (targetPresence - presence) * presenceEase;
    canvas.dataset.presence = presence.toFixed(3);

    pointer.sx += (pointer.x - pointer.sx) * 0.14;
    pointer.sy += (pointer.y - pointer.sy) * 0.14;

    var influence = pointer.active ? motion : 0;
    var speed = Math.min(42, Math.hypot(pointer.vx, pointer.vy));
    var radius = 150 + speed * 2.2;
    var maxEnergy = 0;

    for (var i = 0; i < points.length; i += 1) {
      var p = points[i];
      var dx = p.x - pointer.sx;
      var dy = p.y - pointer.sy;
      var dist = Math.hypot(dx, dy) || 1;

      if (influence > 0 && dist < radius) {
        var falloff = Math.pow(1 - dist / radius, 2);
        var nx = dx / dist;
        var ny = dy / dist;
        var drag = Math.min(1, speed / 24);

        p.vx += nx * falloff * (0.34 + drag * 0.32) * influence;
        p.vy += ny * falloff * (0.34 + drag * 0.32) * influence;
        p.vx += pointer.vx * falloff * 0.022 * influence;
        p.vy += pointer.vy * falloff * 0.022 * influence;
        p.vx += -ny * falloff * 0.18 * influence;
        p.vy += nx * falloff * 0.18 * influence;
      }

      p.vx += (p.baseX - p.x) * 0.035;
      p.vy += (p.baseY - p.y) * 0.035;
      p.vx *= 0.86;
      p.vy *= 0.86;
      p.x += p.vx;
      p.y += p.vy;

      maxEnergy = Math.max(maxEnergy, Math.abs(p.vx) + Math.abs(p.vy) + Math.hypot(p.x - p.baseX, p.y - p.baseY) * 0.035);
    }

    draw(maxEnergy);

    pointer.vx *= 0.74;
    pointer.vy *= 0.74;
    motion *= 0.9;

    var cursorStillSettling = Math.abs(pointer.x - pointer.sx) + Math.abs(pointer.y - pointer.sy) > 0.35;
    var presenceStillSettling = Math.abs(targetPresence - presence) > 0.005;

    if (needsFrame || cursorStillSettling || presenceStillSettling || motion > 0.01 || maxEnergy > 0.012) {
      needsFrame = false;
      schedule();
    }
  }

  buildField();
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('pointerleave', onPointerLeave);
  window.addEventListener('blur', onPointerLeave);
  window.addEventListener('resize', function () {
    if (window.innerWidth < 760) {
      canvas.remove();
      return;
    }

    if (!canvas.isConnected) document.body.prepend(canvas);
    buildField();
    wake();
  });
})();
