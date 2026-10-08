// Podgląd lekarza:
//  1) małe okienko z grą bakterii opóźnioną o kilka sekund,
//  2) zdjęcie miejsca, w którym była bakteria w chwili pobrania krwi (pokazywane z wynikiem badania).
// Lekarz zawsze ma pełny stan gry (host liczy symulację, gość dostaje paczki stanu),
// więc wystarczy zapisywać krótką historię i renderować ją drugim, lekkim widokiem.
(function () {
  const C = DD.CONFIG, P = C.preview, H = DD.Heart, F = DD.Flow;
  const $ = (id) => document.getElementById(id);
  const lerp = (a, b, k) => a + (b - a) * k;
  const mmss = (t) => { const m = Math.floor(t / 60), s = Math.floor(t % 60); return `${m}:${s < 10 ? '0' : ''}${s}`; };

  DD.createDoctorCam = function (state0) {
    const box = $('doc-cam');
    $('cam-delay').textContent = P.delay;
    let view = null;
    try {
      view = DD.createView(box, state0, { maxCells: P.maxCells, maxPixelRatio: 1 });
    } catch (e) { console.error(e); return { update() {} }; }

    // ---------- historia ----------
    let hist = [], recAcc = 0, lastTime = -1;
    function record(s) {
      const b = s.bact;
      hist.push({
        t: s.time,
        b: { x: b.x, y: b.y, vx: b.vx, vy: b.vy, dir: b.dir, hp: b.hp, slowT: b.slowT, hitFlash: b.hitFlash, dead: b.dead, inTissue: b.inTissue, z: b.z,
          transit: b.transit ? { to: b.transit.to, t: b.transit.t, total: b.transit.total } : null },
        ab: s.antibodies.map((a) => ({ x: a.x, y: a.y, z: a.z, stuck: a.stuck, ox: a.ox, oy: a.oy, rot: a.rot, life: a.life, eff: a.eff })),
        cp: (s.copies || []).map((c) => ({ id: c.id, x: c.x, y: c.y, dir: c.dir, born: c.born })),
        fo: (s.food || []).map((f) => ({ id: f.id, x: f.x, y: f.y, z: f.z, kind: f.kind })),
        temp: s.doctor.temp
      });
      while (hist.length && hist[0].t < s.time - P.history) hist.shift();
    }
    function findPair(t) {
      if (!hist.length || t < hist[0].t) return null;
      let i = hist.length - 1;
      while (i > 0 && hist[i].t > t) i--;
      const e0 = hist[i], e1 = hist[Math.min(i + 1, hist.length - 1)];
      const k = e1.t > e0.t ? Math.max(0, Math.min(1, (t - e0.t) / (e1.t - e0.t))) : 0;
      return { e0, e1, k };
    }

    // ---------- "duch" stanu do renderu ----------
    const ghost = {
      time: 0, phase: 0, contraction: 0, running: true, over: null,
      valves: H.VALVES.map((v) => ({ id: v.id, open: 0 })), leaflets: [], chords: [],
      bact: null, antibodies: [], colonies: [], copies: [], food: [], doctor: { temp: 36.6 }
    };
    function buildGhost(pair, live) {
      const { e0, e1, k } = pair;
      const g = ghost;
      g.time = lerp(e0.t, e1.t, k);
      g.phase = (g.time * C.bpm / 60) % 1;
      g.contraction = F.contraction(g.phase);
      H.VALVES.forEach((v, i) => { g.valves[i].open = F.valveOpen(v.type, g.phase); });
      DD.Game.updateValveGeometry(g);
      const a = e0.b, b = e1.b;
      const jump = Math.hypot(b.x - a.x, b.y - a.y) > 4;
      g.bact = Object.assign({}, a, {
        x: jump ? a.x : lerp(a.x, b.x, k), y: jump ? a.y : lerp(a.y, b.y, k),
        dir: a.dir, place: H.placeName(a.x, a.y)
      });
      const same = e0.ab.length === e1.ab.length;
      g.antibodies = e0.ab.map((x, i) => {
        if (!same) return x;
        const y = e1.ab[i];
        return Object.assign({}, x, { x: lerp(x.x, y.x, k), y: lerp(x.y, y.y, k), rot: lerp(x.rot, y.rot, k) });
      });
      g.copies = e0.cp.map((x) => {
        const y = e1.cp.find((c) => c.id === x.id);
        return y ? { id: x.id, x: lerp(x.x, y.x, k), y: lerp(x.y, y.y, k), dir: x.dir, born: x.born } : x;
      });
      g.food = e0.fo;
      g.colonies = live.colonies.filter((c) => c.born <= g.time);
      g.kind = live.kind;
      g.doctor.temp = e0.temp;
      return g;
    }

    // ---------- zdjęcie z chwili pobrania ----------
    let lastSampleT = -1, photoFor = -1;
    function takePhoto(s) {
      const sampleT = s.doctor.test.sampleT;
      const pair = findPair(sampleT);
      const fig = $('test-photo');
      if (!pair) { fig.hidden = true; return; }
      const g = buildGhost({ e0: pair.e0, e1: pair.e0, k: 0 }, s);
      view.frame(g, 1 / 60, { snap: true });
      // drugi kadr: krwinki już rozmieszczone wokół miejsca zdjęcia
      view.frame(g, 1 / 60, { snap: true });
      try {
        $('test-photo-img').src = view.renderer.domElement.toDataURL('image/jpeg', 0.85);
      } catch (e) { fig.hidden = true; return; }
      const where = g.bact.transit ? 'krwiobieg poza sercem' : g.bact.place;
      $('test-photo-place').textContent = where;
      $('test-photo-time').textContent = `pobranie krwi ${mmss(sampleT)}`;
      fig.hidden = false;
    }

    let frameN = 0;
    function update(s, dt) {
      // nowa runda — czyścimy historię i zdjęcie
      if (s.time < lastTime - 0.5) { hist = []; photoFor = -1; $('test-photo').hidden = true; }
      lastTime = s.time;
      const visible = s.running && document.body.dataset.role !== 'bact';
      $('doc-cam-empty').hidden = s.running;
      if (!s.running) return;

      recAcc += dt;
      if (recAcc >= 1 / P.rate) { recAcc = 0; record(s); }

      // wynik badania: zrób zdjęcie raz na każde badanie
      const d = s.doctor;
      if (d.test.state === 'done' && d.test.sampleT >= 0 && photoFor !== d.test.sampleT) {
        photoFor = d.test.sampleT;
        takePhoto(s);
      }
      if (!visible) return;

      // w trybie deweloperskim (dwa widoki 3D naraz) renderujemy podgląd co drugą klatkę
      frameN++;
      if (document.body.dataset.role !== 'doc' && frameN % 2) return;
      const pair = findPair(s.time - P.delay);
      $('doc-cam-wait').hidden = !!pair;
      if (!pair) return;
      view.frame(buildGhost(pair, s), dt * (document.body.dataset.role !== 'doc' ? 2 : 1));
    }
    return { update };
  };
})();
