// Gra przez sieć bez własnego serwera: WebRTC + ręczna wymiana kodów.
//
//  Host                                   Gość
//  createOffer -> kod zaproszenia  ---->  wkleja kod, createAnswer
//  wkleja kod odpowiedzi  <------------  kod odpowiedzi
//  ======== bezpośredni kanał danych przeglądarka <-> przeglądarka ========
//
// Host liczy symulację. Gość wysyła tylko swoje komendy i dostaje stan ~20 razy na sekundę.
// Do przejścia przez routery (NAT) używamy publicznych serwerów STUN Google — one tylko
// mówią przeglądarce, jaki ma adres publiczny; dane gry nie przechodzą przez nie.
(function () {
  const ICE = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }];
  const SNAP_HZ = 20;

  const N = {
    mode: 'local',   // 'local' | 'host' | 'guest'
    role: 'both',    // 'both' | 'bact' | 'doc'
    pc: null, chCmd: null, chSt: null, connected: false,
    onConnected: () => {}, onClosed: () => {}
  };

  // ---------- uprawnienia ról ----------
  N.allowed = function (cmd, role) {
    if (role === 'both') return true;
    if (cmd.type === 'game.start') return true;
    if (role === 'bact') return cmd.type.startsWith('bact.');
    if (role === 'doc') return cmd.type.startsWith('doc.');
    return false;
  };
  N.otherRole = (r) => (r === 'bact' ? 'doc' : 'bact');

  // wszystkie lokalne źródła (klawiatura, przyciski) wysyłają komendy tędy
  DD.send = function (cmd) {
    if (!N.allowed(cmd, N.role)) return;
    if (N.mode === 'guest') { if (N.connected) N.sendReliable({ m: 'cmd', c: cmd }); }
    else DD.CommandBus.push(cmd);
  };

  // ---------- kody zaproszenia / odpowiedzi ----------
  function b64(bytes) {
    let s = ''; for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function unb64(str) {
    str = str.replace(/-/g, '+').replace(/_/g, '/');
    while (str.length % 4) str += '=';
    const s = atob(str), out = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i);
    return out;
  }
  async function pack(obj) {
    const json = JSON.stringify(obj);
    if (window.CompressionStream) {
      const stream = new Blob([json]).stream().pipeThrough(new CompressionStream('deflate-raw'));
      return 'DD1.' + b64(new Uint8Array(await new Response(stream).arrayBuffer()));
    }
    return 'DD0.' + b64(new TextEncoder().encode(json));
  }
  async function unpack(code) {
    code = (code || '').replace(/\s+/g, '');
    const v = code.slice(0, 4), bytes = unb64(code.slice(4));
    if (v === 'DD1.') {
      const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return JSON.parse(await new Response(stream).text());
    }
    if (v === 'DD0.') return JSON.parse(new TextDecoder().decode(bytes));
    throw new Error('To nie wygląda na kod PatientZero. Skopiuj go jeszcze raz w całości.');
  }

  function waitIce(pc) {
    return new Promise((res) => {
      if (pc.iceGatheringState === 'complete') return res();
      const t = setTimeout(res, 5000);
      pc.addEventListener('icegatheringstatechange', () => {
        if (pc.iceGatheringState === 'complete') { clearTimeout(t); res(); }
      });
    });
  }

  function makePC() {
    if (!window.RTCPeerConnection) throw new Error('Ta przeglądarka nie obsługuje połączeń WebRTC.');
    const pc = new RTCPeerConnection({ iceServers: ICE });
    pc.addEventListener('connectionstatechange', () => {
      if (N.connected && (pc.connectionState === 'failed' || pc.connectionState === 'closed' || pc.connectionState === 'disconnected')) lost();
    });
    return pc;
  }
  // reason: 'left' (drugi gracz zamknął grę i zdążył się pożegnać) albo 'lost' (cisza / błąd sieci)
  function lost(reason) {
    if (!N.connected) return;
    N.connected = false;
    clearInterval(pingTimer);
    N.onClosed(reason === 'left' ? 'left' : 'lost');
  }
  function wire(ch) {
    if (ch.label === 'cmd') N.chCmd = ch; else N.chSt = ch;
    ch.addEventListener('open', checkOpen);
    ch.addEventListener('close', () => lost('lost'));
    ch.addEventListener('message', (e) => onMessage(ch.label, e.data));
  }
  // ---------- statystyki połączenia ----------
  // ping co sekundę (pong wraca z tym samym znacznikiem czasu -> RTT),
  // licznik paczek stanu na sekundę, zgubione paczki (numery sekwencyjne), typ trasy i bajty z getStats()
  const S = N.stats = {
    rtt: null, silence: 0, snapRate: 0, snapCount: 0, sentSnaps: 0, recvSnaps: 0,
    lostSnaps: 0, lastSeq: 0, route: '—', bytesSent: 0, bytesRecv: 0, msgsSent: 0, msgsRecv: 0
  };
  const WEAK_MS = 2000, LOST_MS = 6000;
  let lastRecv = 0, pingTimer = null;
  N.quality = function () {
    if (!N.connected) return 'lost';
    if (S.silence > WEAK_MS) return 'stalled';
    if (S.rtt == null || S.rtt > 250 || S.silence > 1000) return 'weak';
    return 'good';
  };
  function routeName(local, remote) {
    const t = [local && local.candidateType, remote && remote.candidateType];
    if (t.includes('relay')) return 'przez serwer pośredniczący (TURN)';
    if (t[0] === 'host' && t[1] === 'host') return 'bezpośrednie w sieci lokalnej';
    if (t.includes('srflx') || t.includes('prflx')) return 'bezpośrednie przez internet';
    return t.filter(Boolean).join(' / ') || '—';
  }
  async function pollStats() {
    if (!N.pc || !N.pc.getStats) return;
    try {
      const rep = await N.pc.getStats();
      let pair = null, bs = 0, br = 0, ms = 0, mr = 0;
      const byId = new Map();
      rep.forEach((r) => {
        byId.set(r.id, r);
        if (r.type === 'candidate-pair' && (r.nominated || r.selected) && r.state === 'succeeded') pair = r;
        if (r.type === 'data-channel') { bs += r.bytesSent || 0; br += r.bytesReceived || 0; ms += r.messagesSent || 0; mr += r.messagesReceived || 0; }
      });
      S.bytesSent = bs; S.bytesRecv = br; S.msgsSent = ms; S.msgsRecv = mr;
      if (pair) S.route = routeName(byId.get(pair.localCandidateId), byId.get(pair.remoteCandidateId));
    } catch (e) { /* statystyki niedostępne */ }
  }
  function checkOpen() {
    if (!N.connected && N.chCmd && N.chSt && N.chCmd.readyState === 'open' && N.chSt.readyState === 'open') {
      N.connected = true;
      lastRecv = performance.now();
      clearInterval(pingTimer);
      pingTimer = setInterval(() => {
        if (!N.connected) { clearInterval(pingTimer); return; }
        N.sendReliable({ m: 'ping', t: performance.now() });
        S.snapRate = S.snapCount; S.snapCount = 0;
        pollStats();
        if (performance.now() - lastRecv > LOST_MS) lost('lost');
      }, 1000);
      N.onConnected();
    }
  }
  // cisza liczona na bieżąco (do ostrzeżenia o słabym połączeniu)
  N.updateSilence = function () { S.silence = N.connected ? performance.now() - lastRecv : 0; };

  // pożegnanie przy zamknięciu karty — drugi gracz zobaczy "opuścił grę", a nie "zerwane"
  window.addEventListener('pagehide', () => { if (N.connected) N.sendReliable({ m: 'bye' }); });

  N.sendReliable = function (obj) {
    if (N.chCmd && N.chCmd.readyState === 'open') N.chCmd.send(JSON.stringify(obj));
  };

  // host: krok 1 — kod zaproszenia
  N.host = async function (role) {
    N.close();
    N.mode = 'host'; N.role = role;
    const pc = N.pc = makePC();
    wire(pc.createDataChannel('cmd'));
    wire(pc.createDataChannel('st', { ordered: false, maxRetransmits: 0 }));
    await pc.setLocalDescription(await pc.createOffer());
    await waitIce(pc);
    return pack({ k: 'o', r: role, s: pc.localDescription.sdp });
  };
  // host: krok 2 — kod odpowiedzi od gościa
  N.acceptAnswer = async function (code) {
    const o = await unpack(code);
    if (o.k !== 'a') throw new Error('To jest kod zaproszenia, a potrzebny jest kod odpowiedzi od drugiego gracza.');
    await N.pc.setRemoteDescription({ type: 'answer', sdp: o.s });
  };
  // gość: z kodu zaproszenia robi kod odpowiedzi
  N.join = async function (code) {
    const o = await unpack(code);
    if (o.k !== 'o') throw new Error('To jest kod odpowiedzi. Wklej kod zaproszenia od hosta.');
    N.close();
    N.mode = 'guest'; N.role = N.otherRole(o.r);
    const pc = N.pc = makePC();
    pc.addEventListener('datachannel', (e) => { wire(e.channel); checkOpen(); });
    await pc.setRemoteDescription({ type: 'offer', sdp: o.s });
    await pc.setLocalDescription(await pc.createAnswer());
    await waitIce(pc);
    return pack({ k: 'a', s: pc.localDescription.sdp });
  };
  N.close = function () {
    try { if (N.pc) N.pc.close(); } catch (e) { /* już zamknięte */ }
    N.pc = N.chCmd = N.chSt = null; N.connected = false;
  };

  // ---------- wiadomości ----------
  let snap = null, snapAt = 0, logCache = [];
  function onMessage(label, data) {
    lastRecv = performance.now();
    let m; try { m = JSON.parse(data); } catch (e) { return; }
    if (label === 'st') {
      if (N.mode !== 'guest') return;
      S.recvSnaps++; S.snapCount++;
      // kanał nieuporządkowany: starsze paczki odrzucamy, dziury liczymy jako zgubione
      if (m.q <= S.lastSeq) return;
      if (S.lastSeq && m.q > S.lastSeq + 1) S.lostSnaps += m.q - S.lastSeq - 1;
      S.lastSeq = m.q;
      snap = m; snapAt = performance.now();
      return;
    }
    if (m.m === 'ping') { N.sendReliable({ m: 'pong', t: m.t }); return; }
    if (m.m === 'pong') {
      const rtt = performance.now() - m.t;
      S.rtt = S.rtt == null ? rtt : S.rtt * 0.7 + rtt * 0.3;
      return;
    }
    if (m.m === 'bye') { lost('left'); return; }
    if (m.m === 'swap' || m.m === 'role' || m.m === 'match') { DD.Match.onMessage(m); return; }
    if (m.m === 'cmd' && N.mode === 'host') {
      if (m.c && typeof m.c.type === 'string' && N.allowed(m.c, N.otherRole(N.role))) DD.CommandBus.push(m.c);
    } else if (m.m === 'log' && N.mode === 'guest') {
      logCache = m.l || [];
    }
  }

  // ---------- host: wysyłanie stanu ----------
  const r2 = (v) => Math.round(v * 100) / 100;
  const TEST = ['idle', 'running', 'done'];
  const FOODK = ['glucose', 'amino', 'lipid'];
  function encode(s) {
    const b = s.bact, d = s.doctor;
    const a = [];
    for (const x of s.antibodies) a.push(r2(x.x), r2(x.y), r2(x.z), x.stuck ? 1 : 0, r2(x.ox), r2(x.oy), r2(x.rot), r2(x.life), r2(x.eff ?? 1));
    const c = [];
    for (const x of s.colonies) c.push(r2(x.x), r2(x.y), r2(x.nx), r2(x.ny), r2(x.born), x.seed, r2(x.size), x.id, x.inTissue ? 1 : 0);
    // pożywienie: [x, y, rodzaj, id] z dokładnością 0,1; kopie: [x, y, kierunek, id, narodziny]
    const r1 = (v) => Math.round(v * 10) / 10;
    const fo = [];
    for (const x of s.food) fo.push(r1(x.x), r1(x.y), FOODK.indexOf(x.kind), x.id);
    const cp = [];
    for (const x of s.copies) cp.push(r2(x.x), r2(x.y), r2(x.dir), x.id, r2(x.born));
    return {
      q: ++seq, t: s.time, run: s.running ? 1 : 0, ov: s.over, org: s.organ,
      b: [r2(b.x), r2(b.y), r2(b.vx), r2(b.vy), r2(b.dir), r2(b.hp), r2(b.infection), r2(b.slowT), r2(b.slowMul),
        r2(b.hitFlash), b.contact ? 1 : 0, 0, 0, 0,
        r2(b.dead), r2(b.colonyCd), b.feeding ? 1 : 0, b.inTissue ? 1 : 0, r2(b.burrowT), r2(b.z)],
      tr: b.transit ? [b.transit.to === 'lungs' ? 1 : 2, r2(b.transit.t), b.transit.total] : 0,
      d: [0, 0, 0, d.unlocked ? 1 : 0, d.knownInfection ?? -1,
        d.resultTime ?? -1, 0, 0, 0, r2(d.feverT), r2(d.feverEff), r2(d.temp), r2(d.test.sampleT), r2(s.patient.cond)],
      a, c, fo, cp, fd: r2(b.food || 0),
      st: s.over ? s.stats : 0,
      k: s.kind, sp: s.species, nr: b.natural, rs: b.resist, cdd: d.cd, dg: s.drugs,
      mu: [b.hidden, r2(b.points), b.mut, r2(b.toxinCd), r2(s.toxinT)],
      su: d.surgery,
      // badania bez wyników oczekujących (gość dostaje wynik dopiero, gdy jest gotowy)
      dt: Object.fromEntries(Object.entries(d.tests).map(([k, T]) => [k, Object.assign({}, T, { pending: null })])),
      dk: [d.resultSeq, d.estInfection ?? -1, d.estT ?? -1, d.estExact ? 1 : 0],
      cg: s.coughs
    };
  }
  let sendAcc = 0, sentLogLen = -1, sentLogT = -1, seq = 0;
  N.hostTick = function (s, dt) {
    if (N.mode !== 'host' || !N.connected) return;
    sendAcc += dt;
    if (sendAcc >= 1 / SNAP_HZ) {
      sendAcc = Math.min(sendAcc - 1 / SNAP_HZ, 1 / SNAP_HZ);
      if (N.chSt && N.chSt.readyState === 'open' && N.chSt.bufferedAmount < 64000) {
        N.chSt.send(JSON.stringify(encode(s)));
        S.sentSnaps++; S.snapCount++;
      }
    }
    const lt = s.log.length ? s.log[s.log.length - 1].t : -1;
    if (s.log.length !== sentLogLen || lt !== sentLogT) {
      sentLogLen = s.log.length; sentLogT = lt;
      N.sendReliable({ m: 'log', l: s.log.slice(-20) });
    }
  };

  // ---------- gość: odtwarzanie stanu z wygładzaniem ----------
  N.guestFrame = function (s, dt) {
    const H = DD.Heart, F = DD.Flow, C = DD.CONFIG;
    const k = 1 - Math.exp(-dt * 14);
    if (snap) {
      const age = Math.min(0.25, (performance.now() - snapAt) / 1000);
      s.time = snap.t + age;
      s.running = !!snap.run; s.over = snap.ov; s.organ = snap.org;
      if (snap.st) s.stats = snap.st;
      if (snap.dt) { s.doctor.tests = snap.dt; s.doctor.test = snap.dt.culture; }
      if (snap.dk) { s.doctor.resultSeq = snap.dk[0]; s.doctor.estInfection = snap.dk[1] < 0 ? null : snap.dk[1]; s.doctor.estT = snap.dk[2]; s.doctor.estExact = !!snap.dk[3]; }
      s.coughs = snap.cg || 0;
      const b = s.bact, v = snap.b, d0 = s.doctor;
      const far = Math.hypot(v[0] - b.x, v[1] - b.y) > 4;
      b.x = far ? v[0] : b.x + (v[0] - b.x) * k;
      b.y = far ? v[1] : b.y + (v[1] - b.y) * k;
      b.vx = v[2]; b.vy = v[3];
      let dd = v[4] - b.dir; while (dd > Math.PI) dd -= 2 * Math.PI; while (dd < -Math.PI) dd += 2 * Math.PI;
      b.dir += dd * k;
      b.hp = v[5]; b.infection = v[6]; b.slowT = v[7]; b.slowMul = v[8]; b.hitFlash = Math.max(b.hitFlash - dt * 2.5, v[9]);
      b.contact = !!v[10];
      if (snap.rs) { b.resist = snap.rs; b.natural = snap.nr; s.kind = snap.k; if (snap.sp) s.species = snap.sp; s.drugs = snap.dg; d0.cd = snap.cdd; }
      if (snap.su) s.doctor.surgery = snap.su;
      if (snap.mu) { b.hidden = snap.mu[0]; b.points = snap.mu[1]; b.mut = snap.mu[2]; b.toxinCd = snap.mu[3]; s.toxinT = snap.mu[4]; }
      b.dead = v[14]; b.colonyCd = v[15]; b.feeding = !!v[16]; b.inTissue = !!v[17]; b.burrowT = v[18]; b.z = v[19];
      b.transit = snap.tr ? { to: snap.tr[0] === 1 ? 'lungs' : 'body', t: snap.tr[1], total: snap.tr[2] } : null;
      b.place = H.placeName(b.x, b.y);
      { const f = F.velocity(b.x, b.y, s.time, (s.time * C.bpm / 60) % 1); b.fx = f[0]; b.fy = f[1]; }
      const d = s.doctor, w = snap.d;
      d.unlocked = !!w[3];
      d.knownInfection = w[4] < 0 ? null : w[4]; d.resultTime = w[5] < 0 ? undefined : w[5];
      d.feverT = w[9]; d.feverEff = w[10]; d.temp = w[11]; s.patient.cond = w[13];
      // przeciwciała
      const A = snap.a, n = A.length / 9;
      if (s.antibodies.length !== n) s.antibodies.length = n;
      for (let i = 0; i < n; i++) {
        const o = i * 9;
        let x = s.antibodies[i];
        if (!x) { x = s.antibodies[i] = { x: A[o], y: A[o + 1] }; }
        const jump = Math.hypot(A[o] - x.x, A[o + 1] - x.y) > 3;
        x.x = jump ? A[o] : x.x + (A[o] - x.x) * k; x.y = jump ? A[o + 1] : x.y + (A[o + 1] - x.y) * k;
        x.z = A[o + 2]; x.stuck = !!A[o + 3]; x.ox = A[o + 4]; x.oy = A[o + 5]; x.rot = A[o + 6]; x.life = A[o + 7]; x.eff = A[o + 8];
        if (x.stuck) { x.x = b.x + x.ox; x.y = b.y + x.oy; }
      }
      // pożywienie i kopie (wygładzane, gdy pod tym samym indeksem jest ten sam element)
      const smooth = (arr, P, W, make) => {
        const n4 = P.length / W; arr.length = n4;
        for (let i = 0; i < n4; i++) {
          const o = i * W; let x = arr[i];
          if (!x || x.id !== P[o + 3]) { x = arr[i] = make(P, o); continue; }
          x.x += (P[o] - x.x) * k; x.y += (P[o + 1] - x.y) * k;
        }
      };
      b.food = snap.fd || 0;
      if (snap.fo) smooth(s.food, snap.fo, 4, (P, o) => ({ x: P[o], y: P[o + 1], kind: FOODK[P[o + 2]], id: P[o + 3], z: ((P[o + 3] * 0.618) % 1 - 0.5) * 1.6 }));
      if (snap.cp) {
        smooth(s.copies, snap.cp, 5, (P, o) => ({ x: P[o], y: P[o + 1], dir: P[o + 2], id: P[o + 3], born: P[o + 4] }));
        for (let i = 0; i < s.copies.length; i++) s.copies[i].dir = snap.cp[i * 5 + 2];
      }
      const Cc = snap.c, m = Cc.length / 9;
      s.colonies.length = m;
      for (let i = 0; i < m; i++) {
        const o = i * 9;
        s.colonies[i] = { x: Cc[o], y: Cc[o + 1], nx: Cc[o + 2], ny: Cc[o + 3], born: Cc[o + 4], seed: Cc[o + 5], size: Cc[o + 6], id: Cc[o + 7], inTissue: !!Cc[o + 8] };
      }
    } else {
      s.time += dt;
    }
    s.log = logCache;
    s.phase = (s.time * C.bpm / 60) % 1;
    s.contraction = F.contraction(s.phase);
    H.VALVES.forEach((v, i) => { s.valves[i].open = F.valveOpen(v.type, s.phase); });
    DD.Game.updateValveGeometry(s);
  };

  DD.Net = N;
})();
