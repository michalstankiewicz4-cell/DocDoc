// Panel lekarza (prawa połowa) i HUD bakterii (lewa połowa).
// UI tylko czyta stan i wysyła komendy — nie zmienia stanu bezpośrednio.
(function () {
  const C = DD.CONFIG, D = C.doctor;
  const $ = (id) => document.getElementById(id);

  const ACTIONS = [
    { cmd: 'doc.antibodies', key: '1', cd: 'antibodies', name: 'Przeciwciała', desc: 'Immunoglobuliny we krwi. Szukają patogenu i kolonii, przyklejają się do nich.' },
    { cmd: 'doc.fever',      key: '2', cd: 'fever',      name: 'Gorączka',     desc: 'Temperatura do 39,6 °C. Osłabia patogen i spowalnia wzrost kolonii.' },
    { cmd: 'doc.abxA',       key: '3', cd: 'abxA',       name: 'Antybiotyk β-laktamowy', desc: 'Bakteriobójczy: niszczy bakterie i kurczy kolonie. Nie działa na wirusy.' },
    { cmd: 'doc.abxB',       key: '4', cd: 'abxB',       name: 'Antybiotyk makrolidowy', desc: 'Bakteriostatyczny: spowalnia bakterie i wstrzymuje wzrost kolonii. Nie działa na wirusy.' },
    { cmd: 'doc.antiviral',  key: '5', cd: 'antiviral',  name: 'Lek przeciwwirusowy',    desc: 'Hamuje namnażanie wirusa i go osłabia. Nie działa na bakterie.' }
  ];
  const COOLDOWN = { antibodies: D.antibodies.cooldown, fever: D.fever.cooldown, abxA: D.abxA.cooldown, abxB: D.abxB.cooldown, antiviral: D.antiviral.cooldown };
  const TESTS = [
    { kind: 'crp', key: 'Z', name: 'CRP', desc: 'Szybkie, przybliżone: poziom stanu zapalnego.' },
    { kind: 'culture', key: 'X', name: 'Posiew krwi', desc: 'Dokładna kolonizacja i zdjęcie miejsca pobrania.' },
    { kind: 'echo', key: 'C', name: 'Echo serca', desc: 'Położenie i wielkość kolonii na ścianach.' },
    { kind: 'abg', key: 'V', name: 'Antybiogram', desc: 'Wrażliwość na leczenie. Wymaga dodatniego posiewu.' }
  ];

  DD.createUI = function () {
    const actionsEl = $('actions');
    const btns = {};
    for (const a of ACTIONS) {
      const b = document.createElement('button');
      b.className = 'action'; b.id = 'act-' + a.cd; b.type = 'button';
      b.innerHTML = `<span class="action-cd"></span><span class="action-head"><span class="action-name">${a.name}</span><kbd>${a.key}</kbd></span><span class="action-desc">${a.desc}</span><span class="action-foot"><span class="action-state"></span><span class="action-eff"></span></span>`;
      b.addEventListener('click', () => DD.send({ type: a.cmd }));
      actionsEl.appendChild(b);
      btns[a.cd] = b;
    }
    // panel mutacji patogenu
    const MUTS = [
      { what: 'speed', key: '7', name: 'Szybkość' },
      { what: 'fever', key: '8', name: 'Odporność na gorączkę' },
      { what: 'capsule', key: '9', name: 'Otoczka (przeciwciała)' },
      { what: 'toxins', key: '0', name: 'Toksyny' }
    ];
    const mutBtns = {};
    for (const m of MUTS) {
      const b = document.createElement('button');
      b.className = 'mut-row'; b.type = 'button';
      b.innerHTML = `<kbd>${m.key}</kbd><span>${m.name}</span><span class="mut-lvl"></span>`;
      b.addEventListener('click', () => { DD.send({ type: 'bact.mutate', what: m.what }); b.blur(); });
      $('mut-list').appendChild(b); mutBtns[m.what] = b;
    }

    // operacja zastawki: przycisk na każdą zastawkę
    const SURG = [
      { valve: 'tricuspid', key: 'H', name: 'Trójdzielna' },
      { valve: 'mitral', key: 'J', name: 'Mitralna' },
      { valve: 'pulmonary', key: 'K', name: 'Pnia płucnego' },
      { valve: 'aortic', key: 'L', name: 'Aorty' }
    ];
    const surgBtns = {};
    for (const v of SURG) {
      const b = document.createElement('button');
      b.className = 'surg-btn'; b.type = 'button';
      b.innerHTML = `<span>${v.name}</span><kbd>${v.key}</kbd>`;
      b.addEventListener('click', () => DD.send({ type: 'doc.surgery', valve: v.valve }));
      $('surgery').appendChild(b); surgBtns[v.valve] = b;
    }

    const testBtns = {};
    for (const t of TESTS) {
      const b = document.createElement('button');
      b.className = 'test-btn'; b.id = 'test-' + t.kind; b.type = 'button';
      b.innerHTML = `<span class="test-bar" aria-hidden="true"><span></span></span><span class="test-row"><span class="test-name">${t.name}</span><kbd>${t.key}</kbd></span><span class="test-desc">${t.desc}</span><span class="test-state"></span>`;
      b.addEventListener('click', () => DD.send({ type: 'doc.test', kind: t.kind }));
      $('tests').appendChild(b);
      testBtns[t.kind] = b;
    }

    // obraz echa: wycinek wachlarza jak w USG, ściany serca z SDF, kolonie jako jasne ogniska
    const echoC = $('res-echo-c'), echoCtx = echoC.getContext('2d');
    let echoBg = null;
    function drawEcho(res) {
      const W = C.world, H = DD.Heart;
      const w = 240, h = 232, pr = Math.min(2, window.devicePixelRatio || 1);
      echoC.width = w * pr; echoC.height = h * pr; echoC.style.width = w + 'px'; echoC.style.height = h + 'px';
      const ctx = echoCtx; ctx.setTransform(pr, 0, 0, pr, 0, 0);
      if (!echoBg) {
        echoBg = document.createElement('canvas'); echoBg.width = w; echoBg.height = h;
        const b = echoBg.getContext('2d'), img = b.createImageData(w, h);
        for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
          const x = W.minX + (i + 0.5) / w * (W.maxX - W.minX), y = W.maxY - (j + 0.5) / h * (W.maxY - W.minY);
          const d = H.sample(x, y), k = (j * w + i) * 4;
          // krew ciemna, ściany jasne (echogeniczne), ziarno plamkowe jak w USG
          const speck = Math.random();
          let v = d < 0 ? 18 + speck * 18 : d < 8 ? 120 + speck * 90 - d * 6 : 30 + speck * 25;
          img.data[k] = img.data[k + 1] = img.data[k + 2] = Math.max(0, Math.min(255, v)); img.data[k + 3] = 255;
        }
        b.putImageData(img, 0, 0);
      }
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
      ctx.save();
      // wachlarz głowicy
      ctx.beginPath(); ctx.moveTo(w / 2, -30); ctx.arc(w / 2, -30, h * 1.2, Math.PI * 0.16, Math.PI * 0.84); ctx.closePath(); ctx.clip();
      ctx.drawImage(echoBg, 0, 0);
      for (const [x, y, size, inT] of res.colonies) {
        const px = (x - W.minX) / (W.maxX - W.minX) * w, py = (W.maxY - y) / (W.maxY - W.minY) * h;
        const r = inT ? 7 + size * 6 : 2.5 + size * 5;      // zgrubienie ściany: większe i bledsze
        const a = inT ? 0.45 : 1;
        const g = ctx.createRadialGradient(px, py, 0, px, py, r * 1.8);
        g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.5, `rgba(255,255,255,${a * 0.6})`); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, r * 1.8, 0, 6.283); ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = 'rgba(160, 220, 255, 0.85)'; ctx.font = '11px system-ui, sans-serif';
      ctx.fillText('P', 6, 14); ctx.fillText('L', w - 14, 14);
    }

    // EKG
    const ecg = $('ecg'), ctx = ecg.getContext('2d');
    const trace = new Float32Array(400); let head = 0, lastPhase = 0;
    // pobudzenia przedwczesne (szeroki QRS), gdy kolonie siedzą w lewym sercu — objaw dla lekarza
    let beat = 0, prevP = 0, ectopicChance = 0;
    const beatHash = (n) => { const x = Math.sin(n * 127.1 + 31.7) * 43758.5453; return x - Math.floor(x); };
    function ecgValue(ph) {
      if (ph < prevP) beat++;
      prevP = ph;
      const g = (c, w, a) => a * Math.exp(-((ph - c) * (ph - c)) / (2 * w * w));
      let v = g(0.03, 0.018, 0.12) + g(0.125, 0.006, -0.12) + g(0.14, 0.007, 1.0) + g(0.155, 0.007, -0.28) + g(0.38, 0.04, 0.26);
      if (beatHash(beat) < ectopicChance) v += g(0.66, 0.022, -0.55) + g(0.7, 0.03, 0.75) + g(0.8, 0.05, -0.2);
      return v;
    }
    function drawEcg(s) {
      const w = ecg.clientWidth, h = ecg.clientHeight, pr = window.devicePixelRatio || 1;
      if (ecg.width !== Math.round(w * pr)) { ecg.width = Math.round(w * pr); ecg.height = Math.round(h * pr); }
      ectopicChance = Math.max(0, Math.min(0.6, (DD.symptomMasses(s).left - 0.35) * 0.8));
      // przesuwaj zapis proporcjonalnie do czasu
      let ph = s.phase; if (ph < lastPhase) ph += 1;
      const steps = Math.max(1, Math.round((ph - lastPhase) * 160));
      for (let i = 1; i <= steps; i++) {
        const p = (lastPhase + (ph - lastPhase) * i / steps) % 1;
        trace[head] = ecgValue(p); head = (head + 1) % trace.length;
      }
      lastPhase = s.phase;
      ctx.setTransform(pr, 0, 0, pr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      ctx.strokeStyle = getComputedStyle(ecg).getPropertyValue('--grid').trim() || '#d6e2dd';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < w; x += 16) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); }
      for (let y = 0; y < h; y += 16) { ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); }
      ctx.stroke();
      ctx.strokeStyle = getComputedStyle(ecg).getPropertyValue('--trace').trim() || '#11795a';
      ctx.lineWidth = 2; ctx.lineJoin = 'round';
      ctx.beginPath();
      const n = trace.length;
      for (let i = 0; i < n; i++) {
        const v = trace[(head + i) % n];
        const x = i / (n - 1) * w, y = h * 0.62 - v * h * 0.5;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.fillStyle = ctx.strokeStyle;
      const lv = trace[(head + n - 1) % n];
      ctx.beginPath(); ctx.arc(w - 2, h * 0.62 - lv * h * 0.5, 3, 0, Math.PI * 2); ctx.fill();
    }

    let logCount = -1;
    const fmt = (v, d = 1) => v.toFixed(d).replace('.', ',');
    const mmss = (t) => { const m = Math.floor(t / 60), s = Math.floor(t % 60); return `${m}:${s < 10 ? '0' : ''}${s}`; };

    // statystyki rundy na ekranie końcowym
    function renderStats(s) {
      const S = s.stats || {};
      const chambers = DD.Heart.ELLIPSES.map((e) => e.name);
      const seen = (S.places || []).filter((p) => chambers.includes(p)).length;
      const num = (v, d = 0) => (v ?? 0).toFixed(d).replace('.', ',');
      const at = (t) => (t >= 0 ? mmss(t) : 'nie było');
      const used = S.used || {};
      const rows = {
        'end-stats-bact': [
          ['Przebyta droga', num(S.distance) + ' j.'],
          ['Najwyższa kolonizacja', Math.floor(S.maxInfection || 0) + '%'],
          ['Założone kolonie', String(S.coloniesFounded || 0)],
          ['Zniszczone kolonie', String(S.coloniesLost || 0)],
          ['Odrodzenia', String(S.deaths || 0)],
          ['Czas przy ścianie', num(S.contactTime) + ' s'],
          ['Przejścia przez zastawki', String(S.valveCrossings || 0)],
          ['Wniknięcia w ścianę serca', String(S.tissueEntries || 0)],
          ['Mutacje', String(S.mutations || 0)],
          ['Uwolnienia toksyn', String(S.toxins || 0)],
          ['Czas w ukryciu', num(S.hiddenTime) + ' s'],
          ['Zjedzone pożywienie', String(S.eaten || 0)],
          ['Kopie: utworzone / zniszczone / obumarłe', `${S.copiesMade || 0} / ${S.copiesLost || 0} / ${S.copiesExpired || 0}`],
          ['Przeciwciała zwiedzione przez kopie', String(S.decoyHits || 0)],
          ['Krążenie płucne / duże', `${S.lungsTrips || 0} / ${S.bodyTrips || 0}`],
          ['Odwiedzone jamy serca', `${seen} z ${chambers.length}`],
          ['Najmniej życia', Math.max(0, Math.ceil(S.minHp ?? 0)) + ' pkt']
        ],
        'end-stats-doc': [
          ['Zlecone badania', String(S.tests || 0)],
          ['Pierwsze badanie', at(S.firstTestAt)],
          ['Pierwsze leczenie', at(S.firstTreatAt)],
          ['Podane przeciwciała', String(used.antibodies || 0)],
          ['Wywołane gorączki', String(used.fever || 0)],
          ['Antybiotyk β-laktamowy', String(used.abxA || 0)],
          ['Antybiotyk makrolidowy', String(used.abxB || 0)],
          ['Lek przeciwwirusowy', String(used.antiviral || 0)],
          ['Obrażenia od leków', num(S.dmgDrugs) + ' pkt'],
          ['Operacje zastawek', String(S.surgeries || 0)],
          ['Ogniska usunięte operacją', String(S.surgeryRemoved || 0)],
          ['Trafienia przeciwciał', String(S.abHits || 0)],
          ['Obrażenia od przeciwciał', num(S.dmgAntibodies) + ' pkt'],
          ['Obrażenia od gorączki', num(S.dmgFever) + ' pkt'],
          ['Najgorszy stan pacjenta', Math.max(0, Math.ceil(S.minCond ?? 100)) + '%'],
          ['Stan pacjenta stracony przez zakażenie', num(S.condByInfection) + ' pkt'],
          ['Stan pacjenta stracony przez leczenie', num(S.condByTreatment) + ' pkt']
        ]
      };
      for (const id in rows) {
        $(id).innerHTML = rows[id].map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('');
      }
    }

    // karty wyników (tylko gdy przyszedł nowy wynik)
    let shownSeq = -1;
    function renderResults(s) {
      const d = s.doctor;
      if (d.resultSeq === shownSeq) return;
      shownSeq = d.resultSeq;
      const T = d.tests;
      $('results-block').hidden = !(T.crp.res || T.culture.res || T.echo.res || T.abg.res);
      const time = (el, t) => { el.querySelector('.res-time').textContent = 'pobranie ' + mmss(t.sampleT); };
      if (T.crp.res) {
        $('res-crp').hidden = false; time($('res-crp'), T.crp);
        const v = T.crp.res.value;
        $('res-crp-v').textContent = v;
        $('res-crp-l').textContent = v < 10 ? 'W normie' : v < 50 ? 'Podwyższone' : v < 150 ? 'Wysokie' : 'Bardzo wysokie';
      } else $('res-crp').hidden = true;
      if (T.culture.res) {
        $('res-culture').hidden = false; time($('res-culture'), T.culture);
        const r = T.culture.res;
        $('res-culture-v').textContent = r.positive ? `Dodatni, kolonizacja ${r.infection}%, komórki we krwi: ${r.cells ?? 0}` : 'Ujemny';
      } else $('res-culture').hidden = true;
      if (T.echo.res) {
        $('res-echo').hidden = false; time($('res-echo'), T.echo);
        drawEcho(T.echo.res);
        const nT = T.echo.res.colonies.filter((c) => c[3]).length, nW = T.echo.res.colonies.length - nT;
        $('res-echo-l').textContent = (nW || nT) ? `Ogniska na ścianach: ${nW}` + (nT ? `. Niewyraźne zgrubienia ściany: ${nT}` : '') : 'Bez widocznych zmian';
      } else $('res-echo').hidden = true;
      if (T.abg.res) {
        $('res-abg').hidden = false; time($('res-abg'), T.abg);
        const lbl = (r) => r < 0.2 ? ['wrażliwa', 'ok'] : r < 0.5 ? ['średnio wrażliwa', 'warm'] : ['oporna', 'high'];
        const R = T.abg.res;
        const rows = [['Przeciwciała', R.antibodies], ['Gorączka', R.fever], ['β-laktam', R.abxA], ['Makrolid', R.abxB]];
        $('res-abg-l').innerHTML = rows.map(([k, e]) => { const [t, c] = lbl(1 - e); return `<div><dt>${k}</dt><dd data-state="${c}">${t}, skuteczność ${Math.round(e * 100)}%</dd></div>`; }).join('');
      } else $('res-abg').hidden = true;
    }

    function update(s) {
      const d = s.doctor, b = s.bact;
      drawEcg(s);
      const fever = d.feverT > 0;
      $('v-hr').textContent = C.bpm;
      $('v-temp').textContent = fmt(d.temp);
      $('vital-temp').dataset.state = d.temp > 38 ? 'high' : d.temp > 37.2 ? 'warm' : 'ok';
      if (d.estInfection == null) {
        $('v-inf').textContent = '—';
        $('v-inf-note').textContent = 'zleć badanie';
      } else {
        $('v-inf').textContent = (d.estExact ? '' : '≈') + d.estInfection + '%';
        $('v-inf-note').textContent = (d.estExact ? 'posiew, ' : 'z CRP, ') + 'stan sprzed ' + mmss(s.time - (d.estT ?? s.time));
      }
      const cond = Math.max(0, s.patient.cond);
      $('v-cond').textContent = Math.ceil(cond);
      $('vital-cond').dataset.state = cond < 30 ? 'high' : cond < 65 ? 'warm' : 'ok';
      $('v-cond-note').textContent = cond < 30 ? 'krytyczny, grozi sepsa' : cond < 65 ? 'pogarsza się' : 'stabilny';
      $('h-cond').style.transform = `scaleX(${cond / 100})`;
      $('h-cond-val').textContent = Math.ceil(cond) + '%';
      $('vital-inf').dataset.state = d.estInfection == null ? 'unknown' : d.estInfection > 50 ? 'high' : 'warm';
      $('clock').textContent = mmss(s.time);

      // badania
      const cultPos = d.tests.culture.res && d.tests.culture.res.positive;
      for (const t of TESTS) {
        const T = d.tests[t.kind], el = testBtns[t.kind], cfg = D.tests[t.kind];
        const bar = el.querySelector('.test-bar span'), st = el.querySelector('.test-state');
        const needCulture = t.kind === 'abg' && !cultPos;
        if (T.state === 'running') {
          el.disabled = true; el.dataset.state = 'running';
          st.textContent = `W toku, wynik za ${Math.ceil(T.t)} s`;
          bar.style.transform = `scaleX(${1 - T.t / cfg.duration})`;
        } else if (T.cd > 0) {
          el.disabled = true; el.dataset.state = 'cooldown';
          st.textContent = `Kolejne za ${Math.ceil(T.cd)} s`;
          bar.style.transform = 'scaleX(0)';
        } else {
          el.disabled = !s.running || !!s.over || needCulture;
          el.dataset.state = needCulture ? 'locked' : 'ready';
          st.textContent = needCulture ? 'Najpierw dodatni posiew' : `Gotowe, wynik po ${cfg.duration} s`;
          bar.style.transform = 'scaleX(0)';
        }
      }
      renderResults(s);

      // operacja zastawki
      {
        const SU = d.surgery || { state: 'idle', cd: 0 };
        const busy = SU.state === 'running' || SU.cd > 0;
        for (const v of SURG) {
          const el = surgBtns[v.valve];
          el.disabled = !d.unlocked || busy || !s.running || !!s.over;
          el.dataset.active = SU.state === 'running' && SU.valve === v.valve ? '1' : '0';
        }
        $('surg-state').textContent = !d.unlocked ? 'Wymaga wyniku badania'
          : SU.state === 'running' ? `Operacja w toku: jeszcze ${Math.ceil(SU.t)} s`
          : SU.cd > 0 ? `Kolejna za ${Math.ceil(SU.cd)} s` : 'Gotowa';
      }

      for (const a of ACTIONS) {
        const el = btns[a.cd], cd = d.cd[a.cd];
        const locked = !d.unlocked;
        el.disabled = locked || cd > 0 || !s.running || !!s.over;
        el.dataset.state = locked ? 'locked' : cd > 0 ? 'cooldown' : 'ready';
        el.querySelector('.action-cd').style.transform = `scaleX(${cd > 0 ? cd / COOLDOWN[a.cd] : 0})`;
        let st = locked ? 'Wymaga wyniku badania' : cd > 0 ? `Gotowe za ${Math.ceil(cd)} s` : 'Gotowe';
        if (a.cd === 'fever' && fever) st = `Trwa jeszcze ${Math.ceil(d.feverT)} s`;
        if (s.drugs[a.cd] && s.drugs[a.cd].t > 0) st = `We krwi jeszcze ${Math.ceil(s.drugs[a.cd].t)} s`;
        el.querySelector('.action-state').textContent = st;
        const eff = 1 - b.resist[a.cd];
        const effEl = el.querySelector('.action-eff');
        const cost = C.patient.sideEffect[a.cd] || 0;
        effEl.textContent = `Dawka ${Math.round(eff * 100)}%` + (cost ? `, stan pacjenta −${cost}` : '');
        effEl.dataset.level = eff > 0.75 ? 'full' : eff > 0.45 ? 'mid' : 'low';
      }

      if (s.log.length !== logCount || (s.log.length && s.log[s.log.length - 1].t !== update._lt)) {
        logCount = s.log.length; update._lt = s.log.length ? s.log[s.log.length - 1].t : 0;
        const ul = $('log');
        ul.innerHTML = '';
        for (let i = s.log.length - 1; i >= Math.max(0, s.log.length - 14); i--) {
          const e = s.log[i];
          if (e.who === 'sys' && e.text.startsWith('Bakteria płynie')) continue; // lekarz tego nie widzi
          const li = document.createElement('li');
          li.dataset.who = e.who;
          li.innerHTML = `<time>${mmss(e.t)}</time><span>${e.text}</span>`;
          ul.appendChild(li);
        }
      }

      // HUD patogenu
      document.querySelectorAll('.js-kind-name').forEach((el) => { el.textContent = s.kind === 'virus' ? 'wirus' : 'bakteria'; });
      $('h-place').textContent = b.transit ? (b.transit.to === 'lungs' ? 'Krążenie płucne' : 'Krążenie duże') : b.place;
      $('h-hp').style.transform = `scaleX(${b.hp / C.bacteria.hp})`;
      $('h-hp-val').textContent = Math.ceil(b.hp);
      $('h-inf').style.transform = `scaleX(${b.infection / 100})`;
      $('h-inf-val').textContent = Math.floor(b.infection) + '%';
      const K = C.colony;
      const canFound = (b.contact || b.inTissue) && !b.transit && !b.dead;
      $('h-contact').hidden = !canFound;
      if (canFound) {
        const colTxt = b.colonyCd > 0 ? `Kolonia możliwa za ${Math.ceil(b.colonyCd)} s.` : b.hp > K.cost + 1 ? `E zakłada kolonię (−${K.cost} życia).` : 'Za mało życia na kolonię.';
        if (b.inTissue) {
          $('h-contact').textContent = 'W mięśniu sercowym: przeciwciała cię tu nie dosięgną, leki działają słabiej. ' + colTxt + ' Do krwi wracasz, podpływając do ściany naczynia.';
        } else if (b.burrowT > 0) {
          $('h-contact').textContent = `Wnikanie w ścianę: ${b.burrowT.toFixed(1).replace('.', ',')} s. Nie odpływaj od ściany. Q przerywa.`;
        } else {
          $('h-contact').textContent = (b.feeding ? 'Żerujesz na tkance, życie wraca. ' : 'Przy ścianie. ') + colTxt + ' Q: wnikanie w ścianę.';
        }
      }
      $('s-colonies-n').textContent = s.colonies.length;
      // pożywienie i kopie
      const food = b.food || 0, ncop = (s.copies || []).length;
      $('h-food').style.transform = `scaleX(${food / 100})`;
      $('h-food-val').textContent = Math.floor(food);
      $('s-copies-n').textContent = ncop; $('s-copies-max').textContent = C.copies.max;
      // mutacje i zdolności
      const MC = C.mutations;
      $('mut-pts').textContent = (b.points || 0).toFixed(1).replace('.', ',');
      for (const m of MUTS) {
        const lvl = (b.mut && b.mut[m.what]) || 0, max = MC[m.what].max, cost = MC.cost[lvl];
        const el = mutBtns[m.what];
        el.querySelector('.mut-lvl').textContent = '●'.repeat(lvl) + '○'.repeat(max - lvl) + (lvl < max ? `  ${cost} pkt` : '');
        el.disabled = lvl >= max || (b.points || 0) < cost;
        el.dataset.afford = !el.disabled ? '1' : '0';
      }
      const ab = [];
      if (b.hidden) ab.push(`<b>Ukryty w kolonii</b>: przeciwciała cię nie widzą. F wychodzi.`);
      else if (s.colonies.some((c) => !!c.inTissue === !!b.inTissue && Math.hypot(c.x - b.x, c.y - b.y) < C.hide.radius)) ab.push('F: ukryj się w kolonii.');
      if (food >= C.copies.cost && ncop < C.copies.max) ab.push('<b>R: rozmnóż się</b> (kopia odciąga przeciwciała).');
      if (b.mut && b.mut.toxins) ab.push(b.toxinCd > 0 ? `Toksyny za ${Math.ceil(b.toxinCd)} s.` : `T: toksyny (−${C.toxins.hpCost} życia, stan pacjenta −${C.toxins.patientDamage}, zakłócają badania).`);
      $('mut-ability').innerHTML = ab.join(' ');
      $('respawn').hidden = !(b.dead > 0);
      if (b.dead > 0) $('respawn-t').textContent = Math.ceil(b.dead);
      let stuck = 0; for (const a of s.antibodies) if (a.stuck) stuck++;
      $('s-fever').hidden = !(d.temp > 37.4);
      // leki we krwi widziane przez patogen (z rzeczywistym działaniem)
      const DN = { abxA: 'β-laktam', abxB: 'makrolid', antiviral: 'lek przeciwwirusowy' };
      const active = Object.keys(DN).filter((k) => s.drugs[k] && s.drugs[k].t > 0);
      $('s-slow').hidden = active.length === 0;
      $('s-slow').textContent = active.map((k) => `${DN[k]}: ${s.drugs[k].eff > 0.05 ? 'działa ' + Math.round(s.drugs[k].eff * 100) + '%' : 'nie działa'}`).join(', ');
      $('s-ab').hidden = stuck === 0;
      $('s-ab-n').textContent = stuck;
      $('s-ab-near').hidden = !(s.antibodies.length > stuck && stuck === 0 && s.antibodies.some(a => Math.hypot(a.x - b.x, a.y - b.y) < 12));
      const RN = { antibodies: 'przeciwciała', fever: 'gorączka', abxA: 'β-laktam', abxB: 'makrolid', antiviral: 'przeciwwirusowy' };
      const res = Object.keys(RN).filter(k => b.resist[k] > 0).map(k => `${RN[k]} ${Math.round(b.resist[k] * 100)}%`);
      $('s-res').hidden = res.length === 0;
      $('s-res').textContent = 'Oporność: ' + res.join(', ');
      $('transit').hidden = !b.transit;
      if (b.transit) $('transit-text').textContent = b.transit.to === 'lungs' ? 'Przez płuca do lewego przedsionka' : 'Przez krążenie duże do prawego przedsionka';

      // koniec gry
      const end = $('end');
      // nowa runda (czas gry się cofnął) odblokowuje ekran końcowy po zamianie ról
      if (DD.Match && s.time < (update._lastT ?? 0) - 0.5) DD.Match.suppressEnd = false;
      update._lastT = s.time;
      if (s.over && end.hidden && !(DD.Match && DD.Match.suppressEnd)) {
        end.hidden = false;
        const kn = s.kind === 'virus' ? 'wirus' : 'bakteria';
        $('end-title').textContent = s.over === 'doctor' ? 'Wygrywa lekarz' : `Wygrywa ${kn}`;
        $('end-text').textContent = s.over === 'doctor'
          ? `Zakażenie wyleczone po ${mmss(s.time)}. Patogenem był${s.kind === 'virus' ? ' wirus' : 'a bakteria'}.`
          : `Pacjent w sepsie po ${mmss(s.time)}. Patogenem był${s.kind === 'virus' ? ' wirus' : 'a bakteria'}.`;
        renderStats(s);
        if (DD.Match) DD.Match.renderEnd();
        $('end-again').focus();
      }
      if (!s.over) { end.hidden = true; if (DD.Match) DD.Match.suppressEnd = false; }
    }
    return { update };
  };
})();
