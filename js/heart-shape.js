// Geometria układu krążenia w przekroju czołowym (2D) jako pole odległości ze znakiem (SDF):
// serce na górze, pod przeponą wątroba i nerka połączone aortą i żyłą główną dolną.
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
    // żyła główna dolna: od nerki przez wątrobę do prawego przedsionka (dolny koniec = wlot krwi z nóg)
    { id: 'IVC', name: 'Żyła główna dolna', r: 5.5, pts: [[-38, -160], [-44, -130], [-47, -95], [-46, -62], [-42, -30], [-37, -8]] },
    { id: 'TV',  name: 'Ujście trójdzielne', r: 4.2, pts: [[-27, -4], [-21, -16]] },
    { id: 'PT',  name: 'Pień płucny',        r: 4.0, pts: [[-5, -20], [-4, -6], [-6, 14], [-8, 34], [-10, 62]] },
    { id: 'AO',  name: 'Aorta',              r: 4.8, pts: [[15, -6], [11, 6], [9, 22], [9, 40], [10, 62]] },
    { id: 'MV',  name: 'Ujście mitralne',    r: 4.0, pts: [[28, 12], [23, -1]] },
    { id: 'PV1', name: 'Żyły płucne',        r: 3.5, pts: [[53, 30], [42, 24]] },
    { id: 'PV2', name: 'Żyły płucne',        r: 3.5, pts: [[53, 10], [42, 15]] },
    // łuk i aorta zstępująca: odchodzi od aorty wstępującej, okrąża serce z prawej strony ekranu i schodzi do brzucha
    { id: 'DAO', name: 'Aorta zstępująca',   r: 4.2, pts: [[9, 36], [18, 45], [34, 50], [52, 48], [64, 38], [67, 10], [67, -40]] },
    { id: 'AAO', name: 'Aorta brzuszna',     r: 4.2, pts: [[67, -40], [58, -66], [44, -90], [38, -112], [36, -140], [36, -226]] },
    // wątroba
    { id: 'HV1', name: 'Żyły wątrobowe',     r: 2.4, pts: [[-44, -76], [-30, -84], [-18, -88]] },
    { id: 'HV2', name: 'Żyły wątrobowe',     r: 2.1, pts: [[-45, -98], [-32, -101], [-24, -99]] },
    { id: 'HA',  name: 'Tętnica wątrobowa',  r: 2.2, pts: [[37, -114], [20, -114], [6, -114], [-1, -111]] },
    { id: 'PORT', name: 'Żyła wrotna',       r: 3.0, pts: [[2, -152], [0, -130], [-2, -114], [-4, -106]] },
    { id: 'SMA', name: 'Tętnica krezkowa górna', r: 2.6, pts: [[36, -150], [50, -157], [62, -160]] },
    // nerka (prawa nerka pacjenta, pod wątrobą)
    { id: 'RV_', name: 'Żyła nerkowa',       r: 2.6, pts: [[-24, -192], [-26, -178], [-38, -161]] },
    { id: 'RA_', name: 'Tętnica nerkowa',    r: 2.3, pts: [[36, -210], [6, -214], [-14, -212], [-24, -208]] },
  ];

  // nerka: fasolka (elipsa z wcięciem wnęki), tętnica łukowata na granicy kory i rdzenia, tętnice międzypłatowe
  // między piramidami, kłębuszki w korze. Wszystko generowane z kilku liczb.
  const KIDNEY = { c: [-38, -200], r: [17, 27], hilum: [-17, -200], hilumR: 8, sinus: [-25, -200],
    arc: [10.5, 18.5], cortex: [14, 23.5] };
  (function () {
    const K = KIDNEY, P = (rx, ry, a) => [K.c[0] + Math.cos(a) * rx, K.c[1] + Math.sin(a) * ry];
    const deg = Math.PI / 180, arc = [];
    for (let a = 70; a <= 290; a += 10) arc.push(P(K.arc[0], K.arc[1], a * deg));
    VESSELS.push({ id: 'KARC', name: 'Tętnica łukowata', r: 1.1, pts: arc });
    // tętnice międzypłatowe: dolne odchodzą od tętnicy nerkowej, górne zbierają krew do żyły nerkowej (bez skrótu przez zatokę)
    for (const a of [100, 126, 152, 176]) VESSELS.push({ id: 'KIL', name: 'Żyła międzypłatowa', r: 1.0, pts: [[-25, -194], P(K.arc[0], K.arc[1], a * deg)] });
    for (const a of [204, 230, 256]) VESSELS.push({ id: 'KIL', name: 'Tętnica międzypłatowa', r: 1.0, pts: [[-25, -206], P(K.arc[0], K.arc[1], a * deg)] });
    for (let a = 78; a <= 282; a += 11) {
      const A = P(K.arc[0], K.arc[1], a * deg), B = P(K.cortex[0], K.cortex[1], a * deg);
      VESSELS.push({ id: 'KGL', name: 'Kłębuszek nerkowy', r: 0.6, pts: [A, B] });
      VESSELS.push({ id: 'KGL', name: 'Kłębuszek nerkowy', r: 1.05, pts: [B, [B[0] + 0.01, B[1]]] });
    }
  })();

  // wątroba: zraziki (heksagonalne) — światło zatok z płytkami hepatocytów ułożonymi promieniście wokół żyły centralnej
  const LIVER = {
    lobes: [{ c: [-18, -94], r: [38, 28], rot: 0.08 }, { c: [16, -86], r: [22, 15], rot: -0.25 }],
    zone: { c: [-8, -95], r: [22, 14], rot: 0 },
    gall: { c: [-27, -121], r: [7, 4], rot: 0.4 },
    plates: []
  };
  (function () {
    const Z = LIVER.zone, sp = 8.5, dy = sp * Math.sqrt(3) / 2;
    for (let row = -2; row <= 2; row++) for (let col = -3; col <= 3; col++) {
      const x = Z.c[0] + col * sp + (row & 1 ? sp / 2 : 0), y = Z.c[1] + row * dy;
      const q = ((x - Z.c[0]) / (Z.r[0] - 3)) ** 2 + ((y - Z.c[1]) / (Z.r[1] - 2.5)) ** 2;
      if (q > 1) continue;
      for (let k = 0; k < 6; k++) {
        const a = Math.PI / 6 + k * Math.PI / 3;
        LIVER.plates.push([x + Math.cos(a) * 2.4, y + Math.sin(a) * 2.4, x + Math.cos(a) * 3.8, y + Math.sin(a) * 3.8]);
      }
    }
  })();
  const PLATE_R = 0.75;

  // ramka samego serca (echo, minimapa)
  const HEART_BOX = { minX: -60, maxX: 60, minY: -58, maxY: 58 };
  const ABDOMEN_BOX = { minX: -60, maxX: 76, minY: -236, maxY: -56 };

  // Zastawki: punkt na kanale + kierunek prądu (w dół strumienia).
  // type 'av' = przedsionkowo-komorowe (otwarte w rozkurczu), 'sl' = półksiężycowate (otwarte w skurczu)
  const VALVES = [
    { id: 'tricuspid', name: 'Zastawka trójdzielna', type: 'av', c: [-24.4, -9.2], dir: [6, -12] },
    { id: 'mitral',    name: 'Zastawka mitralna',    type: 'av', c: [25.6, 5.5],   dir: [-5, -13] },
    { id: 'pulmonary', name: 'Zastawka pnia płucnego', type: 'sl', c: [-4.3, -1.0], dir: [-0.1, 1] },
    { id: 'aortic',    name: 'Zastawka aorty',       type: 'sl', c: [10.6, 9.0],   dir: [-0.6, 4] }
  ];

  // Wyjścia z mapy -> krążenie płucne / reszta ciała; wloty, którymi krew wraca
  const EXITS = [
    { id: 'pulm', from: 'PT',  test: (x, y) => y > 52 && x > -18 && x < 0, to: 'lungs' },
    { id: 'sys',  from: 'AO',  test: (x, y) => y > 52 && x > 2 && x < 18, to: 'body' },
    { id: 'legs', from: 'AAO', test: (x, y) => y < -218 && x > 26 && x < 46, to: 'legs' },
    { id: 'gut',  from: 'SMA', test: (x, y) => x > 58 && y > -168 && y < -152, to: 'gut' }
  ];
  const INLETS = {
    lungs: [{ x: 50, y: 28.6, name: 'Żyły płucne' }, { x: 50, y: 11.6, name: 'Żyły płucne' }],
    body:  [{ x: -30, y: 50, name: 'Żyła główna górna' }],
    legs:  [{ x: -39, y: -156, name: 'Żyła główna dolna' }],
    gut:   [{ x: 1.8, y: -148, name: 'Żyła wrotna' }]
  };
  // nazwy dróg poza mapą (HUD i ekran przejścia)
  const ROUTES = {
    lungs: { name: 'Krążenie płucne', text: 'Przez płuca do lewego przedsionka' },
    body:  { name: 'Krążenie duże', text: 'Przez głowę i ręce do żyły głównej górnej' },
    legs:  { name: 'Kończyny dolne', text: 'Przez nogi do żyły głównej dolnej' },
    gut:   { name: 'Jelita', text: 'Przez jelita do żyły wrotnej i wątroby' }
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
  // światło zatok wątroby: elipsa strefy minus płytki hepatocytów
  function sdLiverZone(px, py) {
    const Z = LIVER.zone;
    let d = sdEllipse(px, py, Z);
    if (d > 2) return d;
    let pl = 1e9;
    for (const q of LIVER.plates) {
      if (Math.abs(px - q[0]) > 6 || Math.abs(py - q[1]) > 6) continue;
      pl = Math.min(pl, sdSegment(px, py, q[0], q[1], q[2], q[3]) - PLATE_R);
    }
    return Math.max(d, -pl);
  }
  function vesselK(v) { return v.r < 1.7 ? 0.6 : 2.4; }   // drobne naczynia nerki łączą się ostrzej
  function analytic(px, py) {
    let d = 1e9;
    for (const e of ELLIPSES) d = smin(d, sdEllipse(px, py, e), 3.0);
    for (const v of VESSELS) {
      if (v.bb && (px < v.bb[0] || px > v.bb[2] || py < v.bb[1] || py > v.bb[3])) continue;
      d = smin(d, sdVessel(px, py, v), vesselK(v));
    }
    if (px > -34 && px < 18 && py > -113 && py < -77) d = smin(d, sdLiverZone(px, py), 1.2);
    return d;
  }
  // ramki naczyń (przyspieszenie budowy mapy)
  for (const v of VESSELS) {
    const m = v.r + 6;
    v.bb = [Math.min(...v.pts.map((p) => p[0])) - m, Math.min(...v.pts.map((p) => p[1])) - m, Math.max(...v.pts.map((p) => p[0])) + m, Math.max(...v.pts.map((p) => p[1])) + m];
  }

  // maski narządów (0..1) do renderu: wątroba, nerka (kora 0,5 / rdzeń 1), pęcherzyk żółciowy, miedniczka i moczowód
  function smoothstep(a, b, x) { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); }
  function sdLiver(px, py) { return smin(sdEllipse(px, py, LIVER.lobes[0]), sdEllipse(px, py, LIVER.lobes[1]), 6); }
  function sdKidney(px, py) {
    const K = KIDNEY;
    return Math.max(sdEllipse(px, py, { c: K.c, r: K.r, rot: 0 }), -(Math.hypot(px - K.hilum[0], py - K.hilum[1]) - K.hilumR));
  }
  function organMasks(px, py) {
    const K = KIDNEY;
    const liver = 1 - smoothstep(-0.8, 0.8, sdLiver(px, py));
    const kid = 1 - smoothstep(-0.8, 0.8, sdKidney(px, py));
    const med = 1 - smoothstep(-0.6, 0.6, sdEllipse(px, py, { c: K.c, r: K.arc, rot: 0 }));
    const gall = 1 - smoothstep(-0.6, 0.6, sdEllipse(px, py, LIVER.gall));
    const pelvis = Math.min(Math.hypot(px - K.sinus[0] - 4, py - K.sinus[1]) - 4.2, sdSegment(px, py, -19, -205, -15, -240) - 2.4);
    const pale = 1 - smoothstep(-0.6, 0.6, pelvis);
    return [liver, kid * (0.5 + 0.5 * med), gall, pale];
  }
  function organAt(px, py) {
    if (py > -60) return 'heart';
    if (sdLiver(px, py) < 0) return 'liver';
    if (sdKidney(px, py) < 1) return 'kidney';
    return 'abdomen';
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
    const W = C.world, cell = C.sdfCell;
    const NX = Math.ceil((W.maxX - W.minX) / cell), NY = Math.ceil((W.maxY - W.minY) / cell);
    const sx = (W.maxX - W.minX) / NX, sy = (W.maxY - W.minY) / NY;
    const NN = NX * NY;
    const inside = new Uint8Array(NN);
    const margin = 1.0;
    for (let j = 0; j < NY; j++) {
      const y = W.minY + (j + 0.5) * sy;
      for (let i = 0; i < NX; i++) {
        const x = W.minX + (i + 0.5) * sx;
        let ins = analytic(x, y) < 0;
        if (x < W.minX + margin || x > W.maxX - margin || y < W.minY + margin || y > W.maxY - margin) ins = false;
        inside[j * NX + i] = ins ? 1 : 0;
      }
    }
    const INF = 1e20;
    const dOut = new Float64Array(NN), dIn = new Float64Array(NN);
    for (let k = 0; k < NN; k++) { dOut[k] = inside[k] ? 0 : INF; dIn[k] = inside[k] ? INF : 0; }
    edt2d(dOut, NX, NY); edt2d(dIn, NX, NY);
    let sdf = new Float32Array(NN);
    for (let k = 0; k < NN; k++) {
      sdf[k] = inside[k] ? -(dIn[k] - 0.5) * cell : (dOut[k] - 0.5) * cell;
    }
    // dwa przebiegi lekkiego rozmycia — gładsze ściany bez schodków
    for (let pass = 0; pass < 2; pass++) {
      const out = new Float32Array(NN);
      for (let j = 0; j < NY; j++) for (let i = 0; i < NX; i++) {
        let s = 0, c = 0;
        for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
          const ii = Math.min(NX - 1, Math.max(0, i + di)), jj = Math.min(NY - 1, Math.max(0, j + dj));
          s += sdf[jj * NX + ii]; c++;
        }
        out[j * NX + i] = s / c;
      }
      sdf = out;
    }
    // maski narządów (RGBA 0..255)
    const organ = new Uint8Array(NN * 4);
    for (let j = 0; j < NY; j++) {
      const y = W.minY + (j + 0.5) * sy;
      if (y > -60) continue;
      for (let i = 0; i < NX; i++) {
        const m = organMasks(W.minX + (i + 0.5) * sx, y), k = (j * NX + i) * 4;
        organ[k] = m[0] * 255; organ[k + 1] = m[1] * 255; organ[k + 2] = m[2] * 255; organ[k + 3] = m[3] * 255;
      }
    }
    return { sdf, NX, NY, sx, sy, organ };
  }

  // miejsca startu patogenu (ekran wyboru narządu)
  const START = {
    heart: { x: C.bacteria.start.x, y: C.bacteria.start.y },
    kidney: { x: KIDNEY.c[0] + Math.cos(2.1) * KIDNEY.arc[0], y: KIDNEY.c[1] + Math.sin(2.1) * KIDNEY.arc[1] }   // tętnica łukowata
  };
  const H = { ELLIPSES, VESSELS, VALVES, EXITS, INLETS, ROUTES, KIDNEY, LIVER, HEART_BOX, ABDOMEN_BOX, START };
  H.organAt = organAt;

  H.init = function () {
    const r = build();
    H.sdf = r.sdf; H.NX = r.NX; H.NY = r.NY; H.sx = r.sx; H.sy = r.sy; H.organ = r.organ;
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
    const W = C.world, NX = H.NX, NY = H.NY;
    let fx = (x - W.minX) / H.sx - 0.5, fy = (y - W.minY) / H.sy - 0.5;
    fx = Math.max(0, Math.min(NX - 1.001, fx)); fy = Math.max(0, Math.min(NY - 1.001, fy));
    const i = fx | 0, j = fy | 0, tx = fx - i, ty = fy - j;
    const s = H.sdf, k = j * NX + i;
    const a = s[k] + (s[k + 1] - s[k]) * tx;
    const b = s[k + NX] + (s[k + NX + 1] - s[k + NX]) * tx;
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
    if (sdEllipse(x, y, LIVER.zone) < 0.5) return 'Zraziki wątroby';
    let best = null, bd = 1e9;
    for (const v of VESSELS) { const d = sdVessel(x, y, v); if (d < bd) { bd = d; best = v; } }
    return best ? best.name : '';
  };

  // obszar serca dla objawów: 'right' (prawe serce i krążenie płucne), 'left' (lewe serce), 'legs' (żyła główna dolna)
  const REGION = { RA: 'right', RV: 'right', SVC: 'right', TV: 'right', PT: 'right', LA: 'left', LV: 'left', MV: 'left', AO: 'left', PV1: 'left', PV2: 'left', IVC: 'legs', DAO: 'left' };
  H.regionOf = function (x, y) {
    if (y < -60) { const o = organAt(x, y); return o === 'liver' || o === 'kidney' ? o : 'abdomen'; }
    let best = null, bd = 1e9;
    for (const e of ELLIPSES) { const d = Math.abs(sdEllipse(x, y, e)); if (d < bd) { bd = d; best = e.id; } }
    for (const v of VESSELS) { const d = Math.abs(sdVessel(x, y, v)); if (d < bd) { bd = d; best = v.id; } }
    return REGION[best] || 'abdomen';
  };

  DD.Heart = H;
})();
