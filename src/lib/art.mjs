// Generative water art for The Current. Original drawings made from code:
// the same seed (a post's slug) always produces the same picture.
// Colours are CSS classes, so the art follows light/dark mode and the spread's tone.
//
//   drift    — a bundle of flow lines; one accent line is "my current"
//   contour  — depth contours of a basin, like a sea chart
//   ripple   — rings spreading from a single drop
//   shimmer  — light playing on the surface, seen from below

export const SCENES = ['drift', 'contour', 'ripple', 'shimmer'];
export const W = 1600;
export const H = 1000;

function hash(str) {
  let h = 2166136261 >>> 0;
  for (const ch of String(str)) {
    h ^= ch.codePointAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function random(seed) {
  let a = hash(seed);
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A scene chosen from the seed, for posts that don't name one. */
export function pickScene(seed) {
  return SCENES[hash(`scene:${seed}`) % SCENES.length];
}

const n = (v) => Math.round(v * 10) / 10;

/** Smooth open curve through points (Catmull-Rom → cubic Bézier). */
function curve(pts) {
  let d = `M${n(pts[0][0])} ${n(pts[0][1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    d += ` C${n(p1[0] + (p2[0] - p0[0]) / 6)} ${n(p1[1] + (p2[1] - p0[1]) / 6)} ${n(p2[0] - (p3[0] - p1[0]) / 6)} ${n(
      p2[1] - (p3[1] - p1[1]) / 6,
    )} ${n(p2[0])} ${n(p2[1])}`;
  }
  return d;
}

/** Smooth closed curve through points. */
function loop(pts) {
  const m = pts.length;
  let d = `M${n(pts[0][0])} ${n(pts[0][1])}`;
  for (let i = 0; i < m; i++) {
    const p0 = pts[(i - 1 + m) % m];
    const p1 = pts[i];
    const p2 = pts[(i + 1) % m];
    const p3 = pts[(i + 2) % m];
    d += ` C${n(p1[0] + (p2[0] - p0[0]) / 6)} ${n(p1[1] + (p2[1] - p0[1]) / 6)} ${n(p2[0] - (p3[0] - p1[0]) / 6)} ${n(
      p2[1] - (p3[1] - p1[1]) / 6,
    )} ${n(p2[0])} ${n(p2[1])}`;
  }
  return `${d} Z`;
}

function drift(r) {
  const count = 24 + Math.floor(r() * 10);
  const waves = [
    { k: 0.0016 + r() * 0.0014, a: 50 + r() * 60, p: r() * 6.283 },
    { k: 0.0042 + r() * 0.003, a: 10 + r() * 18, p: r() * 6.283 },
  ];
  const tilt = (r() - 0.5) * 0.3;
  const accent = Math.floor(count * (0.35 + r() * 0.3));
  const lines = [];
  for (let i = 0; i < count; i++) {
    const y0 = -120 + ((H + 240) * i) / (count - 1);
    const spread = 0.65 + 0.35 * Math.sin(i * 0.33 + waves[0].p);
    const pts = [];
    for (let x = -60; x <= W + 60; x += 60) {
      let y = y0 + tilt * (x - W / 2);
      for (const w of waves) y += w.a * spread * Math.sin(w.k * x + w.p + i * 0.11);
      pts.push([x, y]);
    }
    lines.push(curve(pts));
  }
  const band = Math.max(1, accent - 3);
  let out = `<path class="a-fill" d="${lines[band]} L${W + 60} ${H + 200} L-60 ${H + 200} Z" opacity="0.55"/>`;
  out += `<path class="a-fill-2" d="${lines[Math.min(count - 2, accent + 4)]} L${W + 60} ${H + 200} L-60 ${H + 200} Z" opacity="0.6"/>`;
  out += '<g class="a-flow">';
  lines.forEach((d, i) => {
    if (i === accent) return;
    const cls = i % 5 === 0 ? 'a-line' : 'a-line-soft';
    out += `<path class="${cls}" d="${d}" stroke-width="${i % 5 === 0 ? 1.6 : 1.1}"/>`;
  });
  out += '</g>';
  out += `<path class="a-accent a-accent-flow" d="${lines[accent]}" stroke-width="2.6"/>`;
  return out;
}

function contour(r) {
  const cx = W * (0.5 + r() * 0.32);
  const cy = H * (0.38 + r() * 0.34);
  const harmonics = [2, 3, 5].map((k) => ({ k, a: 0.04 + r() * 0.09, p: r() * 6.283 }));
  const rings = 12 + Math.floor(r() * 4);
  const accent = 3 + Math.floor(r() * (rings - 6));
  let out = '';
  for (let j = rings - 1; j >= 0; j--) {
    const R = 50 + j * 78;
    const pts = [];
    for (let t = 0; t < 360; t += 12) {
      const th = (t * Math.PI) / 180;
      let rr = R;
      for (const h of harmonics) rr *= 1 + h.a * Math.sin(h.k * th + h.p + j * 0.18);
      pts.push([cx + rr * Math.cos(th) * 1.3, cy + rr * Math.sin(th) * 0.82]);
    }
    const depth = j < 3 ? 'a-depth-3' : j < 7 ? 'a-depth-2' : 'a-depth-1';
    const d = loop(pts);
    out += `<path class="${depth}" d="${d}"/>`;
    out +=
      j === accent
        ? `<path class="a-accent" d="${d}" stroke-width="2.2" stroke-dasharray="14 10"/>`
        : `<path class="${j % 4 === 0 ? 'a-line' : 'a-line-soft'}" d="${d}" stroke-width="${j % 4 === 0 ? 1.5 : 1}"/>`;
  }
  return out;
}

function ripple(r) {
  const px = W * (0.56 + r() * 0.26);
  const py = H * (0.6 + r() * 0.16);
  const horizon = H * (0.4 + r() * 0.08);
  const pts = [];
  for (let x = -60; x <= W + 60; x += 80) pts.push([x, horizon + Math.sin(x * 0.004 + r() * 6) * 10]);
  let out = `<path class="a-fill" d="${curve(pts)} L${W + 60} ${H + 40} L-60 ${H + 40} Z"/>`;
  // Rings spread outward from the drop and fade, one after another (see .a-ring-wave in global.css).
  // Without motion they stay where they are drawn here, already spread out, so the still image works too.
  // pathLength=100 keeps the broken-line pattern in proportion as a ring grows.
  const rings = 8;
  const cycle = 12; // seconds for one ring to travel from the centre to the edge
  for (let i = rings - 1; i >= 0; i--) {
    const rx = 46 + i * 104 + r() * 16;
    const ry = rx * 0.27;
    const segs = [];
    let used = 0;
    while (used < 100) {
      const on = 8 + r() * 22;
      const off = 1 + r() * 5;
      segs.push(n(on), n(off));
      used += on + off;
    }
    const cls = i === 1 ? 'a-accent' : i % 3 === 0 ? 'a-line' : 'a-line-soft';
    const op = n(Math.max(0.25, 1 - i * 0.08));
    const delay = n(-(i / rings) * cycle);
    out += `<ellipse class="${cls} a-ring a-ring-wave" pathLength="100" cx="${n(px)}" cy="${n(py)}" rx="${n(rx)}" ry="${n(
      ry,
    )}" stroke-width="${i === 1 ? 2.2 : 1.3}" stroke-dasharray="${segs.join(' ')}" opacity="${op}" style="animation-delay:${delay}s"/>`;
  }
  // a few drops thrown up from the centre
  for (let k = 0; k < 9; k++) {
    const ang = Math.PI * (1.12 + r() * 0.76);
    const dist = 40 + r() * 120;
    const x = px + Math.cos(ang) * dist * 1.4;
    const y = py + Math.sin(ang) * dist;
    out += `<ellipse class="a-drop" cx="${n(x)}" cy="${n(y)}" rx="${n(2 + r() * 3)}" ry="${n(4 + r() * 6)}" transform="rotate(${n(
      ((ang * 180) / Math.PI + 90) % 360,
    )} ${n(x)} ${n(y)})"/>`;
  }
  return out;
}

