// Panel lekarza (prawa połowa) i HUD bakterii (lewa połowa).
// UI tylko czyta stan i wysyła komendy — nie zmienia stanu bezpośrednio.
(function () {
  const C = DD.CONFIG, D = C.doctor;
  const $ = (id) => document.getElementById(id);

  const ACTIONS = [
    { cmd: 'doc.antibodies', key: '1', cd: 'antibodies', name: 'Przeciwciała', desc: 'Immunoglobuliny we krwi. Szukają bakterii i przyklejają się do niej.' },
    { cmd: 'doc.fever',      key: '2', cd: 'fever',      name: 'Gorączka',     desc: 'Temperatura do 39,6 °C. Osłabia bakterię i spowalnia kolonizację.' },
    { cmd: 'doc.slow',       key: '3', cd: 'slow',       name: 'Antybiotyk',   desc: 'Wlew bakteriostatyczny. Bakteria porusza się wolniej.' }
  ];
  const COOLDOWN = { antibodies: D.antibodies.cooldown, fever: D.fever.cooldown, slow: D.slow.cooldown };
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
      for (const [x, y, size] of res.colonies) {
        const px = (x - W.minX) / (W.maxX - W.minX) * w, py = (W.maxY - y) / (W.maxY - W.minY) * h;
        const r = 2.5 + size * 5;
        const g = ctx.createRadialGradient(px, py, 0, px, py, r * 1.8);
        g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.5, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, r * 1.8, 0, 6.283); ctx.fill();
      }
      ctx.restore();
      ctx.fillStyle = 'rgba(160, 220, 255, 0.85)'; ctx.font = '11px system-ui, sans-serif';
      ctx.fillText('P', 6, 14); ctx.fillText('L', w - 14, 14);
    }

    // EKG
    const ecg = $('ecg'), ctx = ecg.getContext('2d');
    const trace = new Float32Array(400); let head = 0, lastPhase = 0;
    function ecgValue(ph) {
      const g = (c, w, a) => a * Math.exp(-((ph - c) * (ph - c)) / (2 * w * w));
      return g(0.03, 0.018, 0.12) + g(0.125, 0.006, -0.12) + g(0.14, 0.007, 1.0) + g(0.155, 0.007, -0.28) + g(0.38, 0.04, 0.26);
    }
    function drawEcg(s) {
      const w = ecg.clientWidth, h = ecg.clientHeight, pr = window.devicePixelRatio || 1;
      if (ecg.width !== Math.round(w * pr)) { ecg.width = Math.round(w * pr); ecg.height = Math.round(h * pr); }
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
          ['Podane antybiotyki', String(used.slow || 0)],
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
        $('res-culture-v').textContent = r.positive ? `Dodatni, kolonizacja ${r.infection}%` : 'Ujemny';
      } else $('res-culture').hidden = true;
      if (T.echo.res) {
        $('res-echo').hidden = false; time($('res-echo'), T.echo);
        drawEcho(T.echo.res);
        const n = T.echo.res.colonies.length;
        $('res-echo-l').textContent = n ? `Ogniska na ścianach: ${n}` : 'Bez widocznych zmian';
      } else $('res-echo').hidden = true;
      if (T.abg.res) {
        $('res-abg').hidden = false; time($('res-abg'), T.abg);
        const lbl = (r) => r < 0.2 ? ['wrażliwa', 'ok'] : r < 0.5 ? ['średnio wrażliwa', 'warm'] : ['oporna', 'high'];
        const rows = [['Przeciwciała', T.abg.res.antibodies], ['Gorączka', T.abg.res.fever], ['Antybiotyk', T.abg.res.slow]];
        $('res-abg-l').innerHTML = rows.map(([k, r]) => { const [t, c] = lbl(r); return `<div><dt>${k}</dt><dd data-state="${c}">${t}, skuteczność ${Math.round((1 - r) * 100)}%</dd></div>`; }).join('');
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

      for (const a of ACTIONS) {
        const el = btns[a.cd], cd = d.cd[a.cd];
        const locked = !d.unlocked;
        el.disabled = locked || cd > 0 || !s.running || !!s.over;
        el.dataset.state = locked ? 'locked' : cd > 0 ? 'cooldown' : 'ready';
        el.querySelector('.action-cd').style.transform = `scaleX(${cd > 0 ? cd / COOLDOWN[a.cd] : 0})`;
        let st = locked ? 'Wymaga wyniku badania' : cd > 0 ? `Gotowe za ${Math.ceil(cd)} s` : 'Gotowe';
        if (a.cd === 'fever' && fever) st = `Trwa jeszcze ${Math.ceil(d.feverT)} s`;
        if (a.cd === 'slow' && b.slowT > 0) st = `Działa jeszcze ${Math.ceil(b.slowT)} s`;
        el.querySelector('.action-state').textContent = st;
        const eff = 1 - b.resist[a.cd];
        const effEl = el.querySelector('.action-eff');
        const cost = C.patient.sideEffect[a.cd] || 0;
        effEl.textContent = `Skuteczność ${Math.round(eff * 100)}%` + (cost ? `, stan pacjenta −${cost}` : '');
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

      // HUD bakterii
      $('h-place').textContent = b.transit ? (b.transit.to === 'lungs' ? 'Krążenie płucne' : 'Krążenie duże') : b.place;
      $('h-hp').style.transform = `scaleX(${b.hp / C.bacteria.hp})`;
      $('h-hp-val').textContent = Math.ceil(b.hp);
      $('h-inf').style.transform = `scaleX(${b.infection / 100})`;
      $('h-inf-val').textContent = Math.floor(b.infection) + '%';
      const K = C.colony;
      const canFound = b.contact && !b.transit && !b.dead;
      $('h-contact').hidden = !canFound;
      if (canFound) {
        $('h-contact').textContent = (b.feeding ? 'Żerujesz na tkance, życie wraca. ' : 'Przy ścianie. ')
          + (b.colonyCd > 0 ? `Kolonia możliwa za ${Math.ceil(b.colonyCd)} s.` : b.hp > K.cost + 1 ? `E zakłada kolonię (−${K.cost} życia).` : 'Za mało życia na kolonię.');
      }
      $('s-colonies-n').textContent = s.colonies.length;
      $('respawn').hidden = !(b.dead > 0);
      if (b.dead > 0) $('respawn-t').textContent = Math.ceil(b.dead);
      let stuck = 0; for (const a of s.antibodies) if (a.stuck) stuck++;
      $('s-fever').hidden = !(d.temp > 37.4);
      $('s-slow').hidden = !(b.slowT > 0);
      $('s-ab').hidden = stuck === 0;
      $('s-ab-n').textContent = stuck;
      $('s-ab-near').hidden = !(s.antibodies.length > stuck && stuck === 0 && s.antibodies.some(a => Math.hypot(a.x - b.x, a.y - b.y) < 12));
      const RN = { antibodies: 'przeciwciała', fever: 'gorączka', slow: 'antybiotyk' };
      const res = Object.keys(RN).filter(k => b.resist[k] > 0).map(k => `${RN[k]} ${Math.round(b.resist[k] * 100)}%`);
      $('s-res').hidden = res.length === 0;
      $('s-res').textContent = 'Oporność: ' + res.join(', ');
      $('transit').hidden = !b.transit;
      if (b.transit) $('transit-text').textContent = b.transit.to === 'lungs' ? 'Przez płuca do lewego przedsionka' : 'Przez krążenie duże do prawego przedsionka';

      // koniec gry
      const end = $('end');
      if (s.over && end.hidden) {
        end.hidden = false;
        $('end-title').textContent = s.over === 'doctor' ? 'Wygrywa lekarz' : 'Wygrywa bakteria';
        $('end-text').textContent = s.over === 'doctor'
          ? `Zakażenie wyleczone po ${mmss(s.time)}: nie ma ani bakterii, ani kolonii.`
          : `Pacjent w sepsie po ${mmss(s.time)}. Bakterii zostało ${Math.ceil(b.hp)} punktów życia.`;
        renderStats(s);
        $('end-again').focus();
      }
      if (!s.over) end.hidden = true;
    }
    return { update };
  };
})();
