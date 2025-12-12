<script lang="ts">
  import { onMount, onDestroy } from "svelte";

  export type GlobePin = {
    lat: number;
    lng: number;
    label?: string;
  };

  export let reisen: GlobePin[] = [];
  export let bucketlist: GlobePin[] = [];
  export let spinSpeed = 0.18; // rad pro Sekunde im Idle

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let width = 560;
  let height = 560;
  let radius = 240;
  let yaw = 0; // horizontale Rotation
  let pitch = 0.2; // leichte Neigung
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let autoSpin = true;
  let rafId: number | null = null;
  let lastFrame = 0;
  let idleTimer: ReturnType<typeof setTimeout> | null = null;
  let resizeObserver: ResizeObserver | null = null;

  const clamp = (val: number, min: number, max: number) => Math.min(Math.max(val, min), max);
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const startIdleSpin = () => {
    if (idleTimer) clearTimeout(idleTimer);
    idleTimer = setTimeout(() => (autoSpin = true), 1200);
  };

  const stopIdleSpin = () => {
    autoSpin = false;
    if (idleTimer) clearTimeout(idleTimer);
  };

  const setSize = (w: number, h: number) => {
    // quadratisch halten
    const size = Math.min(w, h, 720);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = size;
    height = size;
    radius = size * 0.43;
    if (!canvas || !ctx) return;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  const project = (lat: number, lng: number) => {
    // Vektor vom Mittelpunkt
    const phi = toRad(lat);
    const lambda = toRad(lng);
    const x = Math.cos(phi) * Math.cos(lambda);
    const y = Math.sin(phi);
    const z = Math.cos(phi) * Math.sin(lambda);

    // Yaw
    const cy = Math.cos(yaw);
    const sy = Math.sin(yaw);
    const x1 = cy * x + sy * z;
    const z1 = -sy * x + cy * z;

    // Pitch
    const cp = Math.cos(pitch);
    const sp = Math.sin(pitch);
    const y2 = cp * y - sp * z1;
    const z2 = sp * y + cp * z1;

    if (z2 <= 0) return null; // Rueckseite ausblenden

    const perspective = radius * 1.6;
    const k = perspective / (perspective - z2 * radius);
    const px = width / 2 + x1 * radius * k;
    const py = height / 2 - y2 * radius * k;
    return { x: px, y: py, depth: z2 };
  };

  const drawPin = (pin: GlobePin, color: string) => {
    if (!ctx) return;
    const pos = project(pin.lat, pin.lng);
    if (!pos) return;

    ctx.save();
    ctx.lineWidth = 2;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y - 12);
    ctx.lineTo(pos.x, pos.y - 4);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
    ctx.fill();

    if (pin.label) {
      ctx.font = "12px 'Inter', system-ui, sans-serif";
      ctx.textBaseline = "middle";
      ctx.textAlign = "left";
      ctx.fillText(pin.label, pos.x + 10, pos.y);
    }
    ctx.restore();
  };

  const draw = (timestamp: number) => {
    if (!ctx) return;
    if (!lastFrame) lastFrame = timestamp;
    const delta = (timestamp - lastFrame) / 1000;
    lastFrame = timestamp;

    if (autoSpin && !dragging) {
      yaw += spinSpeed * delta;
    }

    ctx.clearRect(0, 0, width, height);

    // Hintergrund
    const bg = ctx.createRadialGradient(width / 2, height / 2, radius * 0.3, width / 2, height / 2, radius * 1.25);
    bg.addColorStop(0, "#0b1021");
    bg.addColorStop(1, "#05060d");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Globus
    const globeGrad = ctx.createRadialGradient(
      width / 2 - radius * 0.15,
      height / 2 - radius * 0.2,
      radius * 0.25,
      width / 2,
      height / 2,
      radius * 1.1
    );
    globeGrad.addColorStop(0, "#2c4975");
    globeGrad.addColorStop(1, "#0a1837");
    ctx.fillStyle = globeGrad;
    ctx.beginPath();
    ctx.arc(width / 2, height / 2, radius, 0, Math.PI * 2);
    ctx.fill();

    // einfache Meridiane/Parallelkreise
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let i = -60; i <= 60; i += 30) {
      ctx.beginPath();
      const steps = 64;
      for (let s = 0; s <= steps; s++) {
        const lng = -180 + (360 / steps) * s;
        const p = project(i, lng);
        if (!p) continue;
        if (s === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
    for (let j = -150; j <= 180; j += 30) {
      ctx.beginPath();
      const steps = 48;
      for (let s = -80; s <= 80; s += 160 / steps) {
        const p = project(s, j);
        if (!p) continue;
        if (s === -80) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    reisen.forEach((pin) => drawPin(pin, "#e11d48")); // rot
    bucketlist.forEach((pin) => drawPin(pin, "#3b82f6")); // blau

    rafId = requestAnimationFrame(draw);
  };

  const onPointerDown = (e: PointerEvent) => {
    if (!canvas) return;
    dragging = true;
    stopIdleSpin();
    lastX = e.clientX;
    lastY = e.clientY;
    canvas.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    yaw += dx * 0.005;
    pitch = clamp(pitch + dy * 0.003, -1.2, 1.2);
    lastX = e.clientX;
    lastY = e.clientY;
  };

  const onPointerUp = (e: PointerEvent) => {
    dragging = false;
    canvas?.releasePointerCapture(e.pointerId);
    startIdleSpin();
  };

  onMount(() => {
    ctx = canvas.getContext("2d");
    if (!ctx) return;
    setSize(canvas.parentElement?.clientWidth ?? width, canvas.parentElement?.clientHeight ?? height);

    resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        setSize(w, h || w);
      }
    });
    resizeObserver.observe(canvas.parentElement ?? canvas);

    lastFrame = performance.now();
    rafId = requestAnimationFrame(draw);
  });

  onDestroy(() => {
    if (rafId) cancelAnimationFrame(rafId);
    if (idleTimer) clearTimeout(idleTimer);
    resizeObserver?.disconnect();
  });
</script>

<div class="globe-shell">
  <canvas
    bind:this={canvas}
    aria-label="Interaktiver Globus"
    on:pointerdown={onPointerDown}
    on:pointermove={onPointerMove}
    on:pointerup={onPointerUp}
    on:pointerleave={onPointerUp}
  ></canvas>
  <div class="legend">
    <span class="dot reise"></span> Reisen
    <span class="dot bucket"></span> Bucketlist
  </div>
</div>

<style>
  .globe-shell {
    position: relative;
    width: 100%;
    max-width: 720px;
    aspect-ratio: 1 / 1;
    margin: 0 auto;
    border-radius: 32px;
    background: radial-gradient(circle at 30% 30%, #0f172a, #020617 80%);
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.45);
    overflow: hidden;
  }

  canvas {
    width: 100%;
    height: 100%;
    display: block;
    cursor: grab;
  }

  canvas:active {
    cursor: grabbing;
  }

  .legend {
    position: absolute;
    bottom: 14px;
    right: 16px;
    background: rgba(15, 23, 42, 0.9);
    color: #e2e8f0;
    padding: 8px 12px;
    border-radius: 999px;
    display: inline-flex;
    align-items: center;
    gap: 12px;
    font-size: 0.9rem;
    letter-spacing: 0.01em;
  }

  .dot {
    width: 12px;
    height: 12px;
    border-radius: 999px;
    display: inline-block;
    margin-right: 6px;
    box-shadow: 0 0 10px rgba(0, 0, 0, 0.25);
  }

  .dot.reise {
    background: #e11d48;
  }

  .dot.bucket {
    background: #3b82f6;
  }
</style>
