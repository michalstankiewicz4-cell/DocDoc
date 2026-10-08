// Geometria serca w przekroju czołowym (2D) jako pole odległości ze znakiem (SDF).
// d < 0  -> światło komory / naczynia (krew)
// d > 0  -> tkanka (mięsień, ściany)
// Jedno źródło prawdy: z tej samej siatki korzystają kolizje i shader tkanki.
(function () {
  const C = DD.CONFIG;

  // Kształty — orientacja jak na rycinie: prawa strona pacjenta po lewej stronie ekranu.
  const ELLIPSES = [
    { id: 'RA', name: 'Prawy przedsionek', c: [-28, 8],  r: [14, 17], rot: 0 },
    { id: 'RV', name: 'Prawa komora',      c: [-14, -26], r: [16, 12], rot: -0.12 },
    { id: 'LA', name: 'Lewy przedsionek',  c: [32, 20],  r: [13, 10], rot: 0.05 },
    { id: 'LV', name: 'Lewa komora',       c: [19, -18], r: [11, 20], rot: 0.2 }
  ];

  const VESSELS = [
    { id: 'SVC', name: 'Żyła główna górna', r: 5.5, pts: [[-30, 60], [-30, 40], [-29, 22]] },
    { id: 'IVC', name: 'Żyła główna dolna', r: 5.5, pts: [[-46, -62], [-42, -30], [-37, -8]] },
    { id: 'TV',  name: 'Ujście trójdzielne', r: 4.2, pts: [[-27, -4], [-21, -16]] },
    { id: 'PT',  name: 'Pień płucny',        r: 4.0, pts: [[-5, -20], [-4, -6], [-6, 14], [-8, 34], [-10, 62]] },
    { id: 'AO',  name: 'Aorta',              r: 4.8, pts: [[15, -6], [11, 6], [9, 22], [9, 40], [10, 62]] },
    { id: 'MV',  name: 'Ujście mitralne',    r: 4.0, pts: [[28, 12], [23, -1]] },
    { id: 'PV1', name: 'Żyły płucne',        r: 3.5, pts: [[64, 30], [42, 24]] },
    { id: 'PV2', name: 'Żyły płucne',        r: 3.5, pts: [[64, 10], [42, 15]] }
  ];

  // Zastawki: punkt na kanale + kierunek prądu (w dół strumienia).
  // type 'av' = przedsionkowo-komorowe (otwarte w rozkurczu), 'sl' = półksiężycowate (otwarte w skurczu)
  const VALVES = [
    { id: 'tricuspid', name: 'Zastawka trójdzielna', type: 'av', c: [-24.4, -9.2], dir: [6, -12] },
    { id: 'mitral',    name: 'Zastawka mitralna',    type: 'av', c: [25.6, 5.5],   dir: [-5, -13] },
    { id: 'pulmonary', name: 'Zastawka pnia płucnego', type: 'sl', c: [-4.3, -1.0], dir: [-0.1, 1] },
    { id: 'aortic',    name: 'Zastawka aorty',       type: 'sl', c: [10.6, 9.0],   dir: [-0.6, 4] }
  ];

  // Wyjścia z mapy -> krążenie płucne / duże
  const EXITS = [
    { id: 'pulm', from: 'PT', test: (x, y) => y > 52 && x > -18 && x < 0, to: 'lungs' },
    { id: 'sys',  from: 'AO', test: (x, y) => y > 52 && x > 2 && x < 18, to: 'body' }
  ];
  const INLETS = {
    lungs: [{ x: 54, y: 26.5, name: 'Żyły płucne' }, { x: 54, y: 12.4, name: 'Żyły płucne' }],
    body:  [{ x: -30, y: 50, name: 'Żyła główna górna' }, { x: -44.5, y: -50, name: 'Żyła główna dolna' }]
  };

  // --- prymitywy analityczne ---
  function sdEllipse(px, py, e) {
    let x = px - e.c[0], y = py - e.c[1];
    const cs = Math.cos(-e.rot), sn = Math.sin(-e.rot);
    const qx = x * cs - y * sn, qy = x * sn + y * cs;
    const k0 = Math.hypot(qx / e.r[0], qy / e.r[1]);
    const k1 = Math.hypot(qx / (e.r[0] * e.r[0]), qy / (e.r[1] * e.r[1]));
    return k1 > 1e-6 ? k0 * (k0 - 1) / k1 : -Math.min(e.r[0], e.r[1]);
  }
  function sdSegment(px, py, ax, ay, bx, by) {
    const pax = px - ax, pay = py - ay, bax = bx - ax, bay = by - ay;
    const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
    return Math.hypot(pax - bax * h, pay - bay * h);
  }
  function sdVessel(px, py, v) {
    let d = 1e9;
    for (let i = 0; i < v.pts.length - 1; i++) {
      const a = v.pts[i], b = v.pts[i + 1];
      d = Math.min(d, sdSegment(px, py, a[0], a[1], b[0], b[1]));
    }
    return d - v.r;
  }
  function smin(a, b, k) {
    const h = Math.max(k - Math.abs(a - b), 0) / k;
    return Math.min(a, b) - h * h * k * 0.25;
  }
  function analytic(px, py) {
    let d = 1e9;
    for (const e of ELLIPSES) d = smin(d, sdEllipse(px, py, e), 3.0);
    for (const v of VESSELS) d = smin(d, sdVessel(px, py, v), 2.4);
    return d;
  }

  // --- dokładna transformata odległości (Felzenszwalb) ---
  function edt1d(f, n, d, v, z) {
    let k = 0; v[0] = 0; z[0] = -Infinity; z[1] = Infinity;
    for (let q = 1; q < n; q++) {
      let s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]);
      while (s <= z[k]) { k--; s = ((f[q] + q * q) - (f[v[k]] + v[k] * v[k])) / (2 * q - 2 * v[k]); }
      k++; v[k] = q; z[k] = s; z[k + 1] = Infinity;
    }
    k = 0;
    for (let q = 0; q < n; q++) {
      while (z[k + 1] < q) k++;
      d[q] = (q - v[k]) * (q - v[k]) + f[v[k]];
    }
  }
  function edt2d(grid, w, h) {
    const INF = 1e20, n = Math.max(w, h);
    const f = new Float64Array(n), d = new Float64Array(n), v = new Int32Array(n), z = new Float64Array(n + 1);
    for (let x = 0; x < w; x++) {
      for (let y = 0; y < h; y++) f[y] = grid[y * w + x];
      edt1d(f, h, d, v, z);
      for (let y = 0; y < h; y++) grid[y * w + x] = d[y];
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) f[x] = grid[y * w + x];
      edt1d(f, w, d, v, z);
      for (let x = 0; x < w; x++) grid[y * w + x] = Math.sqrt(d[x]);
    }
    return grid;
  }

  function build() {
    const W = C.world, N = C.sdfRes;
    const sx = (W.maxX - W.minX) / N, sy = (W.maxY - W.minY) / N;
    const cell = Math.max(sx, sy);
    const inside = new Uint8Array(N * N);
    const margin = 1.0;
    for (let j = 0; j < N; j++) {
      const y = W.minY + (j + 0.5) * sy;
      for (let i = 0; i < N; i++) {
        const x = W.minX + (i + 0.5) * sx;
        let ins = analytic(x, y) < 0;
        if (x < W.minX + margin || x > W.maxX - margin || y < W.minY + margin || y > W.maxY - margin) ins = false;
        inside[j * N + i] = ins ? 1 : 0;
      }
    }
    const INF = 1e20;
    const dOut = new Float64Array(N * N), dIn = new Float64Array(N * N);
    for (let k = 0; k < N * N; k++) { dOut[k] = inside[k] ? 0 : INF; dIn[k] = inside[k] ? INF : 0; }
    edt2d(dOut, N, N); edt2d(dIn, N, N);
    let sdf = new Float32Array(N * N);
    for (let k = 0; k < N * N; k++) {
      sdf[k] = inside[k] ? -(dIn[k] - 0.5) * cell : (dOut[k] - 0.5) * cell;
    }
    // dwa przebiegi lekkiego rozmycia — gładsze ściany bez schodków
    for (let pass = 0; pass < 2; pass++) {
      const out = new Float32Array(N * N);
      for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
        let s = 0, c = 0;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const ii = Math.min(N - 1, Math.max(0, i + di)), jj = Math.min(N - 1, Math.max(0, j + dj));
          s += sdf[jj * N + ii]; c++;
        }
        out[j * N + i] = s / c;
      }
      sdf = out;
    }
    return { sdf, N, sx, sy };
  }

  const H = { ELLIPSES, VESSELS, VALVES, EXITS, INLETS };

  H.init = function () {
    const r = build();
    H.sdf = r.sdf; H.N = r.N; H.sx = r.sx; H.sy = r.sy;
    // szerokość pierścieni zastawek mierzona po SDF
    for (const v of VALVES) {
      const L = Math.hypot(v.dir[0], v.dir[1]);
      v.d = [v.dir[0] / L, v.dir[1] / L];
      v.p = [-v.d[1], v.d[0]];
      const half = (s) => { let t = 0; while (t < 12 && H.sample(v.c[0] + v.p[0] * s * t, v.c[1] + v.p[1] * s * t) < -0.05) t += 0.05; return t; };
      v.w1 = half(1); v.w2 = half(-1);
      v.a1 = [v.c[0] + v.p[0] * v.w1, v.c[1] + v.p[1] * v.w1];
      v.a2 = [v.c[0] - v.p[0] * v.w2, v.c[1] - v.p[1] * v.w2];
    }
    return H;
  };

  // próbkowanie dwuliniowe
  H.sample = function (x, y) {
    const W = C.world, N = H.N;
    let fx = (x - W.minX) / H.sx - 0.5, fy = (y - W.minY) / H.sy - 0.5;
    fx = Math.max(0, Math.min(N - 1.001, fx)); fy = Math.max(0, Math.min(N - 1.001, fy));
    const i = fx | 0, j = fy | 0, tx = fx - i, ty = fy - j;
    const s = H.sdf, k = j * N + i;
    const a = s[k] + (s[k + 1] - s[k]) * tx;
    const b = s[k + N] + (s[k + N + 1] - s[k + N]) * tx;
    return a + (b - a) * ty;
  };
  H.grad = function (x, y, out) {
    const e = 0.15;
    let gx = H.sample(x + e, y) - H.sample(x - e, y);
    let gy = H.sample(x, y + e) - H.sample(x, y - e);
    const L = Math.hypot(gx, gy) || 1;
    out = out || [0, 0]; out[0] = gx / L; out[1] = gy / L; return out;
  };

  // nazwa miejsca (do HUD bakterii)
  H.placeName = function (x, y) {
    for (const v of VALVES) if (Math.hypot(x - v.c[0], y - v.c[1]) < 3.5) return v.name;
    for (const e of ELLIPSES) if (sdEllipse(x, y, e) < 0) return e.name;
    let best = null, bd = 1e9;
    for (const v of VESSELS) { const d = sdVessel(x, y, v); if (d < bd) { bd = d; best = v; } }
    return best ? best.name : '';
  };

  DD.Heart = H;
})();
