// Komórki mięśnia sercowego (kardiomiocyty) w ścianie serca — wspólne dla kolizji (stan gry) i renderu.
// Układ jest proceduralny i deterministyczny: siatka z losowym przesunięciem (hash), każda komórka to elipsa
// ułożona wzdłuż włókien, czyli stycznie do ściany (prostopadle do gradientu SDF).
(function () {
  const C = DD.CONFIG, H = DD.Heart;
  const T = C.tissue;

  function hash2(i, j, k) {
    let h = (i * 374761393 + j * 668265263 + (k | 0) * 362437) | 0;
    h = (h ^ (h >>> 13)) * 1274126177 | 0;
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }

  const cache = new Map();
  // komórka dla oczka siatki (i, j) albo null, jeśli środek nie leży w mięśniu
  function cellAt(i, j) {
    const key = i * 100003 + j;
    if (cache.has(key)) return cache.get(key);
    const G = T.grid;
    const cx = (i + 0.5 + (hash2(i, j, 1) - 0.5) * 0.55) * G;
    const cy = (j + 0.5 + (hash2(i, j, 2) - 0.5) * 0.55) * G;
    const d = H.sample(cx, cy);
    let cell = null;
    // przy ścianie naczynia zostaje wolny pas (cellGap), żeby zawsze dało się wrócić do krwi
    if (d > T.minD + T.cellGap && d < T.maxD - 0.2) {
      const g = H.grad(cx, cy);
      const ang = Math.atan2(g[1], g[0]) + Math.PI / 2 + (hash2(i, j, 3) - 0.5) * 0.35;
      const s = 0.85 + hash2(i, j, 4) * 0.3;
      cell = { cx, cy, ang, a: T.cellLength * 0.5 * s, b: T.cellRadius * (0.9 + hash2(i, j, 5) * 0.2), seed: hash2(i, j, 6), id: key };
    }
    cache.set(key, cell);
    return cell;
  }

  const TC = {};
  // komórki w promieniu r od (x, y)
  TC.near = function (x, y, r, out) {
    out = out || []; out.length = 0;
    const G = T.grid;
    const i0 = Math.floor((x - r) / G), i1 = Math.floor((x + r) / G);
    const j0 = Math.floor((y - r) / G), j1 = Math.floor((y + r) / G);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) {
      const c = cellAt(i, j);
      if (c) out.push(c);
    }
    return out;
  };

  // wypchnięcie okręgu (x, y, r) poza elipsy komórek; zwraca true przy kontakcie
  const tmp = [];
  TC.collide = function (o, r) {
    let hit = false;
    TC.near(o.x, o.y, 2.2, tmp);
    for (const c of tmp) {
      const dx = o.x - c.cx, dy = o.y - c.cy;
      const cs = Math.cos(-c.ang), sn = Math.sin(-c.ang);
      const lx = dx * cs - dy * sn, ly = dx * sn + dy * cs;
      const A = c.a + r, B = c.b + r;
      const k = (lx * lx) / (A * A) + (ly * ly) / (B * B);
      if (k < 1 && k > 1e-6) {
        const f = 1 / Math.sqrt(k);
        const nx = lx * f, ny = ly * f;
        const cs2 = Math.cos(c.ang), sn2 = Math.sin(c.ang);
        o.x = c.cx + nx * cs2 - ny * sn2; o.y = c.cy + nx * sn2 + ny * cs2;
        hit = true;
      }
    }
    return hit;
  };

  // czy punkt leży w mięśniu (pas ściany dostępny dla patogenu)
  TC.inMuscle = function (x, y) { const d = H.sample(x, y); return d > T.minD && d < T.maxD; };

  DD.TissueCells = TC;
})();
