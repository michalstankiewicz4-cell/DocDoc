// Prąd krwi: pole wektorowe zależne od fazy cyklu serca (nie pełna symulacja płynów).
// Trzy pola bazowe liczone raz przy starcie:
//   ven — stały napływ żylny i odpływ tętniczy,
//   dia — rozkurcz: przedsionki -> komory (fala E + skurcz przedsionków),
//   sys — skurcz komór: komory -> pień płucny / aorta.
// W czasie gry mieszamy je wg fazy i dodajemy turbulencję (curl noise).
(function () {
  const C = DD.CONFIG, H = DD.Heart;

  // wnętrze nerki i zrazików liczy przepływ potencjalny — patrz POTENTIAL niżej

  const PATHS = {
    ven: [
      { s: 5,   pts: [[-30, 58], [-29, 24], [-28, 8]] },
      // żyła główna dolna: od nerki przez wątrobę do prawego przedsionka
      { s: 5,   pts: [[-38, -158], [-44, -130], [-47, -95], [-46, -62], [-41, -28], [-36, -6], [-28, 4]] },
      { s: 5,   pts: [[55, 29.5], [42, 24], [34, 20]] },
      { s: 5,   pts: [[55, 10.5], [42, 15], [34, 19]] },
      { s: 5,   pts: [[-4.4, 4], [-6, 14], [-8, 34], [-10, 60]] },
      { s: 5,   pts: [[10.2, 14], [9, 22], [9, 40], [10, 60]] },
      // aorta zstępująca i brzuszna
      { s: 5,   pts: [[9, 32], [18, 45], [34, 50], [52, 48], [64, 38], [67, 10], [67, -40], [58, -66], [44, -90], [38, -112], [36, -140], [36, -226]] },
      // tętnica krezkowa (do jelit), tętnica wątrobowa i żyła wrotna (do wątroby)
      { s: 6,   pts: [[36, -150], [50, -157], [64, -160]] },
      { s: 4,   pts: [[37, -114], [20, -114], [6, -114], [-1, -111], [-4, -104]] },
      { s: 6,   pts: [[2, -154], [0, -130], [-2, -114], [-4, -104]] },
      // zatoki wątroby -> żyły wątrobowe -> żyła główna dolna
      { s: 3,   pts: [[-4, -104], [-10, -97], [-16, -90], [-20, -88], [-30, -84], [-44, -76]] },
      { s: 3,   pts: [[-4, -104], [-14, -100], [-24, -99], [-32, -101], [-45, -98]] },
      { s: 3,   pts: [[-2, -104], [6, -98], [2, -88], [-8, -86], [-18, -88]] },
      { s: 3,   pts: [[-4, -104], [-8, -106], [-16, -105], [-24, -99]] },
      // tętnica nerkowa -> nerka -> żyła nerkowa
      { s: 6,   pts: [[36, -210], [6, -214], [-14, -212], [-24, -208]] },
      { s: 6,   pts: [[-24, -192], [-26, -178], [-38, -161]] }
    ],
    dia: [
      { s: 12,  pts: [[-30, 10], [-27, -3], [-23, -14], [-17, -24], [-10, -30]] },
      { s: 12,  pts: [[33, 18], [27, 8], [23, -3], [21, -18], [22, -32]] }
    ],
    sys: [
      { s: 22,  pts: [[-24, -30], [-12, -27], [-5, -16], [-4, -4], [-6, 14], [-8, 34], [-10, 60]] },
      { s: 24,  pts: [[24, -34], [19, -18], [15, -6], [11, 6], [9, 22], [9, 40], [10, 60]] },
      // fala tętna w aorcie zstępującej i brzusznej
      { s: 9,   pts: [[9, 32], [18, 45], [34, 50], [52, 48], [64, 38], [67, 10], [67, -40], [58, -66], [44, -90], [38, -112], [36, -140], [36, -226]] }
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

  // ramki torów: tor wpływa tylko na punkty bliżej niż ~3 sigma
  function pathBox(p) {
    const m = 20;
    return [Math.min(...p.pts.map((q) => q[0])) - m, Math.min(...p.pts.map((q) => q[1])) - m, Math.max(...p.pts.map((q) => q[0])) + m, Math.max(...p.pts.map((q) => q[1])) + m];
  }
  // Przepływ potencjalny w gęstych sieciach (zraziki wątroby, nerka): ciśnienie z równania Laplace'a w świetle naczyń,
  // prędkość = -grad p. Prąd opływa płytki hepatocytów i nie ma ślepych zaułków.
  const POTENTIAL = [
    { box: [-30.5, -109, 17, -77], inlets: [[-3.8, -107.6]], outlets: [[-29, -84.4], [-29.5, -100.6]], speed: 4 },
    { box: [-58, -230, -19, -171.5], inlets: [[-24.5, -207.5]], outlets: [[-30, -172.5]], speed: 3.5 }
  ];
  function solvePotential(P) {
    const h = 0.4, [x0, y0, x1, y1] = P.box;
    const nx = Math.ceil((x1 - x0) / h), ny = Math.ceil((y1 - y0) / h), n = nx * ny;
    const lum = new Uint8Array(n), fix = new Int8Array(n), p = new Float32Array(n).fill(0.5);
    for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
      const x = x0 + (i + 0.5) * h, y = y0 + (j + 0.5) * h, k = j * nx + i;
      lum[k] = H.sample(x, y) < -0.05 ? 1 : 0;
      for (const q of P.inlets) if (Math.hypot(x - q[0], y - q[1]) < 1.8) { fix[k] = 1; p[k] = 1; }
      for (const q of P.outlets) if (Math.hypot(x - q[0], y - q[1]) < 1.8) { fix[k] = -1; p[k] = 0; }
    }
    // SOR; ściany = brak przepływu (pomijamy sąsiadów poza światłem)
    for (let it = 0; it < 2500; it++) {
      for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
        const k = j * nx + i;
        if (!lum[k] || fix[k]) continue;
        let s = 0, c = 0;
        if (lum[k - 1]) { s += p[k - 1]; c++; } if (lum[k + 1]) { s += p[k + 1]; c++; }
        if (lum[k - nx]) { s += p[k - nx]; c++; } if (lum[k + nx]) { s += p[k + nx]; c++; }
        if (c) p[k] += 1.9 * (s / c - p[k]);
      }
    }
    // gradient -> prędkość, skala tak, by typowa prędkość = speed
    const vx = new Float32Array(n), vy = new Float32Array(n), mags = [];
    for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
      const k = j * nx + i; if (!lum[k]) continue;
      const pl = lum[k - 1] ? p[k - 1] : p[k], pr = lum[k + 1] ? p[k + 1] : p[k];
      const pd = lum[k - nx] ? p[k - nx] : p[k], pu = lum[k + nx] ? p[k + nx] : p[k];
      vx[k] = -(pr - pl); vy[k] = -(pu - pd);
      const m = Math.hypot(vx[k], vy[k]); if (m > 0) mags.push(m);
    }
    mags.sort((a, b) => a - b);
    const med = mags[Math.floor(mags.length * 0.5)] || 1;
    const dead = new Uint8Array(n);
    for (let k = 0; k < n; k++) {
      const m = Math.hypot(vx[k], vy[k]);
      // martwe strefy (za wlotem / wylotem w obrębie ramki): prąd z torów naczyń
      if (m < med * 0.03) { dead[k] = 1; continue; }
      const sc = P.speed * Math.min(1.8, Math.max(0.5, m / med)) / m;
      vx[k] *= sc; vy[k] *= sc;
    }
    Object.assign(P, { h, nx, ny, vx, vy, lum, fix, dead });
  }
  function potentialAt(x, y) {
    for (const P of POTENTIAL) {
      const [x0, y0, x1, y1] = P.box;
      if (x < x0 || x > x1 || y < y0 || y > y1) continue;
      const i = Math.floor((x - x0) / P.h), j = Math.floor((y - y0) / P.h);
      if (i < 0 || j < 0 || i >= P.nx || j >= P.ny) continue;
      const k = j * P.nx + i;
      if (P.fix[k] || P.dead[k]) return null;   // wlot / wylot / martwa strefa: prąd z torów naczyń
      return P.lum[k] ? [P.vx[k], P.vy[k]] : [0, 0];
    }
    return null;
  }

  // strefa zrazików wątroby: szerszy prąd (wiele kanałów między płytkami)
  const Z = H.LIVER.zone;
  const inZone = (x, y) => ((x - Z.c[0]) / (Z.r[0] + 2)) ** 2 + ((y - Z.c[1]) / (Z.r[1] + 2)) ** 2 < 1;
  function buildField(paths, RX, RY) {
    const W = C.world;
    const sx = (W.maxX - W.minX) / RX, sy = (W.maxY - W.minY) / RY;
    const R = RX;
    const f = new Float32Array(RX * RY * 2);
    const sigma = 6.5;
    for (const p of paths) p.bb = p.bb || pathBox(p);
    for (let j = 0; j < RY; j++) for (let i = 0; i < RX; i++) {
      const x = W.minX + (i + 0.5) * sx, y = W.minY + (j + 0.5) * sy;
      const d = H.sample(x, y);
      if (d > 0) continue;
      let vx = 0, vy = 0;
      if (paths === PATHS.ven) {
        const pv = potentialAt(x, y);
        if (pv) { f[(j * R + i) * 2] = pv[0]; f[(j * R + i) * 2 + 1] = pv[1]; continue; }
      }
      for (const p of paths) {
        if (x < p.bb[0] || x > p.bb[2] || y < p.bb[1] || y > p.bb[3]) continue;
        // w jamie brzusznej tory są blisko siebie i w wąskich naczyniach — węższy zasięg
        const sg = y >= -60 ? sigma : inZone(x, y) ? 5 : 2.6;
        const [dist, tx, ty] = nearestOnPath(x, y, p.pts);
        const w = Math.exp(-(dist / sg) * (dist / sg));
        vx += tx * p.s * w; vy += ty * p.s * w;
      }
      // w drobnych naczyniach jamy brzusznej prąd sięga bliżej ściany
      const damp = Math.min(1, Math.max(0, -d / (y < -60 ? 0.6 : 1.6)));
      f[(j * R + i) * 2] = vx * damp; f[(j * R + i) * 2 + 1] = vy * damp;
    }
    // dyfuzja w obrębie światła — wygładza przejścia między strumieniami
    for (let it = 0; it < 6; it++) {
      const g = new Float32Array(f);
      for (let j = 1; j < RY - 1; j++) for (let i = 1; i < RX - 1; i++) {
        const k = (j * R + i) * 2;
        if (f[k] === 0 && f[k + 1] === 0) continue;
        if (W.minY + (j + 0.5) * sy < -60) {
          // jama brzuszna: średnia tylko z sąsiadów w świetle naczynia (ściany nie wygaszają prądu w wąskich kanałach)
          let n = 0, ax = 0, ay = 0;
          for (const o of [2, -2, R * 2, -R * 2]) if (f[k + o] !== 0 || f[k + o + 1] !== 0) { ax += f[k + o]; ay += f[k + o + 1]; n++; }
          if (n) { g[k] = f[k] * 0.5 + ax / n * 0.5; g[k + 1] = f[k + 1] * 0.5 + ay / n * 0.5; }
          continue;
        }
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

  const F = { PATHS, scale: 1 };   // scale: siła prądu (spada do 0, gdy serce staje)

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
    const W = C.world;
    const RX = Math.ceil((W.maxX - W.minX) / C.flowCell), RY = Math.ceil((W.maxY - W.minY) / C.flowCell);
    F.RX = RX; F.RY = RY;
    for (const P of POTENTIAL) solvePotential(P);
    F.ven = buildField(PATHS.ven, RX, RY);
    F.dia = buildField(PATHS.dia, RX, RY);
    F.sys = buildField(PATHS.sys, RX, RY);
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
    const W = C.world, R = F.RX;
    let fx = (x - W.minX) / (W.maxX - W.minX) * F.RX - 0.5, fy = (y - W.minY) / (W.maxY - W.minY) * F.RY - 0.5;
    if (fx < 0 || fy < 0 || fx >= F.RX - 1 || fy >= F.RY - 1) { out[0] = 0; out[1] = 0; return out; }
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
    const amp = (1.6 + 0.3 * Math.hypot(vx, vy)) * (y < -60 ? 2 : 6);   // w drobnych naczyniach brzucha mniej wirów
    const d = H.sample(x, y);
    const wall = Math.min(1, Math.max(0, -d / 1.2));
    vx += (ny - n0) / e * amp * wall;
    vy += -(nx - n0) / e * amp * wall;
    out[0] = vx * F.scale; out[1] = vy * F.scale;
    return out;
  };

  DD.Flow = F;
})();