function shimmer(r) {
  let out = `<rect class="a-fill-2" width="${W}" height="${H}"/>`;
  const count = 90;
  for (let i = 0; i < count; i++) {
    const t = Math.pow(r(), 1.7);
    const y = -20 + t * H * 0.7;
    const w = (60 + r() * 380) * (1 - t * 0.5);
    const h = (5 + r() * 18) * (1 - t * 0.6);
    const x = -100 + r() * (W + 100);
    const wob = h * 0.6;
    const d = `M${n(x)} ${n(y)} C${n(x + w * 0.3)} ${n(y - wob)} ${n(x + w * 0.7)} ${n(y + wob)} ${n(x + w)} ${n(y)} C${n(
      x + w + h,
    )} ${n(y + h * 0.5)} ${n(x + w)} ${n(y + h)} ${n(x + w * 0.6)} ${n(y + h * 0.9)} C${n(x + w * 0.3)} ${n(y + h * 1.2)} ${n(
      x - h,
    )} ${n(y + h)} ${n(x)} ${n(y)} Z`;
    const op = n(0.95 - t * 0.7);
    out += r() < 0.82 ? `<path class="a-glint" d="${d}" opacity="${op}"/>` : `<path class="a-glint-line" d="${d}" opacity="${op}"/>`;
  }
  const ay = H * (0.5 + r() * 0.3);
  const pts = [];
  for (let x = -60; x <= W + 60; x += 100) pts.push([x, ay + Math.sin(x * 0.003 + r() * 6) * 18]);
  out += `<path class="a-accent" d="${curve(pts)}" stroke-width="1.8" opacity="0.8"/>`;
  return out;
}

const draw = { drift, contour, ripple, shimmer };

/**
 * SVG markup for a scene. Decorative: hidden from assistive technology.
 * @param {string} scene one of SCENES
 * @param {string} seed  usually the post slug
 * @param {{ className?: string, preserve?: string }} [opts]
 */
