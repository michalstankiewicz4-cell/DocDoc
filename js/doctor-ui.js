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
    $('btn-test').addEventListener('click', () => DD.send({ type: 'doc.test' }));

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

    function update(s) {
      const d = s.doctor, b = s.bact;
      drawEcg(s);
      const fever = d.feverT > 0;
      $('v-hr').textContent = C.bpm;
      $('v-temp').textContent = fmt(d.temp);
      $('vital-temp').dataset.state = d.temp > 38 ? 'high' : d.temp > 37.2 ? 'warm' : 'ok';
      if (d.knownInfection == null) {
        $('v-inf').textContent = '—';
        $('v-inf-note').textContent = 'zleć badanie krwi';
      } else {
        $('v-inf').textContent = d.knownInfection + '%';
        $('v-inf-note').textContent = 'stan sprzed ' + mmss(s.time - (d.resultTime ?? s.time));
      }
      $('vital-inf').dataset.state = d.knownInfection == null ? 'unknown' : d.knownInfection > 50 ? 'high' : 'warm';
      $('clock').textContent = mmss(s.time);

      // badanie
      const tb = $('btn-test'), bar = $('test-bar');
      if (d.test.state === 'running') {
        tb.disabled = true;
        $('test-label').textContent = `Badanie w toku, wynik za ${Math.ceil(d.test.t)} s`;
        bar.style.transform = `scaleX(${1 - d.test.t / D.testDuration})`;
      } else if (d.test.cd > 0) {
        tb.disabled = true;
        $('test-label').textContent = `Kolejne badanie za ${Math.ceil(d.test.cd)} s`;
        bar.style.transform = 'scaleX(1)';
      } else {
        tb.disabled = !s.running || !!s.over;
        $('test-label').textContent = d.unlocked ? 'Powtórz badanie krwi' : 'Zleć badanie krwi';
        bar.style.transform = 'scaleX(0)';
      }

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
        effEl.textContent = `Skuteczność ${Math.round(eff * 100)}%`;
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
      $('h-contact').hidden = !b.contact || !!b.transit;
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
          ? `Bakteria zniszczona po ${mmss(s.time)}. Kolonizacja zatrzymana na ${Math.floor(b.infection)}%.`
          : `Zakażenie rozwinęło się w ${mmss(s.time)}. Bakterii zostało ${Math.ceil(b.hp)} punktów życia.`;
        $('end-again').focus();
      }
      if (!s.over) end.hidden = true;
    }
    return { update };
  };
})();
