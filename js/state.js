// Stan gry + komendy.
// Cała logika zmienia stan WYŁĄCZNIE przez DD.Game.apply(state, cmd) i DD.Game.step(state, dt).
// Dzięki temu dodanie sieci = podmiana źródła komend (klawiatura/UI -> WebSocket/WebRTC).
(function () {
  const C = DD.CONFIG, H = DD.Heart, F = DD.Flow;
  const B = C.bacteria, D = C.doctor;

  const G = {};

  G.create = function () {
    const s = createRaw();
    s.doctor.test = s.doctor.tests.culture; // zgodność: d.test = posiew
    return s;
  };
  function createRaw() {
    return {
      time: 0, phase: 0, contraction: 0,
      hr: 1, flowMul: 1, ending: null,   // tętno i prąd krwi względem normy (spadają w zakończeniu przy sepsie); ending: { win, t }
      ptype: 'child',    // wylosowany pacjent (C.patients)
      running: false, over: null, organ: null,
      valves: H.VALVES.map(v => ({ id: v.id, open: 0 })),
      bact: {
        x: B.start.x, y: B.start.y, vx: 0, vy: 0, fx: 0, fy: 0, dir: -Math.PI / 2,
        ix: 0, iy: 0, hp: B.hp, infection: 0, dead: 0, colonyCd: 0, feeding: false,
        inTissue: false, burrowT: 0, z: 0,
        hidden: 0,                                     // id kolonii, w której ukrył się patogen (0 = nie)
        points: 0, mut: { speed: 0, fever: 0, capsule: 0, toxins: 0, mask: 0, pierce: 0, drugres: 0, spores: 0, divide: 0, apoptosis: 0, angio: 0, meta: 0 }, toxinCd: 0, signalCd: 0,
        food: 0,                                       // pasek pożywienia (0..100), pełny pozwala się rozmnożyć
        slowT: 0, slowMul: 1, transit: null, hitFlash: 0, contact: false, place: '',
        // oporność na leczenie: każde kolejne użycie tego samego leku działa słabiej
        resist: { antibodies: 0, fever: 0, abxA: 0, abxB: 0, antiviral: 0, antifungal: 0, chemo: 0, radio: 0 },
        natural: null    // klasa antybiotyku, na którą bakteria jest naturalnie oporna (ukryte)
      },
      doctor: {
        tests: {
          crp: { state: 'idle', t: 0, cd: 0, sampleT: -1, res: null, pending: null },
          culture: { state: 'idle', t: 0, cd: 0, sampleT: -1, res: null, pending: null },
          echo: { state: 'idle', t: 0, cd: 0, sampleT: -1, res: null, pending: null },
          abg: { state: 'idle', t: 0, cd: 0, sampleT: -1, res: null, pending: null },
          micro: { state: 'idle', t: 0, cd: 0, sampleT: -1, res: null, pending: null },
          usg: { state: 'idle', t: 0, cd: 0, sampleT: -1, res: null, pending: null },
          cbc: { state: 'idle', t: 0, cd: 0, sampleT: -1, res: null, pending: null },
          pcr: { state: 'idle', t: 0, cd: 0, sampleT: -1, res: null, pending: null },
          urine: { state: 'idle', t: 0, cd: 0, sampleT: -1, res: null, pending: null },
          ct: { state: 'idle', t: 0, cd: 0, sampleT: -1, res: null, pending: null },
          markers: { state: 'idle', t: 0, cd: 0, sampleT: -1, res: null, pending: null },
          xray: { state: 'idle', t: 0, cd: 0, sampleT: -1, res: null, pending: null },
          mri: { state: 'idle', t: 0, cd: 0, sampleT: -1, res: null, pending: null },
          biopsy: { state: 'idle', t: 0, cd: 0, sampleT: -1, res: null, pending: null }
        },
        resultSeq: 0,
        surgery: { state: 'idle', t: 0, cd: 0, valve: null },
        // przeszczep / amputacja: jeden zabieg naraz; done: wykonane (raz na rundę każdy)
        proc: { state: 'idle', t: 0, kind: null, done: {} },
        unlocked: false, knownInfection: null, knownHp: null,
        cd: { antibodies: 0, fever: 0, abxA: 0, abxB: 0, antiviral: 0, antifungal: 0, chemo: 0, radio: 0 },
        feverT: 0, feverEff: 1, temp: 36.6
      },
      // stan pacjenta 0..100: zakażenie i leczenie go obniżają, organizm powoli się regeneruje; 0 = sepsa
      patient: { cond: 100 },
      kind: 'bacteria',  // rodzaj patogenu: 'bacteria' | 'virus' | 'fungus' (wybiera gracz patogenu, lekarz go nie zna)
      species: 'ecoli',  // gatunek z C.species
      toxinT: 0,         // pozostały czas zakłócania badań przez toksyny
      drugs: { abxA: { t: 0, eff: 0 }, abxB: { t: 0, eff: 0 }, antiviral: { t: 0, eff: 0 }, antifungal: { t: 0, eff: 0 }, chemo: { t: 0, eff: 0 } },
      radio: null,     // radioterapia: { region, t, eff } — naświetlany obszar
      antibodies: [],
      colonies: [],    // kolonie patogenu: { x, y, nx, ny, born, seed, size 0..1 }
      food: [],        // pożywienie we krwi: { id, x, y, z, kind }
      copies: [],      // kopie patogenu (wabiki): { id, x, y, vx, vy, dir, born }
      nextId: 1,
      nextColonyId: 1,
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
        used: { antibodies: 0, fever: 0, abxA: 0, abxB: 0, antiviral: 0, antifungal: 0, chemo: 0, radio: 0 },
        minCond: 100, condByInfection: 0, condByTreatment: 0,
        coloniesFounded: 0, coloniesLost: 0, deaths: 0,
        mutations: 0, toxins: 0, hiddenTime: 0,
        eaten: 0, copiesMade: 0, copiesLost: 0, copiesExpired: 0, decoyHits: 0,
        hyphaColonies: 0, sporeStores: 0, sporeColonies: 0, metastases: 0
      },
      valveSide: H.VALVES.map(() => 0),
      coughs: 0,         // licznik kaszlnięć pacjenta (dźwięk u obu graczy)
      symptoms: { right: 0, left: 0, legs: 0 },   // masa kolonii w obszarach serca (objawy u pacjenta)
      fakeSym: null,   // fałszywy objaw od sygnałów chemicznych: { region, t }
    };
  }

  function log(s, who, text) {
    s.log.push({ t: s.time, who, text });
    if (s.log.length > 60) s.log.shift();
  }
  function rnd(s) { // deterministyczny LCG
    s.seed = (s.seed * 1664525 + 1013904223) >>> 0;
    return s.seed / 4294967296;
  }

  // skuteczność leku = 1 - oporność; po podaniu oporność rośnie
  // skutek uboczny dawki leku: natychmiastowy spadek stanu pacjenta
  function sideEffect(s, key) {
    const v = C.patient.sideEffect[key] || 0;
    s.patient.cond -= v; s.stats.condByTreatment += v;
  }
  // wylosowany pacjent: mnożniki obu stron (C.patients, opis w docs/BALANS.md)
  const PT = (s) => C.patients[s.ptype] || C.patients.child;
  G.patientOf = PT;
  function useDrug(s, key) {
    sideEffect(s, key);
    const R = C.resistance, r = s.bact.resist;
    s.stats.used[key]++;
    if (s.stats.firstTreatAt < 0) s.stats.firstTreatAt = s.time;
    const eff = 1 - r[key];
    r[key] = Math.min(R.max, r[key] + R.perUse);
    return eff;
  }
  const pct = (v) => Math.round(v * 100) + '%';

  // grzyb: strzępka kolonii rośnie wzdłuż ściany; po osiągnięciu branchLen na jej końcu wyrasta nowa kolonia.
  // Magazyn zarodników co storePeriod s wypuszcza zarodnik (kopię) do krwi.
  function fungusColony(s, c, dt, slow) {
    const FU = C.fungus;
    if (c.store) {
      c.storeT = (c.storeT ?? FU.storePeriod) - dt;
      if (c.storeT <= 0) {
        c.storeT = FU.storePeriod;
        if (s.copies.length < C.copies.max) {
          s.copies.push({ id: s.nextId++, x: c.x - (c.inTissue ? 0 : c.nx * 0.8), y: c.y - (c.inTissue ? 0 : c.ny * 0.8), vx: 0, vy: 0, dir: 0, wob: rnd(s) * 6, born: s.time, spore: 1 });
          s.stats.copiesMade++;
        }
      }
      return;
    }
    if (c.inTissue || c.hd || c.hy == null) return;
    c.hy += FU.hyphaRate * c.size * slow * dt;
    if (c.hy < FU.branchLen) return;
    c.hy = FU.branchLen; c.hd = 1;
    if (s.colonies.length >= FU.maxColonies) return;
    const P = H.wallWalk(c.x, c.y, c.hs, FU.branchLen, c.seed, walkPts);
    if (P.length < 8) return;   // strzępka nie zdołała się wydłużyć (koniec ściany)
    const tx = P[P.length - 2], ty = P[P.length - 1];
    H.grad(tx, ty, g2);
    // mutacja „strzępki przebijające tkanki”: w sercu nowa kolonia wrasta w mięsień
    if (s.bact.mut.pierce && H.organAt(tx, ty) === 'heart') {
      const d = H.sample(tx, ty), ex = tx + g2[0] * (C.tissue.enterD - d), ey = ty + g2[1] * (C.tissue.enterD - d);
      const n = newColony(s, ex, ey, g2[0], g2[1], C.colony.startSize, c.hs); n.inTissue = true;
      s.colonies.push(n);
    } else {
      const d = H.sample(tx, ty);
      s.colonies.push(newColony(s, tx - g2[0] * d, ty - g2[1] * d, g2[0], g2[1], C.colony.startSize, c.hs));
    }
    s.stats.hyphaColonies++;
  }

  // obszar radioterapii, do którego należy punkt: serce (powyżej przepony), wątroba, nerka
  const regionOrgan = (c) => { const o = H.organAt(c.x, c.y); return o === 'abdomen' ? null : o; };
  // rak: duży guz z mutacją „przerzuty” co metaPeriod s wypuszcza komórkę nowotworową do krwi (osiada jak zarodnik grzyba)
  function cancerColony(s, c, dt) {
    const CA = C.cancer;
    if (!s.bact.mut.meta || c.size < CA.metaMinSize) return;
    c.metaT = (c.metaT ?? CA.metaPeriod) - dt;
    if (c.metaT > 0) return;
    c.metaT = CA.metaPeriod;
    if (s.copies.length < C.copies.max) {
      s.copies.push({ id: s.nextId++, x: c.x - (c.inTissue ? 0 : c.nx * 0.9), y: c.y - (c.inTissue ? 0 : c.ny * 0.9), vx: 0, vy: 0, dir: 0, wob: rnd(s) * 6, born: s.time, meta: 1 });
      s.stats.copiesMade++;
    }
  }

  // radioterapia rani patogen, który jest w naświetlanym obszarze
  const radioDps = (s, b) => (s.radio && s.radio.t > 0 && regionOrgan(b) === s.radio.region ? D.radio.dps * s.radio.eff : 0);

  // narządy wyłączone przez guzy (masa guzów w narządzie ≥ organFail): lista 'heart' | 'liver' | 'kidney'
  G.organFailure = function (s) {
    if (s.kind !== 'cancer') return [];
    const m = { heart: 0, liver: 0, kidney: 0 };
    for (const c of s.colonies) { const o = H.organAt(c.x, c.y); if (o in m) m[o] += c.size; }
    return Object.keys(m).filter((k) => m[k] >= C.cancer.organFail);
  };

  // ---------- KOMENDY ----------
  G.apply = function (s, cmd) {
    const d = s.doctor;
    switch (cmd.type) {
      case 'game.start': {
        if (!H.START[cmd.organ]) return;   // narządy, w których można zacząć: serce, nerka, wątroba
        // cmd.kind: gatunek (C.species) albo dawne 'bacteria' / 'virus'
        // bez wskazanego rodzaju: ostatni wybór gracza patogenu, a gdy go nie ma — rodzaj z poprzedniej rundy
        const species = G.speciesOf(cmd.kind || s.nextKind || (s.running || s.over ? s.species : undefined));
        const kind = C.species[species].kind;
        const nextKind = species;   // kolejna runda bez wyboru zostaje przy tym rodzaju
        Object.assign(s, G.create(), { running: true, organ: cmd.organ, kind, species, nextKind });
        { const st = H.START[cmd.organ]; s.bact.x = st.x; s.bact.y = st.y; }
        s.seed = (Math.random() * 4294967296) >>> 0;   // każda runda inna (liczy tylko host)
        // losowanie pacjenta (cmd.patient wymusza konkretnego, np. w trybie deweloperskim)
        { const ids = Object.keys(C.patients); s.ptype = C.patients[cmd.patient] ? cmd.patient : ids[Math.floor(rnd(s) * ids.length)]; }
        if (kind === 'virus') { s.bact.hp = C.virus.hp; s.stats.minHp = C.virus.hp; }
        else s.bact.natural = C.species[species].natural;
        log(s, 'sys', `Pacjent przyjęty z objawami zakażenia: ${PT(s).name.toLowerCase()}.`);
        return;
      }
      case 'bact.kind':
        if (C.species[cmd.kind] || C.defaultSpecies[cmd.kind]) s.nextKind = cmd.kind;
        return;
      case 'bact.input':
        s.bact.ix = Math.max(-1, Math.min(1, cmd.x));
        s.bact.iy = Math.max(-1, Math.min(1, cmd.y));
        return;
    }
    if (!s.running || s.over || s.ending) return;
    switch (cmd.type) {
      case 'bact.colony': foundColony(s); return;
      case 'bact.hide': hideToggle(s); return;
      case 'bact.copy': makeCopy(s); return;
      case 'bact.mutate': mutate(s, cmd.what); return;
      case 'bact.toxin': releaseToxins(s); return;
      case 'bact.signal': emitSignals(s); return;
      case 'bact.burrow': {
        const b = s.bact, Tt = C.tissue;
        if (b.dead || b.transit) return;
        if (b.inTissue) {
          // Q w mięśniu: powrót do krwi, jeśli naczynie jest blisko
          const dd = H.sample(b.x, b.y);
          if (dd < Tt.exitReach) {
            H.grad(b.x, b.y, g2);
            b.x -= g2[0] * (dd + 0.7); b.y -= g2[1] * (dd + 0.7);
            b.inTissue = false; b.z = 0; b.vx = b.vy = 0;
            log(s, 'bact', 'Patogen wraca do krwi.');
          }
          return;
        }
        if (b.burrowT > 0) { b.burrowT = 0; return; }            // drugie Q przerywa
        // wnikanie tylko w mięsień sercowy (w jamie brzusznej ściany naczyń nie prowadzą do mięśnia)
        if (b.contact && H.organAt(b.x, b.y) === 'heart') b.burrowT = Tt.burrow[s.kind] || Tt.burrow.bacteria;
        return;
      }
      case 'doc.test': orderTest(s, cmd.kind || 'culture', cmd.region); return;
      case 'doc.surgery': {
        const SU = d.surgery, cfg = D.surgery;
        const v = H.VALVES.find((x) => x.id === cmd.valve);
        if (!v || !d.unlocked || SU.state === 'running' || SU.cd > 0) return;
        SU.state = 'running'; SU.t = cfg.duration; SU.valve = v.id;
        s.patient.cond -= cfg.patientCost; s.stats.condByTreatment += cfg.patientCost;
        s.stats.surgeries = (s.stats.surgeries || 0) + 1;
        if (s.stats.firstTreatAt < 0) s.stats.firstTreatAt = s.time;
        log(s, 'doc', `Rozpoczęto operację: ${v.name.toLowerCase()}.`);
        return;
      }
      case 'doc.proc': {
        // przeszczep wątroby / nerki albo amputacja nóg
        const PR = d.proc, what = cmd.what, cfg = what === 'legs' ? D.amputation : D.transplant;
        if (!PROC_NAME[what] || !d.unlocked || PR.state === 'running' || PR.done[what]) return;
        PR.state = 'running'; PR.t = cfg.duration; PR.kind = what;
        s.patient.cond -= cfg.patientCost; s.stats.condByTreatment += cfg.patientCost;
        if (s.stats.firstTreatAt < 0) s.stats.firstTreatAt = s.time;
        log(s, 'doc', `Rozpoczęto zabieg: ${PROC_NAME[what]}.`);
        return;
      }
      case 'doc.antibodies':
        if (!d.unlocked || d.cd.antibodies > 0) return;
        d.cd.antibodies = D.antibodies.cooldown;
        { const eff = useDrug(s, 'antibodies');
          spawnAntibodies(s, eff * PT(s).ab);
          log(s, 'doc', `Podano immunoglobuliny dożylnie (skuteczność ${pct(eff)}).`); }
        return;
      case 'doc.fever':
        if (!d.unlocked || d.cd.fever > 0) return;
        d.cd.fever = D.fever.cooldown; d.feverT = D.fever.duration;
        d.feverEff = useDrug(s, 'fever') * PT(s).drug;
        log(s, 'doc', `Wywołano gorączkę leczniczą (skuteczność ${pct(d.feverEff)}).`);
        return;
      case 'doc.radio': {
        // radioterapia: naświetlanie jednego obszaru (serce, wątroba, nerka)
        if (!d.unlocked || d.cd.radio > 0 || !RADIO_REGION[cmd.region]) return;
        const eff = useDrug(s, 'radio');
        d.cd.radio = D.radio.cooldown;
        s.radio = { region: cmd.region, t: D.radio.duration, eff: eff * susceptibility(s, 'radio') * PT(s).drug };
        log(s, 'doc', `Radioterapia: ${RADIO_REGION[cmd.region]} (skuteczność wg dawkowania ${pct(eff)}).`);
        return;
      }
      case 'doc.abxA': case 'doc.abxB': case 'doc.antiviral': case 'doc.antifungal': case 'doc.chemo': {
        const key = cmd.type.slice(4);
        if (!d.unlocked || d.cd[key] > 0) return;
        const eff = useDrug(s, key);
        d.cd[key] = D[key].cooldown;
        s.drugs[key] = { t: D[key].duration, eff: eff * susceptibility(s, key) * PT(s).drug };
        log(s, 'doc', `Podano ${DRUG_NAME[key]} (skuteczność wg dawkowania ${pct(eff)}).`);
        return;
      }
    }
  };

  // kolonia na ścianie; grzyb dostaje strzępkę (hy: długość, hs: kierunek wzdłuż ściany, hd: strzępka zakończona)
  function newColony(s, x, y, nx, ny, size, hs) {
    const c = { id: s.nextColonyId++, x, y, nx, ny, born: s.time, seed: rnd(s), size };
    if (s.kind === 'fungus') { c.hy = 0; c.hs = hs || (rnd(s) < 0.5 ? -1 : 1); c.hd = 0; }
    return c;
  }
  const walkPts = [];

  // założenie kolonii przy ścianie kosztem życia patogenu
  function foundColony(s) {
    const b = s.bact, K = C.colony;
    if (b.dead || b.transit || !(b.contact || b.inTissue) || b.colonyCd > 0) return;
    // grzyb: E przy własnej kolonii zamienia ją w magazyn zarodników
    if (s.kind === 'fungus') {
      const FU = C.fungus;
      const near = s.colonies.find((c) => !c.store && !!c.inTissue === !!b.inTissue && Math.hypot(c.x - b.x, c.y - b.y) < FU.storeRadius);
      if (near) {
        if (b.hp <= FU.storeCost + 1) return;
        b.hp -= FU.storeCost; b.colonyCd = K.cooldown; near.store = 1; near.storeT = FU.storePeriod * 0.5;
        s.stats.sporeStores++;
        return;
      }
    }
    if (b.hp <= K.cost * PT(s).colonyCost + 1) return;
    b.hp -= K.cost * PT(s).colonyCost; b.colonyCd = K.cooldown;
    H.grad(b.x, b.y, g2);
    if (b.inTissue) {
      // kolonia w mięśniu: w miejscu patogenu, ukryta przed przeciwciałami
      s.colonies.push({ id: s.nextColonyId++, x: b.x, y: b.y, nx: g2[0], ny: g2[1], born: s.time, seed: rnd(s), size: K.startSize, inTissue: true });
    } else {
      const sd = H.sample(b.x, b.y);
      s.colonies.push(newColony(s, b.x - g2[0] * sd, b.y - g2[1] * sd, g2[0], g2[1], K.startSize));
    }
    s.stats.coloniesFounded++;
  }

  const DRUG_NAME = { abxA: 'antybiotyk β-laktamowy', abxB: 'antybiotyk makrolidowy', antiviral: 'lek przeciwwirusowy', antifungal: 'lek przeciwgrzybiczy', chemo: 'chemioterapię' };
  const RADIO_REGION = { heart: 'serce', liver: 'wątroba', kidney: 'nerka' };
  // gatunek patogenu z identyfikatora (dawne 'bacteria' / 'virus' -> gatunek domyślny)
  G.speciesOf = function (id) {
    if (C.species[id]) return id;
    return C.defaultSpecies[id] || C.defaultSpecies.bacteria;
  };
  // naturalna wrażliwość patogenu na lek (0..1): antybiotyki nie działają na wirusa, lek przeciwwirusowy na bakterię
  function susceptibility(s, key) {
    if (key === 'abxA' || key === 'abxB') return s.kind !== 'bacteria' ? 0 : (s.bact.natural === key ? D.naturalResistance : 1);
    if (key === 'antiviral') return s.kind === 'virus' ? ((C.species[s.species] || {}).antiviral ?? 1) : 0;
    // lek przeciwgrzybiczy: tylko grzyb; mutacja „odporność na leki” go osłabia
    if (key === 'antifungal') return s.kind === 'fungus' ? 1 - C.mutations.drugres.step * s.bact.mut.drugres : 0;
    // chemio- i radioterapia: tylko nowotwór; wyłączenie apoptozy je osłabia
    if (key === 'chemo' || key === 'radio') return s.kind === 'cancer' ? apoMul(s) : 0;
    return 1;
  }
  G.susceptibility = susceptibility;

  // ---------- BADANIA ----------
  const TEST_NAME = { crp: 'CRP', culture: 'posiew krwi', echo: 'echo serca', abg: 'antybiogram', micro: 'mikroskop', usg: 'USG jamy brzusznej',
    cbc: 'morfologia', pcr: 'PCR', urine: 'badanie moczu', ct: 'tomografia komputerowa', markers: 'markery nowotworowe', xray: 'RTG klatki piersiowej', mri: 'rezonans magnetyczny' };
  function orderTest(s, kind, region) {
    const d = s.doctor, T = d.tests[kind], cfg = D.tests[kind];
    if (!T || T.state === 'running' || T.cd > 0) return;
    if (kind === 'abg' && !(d.tests.culture.res && d.tests.culture.res.positive)) return; // wymaga dodatniego posiewu
    if (kind === 'biopsy' && !BIOPSY_ORGAN[region]) return;   // biopsja: wybrany narząd
    T.state = 'running'; T.t = cfg.duration; T.sampleT = s.time;
    T.pending = sampleFor(s, kind, region);    // wynik opisuje chwilę pobrania
    if (cfg.patientCost) { s.patient.cond -= cfg.patientCost; s.stats.condByTreatment += cfg.patientCost; }
    s.stats.tests++; if (s.stats.firstTestAt < 0) s.stats.firstTestAt = s.time;
    log(s, 'doc', kind === 'biopsy' ? `Zlecono badanie: biopsja (${BIOPSY_ORGAN[region]}).` : `Zlecono badanie: ${TEST_NAME[kind]}.`);
  }
  const BIOPSY_ORGAN = { heart: 'serce', liver: 'wątroba', kidney: 'nerka' };
  const PROC_NAME = { liver: 'przeszczep wątroby', kidney: 'przeszczep nerki', legs: 'amputacja nóg' };
  // czy punkt należy do obszaru zabiegu: narząd (wątroba, nerka) albo obszar nóg (żyła główna dolna, objaw obrzęku)
  const inProcArea = (what, x, y) => (what === 'legs' ? H.regionOf(x, y) === 'legs' : H.organAt(x, y) === what);
  // co pokazuje biopsja tkanki zajętej przez dany rodzaj patogenu
  const HISTO = { bacteria: 'ropień z bakteriami', virus: 'zapalenie wirusowe (wtręty w komórkach)', fungus: 'strzępki grzyba w tkance', cancer: 'komórki nowotworowe (rak)' };
  function sampleFor(s, kind, region) {
    const b = s.bact;
    const tox = s.toxinT > 0;   // toksyny zakłócają wyniki
    if (kind === 'crp') {
      const v = (4 + b.infection * 2.4 * (1 - C.mutations.mask.crp * maskLvl(s))) * (tox ? 1.6 : 1) + (rnd(s) * 2 - 1) * D.tests.crp.noise * (tox ? 3 : 1);
      return { value: Math.max(1, Math.round(v)) };
    }
    // posiew wyhodowuje tylko bakterie — przy wirusie wynik jest ujemny
    // posiew liczy też komórki patogenu we krwi: oryginał (jeśli płynie we krwi) i jego kopie
    if (kind === 'culture') {
      const inBlood = !b.dead && !b.transit && !b.inTissue && !b.hidden ? 1 : 0;
      const positive = (s.kind === 'bacteria' || s.kind === 'fungus') && rnd(s) < sens(s, 'culture');   // bakterie i drożdżaki rosną na podłożu   // fałszywie ujemny z szansą 1 − czułość
      return { positive, infection: positive ? Math.round(b.infection) : 0, cells: positive ? inBlood + s.copies.length : 0 };
    }
    if (kind === 'echo') {
      // kolonie w mięśniu widać tylko jako niewyraźne zgrubienie ściany w przybliżonym miejscu
      const HB = H.HEART_BOX;   // echo serca widzi tylko serce
      const se = sens(s, 'echo');
      return { colonies: s.colonies.filter((c) => c.y > HB.minY && rnd(s) < se).map((c) => {
        const j = (c.inTissue ? 2.5 : 0) + (tox ? 4 : 0);
        return [Math.round((c.x + (rnd(s) * 2 - 1) * j) * 10) / 10, Math.round((c.y + (rnd(s) * 2 - 1) * j) * 10) / 10, Math.round(c.size * 100) / 100, c.inTissue ? 1 : 0];
      }) };
    }
    // USG jamy brzusznej: kolonie pod przeponą (wątroba, nerka, naczynia brzucha)
    if (kind === 'usg') {
      const AB = H.ABDOMEN_BOX, j = tox ? 4 : 0;
      const se = sens(s, 'usg');
      return { colonies: s.colonies.filter((c) => c.y < AB.maxY && rnd(s) < se).map((c) => [
        Math.round((c.x + (rnd(s) * 2 - 1) * j) * 10) / 10, Math.round((c.y + (rnd(s) * 2 - 1) * j) * 10) / 10,
        Math.round(c.size * 100) / 100, 0, H.organAt(c.x, c.y)]) };
    }
    // mikroskop: rodzaj patogenu, jeśli w próbce krwi są jego komórki (patogen we krwi, kopie albo kolonie na ścianach naczyń)
    if (kind === 'micro') {
      const inBlood = !b.dead && !b.transit && !b.inTissue && !b.hidden;
      const found = (inBlood || s.copies.length > 0 || s.colonies.some((c) => !c.inTissue)) && rnd(s) < sens(s, 'micro');
      return { found, species: found ? s.species : null, n: found ? Math.min(12, 4 + s.copies.length + Math.round(b.infection / 12)) : 0 };
    }
    // morfologia: leukocyty rosną z zakażeniem; przy bakterii przeważają neutrofile, przy wirusie limfocyty
    if (kind === 'cbc') {
      const inf = b.infection * (1 - C.mutations.mask.crp * maskLvl(s));
      const w = 6 + inf * 0.14 + (rnd(s) * 2 - 1) * D.tests.cbc.noise * (tox ? 3 : 1);
      return { wbc: Math.max(2, Math.round(w * 10) / 10), diff: inf < 8 || s.kind === 'cancer' ? 'norm' : s.kind === 'virus' ? 'lympho' : 'neutro' };
    }
    // PCR: materiał genetyczny we krwi (patogen, kopie, kolonie poza mięśniem) — rodzaj z czułością badania
    if (kind === 'pcr') {
      const inBlood = !b.dead && !b.transit && !b.inTissue && !b.hidden;
      const found = s.kind !== 'cancer' && (inBlood || s.copies.length > 0 || s.colonies.some((c) => !c.inTissue)) && rnd(s) < sens(s, 'pcr');   // nowotwór to komórki pacjenta — brak obcego DNA
      return { found, species: found ? s.species : null };
    }
    // badanie moczu: przy koloniach w nerce krwinki czerwone (oba patogeny) i bakterie (tylko bakteria)
    if (kind === 'urine') {
      const km = s.colonies.reduce((a, c) => a + (H.organAt(c.x, c.y) === 'kidney' ? c.size : 0), 0);
      const sick = km > D.tests.urine.minMass, se = sens(s, 'urine');
      return { rbc: sick && rnd(s) < se, bact: sick && s.kind === 'bacteria' && rnd(s) < se, fungi: sick && s.kind === 'fungus' && rnd(s) < se };
    }
    // tomografia: wszystkie kolonie, dokładnie, także w mięśniu (każda wykryta z czułością badania)
    if (kind === 'ct') {
      const se = sens(s, 'ct');
      return { colonies: s.colonies.filter(() => rnd(s) < se).map((c) => [
        Math.round(c.x * 10) / 10, Math.round(c.y * 10) / 10, Math.round(c.size * 100) / 100, c.inTissue ? 1 : 0, H.organAt(c.x, c.y)]) };
    }
    // markery nowotworowe: przy nowotworze rosną z masą guzów (maskowanie je obniża), poza tym w normie
    if (kind === 'markers') {
      const mass = s.kind === 'cancer' ? s.colonies.reduce((a, c) => a + c.size, 0) * (1 - C.mutations.mask.crp * maskLvl(s)) : 0;
      const v = 2.5 + mass * 9 + (rnd(s) * 2 - 1) * D.tests.markers.noise * (tox ? 3 : 1);
      return { value: Math.max(0.5, Math.round(v * 10) / 10) };
    }
    // RTG klatki piersiowej: powiększona sylwetka serca (duża masa ognisk w sercu) i guzki w płucach (ogniska prawego serca)
    if (kind === 'xray') {
      let heart = 0, right = 0;
      for (const c of s.colonies) { if (H.organAt(c.x, c.y) === 'heart') heart += c.size; if ((c.region || H.regionOf(c.x, c.y)) === 'right') right += c.size; }
      const se = sens(s, 'xray');
      return { bigHeart: heart >= D.tests.xray.bigHeart && rnd(s) < se, nodules: right > 0.2 && rnd(s) < se ? Math.min(6, 1 + Math.floor(right * 2)) : 0 };
    }
    // rezonans: jak tomografia, z wielkością ogniska
    if (kind === 'mri') {
      const se = sens(s, 'mri');
      return { colonies: s.colonies.filter(() => rnd(s) < se).map((c) => [
        Math.round(c.x * 10) / 10, Math.round(c.y * 10) / 10, Math.round(c.size * 100) / 100, c.inTissue ? 1 : 0, H.organAt(c.x, c.y)]) };
    }
    // biopsja: wycinek z narządu — rodzaj zmian, jeśli w narządzie są ogniska (bez względu na maskowanie: to tkanka pod mikroskopem)
    if (kind === 'biopsy') {
      const mass = s.colonies.reduce((a, c) => a + (H.organAt(c.x, c.y) === region ? c.size : 0), 0);
      const hit = mass > 0.1 && rnd(s) < D.tests.biopsy.sens;
      return { region, finding: hit ? s.kind : null };
    }
    if (kind === 'abg') {
      const out = {};
      for (const k of ['antibodies', 'fever', 'abxA', 'abxB', 'antifungal']) out[k] = (1 - b.resist[k]) * susceptibility(s, k);
      out.antibodies *= 1 - C.mutations.capsule.step * b.mut.capsule;   // otoczka
      out.fever *= 1 - C.mutations.fever.step * b.mut.fever;            // odporność na gorączkę
      return out;   // skuteczność kolejnej dawki 0..1
    }
    return null;
  }
  function finishTest(s, kind, T) {
    const d = s.doctor;
    T.state = 'done'; T.cd = D.tests[kind].cooldown * PT(s).testCd; T.res = T.pending; T.pending = null; T.resultT = s.time;
    d.resultSeq++;
    const first = !d.unlocked; d.unlocked = true;
    const r = T.res;
    let text = '';
    if (kind === 'crp') {
      text = `CRP ${r.value} mg/l.`;
      d.estInfection = Math.max(0, Math.min(100, Math.round((r.value - 4) / 2.4))); d.estT = T.sampleT; d.estExact = false;
    } else if (kind === 'culture') {
      text = r.positive ? `Posiew dodatni, kolonizacja ${r.infection}%, komórki patogenu we krwi: ${r.cells ?? 0}.` : 'Posiew ujemny: brak wzrostu.';
      if (r.positive) {
        d.knownInfection = r.infection; d.resultTime = T.sampleT;
        d.estInfection = r.infection; d.estT = T.sampleT; d.estExact = true;
      }
    } else if (kind === 'echo') {
      const nW = r.colonies.filter((c) => !c[3]).length, nT = r.colonies.length - nW;
      text = r.colonies.length ? `Echo serca: ogniska na ścianach ${nW}` + (nT ? `, niewyraźne zgrubienia ściany ${nT}.` : '.') : 'Echo serca bez zmian.';
    } else if (kind === 'usg') {
      const nL = r.colonies.filter((c) => c[4] === 'liver').length, nK = r.colonies.filter((c) => c[4] === 'kidney').length;
      const nO = r.colonies.length - nL - nK;
      text = r.colonies.length ? `USG jamy brzusznej: ogniska w wątrobie ${nL}, w nerce ${nK}, w naczyniach ${nO}.` : 'USG jamy brzusznej bez zmian.';
    } else if (kind === 'abg') {
      text = 'Antybiogram gotowy.';
    } else if (kind === 'micro') {
      text = 'Mikroskop: preparat gotowy, szukaj patogenu.';   // rodzaj odkrywa lekarz, przesuwając preparat
    } else if (kind === 'cbc') {
      const DIFF = { norm: 'rozmaz prawidłowy', neutro: 'przewaga neutrofili', lympho: 'przewaga limfocytów' };
      text = `Morfologia: leukocyty ${String(r.wbc).replace('.', ',')} G/l, ${DIFF[r.diff]}.`;
    } else if (kind === 'pcr') {
      text = r.found ? `PCR: wykryto materiał genetyczny: ${C.species[r.species].name.toLowerCase()}.` : 'PCR: nie wykryto materiału genetycznego patogenu.';
    } else if (kind === 'urine') {
      text = `Badanie moczu: krwinki czerwone ${r.rbc ? 'obecne' : 'nieobecne'}, bakterie ${r.bact ? 'obecne' : 'nieobecne'}, grzyby ${r.fungi ? 'obecne' : 'nieobecne'}.`;
    } else if (kind === 'ct') {
      const n = (o) => r.colonies.filter((c) => c[4] === o).length;
      const nH = n('heart'), nL = n('liver'), nK = n('kidney'), nO = r.colonies.length - nH - nL - nK;
      text = r.colonies.length ? `Tomografia: ogniska w sercu ${nH}, w wątrobie ${nL}, w nerce ${nK}, w naczyniach ${nO}.` : 'Tomografia bez zmian.';
    } else if (kind === 'markers') {
      text = `Markery nowotworowe: ${String(r.value).replace('.', ',')} ng/ml${r.value >= 5 ? ' (podwyższone)' : ' (w normie)'}.`;
    } else if (kind === 'xray') {
      text = !r.bigHeart && !r.nodules ? 'RTG klatki piersiowej bez zmian.'
        : `RTG klatki piersiowej: ${[r.bigHeart ? 'powiększona sylwetka serca' : '', r.nodules ? `guzki w płucach: ${r.nodules}` : ''].filter(Boolean).join(', ')}.`;
    } else if (kind === 'mri') {
      const ST = C.cancer.stages, big = r.colonies.filter((c) => c[2] >= ST[1]).length;
      text = r.colonies.length ? `Rezonans: ognisk ${r.colonies.length}, w tym w mięśniu serca ${r.colonies.filter((c) => c[3]).length}, dużych ${big}.` : 'Rezonans bez zmian.';
    } else if (kind === 'biopsy') {
      text = `Biopsja (${BIOPSY_ORGAN[r.region]}): ${r.finding ? HISTO[r.finding] : 'tkanka prawidłowa'}.`;
    }
    log(s, 'doc', 'Wynik: ' + text + (first ? ' Odblokowano leczenie.' : ''));
  }

  // pożywienie: losowy punkt w świetle naczyń
  function placeFood(s, f) {
    const W = C.world;
    for (let t = 0; t < 120; t++) {
      f.x = W.minX + rnd(s) * (W.maxX - W.minX); f.y = W.minY + rnd(s) * (W.maxY - W.minY);
      if (H.sample(f.x, f.y) < -1.0 && f.y < 50) break;
    }
    f.z = (rnd(s) - 0.5) * 1.6;
    // udział glukozy zależy od pacjenta (diabetyk: więcej), reszta po równo aminokwasy i lipidy
    const gl = PT(s).glucose ?? 1 / 3, r = rnd(s);
    f.kind = r < gl ? 'glucose' : r < gl + (1 - gl) / 2 ? 'amino' : 'lipid';
    f.age = rnd(s) * C.food.maxAge * 0.5;
    f.id = s.nextId++;
    return f;
  }
  // R: rozmnożenie — kopia patogenu za pełny pasek pożywienia
  function makeCopy(s) {
    const b = s.bact, Q = C.copies;
    if (b.dead || b.transit || b.inTissue || b.hidden || b.food < Q.cost || s.copies.length >= Q.max) return;
    b.food -= Q.cost;
    const a = rnd(s) * 6.283;
    s.copies.push({ id: s.nextId++, x: b.x + Math.cos(a) * 0.7, y: b.y + Math.sin(a) * 0.7, vx: Math.cos(a) * 2, vy: Math.sin(a) * 2, dir: a, born: s.time, wob: rnd(s) * 6.283 });
    s.stats.copiesMade++;
  }

  // F: ukrycie w najbliższej własnej kolonii (albo wyjście z ukrycia)
  function hideToggle(s) {
    const b = s.bact;
    if (b.hidden) { b.hidden = 0; return; }
    if (b.dead || b.transit || b.burrowT > 0) return;
    let best = null, bd = C.hide.radius;
    for (const c of s.colonies) {
      if (!!c.inTissue !== !!b.inTissue) continue;
      const dd = Math.hypot(c.x - b.x, c.y - b.y);
      if (dd < bd) { bd = dd; best = c; }
    }
    if (!best) return;
    b.hidden = best.id; b.vx = b.vy = 0;
    for (let i = s.antibodies.length - 1; i >= 0; i--) if (s.antibodies[i].stuck) s.antibodies.splice(i, 1);
  }
  // mutacje za punkty z przyrostu kolonii
  // grzyb ma własne mutacje pod tymi samymi klawiszami (7, 8, 0); 9 (otoczka) i 6 (maskowanie) są wspólne
  const FUNGUS_MUT = { speed: 'pierce', fever: 'drugres', toxins: 'spores' };
  // rak: 7 szybsze podziały, 8 wyłączenie apoptozy, 9 angiogeneza, 0 przerzuty; 6 wspólne
  const CANCER_MUT = { speed: 'divide', fever: 'apoptosis', capsule: 'angio', toxins: 'meta' };
  G.mutKey = (s, what) => (s.kind === 'fungus' && FUNGUS_MUT[what]) || (s.kind === 'cancer' && CANCER_MUT[what]) || what;
  // wyłączenie apoptozy: mnożnik skutków leczenia i przeciwciał dla nowotworu
  const apoMul = (s) => 1 - C.cancer.apoStep * (s.bact.mut.apoptosis || 0);
  function mutate(s, what) {
    what = G.mutKey(s, what);
    const b = s.bact, M = C.mutations;
    if (!M[what] || b.dead) return;
    const lvl = b.mut[what];
    if (lvl >= M[what].max) return;
    const cost = M.cost[lvl];
    if (b.points < cost) return;
    b.points -= cost; b.mut[what] = lvl + 1;
    s.stats.mutations++;
  }
  // T: toksyny — pogarszają stan pacjenta i zakłócają badania pobrane w tym czasie
  function releaseToxins(s) {
    const b = s.bact, X = C.toxins;
    if (!b.mut.toxins || b.toxinCd > 0 || b.dead || b.hp <= X.hpCost + 1) return;
    b.hp -= X.hpCost; b.toxinCd = X.cooldown;
    s.patient.cond -= X.patientDamage; s.stats.condByInfection += X.patientDamage;
    s.toxinT = X.distortion;
    s.stats.toxins++;
  }

  // maskowanie (mutacja 6): objawy słabsze, badania mniej czułe, CRP niższe
  const maskLvl = (s) => (s.bact.mut && s.bact.mut.mask) || 0;
  // wzmocnienie objawów: pacjent (dziecko — wcześniej, senior — słabiej) i maskowanie patogenu
  G.symptomGain = (s) => PT(s).symptom * (1 - C.mutations.mask.symptom * maskLvl(s));
  // czułość badania (szansa wykrycia), obniżona przez maskowanie
  const sens = (s, kind) => Math.max(0.3, (D.tests[kind].sens ?? 1) - C.mutations.mask.sens * maskLvl(s));
  // B: sygnały chemiczne — fałszywy objaw w obszarze, w którym nie ma kolonii
  function emitSignals(s) {
    const b = s.bact, X = C.signals;
    if (b.signalCd > 0 || b.dead || b.hp <= X.hpCost + 1) return;
    const real = s.symptoms;
    const free = X.regions.filter((r) => (real[r] || 0) < 0.2);
    const pool = free.length ? free : X.regions;
    b.hp -= X.hpCost; b.signalCd = X.cooldown;
    s.fakeSym = { region: pool[Math.floor(rnd(s) * pool.length)], t: X.duration };
    s.stats.signals = (s.stats.signals || 0) + 1;
  }

  function spawnAntibodies(s, eff) {
    // lek podany dożylnie miesza się z krwią: przeciwciała pojawiają się w całym krwiobiegu (serce i jama brzuszna)
    const W = C.world;
    for (let i = 0; i < D.antibodies.count; i++) {
      let x = 0, y = 0;
      for (let t = 0; t < 120; t++) {
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
    // zakończenie: przy sepsie serce zwalnia do zatrzymania, a prąd krwi ustaje
    if (s.ending) {
      s.ending.t = Math.max(0, s.ending.t - dt);
      const k = s.ending.t / C.ending.duration;
      if (s.ending.win === 'bacteria') { s.hr = k; s.flowMul = k * k; }
    }
    s.phase = (s.phase + dt * C.bpm / 60 * s.hr) % 1;
    F.scale = s.flowMul;
    s.contraction = F.contraction(s.phase) * Math.min(1, s.hr * 2);
    H.VALVES.forEach((v, i) => { s.valves[i].open = F.valveOpen(v.type, s.phase); });
    updateValveGeometry(s);
    if (s.over) return;
    if (s.ending) {   // rozgrywka zatrzymana; po upływie czasu pokazujemy wynik
      if (s.ending.t <= 0) s.over = s.ending.win;
      return;
    }

    const b = s.bact, d = s.doctor;

    // --- lekarz ---
    for (const kind in d.tests) {
      const T = d.tests[kind];
      if (T.state === 'running') { T.t -= dt; if (T.t <= 0) finishTest(s, kind, T); }
      else if (T.cd > 0) T.cd = Math.max(0, T.cd - dt);
    }
    for (const k in d.cd) d.cd[k] = Math.max(0, d.cd[k] - dt);
    // operacja zastawki: po zakończeniu usuwa kolonie wokół zastawki i rani patogen w pobliżu
    {
      const SU = d.surgery, cfg = D.surgery;
      if (SU.state === 'running') {
        SU.t -= dt;
        if (SU.t <= 0) {
          const v = H.VALVES.find((x) => x.id === SU.valve);
          let removed = 0;
          for (let i = s.colonies.length - 1; i >= 0; i--) {
            const c = s.colonies[i];
            if (Math.hypot(c.x - v.c[0], c.y - v.c[1]) < cfg.radius) { s.colonies.splice(i, 1); removed++; }
          }
          s.stats.coloniesLost += removed;
          s.stats.surgeryRemoved = (s.stats.surgeryRemoved || 0) + removed;
          if (!b.dead && !b.transit && Math.hypot(b.x - v.c[0], b.y - v.c[1]) < cfg.radius) { b.hp -= cfg.pathogenDamage; b.hitFlash = 1; }
          SU.state = 'done'; SU.cd = cfg.cooldown;
          log(s, 'doc', `Operacja zakończona: ${v.name.toLowerCase()}. Usunięte ogniska: ${removed}.`);
        }
      } else if (SU.cd > 0) SU.cd = Math.max(0, SU.cd - dt);
    }
    // przeszczep / amputacja: po zakończeniu usuwa wszystkie ogniska w obszarze, patogen w nim traci dużo życia
    {
      const PR = d.proc;
      if (PR && PR.state === 'running') {
        PR.t -= dt;
        if (PR.t <= 0) {
          const what = PR.kind, cfg = what === 'legs' ? D.amputation : D.transplant;
          let removed = 0;
          for (let i = s.colonies.length - 1; i >= 0; i--) if (inProcArea(what, s.colonies[i].x, s.colonies[i].y)) { s.colonies.splice(i, 1); removed++; }
          s.stats.coloniesLost += removed; s.stats.procRemoved = (s.stats.procRemoved || 0) + removed;
          const hit = !b.dead && (what === 'legs' ? (b.transit && b.transit.to === 'legs') || inProcArea(what, b.x, b.y) : !b.transit && inProcArea(what, b.x, b.y));
          if (hit) { b.hp -= cfg.pathogenDamage; b.hitFlash = 1; }
          PR.state = 'idle'; PR.done[what] = 1;
          s.stats.procs = (s.stats.procs || 0) + 1;
          log(s, 'doc', `Zabieg zakończony: ${PROC_NAME[what]}. Usunięte ogniska: ${removed}.`);
        }
      }
    }
    if (d.feverT > 0) d.feverT = Math.max(0, d.feverT - dt);
    const targetT = d.feverT > 0 ? D.fever.temp : 36.6;
    d.temp += (targetT - d.temp) * Math.min(1, dt * 0.35);
    const feverK = Math.max(0, Math.min(1, (d.temp - 37.2) / (D.fever.temp - 37.2)));
    // objawy z położenia kolonii: masa kolonii w prawym sercu, lewym sercu i przy żyle głównej dolnej
    const sym = s.symptoms;
    for (const k in sym) sym[k] = 0;
    for (const c of s.colonies) { if (!c.region) c.region = H.regionOf(c.x, c.y); sym[c.region] = (sym[c.region] || 0) + c.size; }
    if (s.fakeSym) { s.fakeSym.t -= dt; if (s.fakeSym.t <= 0) s.fakeSym = null; }
    if (b.signalCd > 0) b.signalCd = Math.max(0, b.signalCd - dt);
    // kaszel: tym częstszy, im większe zakażenie, zwłaszcza w prawym sercu (krążenie płucne)
    if (rnd(s) < (C.cough.base + C.cough.perInfection * s.bact.infection + C.cough.perRightMass * (sym.right + (s.fakeSym && s.fakeSym.region === 'right' ? C.signals.mass : 0)) * G.symptomGain(s)) * dt) s.coughs++;

    // --- stan pacjenta ---
    {
      const P = C.patient, ST = s.stats;
      let byInf = P.infectionDrain * PT(s).drain * (b.infection / 100) * dt;
      // rak: duże guzy wyłączają narząd (dodatkowy spadek stanu)
      if (s.kind === 'cancer') { const of = G.organFailure(s); byInf += C.cancer.failDrain * of.length * dt; }
      const byFever = P.feverDrain * feverK * dt;
      const regen = P.regen * PT(s).regen * Math.max(0, 1 - b.infection / P.regenStopsAt) * dt;
      s.patient.cond = Math.min(100, s.patient.cond - byInf - byFever + regen);
      ST.condByInfection += byInf; ST.condByTreatment += byFever;
      ST.minCond = Math.min(ST.minCond, s.patient.cond);
    }

    // --- leki w organizmie ---
    const dr = s.drugs;
    for (const k in dr) if (dr[k].t > 0) dr[k].t = Math.max(0, dr[k].t - dt);
    const on = (k) => (dr[k].t > 0 ? dr[k].eff : 0);
    const effA = on('abxA'), effB = on('abxB'), effV = on('antiviral'), effF = on('antifungal'), effC = on('chemo');
    // spowolnienie ruchu i wstrzymanie wzrostu kolonii: makrolid (bakteria), lek przeciwwirusowy (wirus)
    b.slowMul = (1 - (1 - D.abxB.speedMul) * effB) * (1 - (1 - D.antiviral.speedMul) * effV);
    b.slowT = Math.max(effB > 0 ? dr.abxB.t : 0, effV > 0 ? dr.antiviral.t : 0);
    const halt = Math.max(effB, effV, effF * 0.5);

    // --- kolonie: rosną same; leki wstrzymują wzrost, gorączka go spowalnia, β-laktam je kurczy ---
    const K = C.colony;
    const SPc = C.species[s.species] || {};
    const grow0 = K.growth * PT(s).growth * (s.kind === 'virus' ? C.virus.growthMul : 1) * (SPc.growth ?? 1)
      * (1 - feverK * d.feverEff * (1 - D.fever.infectionMul));
    const pen = C.tissue.drugPenetration;
    let mass = 0;
    if (s.toxinT > 0) s.toxinT = Math.max(0, s.toxinT - dt);
    if (b.toxinCd > 0) b.toxinCd = Math.max(0, b.toxinCd - dt);
    for (let i = s.colonies.length - 1; i >= 0; i--) {
      const c = s.colonies[i];
      const pk = c.inTissue ? pen : 1;   // leki słabiej docierają do kolonii w mięśniu
      const before = c.size;
      const pf = c.store ? C.fungus.storeShrink : 1;   // magazyn zarodników: leki słabiej
      let gr = grow0 * (1 - halt * pk), sh = (D.abxA.colonyShrink * effA + D.antifungal.colonyShrink * effF) * pk * pf, cap = 1;
      if (s.kind === 'cancer') {
        // guz: szybsze podziały, bez własnych naczyń zatrzymuje się na smallCap; chemio- i radioterapia go kurczą
        const CA = C.cancer;
        gr *= 1 + CA.divStep * b.mut.divide;
        cap = b.mut.angio ? CA.maxSize : CA.smallCap;
        if (c.size > cap) gr = 0;
        sh += D.chemo.colonyShrink * effC * pk;
        if (s.radio && s.radio.t > 0 && regionOrgan(c) === s.radio.region) sh += D.radio.colonyShrink * s.radio.eff;
      }
      c.size = Math.min(Math.max(cap, c.size), c.size + (gr - sh) * dt);
      if (c.size > before) b.points += (c.size - before) * C.mutations.perGrowth;   // punkty mutacji z przyrostu
      if (c.size <= 0.02) { s.colonies.splice(i, 1); s.stats.coloniesLost++; continue; }
      mass += c.size;
      if (s.kind === 'fungus') fungusColony(s, c, dt, 1 - effF * pk);
      if (s.kind === 'cancer') cancerColony(s, c, dt);
    }
    if (s.radio) { s.radio.t -= dt; if (s.radio.t <= 0) s.radio = null; }
    b.infection = Math.min(100, mass * K.infectionPerSize * (s.kind === 'cancer' ? C.cancer.infectionMul : 1));   // guzy są większe od kolonii
    s.stats.maxInfection = Math.max(s.stats.maxInfection, b.infection);

    // --- bakteria ---
    b.hitFlash = Math.max(0, b.hitFlash - dt * 2.5);
    if (b.colonyCd > 0) b.colonyCd = Math.max(0, b.colonyCd - dt);
    if (b.dead > 0) {
      // odrodzenie w największej kolonii
      b.dead = Math.max(0, b.dead - dt);
      if (b.dead === 0 && s.colonies.length) {
        let best = s.colonies[0];
        for (const c of s.colonies) if (c.size > best.size) best = c;
        // grzyb odradza się w największym magazynie zarodników, jeśli ma któryś
        for (const c of s.colonies) if (c.store && (!best.store || c.size > best.size)) best = c;
        if (best.inTissue) { b.x = best.x; b.y = best.y; b.inTissue = true; b.z = C.tissue.z; }
        else { b.x = best.x - best.nx * 0.6; b.y = best.y - best.ny * 0.6; b.inTissue = false; b.z = 0; }
        b.vx = b.vy = 0; b.burrowT = 0;
        b.hp = K.respawnHp * (s.kind === 'virus' ? C.virus.hp / B.hp : 1); b.transit = null;
        best.size -= K.respawnCost * (best.store ? 0.5 : 1);
        if (best.size <= 0.02) { s.colonies.splice(s.colonies.indexOf(best), 1); s.stats.coloniesLost++; }
      }
    } else if (b.hidden) {
      // ukryty w kolonii: bez ruchu, odporny na przeciwciała, żeruje
      const hc = s.colonies.find((c) => c.id === b.hidden);
      if (!hc) b.hidden = 0;
      else {
        b.x = hc.x - (hc.inTissue ? 0 : hc.nx * 0.35); b.y = hc.y - (hc.inTissue ? 0 : hc.ny * 0.35);
        b.vx = b.vy = 0; b.contact = !hc.inTissue;
        const maxHp = s.kind === 'virus' ? C.virus.hp : B.hp;
        b.feeding = b.hp < maxHp; if (b.feeding) b.hp = Math.min(maxHp, b.hp + K.feed * dt);
        if (feverK > 0) { const fd = D.fever.dps * feverK * d.feverEff * (1 - C.mutations.fever.step * b.mut.fever) * dt; b.hp -= fd; s.stats.dmgFever += fd; }
        { const dd = (D.abxA.dps * effA + D.antiviral.dps * effV + D.antifungal.dps * effF + D.chemo.dps * effC + radioDps(s, b)) * dt; b.hp -= dd; s.stats.dmgDrugs = (s.stats.dmgDrugs || 0) + dd; }
        s.stats.hiddenTime += dt;
      }
    } else if (b.transit) {
      b.transit.t -= dt;
      if (b.transit.t <= 0) {
        const opts = H.INLETS[b.transit.to];
        const p = opts[Math.floor(rnd(s) * opts.length)];
        b.x = p.x; b.y = p.y; b.vx = b.vy = 0; b.transit = null;
      }
    } else {
      let stuck = 0; for (const a of s.antibodies) if (a.stuck) stuck += (a.eff ?? 1);
      const mul = b.slowMul * Math.max(0.3, 1 - stuck * 0.08) * (s.kind === 'virus' ? C.virus.speedMul : 1) * ((C.species[s.species] || {}).speed ?? 1)
        * (1 + C.mutations.speed.step * b.mut.speed);
      const il = Math.hypot(b.ix, b.iy) || 1;
      b.vx += (b.ix / il) * B.accel * mul * dt * (b.ix || b.iy ? 1 : 0);
      b.vy += (b.iy / il) * B.accel * mul * dt * (b.ix || b.iy ? 1 : 0);
      const dragK = Math.exp(-B.drag * dt);
      b.vx *= dragK; b.vy *= dragK;
      const sp = Math.hypot(b.vx, b.vy), cap = B.maxSpeed * mul;
      if (sp > cap) { b.vx *= cap / sp; b.vy *= cap / sp; }
      const Tt = C.tissue;
      const ox = b.x, oy = b.y;
      if (b.inTissue) {
        // w mięśniu: bez prądu krwi, wolniej, między komórkami
        const tm = Tt.speedMul[s.kind] || Tt.speedMul.bacteria;
        b.fx = b.fy = 0;
        b.x += b.vx * tm * dt; b.y += b.vy * tm * dt;
        if (Math.hypot(b.vx, b.vy) > 0.4) b.dir = Math.atan2(b.vy, b.vx);
        DD.TissueCells.collide(b, B.radius * 0.8);
        const dd = H.sample(b.x, b.y);
        if (dd > Tt.maxD) { H.grad(b.x, b.y, g2); b.x -= g2[0] * (dd - Tt.maxD); b.y -= g2[1] * (dd - Tt.maxD); }
        b.z += (Tt.z - b.z) * Math.min(1, dt * 6);
        b.contact = false;
        if (dd < Tt.exitD) {
          // wypłynięcie z mięśnia do krwi
          H.grad(b.x, b.y, g2);
          b.x -= g2[0] * (dd + 0.7); b.y -= g2[1] * (dd + 0.7);
          b.inTissue = false; b.z = 0;
          log(s, 'bact', 'Patogen wraca do krwi.');
        }
      } else {
        F.velocity(b.x, b.y, s.time, s.phase, fv);
        b.fx = fv[0]; b.fy = fv[1];
        // przy ścianie prąd słabnie (warstwa przyścienna) — tam bakteria może się trzymać
        b.x += (b.vx + fv[0] * B.flowCoupling) * dt;
        b.y += (b.vy + fv[1] * B.flowCoupling) * dt;
        if (Math.hypot(b.vx, b.vy) > 0.4) b.dir = Math.atan2(b.vy, b.vx);

        collideChords(s, b, B.radius);
        collideLeaflets(s, b, B.radius);
        b.contact = collideWalls(b, B.radius + 0.05) || H.sample(b.x, b.y) > -(B.radius + 0.3);

        // wnikanie w ścianę: trwa, dopóki patogen przy niej jest
        if (b.burrowT > 0) {
          if (!b.contact) b.burrowT = 0;
          else {
            b.burrowT = Math.max(0, b.burrowT - dt);
            b.z = Tt.z * (1 - b.burrowT / (Tt.burrow[s.kind] || Tt.burrow.bacteria)) * 0.5;
            if (b.burrowT === 0) {
              H.grad(b.x, b.y, g2);
              const dd = H.sample(b.x, b.y);
              b.x += g2[0] * (Tt.enterD - dd); b.y += g2[1] * (Tt.enterD - dd);
              b.inTissue = true; b.vx = b.vy = 0;
              s.stats.tissueEntries = (s.stats.tissueEntries || 0) + 1;
              log(s, 'bact', 'Patogen wniknął w ścianę serca.');
            }
          }
        } else b.z += (0 - b.z) * Math.min(1, dt * 6);
      }

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
      // żerowanie na tkance odnawia życie
      const maxHp = s.kind === 'virus' ? C.virus.hp : B.hp;
      b.feeding = (b.contact || b.inTissue) && b.hp < maxHp;
      if (b.feeding) b.hp = Math.min(maxHp, b.hp + K.feed * dt);
      if (feverK > 0) { const fd = D.fever.dps * feverK * d.feverEff * (1 - C.mutations.fever.step * b.mut.fever) * dt; b.hp -= fd; ST.dmgFever += fd; }
      // leki bójcze: β-laktam (bakteria), przeciwwirusowy (wirus)
      { const dd = (D.abxA.dps * effA + D.antiviral.dps * effV + D.antifungal.dps * effF + D.chemo.dps * effC + radioDps(s, b)) * dt; b.hp -= dd; ST.dmgDrugs = (ST.dmgDrugs || 0) + dd; }

      if (!b.inTissue) for (const ex of H.EXITS) if (ex.test(b.x, b.y)) {
        b.transit = { to: ex.to, t: 1.6, total: 1.6 };
        if (ex.to === 'lungs') ST.lungsTrips++; else ST.bodyTrips++;
        log(s, 'bact', `Patogen płynie: ${H.ROUTES[ex.to].name.toLowerCase()}.`);
      }
      b.place = b.inTissue ? 'Mięsień sercowy' : H.placeName(b.x, b.y);
      if (b.place && !ST.places.includes(b.place)) ST.places.push(b.place);
      ST.minHp = Math.min(ST.minHp, b.hp);
    }

    // --- przeciwciała ---
    // --- pożywienie: płynie z prądem, zjadane przez patogen ---
    const FD = C.food;
    const foodN = Math.round(FD.count * PT(s).food);
    while (s.food.length < foodN) s.food.push(placeFood(s, {}));
    if (s.food.length > foodN) s.food.length = foodN;
    const canEat = !b.dead && !b.transit && !b.inTissue && !b.hidden;
    for (const f of s.food) {
      // pożywienie, które długo nie zostało zjedzone (np. utknęło w zaułku), pojawia się w innym miejscu
      f.age = (f.age || 0) + dt;
      if (f.age > FD.maxAge) { placeFood(s, f); continue; }
      F.velocity(f.x, f.y, s.time, s.phase, fv);
      f.x += fv[0] * 0.95 * dt; f.y += fv[1] * 0.95 * dt;
      const fdd = H.sample(f.x, f.y);
      if (fdd > -0.3) { H.grad(f.x, f.y, g2); f.x -= g2[0] * (fdd + 0.3); f.y -= g2[1] * (fdd + 0.3); }
      let gone = f.y > 52 || f.x > 58 || f.y < -56;
      if (!gone && canEat && b.food < 100 && Math.hypot(f.x - b.x, f.y - b.y) < FD.eatRadius) {
        b.food = Math.min(100, b.food + FD.kinds[f.kind]); s.stats.eaten++; gone = true;
        if (f.kind === 'lipid') b.hp = Math.min(s.kind === 'virus' ? C.virus.hp : B.hp, b.hp + FD.lipidHp);
        if (f.kind === 'amino') b.points = (b.points || 0) + FD.aminoPoints;
      }
      if (gone) placeFood(s, f);
    }

    // --- kopie patogenu: płyną z prądem i lekko się ruszają ---
    for (let i = s.copies.length - 1; i >= 0; i--) {
      const c = s.copies[i];
      if (s.time - c.born > C.copies.life) { s.copies.splice(i, 1); s.stats.copiesExpired = (s.stats.copiesExpired || 0) + 1; continue; }
      F.velocity(c.x, c.y, s.time, s.phase, fv);
      c.wob += dt * (0.8 + (c.id % 5) * 0.2);
      const sw = C.copies.swim;
      c.vx += Math.cos(c.wob) * sw * dt * 3; c.vy += Math.sin(c.wob * 1.3) * sw * dt * 3;
      const dk = Math.exp(-3 * dt); c.vx *= dk; c.vy *= dk;
      c.x += (c.vx + fv[0] * B.flowCoupling) * dt; c.y += (c.vy + fv[1] * B.flowCoupling) * dt;
      if (Math.hypot(c.vx, c.vy) > 0.3) c.dir = Math.atan2(c.vy, c.vx);
      collideLeaflets(s, c, B.radius); const hit = collideWalls(c, B.radius);
      for (const ex of H.EXITS) if (ex.test(c.x, c.y)) { const L = H.INLETS[ex.to], p = L[Math.floor(rnd(s) * L.length)]; c.x = p.x; c.y = p.y; }
      // grzyb z mutacją „zarodniki z krwią”: zarodnik przy ścianie osiada i zakłada kolonię
      const settles = (s.kind === 'fungus' && b.mut.spores) || (s.kind === 'cancer' && b.mut.meta);   // zarodnik grzyba / przerzut raka
      if (settles && s.time - c.born > C.fungus.sporeSettle && s.colonies.length < C.fungus.maxColonies
          && (hit || H.sample(c.x, c.y) > -(B.radius + 0.3))) {
        H.grad(c.x, c.y, g2); const d = H.sample(c.x, c.y);
        s.colonies.push(newColony(s, c.x - g2[0] * d, c.y - g2[1] * d, g2[0], g2[1], C.colony.startSize * 0.6));
        s.copies.splice(i, 1); if (s.kind === 'cancer') s.stats.metastases++; else s.stats.sporeColonies++;
        continue;
      }
    }

    const A = D.antibodies;
    for (let i = s.antibodies.length - 1; i >= 0; i--) {
      const a = s.antibodies[i];
      a.life -= dt; a.rot += a.spin * dt;
      if (a.life <= 0) { s.antibodies.splice(i, 1); continue; }
      if (a.stuck) { a.x = b.x + a.ox; a.y = b.y + a.oy; continue; }
      F.velocity(a.x, a.y, s.time, s.phase, fv);
      let vx = fv[0] * 0.9, vy = fv[1] * 0.9;
      const alive = !b.transit && !b.dead && !b.inTissue && !b.hidden;
      const dx = b.x - a.x, dy = b.y - a.y, dist = Math.hypot(dx, dy);
      // cel: patogen albo jedna z jego kopii w zasięgu, wybrany losowo — przeciwciało nie odróżnia oryginału od kopii
      const R = A.homingRadius;
      if (a.tgt === 'p' && !(alive && dist < R * 1.3)) a.tgt = null;
      let tc = null;
      if (typeof a.tgt === 'number') {
        tc = s.copies.find((c) => c.id === a.tgt);
        if (!tc || Math.hypot(tc.x - a.x, tc.y - a.y) > R * 1.3) { a.tgt = null; tc = null; }
      }
      if (a.tgt == null) {
        const cands = [];
        if (alive && dist < R) cands.push('p');
        for (const c of s.copies) if (Math.hypot(c.x - a.x, c.y - a.y) < R) cands.push(c.id);
        if (cands.length) {
          a.tgt = cands[Math.floor(rnd(s) * cands.length)];
          if (typeof a.tgt === 'number') tc = s.copies.find((c) => c.id === a.tgt);
        }
      }
      let tx = 0, ty = 0, td = 1e9, col = null;
      if (a.tgt === 'p') { tx = dx; ty = dy; td = dist; }
      else if (tc) { tx = tc.x - a.x; ty = tc.y - a.y; td = Math.hypot(tx, ty); }
      else {
        for (const c of s.colonies) {
          if (c.inTissue) continue;   // przeciwciała nie docierają do kolonii w mięśniu
          const cx = c.x - a.x, cy = c.y - a.y, cd = Math.hypot(cx, cy);
          if (cd < A.homingRadius && cd < td) { tx = cx; ty = cy; td = cd; col = c; }
        }
      }
      if (td < A.homingRadius) {
        const k = A.speed * (1 - td / A.homingRadius * 0.5);
        vx += tx / td * k; vy += ty / td * k;
      }
      if (tc && td < B.radius + 0.4) {
        // trafiona kopia ginie razem z przeciwciałem
        s.copies.splice(s.copies.indexOf(tc), 1);
        s.stats.copiesLost++; s.stats.decoyHits++;
        s.antibodies.splice(i, 1);
        continue;
      }
      if (col && td < 0.6 + col.size * 0.5) {
        col.size -= K.abDamage * (a.eff ?? 1) * ((C.species[s.species] || {}).biofilm ?? 1) * (s.kind === 'cancer' ? apoMul(s) : 1);   // biofilm gronkowca chroni kolonie; guz bez apoptozy też
        s.stats.abHits++;
        if (col.size <= 0.02) { s.colonies.splice(s.colonies.indexOf(col), 1); s.stats.coloniesLost++; }
        s.antibodies.splice(i, 1);
        continue;
      }
      a.x += vx * dt; a.y += vy * dt;
      collideLeaflets(s, a, 0.2);
      collideWalls(a, 0.25);
      for (const ex of H.EXITS) if (ex.test(a.x, a.y)) {
        const L = H.INLETS[ex.to], p = L[Math.floor(rnd(s) * L.length)]; a.x = p.x; a.y = p.y;
      }
      if (alive && dist < B.radius + 0.4) {
        a.stuck = true; a.ox = a.x - b.x; a.oy = a.y - b.y; a.life = Math.min(a.life, 8);
        const cap = 1 - C.mutations.capsule.step * b.mut.capsule;   // otoczka osłabia przeciwciała
        b.hp -= A.damage * (a.eff ?? 1) * cap; b.hitFlash = 0.4 + 0.6 * (a.eff ?? 1) * cap;
        s.stats.abHits++; s.stats.dmgAntibodies += A.damage * (a.eff ?? 1) * cap;
      }
    }

    // --- koniec gry ---
    if (b.hp <= 0 && !b.dead) {
      b.hp = 0; s.stats.deaths++;
      for (let i = s.antibodies.length - 1; i >= 0; i--) if (s.antibodies[i].stuck) s.antibodies.splice(i, 1);
      if (s.colonies.length) b.dead = K.respawnDelay;
    }
    if (b.hp <= 0 && !s.colonies.length) { s.ending = { win: 'doctor', t: C.ending.duration }; log(s, 'sys', 'Zakażenie wyleczone: nie ma ani patogenu, ani kolonii. Wygrywa lekarz.'); }
    else if (s.patient.cond <= 0) { s.patient.cond = 0; s.ending = { win: 'bacteria', t: C.ending.duration }; log(s, 'sys', s.kind === 'cancer' ? 'Wyniszczenie nowotworowe: stan pacjenta krytyczny. Wygrywa nowotwór.' : 'Sepsa: stan pacjenta krytyczny. Wygrywa patogen.'); }
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
