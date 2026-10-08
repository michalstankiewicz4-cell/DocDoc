// Stan gry + komendy.
// Cała logika zmienia stan WYŁĄCZNIE przez DD.Game.apply(state, cmd) i DD.Game.step(state, dt).
// Dzięki temu dodanie sieci = podmiana źródła komend (klawiatura/UI -> WebSocket/WebRTC).
(function () {
  const C = DD.CONFIG, H = DD.Heart, F = DD.Flow;
  const B = C.bacteria, D = C.doctor;

  const G = {};

  G.create = function () {
    return {
      time: 0, phase: 0, contraction: 0,
      running: false, over: null, organ: null,
      valves: H.VALVES.map(v => ({ id: v.id, open: 0 })),
      bact: {
        x: B.start.x, y: B.start.y, vx: 0, vy: 0, fx: 0, fy: 0, dir: -Math.PI / 2,
        ix: 0, iy: 0, hp: B.hp, infection: 0, nextColony: C.infection.colonyEvery,
        slowT: 0, slowMul: 1, transit: null, hitFlash: 0, contact: false, place: '',
        // oporność na leczenie: każde kolejne użycie tego samego leku działa słabiej
        resist: { antibodies: 0, fever: 0, slow: 0 }
      },
      doctor: {
        test: { state: 'idle', t: 0, cd: 0, sampleT: -1 },
        unlocked: false, knownInfection: null, knownHp: null,
        cd: { antibodies: 0, fever: 0, slow: 0 },
        feverT: 0, feverEff: 1, temp: 36.6
      },
      antibodies: [],
      colonies: [],
      chords: [],      // geometria strun ścięgnistych (liczona co krok, wspólna dla kolizji i renderu)
      leaflets: [],    // płatki zastawek
      log: [],
      seed: 1,
      // statystyki rundy (ekran końcowy)
      stats: {
        distance: 0, contactTime: 0, maxInfection: 0, minHp: B.hp,
        valveCrossings: 0, lungsTrips: 0, bodyTrips: 0, places: [],
        abHits: 0, dmgAntibodies: 0, dmgFever: 0,
        tests: 0, firstTestAt: -1, firstTreatAt: -1,
        used: { antibodies: 0, fever: 0, slow: 0 }
      },
      valveSide: H.VALVES.map(() => 0),
      coughs: 0          // licznik kaszlnięć pacjenta (dźwięk u obu graczy)
    };
  };

  function log(s, who, text) {
    s.log.push({ t: s.time, who, text });
    if (s.log.length > 60) s.log.shift();
  }
  function rnd(s) { // deterministyczny LCG
    s.seed = (s.seed * 1664525 + 1013904223) >>> 0;
    return s.seed / 4294967296;
  }

  // skuteczność leku = 1 - oporność; po podaniu oporność rośnie
  function useDrug(s, key) {
    const R = C.resistance, r = s.bact.resist;
    s.stats.used[key]++;
    if (s.stats.firstTreatAt < 0) s.stats.firstTreatAt = s.time;
    const eff = 1 - r[key];
    r[key] = Math.min(R.max, r[key] + R.perUse);
    return eff;
  }
  const pct = (v) => Math.round(v * 100) + '%';

  // ---------- KOMENDY ----------
  G.apply = function (s, cmd) {
    const d = s.doctor;
    switch (cmd.type) {
      case 'game.start':
        if (cmd.organ !== 'heart') return;
        Object.assign(s, G.create(), { running: true, organ: 'heart' });
        log(s, 'sys', 'Pacjent przyjęty. Bakteria wnika przez żyłę główną górną.');
        return;
      case 'bact.input':
        s.bact.ix = Math.max(-1, Math.min(1, cmd.x));
        s.bact.iy = Math.max(-1, Math.min(1, cmd.y));
        return;
    }
    if (!s.running) return;
    switch (cmd.type) {
      case 'doc.test':
        if (d.test.state === 'running' || d.test.cd > 0) return;
        d.test.state = 'running'; d.test.t = D.testDuration; d.test.sampleT = s.time; // chwila pobrania krwi
        s.stats.tests++; if (s.stats.firstTestAt < 0) s.stats.firstTestAt = s.time;
        log(s, 'doc', 'Zlecono badanie krwi (posiew + morfologia).');
        return;
      case 'doc.antibodies':
        if (!d.unlocked || d.cd.antibodies > 0) return;
        d.cd.antibodies = D.antibodies.cooldown;
        { const eff = useDrug(s, 'antibodies');
          spawnAntibodies(s, eff);
          log(s, 'doc', `Podano immunoglobuliny dożylnie (skuteczność ${pct(eff)}).`); }
        return;
      case 'doc.fever':
        if (!d.unlocked || d.cd.fever > 0) return;
        d.cd.fever = D.fever.cooldown; d.feverT = D.fever.duration;
        d.feverEff = useDrug(s, 'fever');
        log(s, 'doc', `Wywołano gorączkę leczniczą (skuteczność ${pct(d.feverEff)}).`);
        return;
      case 'doc.slow':
        if (!d.unlocked || d.cd.slow > 0) return;
        { const eff = useDrug(s, 'slow');
          d.cd.slow = D.slow.cooldown; s.bact.slowT = D.slow.duration;
          s.bact.slowMul = 1 - (1 - D.slow.speedMul) * eff;
          log(s, 'doc', `Podano antybiotyk bakteriostatyczny we wlewie (skuteczność ${pct(eff)}).`); }
        return;
    }
  };

  function spawnAntibodies(s, eff) {
    // lek podany dożylnie miesza się z krwią: przeciwciała pojawiają się w całym krwiobiegu serca
    const W = C.world;
    for (let i = 0; i < D.antibodies.count; i++) {
      let x = 0, y = 0;
      for (let t = 0; t < 40; t++) {
        x = W.minX + rnd(s) * (W.maxX - W.minX); y = W.minY + rnd(s) * (W.maxY - W.minY);
        if (H.sample(x, y) < -1.0) break;
      }
      s.antibodies.push({
        x, y,
        z: (rnd(s) - 0.5) * 2.5, life: D.antibodies.life * (0.8 + rnd(s) * 0.4),
        stuck: false, ox: 0, oy: 0, eff, rot: rnd(s) * 6.28, spin: (rnd(s) - 0.5) * 4
      });
    }
  }

  // ---------- GEOMETRIA ZASTAWEK I STRUN ----------
  function updateValveGeometry(s) {
    s.leaflets.length = 0; s.chords.length = 0;
    H.VALVES.forEach((v, i) => {
      const open = s.valves[i].open;
      const width = v.w1 + v.w2;
      [[v.a1, 1], [v.a2, -1]].forEach(([hinge, side]) => {
        // zamknięty: płatek celuje w środek pierścienia (lekko w górę strumienia — kopuła)
        const len = width * 0.5 + 0.25;
        const closedAng = Math.atan2(-v.p[1] * side - v.d[1] * 0.25, -v.p[0] * side - v.d[0] * 0.25);
        const openAng = Math.atan2(v.d[1] - v.p[1] * side * 0.12, v.d[0] - v.p[0] * side * 0.12);
        let da = openAng - closedAng;
        while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
        const ang = closedAng + da * open;
        const tip = [hinge[0] + Math.cos(ang) * len, hinge[1] + Math.sin(ang) * len];
        s.leaflets.push({ valve: v.id, type: v.type, hinge, tip, ang, len, open });
        if (v.type === 'av') {
          // mięsień brodawkowaty w komorze, struny do brzegu płatka
          const px = v.c[0] + v.d[0] * 9 + v.p[0] * side * 3.2;
          const py = v.c[1] + v.d[1] * 9 + v.p[1] * side * 3.2;
          const tipZ = -1.9;
          for (const [f, z] of [[0.55, -3.2], [0.8, -1.2], [1.0, 0.6], [0.7, 1.8], [0.95, -2.4]]) {
            const ax = hinge[0] + (tip[0] - hinge[0]) * f, ay = hinge[1] + (tip[1] - hinge[1]) * f;
            s.chords.push({ a: [px, py, tipZ], b: [ax, ay, z], pap: [px, py] });
          }
        }
      });
    });
  }

  // ---------- KOLIZJE ----------
  const g2 = [0, 0];
  function collideWalls(o, r) {
    const d = H.sample(o.x, o.y);
    if (d > -r) {
      H.grad(o.x, o.y, g2);
      const push = d + r;
      o.x -= g2[0] * push; o.y -= g2[1] * push;
      return true;
    }
    return false;
  }
  function closestOnSeg(px, py, ax, ay, bx, by) {
    const vx = bx - ax, vy = by - ay;
    const h = Math.max(0, Math.min(1, ((px - ax) * vx + (py - ay) * vy) / (vx * vx + vy * vy)));
    return [ax + vx * h, ay + vy * h];
  }
  function collideLeaflets(s, o, r) {
    let hit = false;
    for (const L of s.leaflets) {
      const [cx, cy] = closestOnSeg(o.x, o.y, L.hinge[0], L.hinge[1], L.tip[0], L.tip[1]);
      const dx = o.x - cx, dy = o.y - cy, dist = Math.hypot(dx, dy), rr = r + 0.22;
      if (dist < rr && dist > 1e-5) { o.x = cx + dx / dist * rr; o.y = cy + dy / dist * rr; hit = true; }
    }
    return hit;
  }
  function collideChords(s, o, r) {
    for (const ch of s.chords) {
      const a = ch.a, b = ch.b;
      // punkt struny najbliższy (x,y,0) w 3D
      const vx = b[0] - a[0], vy = b[1] - a[1], vz = b[2] - a[2];
      const h = Math.max(0, Math.min(1, ((o.x - a[0]) * vx + (o.y - a[1]) * vy + (0 - a[2]) * vz) / (vx * vx + vy * vy + vz * vz)));
      const cx = a[0] + vx * h, cy = a[1] + vy * h, cz = a[2] + vz * h;
      const dx = o.x - cx, dy = o.y - cy, dist3 = Math.hypot(dx, dy, cz), rr = r + 0.09;
      if (dist3 < rr) {
        const dxy = Math.hypot(dx, dy) || 1e-4;
        const need = Math.sqrt(Math.max(0, rr * rr - cz * cz));
        o.x = cx + dx / dxy * need; o.y = cy + dy / dxy * need;
      }
    }
  }

  // ---------- KROK SYMULACJI ----------
  const fv = [0, 0];
  G.step = function (s, dt) {
    if (!s.running) return;
    s.time += dt;
    s.phase = (s.time * C.bpm / 60) % 1;
    s.contraction = F.contraction(s.phase);
    H.VALVES.forEach((v, i) => { s.valves[i].open = F.valveOpen(v.type, s.phase); });
    updateValveGeometry(s);
    if (s.over) return;

    const b = s.bact, d = s.doctor;

    // --- lekarz ---
    if (d.test.state === 'running') {
      d.test.t -= dt;
      if (d.test.t <= 0) {
        d.test.state = 'done'; d.test.cd = D.testCooldown;
        d.knownInfection = Math.round(b.infection); d.knownHp = Math.round(b.hp); d.resultTime = s.time;
        const first = !d.unlocked; d.unlocked = true;
        log(s, 'doc', `Wynik: posiew dodatni, kolonizacja ok. ${d.knownInfection}%.` + (first ? ' Odblokowano leczenie.' : ''));
      }
    } else if (d.test.cd > 0) d.test.cd = Math.max(0, d.test.cd - dt);
    for (const k in d.cd) d.cd[k] = Math.max(0, d.cd[k] - dt);
    if (d.feverT > 0) d.feverT = Math.max(0, d.feverT - dt);
    const targetT = d.feverT > 0 ? D.fever.temp : 36.6;
    d.temp += (targetT - d.temp) * Math.min(1, dt * 0.35);
    const feverK = Math.max(0, Math.min(1, (d.temp - 37.2) / (D.fever.temp - 37.2)));
    // kaszel: tym częstszy, im większe zakażenie
    if (rnd(s) < (C.cough.base + C.cough.perInfection * s.bact.infection) * dt) s.coughs++;

    // --- bakteria ---
    b.hitFlash = Math.max(0, b.hitFlash - dt * 2.5);
    if (b.slowT > 0) b.slowT = Math.max(0, b.slowT - dt);
    if (b.transit) {
      b.transit.t -= dt;
      if (b.transit.t <= 0) {
        const opts = H.INLETS[b.transit.to];
        const p = opts[Math.floor(rnd(s) * opts.length)];
        b.x = p.x; b.y = p.y; b.vx = b.vy = 0; b.transit = null;
      }
    } else {
      let stuck = 0; for (const a of s.antibodies) if (a.stuck) stuck += (a.eff ?? 1);
      const mul = (b.slowT > 0 ? b.slowMul : 1) * Math.max(0.3, 1 - stuck * 0.08);
      const il = Math.hypot(b.ix, b.iy) || 1;
      b.vx += (b.ix / il) * B.accel * mul * dt * (b.ix || b.iy ? 1 : 0);
      b.vy += (b.iy / il) * B.accel * mul * dt * (b.ix || b.iy ? 1 : 0);
      const dragK = Math.exp(-B.drag * dt);
      b.vx *= dragK; b.vy *= dragK;
      const sp = Math.hypot(b.vx, b.vy), cap = B.maxSpeed * mul;
      if (sp > cap) { b.vx *= cap / sp; b.vy *= cap / sp; }
      F.velocity(b.x, b.y, s.time, s.phase, fv);
      b.fx = fv[0]; b.fy = fv[1];
      // przy ścianie prąd słabnie (warstwa przyścienna) — tam bakteria może się trzymać
      const ox = b.x, oy = b.y;
      b.x += (b.vx + fv[0] * B.flowCoupling) * dt;
      b.y += (b.vy + fv[1] * B.flowCoupling) * dt;
      if (Math.hypot(b.vx, b.vy) > 0.4) b.dir = Math.atan2(b.vy, b.vx);

      collideChords(s, b, B.radius);
      collideLeaflets(s, b, B.radius);
      b.contact = collideWalls(b, B.radius + 0.05) || H.sample(b.x, b.y) > -(B.radius + 0.3);

      const ST = s.stats;
      ST.distance += Math.hypot(b.x - ox, b.y - oy);
      // przejście przez zastawkę = zmiana strony płaszczyzny pierścienia w jego obrębie
      H.VALVES.forEach((v, i) => {
        const rx = b.x - v.c[0], ry = b.y - v.c[1];
        const along = rx * v.d[0] + ry * v.d[1], across = rx * v.p[0] + ry * v.p[1];
        const side = Math.abs(across) < Math.max(v.w1, v.w2) + 0.5 && Math.abs(along) < 3 ? Math.sign(along) : 0;
        if (side && s.valveSide[i] && side !== s.valveSide[i]) ST.valveCrossings++;
        if (side) s.valveSide[i] = side; else if (Math.abs(along) >= 3) s.valveSide[i] = 0;
      });
      if (b.contact) ST.contactTime += dt;
      ST.maxInfection = Math.max(ST.maxInfection, b.infection);
      if (b.contact) {
        b.infection += C.infection.ratePerSec * (1 - feverK * d.feverEff * (1 - D.fever.infectionMul)) * dt;
        if (b.infection >= b.nextColony) {
          b.nextColony += C.infection.colonyEvery;
          H.grad(b.x, b.y, g2);
          const sd = H.sample(b.x, b.y);
          s.colonies.push({ x: b.x - g2[0] * sd, y: b.y - g2[1] * sd, nx: g2[0], ny: g2[1], born: s.time, seed: rnd(s) });
        }
      }
      if (feverK > 0) { const fd = D.fever.dps * feverK * d.feverEff * dt; b.hp -= fd; ST.dmgFever += fd; }

      for (const ex of H.EXITS) if (ex.test(b.x, b.y)) {
        b.transit = { to: ex.to, t: 1.6, total: 1.6 };
        if (ex.to === 'lungs') ST.lungsTrips++; else ST.bodyTrips++;
        log(s, 'sys', ex.to === 'lungs' ? 'Bakteria płynie przez krążenie płucne.' : 'Bakteria płynie przez krążenie duże.');
      }
      b.place = H.placeName(b.x, b.y);
      if (b.place && !ST.places.includes(b.place)) ST.places.push(b.place);
      ST.minHp = Math.min(ST.minHp, b.hp);
    }

    // --- przeciwciała ---
    const A = D.antibodies;
    for (let i = s.antibodies.length - 1; i >= 0; i--) {
      const a = s.antibodies[i];
      a.life -= dt; a.rot += a.spin * dt;
      if (a.life <= 0) { s.antibodies.splice(i, 1); continue; }
      if (a.stuck) { a.x = b.x + a.ox; a.y = b.y + a.oy; continue; }
      F.velocity(a.x, a.y, s.time, s.phase, fv);
      let vx = fv[0] * 0.9, vy = fv[1] * 0.9;
      const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy);
      if (!b.transit && dist < A.homingRadius) {
        const k = A.speed * (1 - dist / A.homingRadius * 0.5);
        vx += dx / dist * k; vy += dy / dist * k;
      }
      a.x += vx * dt; a.y += vy * dt;
      collideLeaflets(s, a, 0.2);
      collideWalls(a, 0.25);
      for (const ex of H.EXITS) if (ex.test(a.x, a.y)) {
        const p = H.INLETS[ex.to][Math.floor(rnd(s) * 2)]; a.x = p.x; a.y = p.y;
      }
      if (!b.transit && dist < B.radius + 0.4) {
        a.stuck = true; a.ox = a.x - b.x; a.oy = a.y - b.y; a.life = Math.min(a.life, 8);
        b.hp -= A.damage * (a.eff ?? 1); b.hitFlash = 0.4 + 0.6 * (a.eff ?? 1);
        s.stats.abHits++; s.stats.dmgAntibodies += A.damage * (a.eff ?? 1);
      }
    }

    // --- koniec gry ---
    if (b.hp <= 0) { b.hp = 0; s.over = 'doctor'; log(s, 'sys', 'Bakteria zniszczona. Wygrywa lekarz.'); }
    else if (b.infection >= 100) { b.infection = 100; s.over = 'bacteria'; log(s, 'sys', 'Zakażenie rozwinięte. Wygrywa bakteria.'); }
  };

  G.updateValveGeometry = updateValveGeometry;
  DD.Game = G;

  // ---------- SZYNA KOMEND ----------
  // Źródła (lokalna klawiatura, UI lekarza, w przyszłości sieć) wrzucają komendy,
  // pętla gry zdejmuje je przed każdym krokiem symulacji.
  DD.CommandBus = {
    queue: [],
    push(cmd) { this.queue.push(cmd); },
    drain(fn) { const q = this.queue; this.queue = []; for (const c of q) fn(c); }
  };
})();
