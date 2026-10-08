// Prąd krwi: pole wektorowe zależne od fazy cyklu serca (nie pełna symulacja płynów).
// Trzy pola bazowe liczone raz przy starcie:
//   ven — stały napływ żylny i odpływ tętniczy,
//   dia — rozkurcz: przedsionki -> komory (fala E + skurcz przedsionków),
//   sys — skurcz komór: komory -> pień płucny / aorta.
// W czasie gry mieszamy je wg fazy i dodajemy turbulencję (curl noise).
(function () {
  const C = DD.CONFIG, H = DD.Heart;

  const PATHS = {
    ven: [
      { s: 5,   pts: [[-30, 58], [-29, 24], [-28, 8]] },
      { s: 5,   pts: [[-46, -60], [-41, -28], [-36, -6], [-28, 4]] },
      { s: 5,   pts: [[62, 29.5], [42, 24], [34, 20]] },
      { s: 5,   pts: [[62, 10.5], [42, 15], [34, 19]] },
      { s: 5,   pts: [[-4.4, 4], [-6, 14], [-8, 34], [-10, 60]] },
      { s: 5,   pts: [[10.2, 14], [9, 22], [9, 40], [10, 60]] }
    ],
    dia: [
      { s: 12,  pts: [[-30, 10], [-27, -3], [-23, -14], [-17, -24], [-10, -30]] },
      { s: 12,  pts: [[33, 18], [27, 8], [23, -3], [21, -18], [22, -32]] }
    ],
    sys: [
      { s: 22,  pts: [[-24, -30], [-12, -27], [-5, -16], [-4, -4], [-6, 14], [-8, 34], [-10, 60]] },
      { s: 24,  pts: [[24, -34], [19, -18], [15, -6], [11, 6], [9, 22], [9, 40], [10, 60]] }
    ]
  };

  function nearestOnPath(x, y, pts) {
    let best = 1e9, tx = 0, ty = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const bx = b[0] - a[0], by = b[1] - a[1];
      const L2 = bx * bx + by * by;
      const h = Math.max(0, Math.min(1, ((x - a[0]) * bx + (y - a[1]) * by) / L2));
      const d = Math.hypot(x - a[0] - bx * h, y - a[1] - by * h);
      if (d < best) { best = d; const L = Math.sqrt(L2); tx = bx / L; ty = by / L; }
    }
    return [best, tx, ty];
  }

  function buildField(paths, R) {
    const W = C.world;
    const sx = (W.maxX - W.minX) / R, sy = (W.maxY - W.minY) / R;
    const f = new Float32Array(R * R * 2);
    const sigma = 6.5;
    for (let j = 0; j < R; j++) for (let i = 0; i < R; i++) {
      const x = W.minX + (i + 0.5) * sx, y = W.minY + (j + 0.5) * sy;
      const d = H.sample(x, y);
      if (d > 0) continue;
      let vx = 0, vy = 0;
      for (const p of paths) {
        const [dist, tx, ty] = nearestOnPath(x, y, p.pts);
        const w = Math.exp(-(dist / sigma) * (dist / sigma));
        vx += tx * p.s * w; vy += ty * p.s * w;
      }
      const damp = Math.min(1, Math.max(0, -d / 1.6));
      f[(j * R + i) * 2] = vx * damp; f[(j * R + i) * 2 + 1] = vy * damp;
    }
    // dyfuzja w obrębie światła — wygładza przejścia między strumieniami
    for (let it = 0; it < 6; it++) {
      const g = new Float32Array(f);
      for (let j = 1; j < R - 1; j++) for (let i = 1; i < R - 1; i++) {
        const k = (j * R + i) * 2;
        if (f[k] === 0 && f[k + 1] === 0) continue;
        for (let c = 0; c < 2; c++) {
          g[k + c] = f[k + c] * 0.5 + (f[k + 2 + c] + f[k - 2 + c] + f[k + R * 2 + c] + f[k - R * 2 + c]) * 0.125;
        }
      }
      f.set(g);
    }
    return f;
  }

  // ---- faza cyklu serca ----
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const pulse = (a, b, x) => (x < a || x > b) ? 0 : Math.sin(Math.PI * (x - a) / (b - a));

  const F = { PATHS };

  // phase: 0..1. 0–0.12 skurcz przedsionków, 0.14–0.45 skurcz komór, reszta rozkurcz
  F.gains = function (phase) {
    const sys = Math.pow(pulse(0.14, 0.45, phase), 0.8);
    const dia = 0.85 * pulse(0.48, 0.82, phase) + 1.0 * pulse(0.0, 0.12, phase) + (phase > 0.82 ? 0.12 : 0);
    return { sys, dia };
  };
  // otwarcie zastawek 0..1
  F.valveOpen = function (type, phase) {
    if (type === 'av') {
      // zamknięte w skurczu komór (0.13–0.47)
      return 1 - (smooth(0.12, 0.15, phase) - smooth(0.46, 0.50, phase));
    }
    return smooth(0.15, 0.19, phase) - smooth(0.42, 0.46, phase);
  };
  // skurcz mięśnia do wizualizacji (0..1)
  F.contraction = function (phase) {
    return Math.max(0.35 * pulse(0.0, 0.12, phase), pulse(0.13, 0.48, phase));
  };

  F.init = function () {
    const R = C.flowRes;
    F.R = R;
    F.ven = buildField(PATHS.ven, R);
    F.dia = buildField(PATHS.dia, R);
    F.sys = buildField(PATHS.sys, R);
    return F;
  };

  // --- szum do turbulencji (deterministyczny, wspólny dla obu stron sieci) ---
  function hash(i, j, k) {
    let h = (i * 374761393 + j * 668265263 + k * 2147483647) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  function vnoise(x, y, z) {
    const i = Math.floor(x), j = Math.floor(y), k = Math.floor(z);
    const fx = x - i, fy = y - j, fz = z - k;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy), uz = fz * fz * (3 - 2 * fz);
    const l = (a, b, t) => a + (b - a) * t;
    return l(
      l(l(hash(i, j, k), hash(i + 1, j, k), ux), l(hash(i, j + 1, k), hash(i + 1, j + 1, k), ux), uy),
      l(l(hash(i, j, k + 1), hash(i + 1, j, k + 1), ux), l(hash(i, j + 1, k + 1), hash(i + 1, j + 1, k + 1), ux), uy),
      uz);
  }
  F.noise = vnoise;

  function sampleField(f, x, y, out) {
    const W = C.world, R = F.R;
    let fx = (x - W.minX) / (W.maxX - W.minX) * R - 0.5, fy = (y - W.minY) / (W.maxY - W.minY) * R - 0.5;
    if (fx < 0 || fy < 0 || fx >= R - 1 || fy >= R - 1) { out[0] = 0; out[1] = 0; return out; }
    const i = fx | 0, j = fy | 0, tx = fx - i, ty = fy - j;
    for (let c = 0; c < 2; c++) {
      const k = (j * R + i) * 2 + c;
      const a = f[k] + (f[k + 2] - f[k]) * tx;
      const b = f[k + R * 2] + (f[k + R * 2 + 2] - f[k + R * 2]) * tx;
      out[c] = a + (b - a) * ty;
    }
    return out;
  }

  const tA = [0, 0], tB = [0, 0], tC = [0, 0];
  // prędkość krwi w punkcie (x,y) dla czasu t i fazy
  F.velocity = function (x, y, t, phase, out) {
    out = out || [0, 0];
    const g = F.gains(phase);
    sampleField(F.ven, x, y, tA); sampleField(F.dia, x, y, tB); sampleField(F.sys, x, y, tC);
    let vx = tA[0] + tB[0] * g.dia + tC[0] * g.sys;
    let vy = tA[1] + tB[1] * g.dia + tC[1] * g.sys;
    // curl noise — wiry i zawirowania
    const s = 0.11, e = 0.5, tz = t * 0.35;
    const n0 = vnoise(x * s, y * s, tz);
    const nx = vnoise((x + e) * s, y * s, tz), ny = vnoise(x * s, (y + e) * s, tz);
    const amp = (1.6 + 0.3 * Math.hypot(vx, vy)) * 6;
    const d = H.sample(x, y);
    const wall = Math.min(1, Math.max(0, -d / 1.2));
    vx += (ny - n0) / e * amp * wall;
    vy += -(nx - n0) / e * amp * wall;
    out[0] = vx; out[1] = vy;
    return out;
  };

  DD.Flow = F;
})();
