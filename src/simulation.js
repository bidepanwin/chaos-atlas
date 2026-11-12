/**
 * CHAOS ATLAS — deterministic, dependency-free canvas experiments.
 * Lorenz uses RK4 integration; flow follows an analytic stream function;
 * particle life uses finite-range forces on a periodic spatial grid.
 */
const TAU = Math.PI * 2;
const BACKGROUND = '#0a0e0d';
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const PALETTES = {
  lichen: ['#d5ed9d', '#9fcfa5', '#eef0d8', '#6f9e86'],
  glacier: ['#b5ddec', '#80aac9', '#e0eee9', '#8c97bd'],
  rose: ['#e2a4bc', '#b48aa8', '#f3dce4', '#9b7e9f'],
  ember: ['#ffba89', '#e57c78', '#f4e4b9', '#b990a9'],
  mono: ['#f0eee1', '#acb6b0', '#d2d5c8', '#7a8982'],
};
const SCENES = ['lorenz', 'flow', 'life'];

function randomSource(seed) {
  let a = seed >>> 0;
  return () => {
    a += 0x6d2b79f5;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function rgb(hex) {
  return [1, 3, 5].map((start) => parseInt(hex.slice(start, start + 2), 16)).join(',');
}

function derivative(x, y, z, rho) {
  return [10 * (y - x), x * (rho - z) - y, x * y - (8 / 3) * z];
}

function lorenzStep(x, y, z, dt, rho) {
  const a = derivative(x, y, z, rho);
  const b = derivative(x + a[0] * dt / 2, y + a[1] * dt / 2, z + a[2] * dt / 2, rho);
  const c = derivative(x + b[0] * dt / 2, y + b[1] * dt / 2, z + b[2] * dt / 2, rho);
  const d = derivative(x + c[0] * dt, y + c[1] * dt, z + c[2] * dt, rho);
  return [
    x + dt * (a[0] + 2 * b[0] + 2 * c[0] + d[0]) / 6,
    y + dt * (a[1] + 2 * b[1] + 2 * c[1] + d[1]) / 6,
    z + dt * (a[2] + 2 * b[2] + 2 * c[2] + d[2]) / 6,
  ];
}

export class Simulation {
  constructor(canvas, { onStats } = {}) {
    if (!canvas?.getContext) throw new TypeError('Simulation requires a canvas.');
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false });
    if (!this.ctx) throw new Error('Canvas 2D is unavailable in this browser.');
    this.onStats = typeof onStats === 'function' ? onStats : () => {};
    this.scene = 'lorenz';
    this.palette = 'lichen';
    this.seed = 271828;
    this.parameters = { speed: 1, density: 1, force: 1 };
    this.running = true;
    this.reducedMotion = false;
    this.elapsed = 0;
    this.activity = 0;
    this.trace = Array(48).fill(0);
    this.width = 1;
    this.height = 1;
    this.aspect = 1;
    this.zoom = 1;
    this.yawOffset = 0;
    this.pitchOffset = 0;
    this.pointer = { active: false, down: false, x: 0, y: 0 };
    this._fps = 0;
    this._lastTime = null;
    this._lastStats = 0;
    this._accumulator = 0;
    this._destroyed = false;
    this._projected = [];
    this._lastPointer = null;
    this._tick = this._tick.bind(this);
    this._onPointerMove = this._onPointerMove.bind(this);
    this._onPointerDown = (event) => {
      this.pointer.down = true;
      this._lastPointer = { x: event.clientX, y: event.clientY };
      this.canvas.setPointerCapture?.(event.pointerId);
      this._onPointerMove(event);
    };
    this._onPointerUp = (event) => {
      this.pointer.down = false; this._lastPointer = null;
      if (event.pointerType === 'touch' || event.type === 'pointercancel') this.pointer.active = false;
    };
    this._onPointerLeave = () => { if (!this.pointer.down) this.pointer.active = false; };
    this._onWheel = (event) => {
      if (this.scene !== 'lorenz') return;
      event.preventDefault();
      this.zoom = clamp(this.zoom * Math.exp(-event.deltaY * 0.001), 0.65, 1.7);
      this._render();
    };
    this._onVisibility = () => {
      this._lastTime = null;
      this._fps = 0;
      this._accumulator = 0;
      if (document.hidden) this._emitStats(true);
      else this._schedule();
    };
    canvas.addEventListener('pointermove', this._onPointerMove);
    canvas.addEventListener('pointerdown', this._onPointerDown);
    canvas.addEventListener('pointerup', this._onPointerUp);
    canvas.addEventListener('pointercancel', this._onPointerUp);
    canvas.addEventListener('pointerleave', this._onPointerLeave);
    canvas.addEventListener('wheel', this._onWheel, { passive: false });
    document.addEventListener('visibilitychange', this._onVisibility);
    this._observer = new ResizeObserver(() => this.resize());
    this._observer.observe(canvas);
    this.resize();
    this.reset();
    this._schedule();
  }

  setScene(id) {
    if (!SCENES.includes(id) || id === this.scene) return;
    this.scene = id;
    this.reset();
  }

  setPalette(id) {
    if (!PALETTES[id]) return;
    this.palette = id;
    this._render();
  }

  setParameters(values = {}) {
    const previous = { ...this.parameters };
    for (const [key, min, max] of [['speed', 0.2, 2], ['density', 0.3, 1.5], ['force', 0, 2]]) {
      if (Number.isFinite(values[key])) this.parameters[key] = clamp(values[key], min, max);
    }
    if (previous.density !== this.parameters.density ||
      (this.scene === 'lorenz' && previous.force !== this.parameters.force)) this.reset();
    else this._render();
  }

  setSeed(value) {
    if (!Number.isFinite(Number(value))) return;
    this.seed = Number(value) >>> 0;
    this.reset();
  }

  setRunning(value) {
    this.running = Boolean(value);
    this._lastTime = null;
    this._fps = 0;
    this._accumulator = 0;
    this._emitStats(true);
    this._schedule();
  }

  setReducedMotion(value) {
    this.reducedMotion = Boolean(value);
    this._lastTime = null;
    this._fps = 0;
    this._accumulator = 0;
    this._render();
    this._emitStats(true);
    this._schedule();
  }

  resize() {
    const bounds = this.canvas.getBoundingClientRect();
    const width = Math.max(1, bounds.width || this.canvas.clientWidth || 900);
    const height = Math.max(1, bounds.height || this.canvas.clientHeight || 600);
    const ratio = Math.min(globalThis.devicePixelRatio || 1, 2);
    const oldAspect = this.aspect;
    this.width = width;
    this.height = height;
    this.aspect = width / height;
    this.canvas.width = Math.round(width * ratio);
    this.canvas.height = Math.round(height * ratio);
    this.ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (this._points && Math.abs(oldAspect - this.aspect) > 0.08 && this.scene !== 'lorenz') this.reset();
    else if (this._points) this._render();
  }

  reset() {
    this.pointer.active = false;
    this.pointer.down = false;
    this._lastPointer = null;
    this.elapsed = 0;
    this.activity = 0;
    this.trace = Array(48).fill(0);
    this._accumulator = 0;
    this.zoom = 1;
    this.yawOffset = 0;
    this.pitchOffset = 0;
    this._random = randomSource(this.seed);
    if (this.scene === 'lorenz') this._initLorenz();
    else if (this.scene === 'flow') this._initFlow();
    else this._initLife();
    this._render();
    this._emitStats(true);
  }

  _initLorenz() {
    const count = Math.round(4 + this.parameters.density * 7);
    const samples = 1400;
    const rho = 24 + this.parameters.force * 4;
    this._points = [];
    this._projected = [];
    for (let ribbon = 0; ribbon < count; ribbon++) {
      let x = (this._random() - 0.5) * 30;
      let y = (this._random() - 0.5) * 30;
      let z = 10 + this._random() * 20;
      for (let i = 0; i < 240; i++) [x, y, z] = lorenzStep(x, y, z, 0.006, rho);
      const positions = new Float32Array(samples * 3);
      for (let i = 0; i < samples; i++) {
        [x, y, z] = lorenzStep(x, y, z, 0.0075, rho);
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
      }
      this._points.push({ positions, phase: Math.floor(this._random() * samples), type: ribbon % 4 });
      this._projected.push(new Float32Array(samples * 3));
    }
    this._particleCount = count * samples;
    this.activity = this._lorenzActivity();
  }

  _lorenzActivity() {
    const ribbon = this._points?.[0];
    if (!ribbon) return 0;
    const index = (Math.floor(this.elapsed * 65) + ribbon.phase) % (ribbon.positions.length / 3);
    const offset = index * 3;
    const v = derivative(...ribbon.positions.subarray(offset, offset + 3), 24 + this.parameters.force * 4);
    return clamp(Math.hypot(...v) / 500, 0, 1);
  }

  _newTrailPoint(type, trailSize) {
    return {
      x: this._random() * this.aspect,
      y: this._random(), vx: 0, vy: 0, type,
      history: new Float32Array(trailSize * 2),
      historyIndex: 0, historyLength: 0,
      age: Math.floor(this._random() * 250),
      life: 220 + Math.floor(this._random() * 320),
    };
  }

  _record(point) {
    const index = point.historyIndex * 2;
    point.history[index] = point.x;
    point.history[index + 1] = point.y;
    point.historyIndex = (point.historyIndex + 1) % (point.history.length / 2);
    point.historyLength = Math.min(point.historyLength + 1, point.history.length / 2);
  }

  _initFlow() {
    const count = Math.round(450 + this.parameters.density * 1050);
    this._points = Array.from({ length: count }, (_, i) => this._newTrailPoint(i % 4, 64));
    this._particleCount = count;
    for (let i = 0; i < 85; i++) this._stepFlow(1 / 60, i / 60);
  }

  _flowVelocity(x, y, time) {
    const complexity = 1 + this.parameters.force * 0.55;
    const px = (x - this.aspect / 2) * 4;
    const py = (y - 0.5) * 4;
    const a = px * 1.2 + Math.sin(time * 0.13) * 0.65;
    const b = py * 1.05 - Math.cos(time * 0.11) * 0.65;
    const c = px * 2.1 - time * 0.075;
    const d = py * 1.8 + time * 0.06;
    let vx = -Math.sin(a) * Math.sin(b) * 1.05 - 0.45 * complexity * Math.sin(c) * Math.sin(d) * 1.8;
    let vy = -Math.cos(a) * Math.cos(b) * 1.2 - 0.45 * complexity * Math.cos(c) * Math.cos(d) * 2.1;
    if (this.pointer.active) {
      const dx = x - this.pointer.x;
      const dy = y - this.pointer.y;
      const influence = Math.exp(-(dx * dx + dy * dy) * 25) * this.parameters.force * 7;
      vx -= dy * influence;
      vy += dx * influence;
    }
    return [vx * 0.105, vy * 0.105];
  }

  _stepFlow(dt, time = this.elapsed) {
    let total = 0;
    for (const point of this._points) {
      const [vx, vy] = this._flowVelocity(point.x, point.y, time);
      point.vx = vx;
      point.vy = vy;
      point.x += vx * dt;
      point.y += vy * dt;
      point.age += dt * 60;
      if (point.x < 0 || point.x > this.aspect || point.y < 0 || point.y > 1 || point.age > point.life) {
        point.x = this._random() * this.aspect;
        point.y = this._random();
        point.age = 0;
        point.historyLength = 0;
        point.historyIndex = 0;
      }
      this._record(point);
      total += Math.hypot(vx, vy);
    }
    this.activity = clamp(total / this._points.length / 0.38, 0, 1);
  }

  _initLife() {
    const count = Math.round(160 + this.parameters.density * 270);
    this._points = Array.from({ length: count }, (_, i) => this._newTrailPoint(i % 4, 16));
    this._particleCount = count;
    this._rules = new Float32Array(16);
    for (let a = 0; a < 4; a++) {
      for (let b = 0; b < 4; b++) {
        this._rules[a * 4 + b] = a === b ? 0.55 + this._random() * 0.35 : this._random() * 1.7 - 0.85;
      }
    }
    this._radius = 0.14;
    this._gridColumns = Math.max(3, Math.floor(this.aspect / this._radius));
    this._gridRows = Math.max(3, Math.floor(1 / this._radius));
    this._grid = Array.from({ length: this._gridColumns * this._gridRows }, () => []);
    this._accelerations = new Float32Array(count * 2);
    for (let i = 0; i < 75; i++) this._stepLife(1 / 60);
  }

  _stepLife(dt) {
    const points = this._points;
    const columns = this._gridColumns;
    const rows = this._gridRows;
    const radius = this._radius;
    const radiusSquared = radius * radius;
    for (const cell of this._grid) cell.length = 0;
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const column = Math.min(columns - 1, Math.floor(point.x / this.aspect * columns));
      const row = Math.min(rows - 1, Math.floor(point.y * rows));
      this._grid[row * columns + column].push(i);
    }
    const strength = 0.18 + this.parameters.force * 0.17;
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const column = Math.min(columns - 1, Math.floor(point.x / this.aspect * columns));
      const row = Math.min(rows - 1, Math.floor(point.y * rows));
      let ax = 0;
      let ay = 0;
      for (let gy = -1; gy <= 1; gy++) {
        for (let gx = -1; gx <= 1; gx++) {
          const cell = this._grid[((row + gy + rows) % rows) * columns + ((column + gx + columns) % columns)];
          for (const j of cell) {
            if (j === i) continue;
            const other = points[j];
            let dx = other.x - point.x;
            let dy = other.y - point.y;
            if (dx > this.aspect / 2) dx -= this.aspect;
            if (dx < -this.aspect / 2) dx += this.aspect;
            if (dy > 0.5) dy -= 1;
            if (dy < -0.5) dy += 1;
            const squared = dx * dx + dy * dy;
            if (squared <= 0.000001 || squared > radiusSquared) continue;
            const distance = Math.sqrt(squared);
            const normalized = distance / radius;
            const force = normalized < 0.23
              ? (normalized / 0.23 - 1) * 2.6
              : this._rules[point.type * 4 + other.type] * (1 - Math.abs(2 * (normalized - 0.23) / 0.77 - 1));
            ax += dx / distance * force;
            ay += dy / distance * force;
          }
        }
      }
      if (this.pointer.active) {
        const dx = this.pointer.x - point.x;
        const dy = this.pointer.y - point.y;
        const distance = Math.hypot(dx, dy);
        const pointerRadius = 0.22;
        if (distance < pointerRadius) {
          // A compact, softened radial force: no singularity or long-range launch.
          const falloff = (1 - distance / pointerRadius) ** 2;
          const influence = falloff * this.parameters.force * (this.pointer.down ? -2 : 2);
          const softened = Math.max(0.025, distance);
          ax += dx / softened * influence;
          ay += dy / softened * influence;
        }
      }
      this._accelerations[i * 2] = ax * strength;
      this._accelerations[i * 2 + 1] = ay * strength;
    }
    let total = 0;
    const damping = Math.exp(-dt * 5.8);
    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      point.vx = (point.vx + this._accelerations[i * 2] * dt) * damping;
      point.vy = (point.vy + this._accelerations[i * 2 + 1] * dt) * damping;
      const speed = Math.hypot(point.vx, point.vy);
      if (speed > 0.22) { point.vx *= 0.22 / speed; point.vy *= 0.22 / speed; }
      const x = point.x + point.vx * dt;
      const y = point.y + point.vy * dt;
      if (x < 0 || x >= this.aspect || y < 0 || y >= 1) point.historyLength = 0;
      point.x = ((x % this.aspect) + this.aspect) % this.aspect;
      point.y = ((y % 1) + 1) % 1;
      this._record(point);
      total += Math.hypot(point.vx, point.vy);
    }
    this.activity = clamp(total / points.length / 0.1, 0, 1);
  }

  _onPointerMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.pointer.active = true;
    this.pointer.x = (event.clientX - rect.left) / rect.width * this.aspect;
    this.pointer.y = (event.clientY - rect.top) / rect.height;
    if (this.pointer.down && this._lastPointer && this.scene === 'lorenz') {
      this.yawOffset += (event.clientX - this._lastPointer.x) * 0.007;
      this.pitchOffset = clamp(this.pitchOffset + (event.clientY - this._lastPointer.y) * 0.004, -0.65, 0.65);
      this._render();
    }
    this._lastPointer = { x: event.clientX, y: event.clientY };
  }

  _schedule() {
    if (this._raf || this._destroyed || document.hidden || !this.running || this.reducedMotion) return;
    this._raf = requestAnimationFrame(this._tick);
  }

  _tick(time) {
    this._raf = null;
    if (this._destroyed || document.hidden || !this.running || this.reducedMotion) return;
    const measuredDelta = this._lastTime === null ? null : (time - this._lastTime) / 1000;
    const delta = measuredDelta === null ? 0 : clamp(measuredDelta, 0, 0.06);
    this._lastTime = time;
    if (measuredDelta > 0) {
      const measuredFps = 1 / measuredDelta;
      this._fps = this._fps ? this._fps * 0.92 + measuredFps * 0.08 : measuredFps;
    }
    this._accumulator += delta;
    let steps = 0;
    while (this._accumulator >= 1 / 60 && steps < 4) {
      const dt = this.parameters.speed / 60;
      this.elapsed += dt;
      if (this.scene === 'flow') this._stepFlow(dt);
      else if (this.scene === 'life') this._stepLife(dt);
      else this.activity = this._lorenzActivity();
      this._accumulator -= 1 / 60;
      steps++;
    }
    this._render();
    if (time - this._lastStats >= 250) {
      this._lastStats = time;
      this.trace.shift();
      this.trace.push(this.activity);
      this._emitStats();
    }
    this._schedule();
  }

  _emitStats(force = false) {
    if (this._destroyed) return;
    const active = this.running && !this.reducedMotion && !document.hidden;
    this.onStats({
      fps: active ? Math.round(this._fps) : 0,
      particles: this._particleCount || 0,
      elapsed: this.elapsed,
      activity: this.activity,
      trace: [...this.trace],
      ...(force ? { changed: true } : {}),
    });
  }

  _render(context = this.ctx, width = this.width, height = this.height, exporting = false) {
    if (!this._points) return;
    context.save();
    context.globalAlpha = 1;
    context.globalCompositeOperation = 'source-over';
    context.fillStyle = BACKGROUND;
    context.fillRect(0, 0, width, height);
    const glow = context.createRadialGradient(width * 0.5, height * 0.48, 0, width * 0.5, height * 0.48, Math.max(width, height) * 0.55);
    glow.addColorStop(0, '#121a15');
    glow.addColorStop(1, BACKGROUND);
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
    this._drawGrid(context, width, height);
    if (this.scene === 'lorenz') this._drawLorenz(context, width, height);
    else this._drawParticles(context, width, height);
    if (this.pointer.active && !exporting && this.scene !== 'lorenz') {
      const scale = Math.min(width / this.aspect, height);
      const ox = (width - this.aspect * scale) / 2;
      const oy = (height - scale) / 2;
      context.strokeStyle = `rgba(${rgb(PALETTES[this.palette][0])},.22)`;
      context.lineWidth = 0.75;
      context.beginPath();
      context.arc(ox + this.pointer.x * scale, oy + this.pointer.y * scale, scale * 0.085, 0, TAU);
      context.stroke();
      context.beginPath();
      context.arc(ox + this.pointer.x * scale, oy + this.pointer.y * scale, 2, 0, TAU);
      context.stroke();
    }
    context.restore();
  }

  _drawGrid(context, width, height) {
    const cell = Math.max(40, height / 9);
    context.strokeStyle = 'rgba(186,205,177,.037)';
    context.lineWidth = Math.max(0.5, width / 2800);
    context.beginPath();
    for (let x = width / 2 % cell; x < width; x += cell) { context.moveTo(x, 0); context.lineTo(x, height); }
    for (let y = height / 2 % cell; y < height; y += cell) { context.moveTo(0, y); context.lineTo(width, y); }
    context.stroke();
    context.fillStyle = 'rgba(197,213,180,.2)';
    const dot = Math.max(1.1, width / 1900);
    for (let x = width / 2 % (cell * 3); x < width; x += cell * 3) {
      for (let y = height / 2 % (cell * 3); y < height; y += cell * 3) {
        context.fillRect(x - dot, y, dot * 2, dot * 0.6);
        context.fillRect(x, y - dot, dot * 0.6, dot * 2);
      }
    }
  }

  _drawLorenz(context, width, height) {
    const yaw = 0.1 + Math.sin(this.elapsed * 0.055) * 0.32 + this.yawOffset;
    const pitch = 0.12 + this.pitchOffset;
    const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
    const scale = Math.min(width / 66, height / 55) * this.zoom;
    const colors = PALETTES[this.palette];
    const centerX = width * 0.5;
    const centerY = height * 0.53;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    const projected = [];
    for (let r = 0; r < this._points.length; r++) {
      const ribbon = this._points[r];
      const source = ribbon.positions;
      const screen = this._projected[r];
      for (let i = 0; i < source.length; i += 3) {
        const x = source[i], y = source[i + 1], z = source[i + 2] - 25;
        const depth = y * cy - x * sy;
        const px = x * cy + y * sy;
        const py = z * cp - depth * sp;
        const perspective = 1 + depth * 0.003;
        screen[i] = centerX + px * scale * perspective;
        screen[i + 1] = centerY - py * scale * perspective;
        screen[i + 2] = depth;
      }
      projected.push(screen);
      context.strokeStyle = `rgba(${rgb(colors[ribbon.type])},${ribbon.type === 2 ? 0.25 : 0.35})`;
      context.lineWidth = Math.max(0.6, width / 1900);
      context.beginPath();
      context.moveTo(screen[0], screen[1]);
      for (let i = 3; i < screen.length; i += 3) context.lineTo(screen[i], screen[i + 1]);
      context.stroke();
    }
    context.globalCompositeOperation = 'lighter';
    for (let r = 0; r < this._points.length; r++) {
      const ribbon = this._points[r];
      const screen = projected[r];
      const total = screen.length / 3;
      const head = (Math.floor(this.elapsed * 65) + ribbon.phase) % total;
      const length = 95;
      for (let part = 0; part < 4; part++) {
        context.strokeStyle = `rgba(${rgb(colors[ribbon.type])},${0.18 + part * 0.15})`;
        context.lineWidth = Math.max(0.7, width / 1500) * (0.6 + part * 0.18);
        context.beginPath();
        let drawing = false;
        for (let i = Math.floor(part * length / 4); i <= Math.floor((part + 1) * length / 4); i++) {
          const index = (head - length + i + total) % total;
          const offset = index * 3;
          if (!drawing || index === 0) { context.moveTo(screen[offset], screen[offset + 1]); drawing = true; }
          else context.lineTo(screen[offset], screen[offset + 1]);
        }
        context.stroke();
      }
      const x = screen[head * 3], y = screen[head * 3 + 1];
      const radius = Math.max(1.2, width / 1000);
      context.fillStyle = `rgba(${rgb(colors[ribbon.type])},.18)`;
      context.beginPath(); context.arc(x, y, radius * 4, 0, TAU); context.fill();
      context.fillStyle = colors[ribbon.type];
      context.beginPath(); context.arc(x, y, radius, 0, TAU); context.fill();
    }
    context.globalCompositeOperation = 'source-over';
  }

  _drawParticles(context, width, height) {
    const scale = Math.min(width / this.aspect, height);
    const ox = (width - this.aspect * scale) / 2;
    const oy = (height - scale) / 2;
    const colors = PALETTES[this.palette];
    const flow = this.scene === 'flow';
    const stride = flow ? 3 : 1;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    for (let type = 0; type < 4; type++) {
      for (let part = 0; part < (flow ? 3 : 1); part++) {
        context.strokeStyle = `rgba(${rgb(colors[type])},${flow ? 0.17 + part * 0.18 : 0.18})`;
        context.lineWidth = flow ? Math.max(0.55, scale / 950) : Math.max(0.8, scale / 650);
        context.beginPath();
        for (const point of this._points) {
          if (point.type !== type || point.historyLength < 2) continue;
          const length = point.historyLength;
          const capacity = point.history.length / 2;
          const start = flow ? Math.floor(length * part / 3) : 0;
          const end = flow ? Math.min(length - 1, Math.floor(length * (part + 1) / 3)) : length - 1;
          let drawing = false;
          for (let j = start; j <= end; j += stride) {
            const index = ((point.historyIndex - length + j + capacity) % capacity) * 2;
            const x = ox + point.history[index] * scale;
            const y = oy + point.history[index + 1] * scale;
            if (!drawing) { context.moveTo(x, y); drawing = true; }
            else context.lineTo(x, y);
          }
        }
        context.stroke();
      }
      if (flow) continue;
      const radius = Math.max(1.55, scale / 300);
      context.fillStyle = `rgba(${rgb(colors[type])},.065)`;
      context.beginPath();
      for (const point of this._points) {
        if (point.type !== type) continue;
        const x = ox + point.x * scale, y = oy + point.y * scale;
        context.moveTo(x + radius * 3.5, y);
        context.arc(x, y, radius * 3.5, 0, TAU);
      }
      context.fill();
      context.fillStyle = colors[type];
      context.beginPath();
      for (const point of this._points) {
        if (point.type !== type) continue;
        const x = ox + point.x * scale, y = oy + point.y * scale;
        context.moveTo(x + radius, y); context.arc(x, y, radius, 0, TAU);
      }
      context.fill();
    }
  }

  getSnapshot() {
    const physics = this.scene === 'lorenz'
      ? { sigma: 10, rho: 24 + this.parameters.force * 4, beta: 8 / 3, integrator: 'RK4', dt: 0.0075 }
      : this.scene === 'flow'
        ? { field: 'analytic stream function', boundary: 'respawn', integrator: 'Euler', dt: this.parameters.speed / 60 }
        : { rules: Array.from(this._rules), radius: this._radius, boundary: 'periodic', integrator: 'semi-implicit Euler', dt: this.parameters.speed / 60 };
    return {
      scene: this.scene,
      palette: this.palette,
      seed: this.seed,
      parameters: { ...this.parameters },
      running: this.running,
      reducedMotion: this.reducedMotion,
      elapsed: this.elapsed,
      particleCount: this._particleCount,
      activity: this.activity,
      physics,
    };
  }

  async exportImage({ width = 3840, height = 2160 } = {}) {
    width = clamp(Math.round(Number(width) || 3840), 320, 7680);
    height = clamp(Math.round(Number(height) || 2160), 320, 7680);
    const output = document.createElement('canvas');
    output.width = width;
    output.height = height;
    const context = output.getContext('2d', { alpha: false });
    if (!context) throw new Error('Could not create an export canvas.');
    this._render(context, width, height, true);
    return new Promise((resolve, reject) => output.toBlob((blob) => {
      output.width = 1;
      output.height = 1;
      if (blob) resolve(blob);
      else reject(new Error('The browser could not encode the PNG image.'));
    }, 'image/png'));
  }

  destroy() {
    this._destroyed = true;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._observer.disconnect();
    this.canvas.removeEventListener('pointermove', this._onPointerMove);
    this.canvas.removeEventListener('pointerdown', this._onPointerDown);
    this.canvas.removeEventListener('pointerup', this._onPointerUp);
    this.canvas.removeEventListener('pointercancel', this._onPointerUp);
    this.canvas.removeEventListener('pointerleave', this._onPointerLeave);
    this.canvas.removeEventListener('wheel', this._onWheel);
    document.removeEventListener('visibilitychange', this._onVisibility);
  }
}