export function sceneSvg(scene, seed, opts = {}) {
  const name = SCENES.includes(scene) ? scene : pickScene(seed);
  const r = random(`${name}:${seed}`);
  const cls = ['art', `art--${name}`, opts.className].filter(Boolean).join(' ');
  return `<svg class="${cls}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="${
    opts.preserve ?? 'xMidYMid slice'
  }" aria-hidden="true" focusable="false"><rect class="a-bg" width="${W}" height="${H}"/>${draw[name](r)}</svg>`;
}

/**
 * "The current flow": a stream seen from above. Soft, blurred bands of water drift at
 * different speeds and light glints on the surface. Bands and glints are drawn on a pattern that repeats
 * every P and slide by exactly one P, so the drift loops seamlessly (see .art--flow in global.css).
 */
export function flowSvg(seed) {
  const r = random(`flow:${seed}`);
  const FW = 1600;
  const FH = 900;
  const P = 800; // repeat length; bands and glints slide by one P per loop
  const id = `flow-${hash(seed)}`;

  // soft water bands: a filled ribbon between two gentle waves
  const ribbon = (base, thick, amp, ph) => {
    const top = [];
    const bot = [];
    for (let x = 0; x <= FW + P; x += 40) {
      const t = (x / P) * Math.PI * 2;
      top.push([x, base + amp * Math.sin(t + ph) + amp * 0.3 * Math.sin(2 * t + ph * 1.7)]);
      bot.push([x, base + thick + amp * 0.8 * Math.sin(t + ph + 0.9) + amp * 0.25 * Math.sin(2 * t + ph)]);
    }
    return `M${top.map(([x, y]) => `${n(x)} ${n(y)}`).join(' L')} L${bot
      .reverse()
      .map(([x, y]) => `${n(x)} ${n(y)}`)
      .join(' L')} Z`;
  };
  const bands = [
    { base: 120, thick: 150, amp: 34, tone: 'f-band--light', dur: 70, dir: 1 },
    { base: 300, thick: 110, amp: 26, tone: 'f-band--white', dur: 46, dir: 1 },
    { base: 400, thick: 170, amp: 40, tone: 'f-band--deep', dur: 90, dir: -1 },
    { base: 520, thick: 90, amp: 22, tone: 'f-band--white', dur: 38, dir: 1 },
    { base: 640, thick: 160, amp: 30, tone: 'f-band--light', dur: 64, dir: -1 },
  ];
  let water = '';
  for (const b of bands) {
    const ph = r() * 6.28;
    water += `<path class="f-band ${b.tone}${b.dir < 0 ? ' f-band--back' : ''}" d="${ribbon(b.base, b.thick, b.amp, ph)}" style="--dur:${b.dur}s;animation-delay:-${n(
      r() * b.dur,
    )}s"/>`;
  }

  // light glints on the surface (the pattern repeats every P so it loops with the drift)
  const glintBase = [];
  for (let k = 0; k < 9; k++) glintBase.push({ x: r() * P, y: 80 + r() * (FH - 160), w: 40 + r() * 70 });
  let glints = '';
  for (const off of [0, P, 2 * P]) {
    for (const g of glintBase) {
      glints += `<path class="f-glint" d="M${n(g.x + off)} ${n(g.y)} q ${n(g.w / 2)} -${n(g.w / 7)} ${n(g.w)} 0"/>`;
    }
  }

  return `<svg class="art art--flow" viewBox="0 0 ${FW} ${FH}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false"><defs><linearGradient id="${id}-water" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color: var(--hero-horizon)"/><stop offset="0.55" style="stop-color: var(--hero-sea); stop-opacity: 0.75"/><stop offset="1" style="stop-color: var(--hero-deep); stop-opacity: 0.55"/></linearGradient><filter id="${id}-soft" x="-10%" y="-40%" width="120%" height="180%"><feGaussianBlur stdDeviation="18"/></filter></defs><rect width="${FW}" height="${FH}" fill="url(#${id}-water)"/><g filter="url(#${id}-soft)">${water}</g><g class="f-glints">${glints}</g></svg>`;
}

/** A thin strip of flow lines (used for the home "currents" rows and the logo-like marks). */
export function stripSvg(seed, { lines = 7, width = 600, height = 120 } = {}) {
  const r = random(`strip:${seed}`);
  const k = 0.006 + r() * 0.006;
  const a = 8 + r() * 10;
  const p = r() * 6.283;
  const accent = Math.floor(lines / 2);
  let out = '';
  for (let i = 0; i < lines; i++) {
    const y0 = 14 + ((height - 28) * i) / (lines - 1);
    const pts = [];
    for (let x = -20; x <= width + 20; x += 40) pts.push([x, y0 + a * Math.sin(k * x + p + i * 0.2)]);
    out += `<path class="${i === accent ? 'a-accent a-accent-flow' : i % 3 === 0 ? 'a-line' : 'a-line-soft'}" d="${curve(
      pts,
    )}" stroke-width="${i === accent ? 2.2 : 1.2}"/>`;
  }
  return `<svg class="art art--strip" viewBox="0 0 ${width} ${height}" preserveAspectRatio="none" aria-hidden="true" focusable="false">${out}</svg>`;
}
