// Sala szpitalna dla lekarza: pacjent na łóżku (oddech, kaszel, gorączka, bladość, obrzęk nóg),
// kroplówka (kapie, gdy lek jest we krwi), monitor z alarmem i laboratorium z animacją trwających badań.
// Wszystko rysowane na żywo w canvas 2D; objawy wynikają ze stanu gry, a nie ze skryptu.
(function () {
  const C = DD.CONFIG;
  const $ = (id) => document.getElementById(id);
  const lerp = (a, b, k) => a + (b - a) * k;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const mix = (a, b, k) => a.map((v, i) => lerp(v, b[i], clamp(k, 0, 1)));
  const rgb = (c) => `rgb(${c.map(Math.round).join(',')})`;

  // masa kolonii w obszarach (serce, wątroba, nerka, reszta jamy brzusznej) (liczone z kolonii — działa też u gościa)
  DD.symptomMasses = function (s) {
    const m = { right: 0, left: 0, legs: 0, liver: 0, kidney: 0, abdomen: 0 };
    for (const c of s.colonies) { if (!c.region) c.region = DD.Heart.regionOf(c.x, c.y); m[c.region] += c.size || 0; }
    return m;
  };

  DD.createPatientRoom = function () {
    const cv = $('room'), ctx = cv.getContext('2d');
    let t = 0, lastCoughs = 0, coughT = 0, breath = 0;
    const W = 720, Hh = 230;

    function resize() {
      const w = cv.clientWidth || W, pr = Math.min(2, window.devicePixelRatio || 1);
      const h = Math.round(w * Hh / W);
      if (cv.width !== Math.round(w * pr)) { cv.width = Math.round(w * pr); cv.height = Math.round(h * pr); }
      cv.style.height = h + 'px';
      return { sc: (w / W) * pr };
    }

    function symptomsOf(s, m) {
      const d = s.doctor, cond = s.patient.cond, list = [];
      if (d.temp >= 37.8) list.push(['Gorączka, poty', 'warm']);
      if (m.right > 0.35 || cond < 45) list.push(['Duszność', m.right > 0.8 || cond < 30 ? 'high' : 'warm']);
      if (m.right > 0.2) list.push(['Kaszel', 'warm']);
      if (m.left > 0.35) list.push(['Zaburzenia rytmu serca', m.left > 0.9 ? 'high' : 'warm']);
      if (m.legs > 0.25) list.push(['Obrzęk nóg', 'warm']);
      if (m.liver > 0.3) list.push(['Żółtaczka', m.liver > 0.9 ? 'high' : 'warm']);
      if (m.kidney > 0.3) list.push(['Krew w moczu', m.kidney > 0.9 ? 'high' : 'warm']);
      if (cond < 55) list.push(['Bladość', cond < 30 ? 'high' : 'warm']);
      if (cond < 25) list.push(['Sinica', 'high']);
      return list;
    }

    let lastSym = '';
    function draw(s, dt) {
      t += dt;
      const { sc } = resize();
      const d = s.doctor, cond = clamp(s.patient.cond, 0, 100), m = DD.symptomMasses(s);
      const feverK = clamp((d.temp - 37.2) / 2.4, 0, 1);
      // oddech: szybszy przy gorączce, złym stanie i koloniach w prawym sercu
      const rr = 14 + 8 * feverK + 14 * clamp((60 - cond) / 60, 0, 1) + 6 * clamp(m.right, 0, 1.2);
      breath += dt * rr / 60 * Math.PI * 2;
      const chest = Math.sin(breath);
      if (s.coughs > lastCoughs) coughT = 0.6;
      lastCoughs = s.coughs;
      coughT = Math.max(0, coughT - dt);
      const cough = coughT > 0 ? Math.sin((0.6 - coughT) / 0.6 * Math.PI * 3) * (coughT / 0.6) : 0;

      ctx.setTransform(sc, 0, 0, sc, 0, 0);
      // ściana i podłoga
      const g = ctx.createLinearGradient(0, 0, 0, Hh);
      g.addColorStop(0, '#e6eeeb'); g.addColorStop(0.78, '#dbe6e2'); g.addColorStop(0.78, '#c9d6d1'); g.addColorStop(1, '#bfcdc8');
      ctx.fillStyle = g; ctx.fillRect(0, 0, W, Hh);

      // monitor na ścianie
      const alarm = cond < 30 || d.temp >= 39;
      const flash = alarm && Math.sin(t * 8) > 0;
      ctx.fillStyle = '#26332f'; roundRect(486, 18, 112, 70, 6); ctx.fill();
      ctx.lineWidth = 3; ctx.strokeStyle = flash ? '#e0452f' : '#3b4b46'; roundRect(486, 18, 112, 70, 6); ctx.stroke();
      ctx.strokeStyle = '#4fd39a'; ctx.lineWidth = 1.5; ctx.beginPath();
      for (let x = 0; x <= 90; x++) {
        const ph = ((t * C.bpm / 60) + x / 45) % 1;
        const y = ph > 0.12 && ph < 0.16 ? (ph < 0.14 ? -14 : 5) : Math.sin(ph * 6.28) * 1.5;
        if (x === 0) ctx.moveTo(497 + x, 46 + y); else ctx.lineTo(497 + x, 46 + y);
      }
      ctx.stroke();
      ctx.fillStyle = flash ? '#ff8a78' : '#bfeedd'; ctx.font = '700 13px "Atkinson Hyperlegible", system-ui, sans-serif';
      ctx.fillText(`${C.bpm}`, 497, 78); ctx.fillText(`${d.temp.toFixed(1).replace('.', ',')}°`, 535, 78);
      ctx.fillStyle = '#7d8d88'; ctx.fillRect(538, 88, 8, 12);

      // stojak kroplówki
      const drugOn = Object.values(s.drugs || {}).some((x) => x.t > 0) || (d.cd.antibodies > C.doctor.antibodies.cooldown - 8);
      ctx.strokeStyle = '#8a9a95'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(70, 30); ctx.lineTo(70, 200); ctx.moveTo(52, 200); ctx.lineTo(88, 200); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(56, 30); ctx.lineTo(84, 30); ctx.stroke();
      ctx.fillStyle = 'rgba(210, 236, 240, 0.85)'; roundRect(60, 34, 22, 34, 4); ctx.fill();
      ctx.fillStyle = drugOn ? 'rgba(255, 210, 120, 0.85)' : 'rgba(170, 214, 222, 0.85)'; ctx.fillRect(61, 46, 20, 21);
      ctx.fillStyle = '#c8dde0'; ctx.fillRect(68, 70, 6, 12);
      if (drugOn) { const dy = (t * 2.2 % 1) * 9; ctx.fillStyle = '#e8a63a'; ctx.beginPath(); ctx.arc(71, 72 + dy, 1.6, 0, 6.283); ctx.fill(); }
      ctx.strokeStyle = 'rgba(150, 190, 200, 0.9)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(71, 82); ctx.bezierCurveTo(70, 140, 150, 150, 205, 128); ctx.stroke();

      // łóżko
      ctx.fillStyle = '#a7b5b0'; ctx.fillRect(110, 150, 320, 10); ctx.fillRect(116, 160, 6, 40); ctx.fillRect(418, 160, 6, 40);
      // worek na mocz przy łóżku: krew w moczu, gdy kolonie siedzą w nerce
      { const hem = m.kidney > 0.3 ? clamp((m.kidney - 0.3) / 0.6, 0.3, 1) : 0;
        const urine = rgb(mix([236, 214, 118], [168, 34, 36], hem));
        ctx.strokeStyle = 'rgba(200, 210, 200, 0.95)'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(300, 150); ctx.bezierCurveTo(310, 176, 336, 170, 344, 172); ctx.stroke();
        ctx.strokeStyle = urine; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(301, 152); ctx.bezierCurveTo(311, 176, 336, 170, 344, 172); ctx.stroke();
        ctx.fillStyle = '#8a9a95'; ctx.fillRect(338, 160, 26, 3);                       // wieszak na ramie łóżka
        ctx.fillStyle = 'rgba(235, 242, 240, 0.9)'; roundRect(340, 164, 22, 30, 4); ctx.fill();
        ctx.fillStyle = urine; roundRect(341, 176, 20, 17, 3); ctx.fill();
        ctx.strokeStyle = '#9fb0aa'; ctx.lineWidth = 0.8; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(343, 170 + k * 7); ctx.lineTo(348, 170 + k * 7); ctx.stroke(); } }
      ctx.fillStyle = '#7f8f8a'; ctx.fillRect(104, 112, 8, 88); ctx.fillRect(428, 128, 8, 72);
      ctx.fillStyle = '#f4f7f6'; roundRect(112, 134, 316, 20, 6); ctx.fill();
      ctx.fillStyle = '#ffffff'; roundRect(118, 118, 62, 22, 10); ctx.fill();   // poduszka

      // pacjent: skóra zależna od stanu i gorączki
      // bladość przy złym stanie, zaczerwienienie przy gorączce
      // żółtaczka: kolonie w wątrobie barwią skórę na żółto
      const jaund = m.liver > 0.3 ? clamp((m.liver - 0.3) / 0.6, 0.25, 1) : 0;
      const skin = rgb(mix(mix(mix([232, 184, 156], [214, 207, 200], (60 - cond) / 50), [240, 144, 128], feverK * 0.7), [222, 196, 96], jaund * 0.75));
      const headY = 118 - cough * 6, headX = 150 + cough * 2;
      ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(headX, headY, 17, 15, 0, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#5b4436'; ctx.beginPath(); ctx.ellipse(headX - 6, headY - 7, 13, 9, -0.3, 0, 6.283); ctx.fill();
      ctx.strokeStyle = '#6b4a3c'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(headX + 5, headY - 1); ctx.lineTo(headX + 10, headY - 1); ctx.stroke();
      if (jaund > 0) { ctx.fillStyle = `rgba(230, 200, 60, ${0.5 + jaund * 0.5})`; ctx.beginPath(); ctx.ellipse(headX + 7.5, headY + 1.6, 2.4, 1.2, 0, 0, 6.283); ctx.fill(); }   // żółte białka oczu
      ctx.strokeStyle = cond < 25 ? '#6a7fb8' : '#b56a62'; ctx.beginPath();
      if (coughT > 0 || rr > 26) ctx.ellipse(headX + 13, headY + 7, 2.5, 2 + Math.abs(cough) * 2, 0, 0, 6.283);
      else { ctx.moveTo(headX + 9, headY + 8); ctx.lineTo(headX + 14, headY + 8); }
      ctx.stroke();
      if (feverK > 0.3) {   // poty
        ctx.fillStyle = 'rgba(140, 200, 235, 0.9)';
        for (let i = 0; i < 3; i++) { const yy = headY - 10 + ((t * 0.6 + i * 0.33) % 1) * 12; ctx.beginPath(); ctx.ellipse(headX + 2 + i * 5, yy, 1.4, 2.2, 0, 0, 6.283); ctx.fill(); }
      }
      if (coughT > 0) {   // kaszel
        ctx.strokeStyle = `rgba(90, 110, 105, ${coughT / 0.6})`; ctx.lineWidth = 1.5;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(headX + 24 + i * 7, headY + 6, 3 + i * 2, -0.8, 0.8); ctx.stroke(); }
      }

      // tułów pod kołdrą (klatka unosi się z oddechem), nogi z obrzękiem
      const lift = chest * (2 + rr / 14);
      const legs = 1 + clamp(m.legs, 0, 1.2) * 0.5;
      ctx.fillStyle = '#9fc4bb';
      ctx.beginPath();
      ctx.moveTo(166, 136);
      ctx.bezierCurveTo(190, 104 - lift, 250, 104 - lift, 285, 118);
      ctx.bezierCurveTo(320, 124, 360, 122 - 6 * legs, 395, 120 - 8 * legs);
      ctx.bezierCurveTo(412, 118 - 8 * legs, 420, 128, 420, 138);
      ctx.lineTo(166, 138); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#86aea5'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(205, 120 - lift * 0.6); ctx.bezierCurveTo(240, 128, 270, 126, 300, 130); ctx.stroke();
      ctx.fillStyle = skin; ctx.beginPath(); ctx.ellipse(208, 126 - lift * 0.4, 14, 5, -0.2, 0, 6.283); ctx.fill();   // ręka z wenflonem

      // laboratorium: stół i animacje trwających badań
      ctx.fillStyle = '#c3d0cb'; ctx.fillRect(470, 150, 240, 8); ctx.fillStyle = '#a9b8b3'; ctx.fillRect(480, 158, 6, 42); ctx.fillRect(694, 158, 6, 42);
      ctx.font = '11px "Atkinson Hyperlegible", system-ui, sans-serif'; ctx.fillStyle = '#56706a';
      const T = d.tests || {};
      const prog = (k) => (T[k] && T[k].state === 'running' ? 1 - T[k].t / C.doctor.tests[k].duration : -1);
      // CRP: wirówka
      { const p = prog('crp'), x = 492, y = 132;
        ctx.fillStyle = '#e7eeeb'; roundRect(x - 16, y - 8, 32, 26, 5); ctx.fill();
        ctx.strokeStyle = '#7d8d88'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y + 4, 9, 0, 6.283); ctx.stroke();
        const a = p >= 0 ? t * 25 : 0.5;
        for (let i = 0; i < 4; i++) { const aa = a + i * Math.PI / 2; ctx.beginPath(); ctx.moveTo(x, y + 4); ctx.lineTo(x + Math.cos(aa) * 8, y + 4 + Math.sin(aa) * 8); ctx.stroke(); }
        if (p >= 0) ctx.fillText('CRP', x - 10, y + 32); }
      // mikroskop: statyw, tubus, stolik z preparatem; w czasie badania świeci lampka i obraca się pokrętło
      { const p = prog('micro'), x = 530, y = 150;
        ctx.fillStyle = '#4d5e59'; roundRect(x - 13, y - 5, 26, 5, 2); ctx.fill();                 // podstawa
        ctx.strokeStyle = '#4d5e59'; ctx.lineWidth = 4; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(x + 7, y - 5); ctx.quadraticCurveTo(x + 12, y - 22, x + 3, y - 34); ctx.stroke();   // ramię
        ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x + 2, y - 36); ctx.lineTo(x - 6, y - 24); ctx.stroke();          // tubus
        ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 3, y - 37); ctx.lineTo(x + 6, y - 42); ctx.stroke();          // okular
        ctx.lineCap = 'butt';
        ctx.fillStyle = '#6b7c77'; ctx.fillRect(x - 12, y - 17, 18, 3);                              // stolik
        ctx.fillStyle = p >= 0 ? '#e9f4ff' : '#cfd9d5'; ctx.fillRect(x - 10, y - 18.5, 12, 1.6);     // szkiełko
        if (p >= 0) {
          ctx.fillStyle = 'rgba(255, 236, 160, 0.9)'; ctx.beginPath(); ctx.arc(x - 4, y - 10, 2.2 + Math.sin(t * 8) * 0.4, 0, 6.283); ctx.fill();
          const a = t * 3; ctx.strokeStyle = '#2f3b38'; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.arc(x + 9, y - 14, 3, a, a + 4.5); ctx.stroke();
          ctx.fillStyle = '#56706a'; ctx.fillText('Mikroskop', x - 24, y + 14);
        } }
      // posiew: szalka z rosnącymi koloniami
      { const p = prog('culture'), x = 570, y = 140;
        ctx.fillStyle = '#f3e7c8'; ctx.beginPath(); ctx.ellipse(x, y, 18, 7, 0, 0, 6.283); ctx.fill();
        ctx.strokeStyle = '#c9b98f'; ctx.stroke();
        if (p >= 0) {
          const n = Math.floor(p * 14), pos = s.kind !== 'virus';
          ctx.fillStyle = '#d8d27a';
          for (let i = 0; i < (pos ? n : 0); i++) { const aa = i * 2.4, rr2 = (i % 4) * 3.5 + 2; ctx.beginPath(); ctx.ellipse(x + Math.cos(aa) * rr2 * 1.3, y + Math.sin(aa) * rr2 * 0.45, 1.6 + p, 0.8 + p * 0.4, 0, 0, 6.283); ctx.fill(); }
          ctx.fillStyle = '#56706a'; ctx.fillText('Posiew', x - 16, y + 24);
        } }
      // antybiogram: krążki ze strefami zahamowania
      { const p = prog('abg'), x = 620, y = 140;
        ctx.fillStyle = '#f0e4c4'; ctx.beginPath(); ctx.ellipse(x, y, 18, 7, 0, 0, 6.283); ctx.fill();
        if (p >= 0) {
          for (let i = 0; i < 4; i++) {
            const px = x - 10 + i * 7;
            ctx.fillStyle = `rgba(255,255,255,${0.35 + 0.3 * p})`; ctx.beginPath(); ctx.ellipse(px, y, 2 + p * 3, 1 + p * 1.2, 0, 0, 6.283); ctx.fill();
            ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(px, y, 1.4, 0.7, 0, 0, 6.283); ctx.fill();
          }
          ctx.fillStyle = '#56706a'; ctx.fillText('Antybiogram', x - 26, y + 24);
        } }
      // echo: wózek USG z ekranem + głowica na klatce pacjenta
      { const p = prog('echo'), x = 670, y = 112;
        ctx.fillStyle = '#5f6f6a'; roundRect(x - 20, y - 14, 40, 30, 4); ctx.fill();
        ctx.fillStyle = '#0d1311'; roundRect(x - 16, y - 10, 32, 22, 2); ctx.fill();
        if (p >= 0) {
          ctx.fillStyle = 'rgba(220,220,220,0.75)'; ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.arc(x, y - 8, 18, Math.PI * 0.3, Math.PI * 0.7); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#3d4a46'; roundRect(232, 104 - lift, 10, 7, 2); ctx.fill();
          ctx.strokeStyle = '#3d4a46'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(240, 104 - lift); ctx.bezierCurveTo(330, 60, 560, 70, x - 20, y); ctx.stroke();
          ctx.fillStyle = '#56706a'; ctx.fillText('Echo', x - 12, y + 30);
        } }

      // objawy (tylko gdy lista się zmieniła)
      const sym = s.running ? symptomsOf(s, m) : [];
      const key = sym.map((x) => x.join(':')).join('|');
      if (key !== lastSym) {
        lastSym = key;
        $('symptoms').innerHTML = sym.length ? sym.map(([n, lv]) => `<li data-level="${lv}">${n}</li>`).join('') : '<li data-level="ok">Bez objawów</li>';
      }
      // alarm na monitorze funkcji życiowych
      document.querySelector('.monitor').dataset.alarm = alarm && s.running ? 'on' : 'off';
    }

    function roundRect(x, y, w, h, r) {
      ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
      ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
    }
    return { draw };
  };
})();
