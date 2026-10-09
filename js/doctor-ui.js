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
    { kind: 'crp', key: 'Z', short: 'CRP', name: 'CRP', desc: 'Szybkie, przybliżone: poziom stanu zapalnego.' },
    { kind: 'culture', key: 'X', short: 'Posiew', name: 'Posiew krwi', desc: 'Dokładna kolonizacja i zdjęcie miejsca pobrania.' },
    { kind: 'echo', key: 'C', short: 'Echo', name: 'Echo serca', desc: 'Położenie i wielkość kolonii na ścianach.' },
    { kind: 'usg', key: 'G', short: 'USG', name: 'USG jamy brzusznej', desc: 'Kolonie w wątrobie, nerce i naczyniach brzucha.' },
    { kind: 'abg', key: 'V', short: 'Antybiogram', name: 'Antybiogram', desc: 'Wrażliwość na leczenie. Wymaga dodatniego posiewu.' },
    { kind: 'micro', key: 'N', short: 'Mikroskop', name: 'Mikroskop', desc: 'Próbka krwi pod mikroskopem: rodzaj bakterii albo wirusa.' }
  ];

  // ikony (obrys 24 × 24) dla pozycji menu
  const ICON = {
    antibodies: '<path d="M12 21v-8M12 13 6 6M12 13l6-7"/><circle cx="5" cy="5" r="1.6"/><circle cx="19" cy="5" r="1.6"/>',
    fever: '<path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0Z"/><path d="M12 9v7"/>',
    abxA: '<rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-35 12 12)"/><path d="m9.5 8.4 5 7.2"/>',
    abxB: '<circle cx="12" cy="12" r="7"/><path d="M5 12h14"/>',
    antiviral: '<path d="m14 4 6 6M17 7l-9 9-4 1 1-4 9-9M4 20l3-3"/><path d="m11 10 3 3"/>',
    crp: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3"/><path d="M7.5 14h9"/>',
    culture: '<ellipse cx="12" cy="13" rx="9" ry="5"/><path d="M3 13v2c0 2.8 4 5 9 5s9-2.2 9-5v-2"/><circle cx="9" cy="12" r="1"/><circle cx="14" cy="14" r="1"/>',
    echo: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
    usg: '<path d="M4 20 12 6l8 14Z"/><path d="M9 3h6v3H9z"/>',
    abg: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="2"/><circle cx="15" cy="9" r="2"/><circle cx="12" cy="16" r="2"/>',
    micro: '<path d="M6 21h12M9 21v-3h6M14 4l-4 9 3 1.5 4-9zM12 18a6 6 0 0 0 6-6"/>',
    surgery: '<path d="M3 21 14 10M14 10l3-7 4 4-7 3"/>'
  };
  const svg = (k) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICON[k] || ''}</svg>`;

  DD.createUI = function () {
    // rozwijane menu konsoli: jedno otwarte naraz, Esc i kliknięcie obok zamykają
    const menus = [...document.querySelectorAll('.menu')];
    function closeMenus(except) {
      for (const m of menus) if (m !== except) { m.querySelector('.menu-btn').setAttribute('aria-expanded', 'false'); m.querySelector('.menu-list').hidden = true; m.dataset.open = '0'; }
    }
    for (const m of menus) {
      const btn = m.querySelector('.menu-btn'), list = m.querySelector('.menu-list');
      btn.addEventListener('click', () => {
        const open = list.hidden;
        closeMenus(m);
        list.hidden = !open; btn.setAttribute('aria-expanded', String(open)); m.dataset.open = open ? '1' : '0';
      });
    }
    document.addEventListener('click', (e) => { if (!e.target.closest('.menu')) closeMenus(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenus(); });
    const pick = () => closeMenus();   // po wyborze pozycji menu się zamyka

    const actionsEl = $('actions');
    const btns = {};
    for (const a of ACTIONS) {
      const b = document.createElement('button');
      b.className = 'action'; b.id = 'act-' + a.cd; b.type = 'button'; b.setAttribute('role', 'menuitem');
      b.innerHTML = `<span class="action-cd"></span>${svg(a.cd)}<span class="action-head"><span class="action-name">${a.name}</span><kbd>${a.key}</kbd></span><span class="action-desc">${a.desc}</span><span class="action-foot"><span class="action-state"></span><span class="action-eff"></span></span>`;
      b.addEventListener('click', () => { DD.send({ type: a.cmd }); pick(); });
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
      b.className = 'surg-btn'; b.type = 'button'; b.setAttribute('role', 'menuitem');
      b.innerHTML = `${svg('surgery')}<span>Zastawka ${v.name.toLowerCase()}</span><kbd>${v.key}</kbd>`;
      b.addEventListener('click', () => { DD.send({ type: 'doc.surgery', valve: v.valve }); pick(); });
      $('surgery').appendChild(b); surgBtns[v.valve] = b;
    }

    const testBtns = {}, lampEls = {};
    for (const t of TESTS) {
      const b = document.createElement('button');
      b.className = 'test-btn'; b.id = 'test-' + t.kind; b.type = 'button'; b.setAttribute('role', 'menuitem');
      b.innerHTML = `<span class="test-bar" aria-hidden="true"><span></span></span>${svg(t.kind)}<span class="test-row"><span class="test-name">${t.name}</span><kbd>${t.key}</kbd></span><span class="test-desc">${t.desc}</span><span class="test-state"></span>`;
      b.addEventListener('click', () => { DD.send({ type: 'doc.test', kind: t.kind }); pick(); });
      $('tests').appendChild(b);
      testBtns[t.kind] = b;
      // lampka badania na konsoli (widać stan bez otwierania menu)
      const li = document.createElement('li');
      li.className = 'lamp'; li.innerHTML = `<span class="lamp-dot"></span><span class="lamp-name">${t.short || t.name}</span>`;
      $('lamps').appendChild(li); lampEls[t.kind] = li;
    }

    // obraz USG (echo serca albo jama brzuszna): wycinek wachlarza, ściany z SDF jasne, kolonie jako jasne ogniska
    function makeUS(canvas, box, w, h) {
      const H = DD.Heart, ctx0 = canvas.getContext('2d');
      let bg = null;
      return function draw(res) {
        const pr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = w * pr; canvas.height = h * pr; canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
        const ctx = ctx0; ctx.setTransform(pr, 0, 0, pr, 0, 0);
        const sc = Math.min(w / (box.maxX - box.minX), h / (box.maxY - box.minY));
        const ox = (w - (box.maxX - box.minX) * sc) / 2, oy = (h - (box.maxY - box.minY) * sc) / 2;
        const toX = (x) => ox + (x - box.minX) * sc, toY = (y) => oy + (box.maxY - y) * sc;
        if (!bg) {
          bg = document.createElement('canvas'); bg.width = w; bg.height = h;
          const b = bg.getContext('2d'), img = b.createImageData(w, h);
          for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
            const x = box.minX + (i + 0.5 - ox) / sc, y = box.maxY - (j + 0.5 - oy) / sc;
            const k = (j * w + i) * 4, speck = Math.random();
            let v = 12 + speck * 10;
            if (x >= box.minX && x <= box.maxX && y >= box.minY && y <= box.maxY) {
              const d = H.sample(x, y), o = H.organAt(x, y);
              // krew ciemna, ściany jasne (echogeniczne), miąższ narządów średnio szary, ziarno plamkowe jak w USG
              v = d < 0 ? 18 + speck * 18 : d < 1.2 ? 150 + speck * 90 : (o === 'liver' || o === 'kidney') ? 70 + speck * 60 : d < 8 ? 120 + speck * 90 - d * 6 : 30 + speck * 25;
            }
            img.data[k] = img.data[k + 1] = img.data[k + 2] = Math.max(0, Math.min(255, v)); img.data[k + 3] = 255;
          }
          b.putImageData(img, 0, 0);
        }
        ctx.fillStyle = '#000'; ctx.fillRect(0, 0, w, h);
        ctx.save();
        ctx.beginPath(); ctx.moveTo(w / 2, -30); ctx.arc(w / 2, -30, h * 1.2, Math.PI * 0.16, Math.PI * 0.84); ctx.closePath(); ctx.clip();
        ctx.drawImage(bg, 0, 0);
        for (const [x, y, size, inT] of res.colonies) {
          const px = toX(x), py = toY(y);
          const r = (inT ? 7 + size * 6 : 2.5 + size * 5) * Math.min(1.2, sc / 2);   // zgrubienie ściany: większe i bledsze
          const a = inT ? 0.45 : 1;
          const g = ctx.createRadialGradient(px, py, 0, px, py, r * 1.8);
          g.addColorStop(0, `rgba(255,255,255,${a})`); g.addColorStop(0.5, `rgba(255,255,255,${a * 0.6})`); g.addColorStop(1, 'rgba(255,255,255,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(px, py, r * 1.8, 0, 6.283); ctx.fill();
        }
        ctx.restore();
        ctx.fillStyle = 'rgba(160, 220, 255, 0.85)'; ctx.font = '11px system-ui, sans-serif';
        ctx.fillText('P', 6, 14); ctx.fillText('L', w - 14, 14);
      };
    }
    const drawEcho = makeUS($('res-echo-c'), DD.Heart.HEART_BOX, 240, 232);
    const drawUsg = makeUS($('res-usg-c'), DD.Heart.ABDOMEN_BOX, 240, 300);

    // Mikroskop: preparat (3 × 3 pola widzenia) rysowany raz na wynik; lekarz przesuwa go myszą albo strzałkami
    // i szuka patogenu. Rodzaj ujawnia się, gdy drobnoustrój trafi w środek pola widzenia.
    // Bakterie: barwienie Grama (mikroskop świetlny), wirusy: mikroskop elektronowy.
    const microC = $('res-micro-c');
    const MW = 240, MH = 200, SW = MW * 3, SH = MH * 3;
    const micro = { slide: null, res: null, px: 0, py: 0, found: false, done: false, seen: new Set(), key: null, flash: 0, start: 0, hint: false, sampleT: -1 };
    const HINT_AFTER = 15000;   // po tylu ms bez znalezienia pojawia się strzałka do najbliższego skupiska
    function rngFrom(seed) {
      let sd = (Math.floor(seed * 1000) % 2147483646) + 1;
      return () => { sd = sd * 16807 % 2147483647; return (sd - 1) / 2147483646; };
    }
    function drawOrganism(g, look, x0, y0, R) {
      const purple = '#4b1f7a', pink = '#c43a6a';
      if (look === 'staph') {
        const m = 5 + Math.floor(R() * 8);
        for (let k = 0; k < m; k++) { const a = R() * 6.283, rr = Math.sqrt(R()) * 7;
          g.fillStyle = purple; g.beginPath(); g.arc(x0 + Math.cos(a) * rr * 1.4, y0 + Math.sin(a) * rr * 1.4, 3.1, 0, 6.283); g.fill(); }
      } else if (look === 'strep') {
        let a = R() * 6.283, x = x0, y = y0; const m = 6 + Math.floor(R() * 7);
        x -= Math.cos(a) * m * 3; y -= Math.sin(a) * m * 3;
        for (let k = 0; k < m; k++) { g.fillStyle = purple; g.beginPath(); g.ellipse(x, y, 3.2, 2.7, a, 0, 6.283); g.fill(); a += (R() - 0.5) * 0.6; x += Math.cos(a) * 6.2; y += Math.sin(a) * 6.2; }
      } else if (look === 'ecoli') {
        const a = R() * 6.283;
        g.save(); g.translate(x0, y0); g.rotate(a);
        g.strokeStyle = 'rgba(196, 58, 106, 0.35)'; g.lineWidth = 0.6;
        for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(-5, 0); g.bezierCurveTo(-9, -3 + k * 3, -12, 3 - k * 2, -16, -1 + k * 2); g.stroke(); }
        g.fillStyle = pink; g.beginPath(); g.ellipse(0, 0, 7.5, 2.8, 0, 0, 6.283); g.fill();
        g.restore();
      } else if (look === 'flu') {
        const r = 11 + R() * 3, x = x0, y = y0;
        g.strokeStyle = '#2b2b29'; g.lineWidth = 1;
        for (let k = 0; k < 36; k++) { const a = k / 36 * 6.283; g.beginPath(); g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.lineTo(x + Math.cos(a) * (r + 3.2), y + Math.sin(a) * (r + 3.2)); g.stroke(); }
        g.fillStyle = '#3a3a37'; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
        g.fillStyle = '#6d6d68'; g.beginPath(); g.arc(x, y, r * 0.72, 0, 6.283); g.fill();
      } else if (look === 'coxsackie') {
        // drobne wiriony w luźnym skupisku
        for (let q = 0; q < 7; q++) {
          const x = x0 + (R() - 0.5) * 26, y = y0 + (R() - 0.5) * 26;
          g.fillStyle = '#2f2f2c'; g.beginPath();
          for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283; g[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * 3.6, y + Math.sin(a) * 3.6); }
          g.closePath(); g.fill();
        }
      } else {
        const r = 8, x = x0, y = y0;
        g.strokeStyle = '#2b2b29'; g.lineWidth = 0.8;
        for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283 + 0.3; const ex = x + Math.cos(a) * (r + 9), ey = y + Math.sin(a) * (r + 9);
          g.beginPath(); g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r); g.lineTo(ex, ey); g.stroke();
          g.fillStyle = '#2b2b29'; g.beginPath(); g.arc(ex, ey, 1.6, 0, 6.283); g.fill(); }
        g.fillStyle = '#353532'; g.beginPath();
        for (let k = 0; k < 6; k++) { const a = k / 6 * 6.283 + 0.3; g[k ? 'lineTo' : 'moveTo'](x + Math.cos(a) * r, y + Math.sin(a) * r); }
        g.closePath(); g.fill();
        g.strokeStyle = '#5c5c57'; g.lineWidth = 0.6; g.beginPath(); g.arc(x, y, r * 0.55, 0, 6.283); g.stroke();
      }
    }
    // preparat: tło, krwinki, granulocyty i skupiska drobnoustrojów poza polem startowym
    function buildSlide(res, seed) {
      const pr = Math.min(2, window.devicePixelRatio || 1);
      const c = document.createElement('canvas'); c.width = SW * pr; c.height = SH * pr;
      const g = c.getContext('2d'); g.setTransform(pr, 0, 0, pr, 0, 0);
      const R = rngFrom(seed);
      const sp = res.found ? C.species[res.species] : null;
      const em = sp && sp.kind === 'virus';
      if (!em) {
        g.fillStyle = '#f6ebe5'; g.fillRect(0, 0, SW, SH);
        for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(230, 200, 195, ${0.15 + R() * 0.2})`; g.beginPath(); g.arc(R() * SW, R() * SH, 30 + R() * 60, 0, 6.283); g.fill(); }
        for (let i = 0; i < 340; i++) {
          const x = R() * SW, y = R() * SH, r = 9 + R() * 2.5;
          g.fillStyle = 'rgba(226, 150, 150, 0.55)'; g.beginPath(); g.arc(x, y, r, 0, 6.283); g.fill();
          g.fillStyle = 'rgba(250, 225, 222, 0.7)'; g.beginPath(); g.arc(x, y, r * 0.45, 0, 6.283); g.fill();
        }
        for (let i = 0; i < 6; i++) {
          const x = 30 + R() * (SW - 60), y = 30 + R() * (SH - 60);
          g.fillStyle = 'rgba(214, 190, 220, 0.9)'; g.beginPath(); g.arc(x, y, 13, 0, 6.283); g.fill();
          g.fillStyle = '#5a3a86'; for (let k = 0; k < 3; k++) { g.beginPath(); g.ellipse(x - 5 + k * 5, y + (k % 2 ? 3 : -2), 4, 3, k, 0, 6.283); g.fill(); }
        }
      } else {
        g.fillStyle = '#9a9a96'; g.fillRect(0, 0, SW, SH);
        for (let i = 0; i < 14000; i++) { const v = 120 + R() * 70; g.fillStyle = `rgba(${v},${v},${v - 4},0.5)`; g.fillRect(R() * SW, R() * SH, 2, 2); }
      }
      // skupiska drobnoustrojów: poza środkowym polem (od którego zaczyna się oglądanie)
      const targets = [];
      const n = res.found ? Math.max(3, Math.min(8, Math.round((res.n || 4) * 0.6))) : 0;
      for (let t = 0; t < n; t++) {
        let x = 0, y = 0;
        for (let k = 0; k < 30; k++) {
          // tylko tam, gdzie środek pola widzenia może dotrzeć
          x = MW / 2 + 12 + R() * (SW - MW - 24); y = MH / 2 + 12 + R() * (SH - MH - 24);
          const inStart = Math.abs(x - SW / 2) < MW * 0.6 && Math.abs(y - SH / 2) < MH * 0.6;
          if (!inStart && targets.every((q) => Math.hypot(q.x - x, q.y - y) > 90)) break;
        }
        drawOrganism(g, res.species, x, y, R);
        targets.push({ x, y });
      }
      return { c, targets, em, pr };
    }
    function drawMicroView() {
      const S = micro.slide; if (!S) return;
      const w = MW, h = MH, pr = S.pr;
      if (microC.width !== w * pr) { microC.width = w * pr; microC.height = h * pr; microC.style.width = w + 'px'; microC.style.height = h + 'px'; }
      const g = microC.getContext('2d'); g.setTransform(pr, 0, 0, pr, 0, 0);
      const cx = w / 2, cy = h / 2, rad = Math.min(w, h) / 2 - 4;
      g.fillStyle = '#0b0d0c'; g.fillRect(0, 0, w, h);
      g.save(); g.beginPath(); g.arc(cx, cy, rad, 0, 6.283); g.clip();
      g.drawImage(S.c, micro.px * pr, micro.py * pr, w * pr, h * pr, 0, 0, w, h);
      // krzyż celownika w okularze
      g.strokeStyle = S.em ? 'rgba(255,255,255,0.35)' : 'rgba(60,30,40,0.3)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(cx - 10, cy); g.lineTo(cx + 10, cy); g.moveTo(cx, cy - 10); g.lineTo(cx, cy + 10); g.stroke();
      if (micro.flash > 0) {
        g.strokeStyle = `rgba(80, 220, 160, ${micro.flash})`; g.lineWidth = 3;
        g.beginPath(); g.arc(cx, cy, 30, 0, 6.283); g.stroke();
      }
      // podpowiedź: pulsująca strzałka przy brzegu okularu w stronę najbliższego skupiska
      if (micro.hint && !micro.found && S.targets.length) {
        const mx = micro.px + w / 2, my = micro.py + h / 2;
        let best = S.targets[0], bd = 1e9;
        for (const q of S.targets) { const dd = Math.hypot(q.x - mx, q.y - my); if (dd < bd) { bd = dd; best = q; } }
        const a = Math.atan2(best.y - my, best.x - mx), pulse = 0.5 + 0.5 * Math.sin(performance.now() / 160);
        const r0 = rad - 42 + pulse * 8;
        g.save(); g.translate(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.rotate(a); g.scale(1.8, 1.8);
        g.fillStyle = `rgba(30, 190, 130, ${0.7 + 0.3 * pulse})`; g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = 1;
        g.beginPath(); g.moveTo(12, 0); g.lineTo(-6, -9); g.lineTo(-2, 0); g.lineTo(-6, 9); g.closePath(); g.fill(); g.stroke();
        g.restore();
      }
      const v = g.createRadialGradient(cx, cy, rad * 0.75, cx, cy, rad);
      v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.45)'); g.fillStyle = v; g.fillRect(0, 0, w, h);
      g.restore();
      g.font = '10px system-ui, sans-serif'; g.textAlign = 'center';
      g.fillStyle = S.em ? 'rgba(255,255,255,0.85)' : 'rgba(40,20,30,0.75)';
      g.fillText(S.em ? 'mikroskop elektronowy' : 'barwienie Grama, ×1000', cx, h - 30);
      g.fillRect(cx - 18, h - 24, 36, 2); g.fillText(S.em ? '100 nm' : '10 µm', cx, h - 12);
      g.textAlign = 'start';
    }
    function microText() {
      const r = micro.res, sp = r && r.found && C.species[r.species];
      if (micro.found && sp) {
        $('res-micro-v').textContent = sp.name;
        $('res-micro-l').innerHTML = `<i>${sp.latin}</i>. ${sp.micro} <b>${sp.treat}</b>`;
      } else if (micro.done) {
        $('res-micro-v').textContent = 'Brak drobnoustrojów w próbce';
        $('res-micro-l').textContent = 'Przeszukano preparat. Patogen nie płynął we krwi w chwili pobrania (mógł być w mięśniu albo ukryty).';
      } else {
        $('res-micro-v').textContent = 'Szukaj patogenu';
        $('res-micro-l').textContent = 'Przesuwaj preparat myszą albo strzałkami (po kliknięciu w obraz), aż drobnoustrój znajdzie się w środku pola widzenia.';
      }
    }
    // po każdym przesunięciu: czy w środku jest drobnoustrój, ile preparatu już obejrzano
    function microCheck() {
      const S = micro.slide; if (!S) return;
      const mx = micro.px + MW / 2, my = micro.py + MH / 2;
      // obejrzane pola: siatka 5 × 4 na obszarze, który może zająć środek okularu
      micro.seen.add(Math.min(4, Math.floor((mx - MW / 2) / ((SW - MW) / 5))) + ',' + Math.min(3, Math.floor((my - MH / 2) / ((SH - MH) / 4))));
      if (!micro.found && S.targets.some((q) => Math.hypot(q.x - mx, q.y - my) < 34)) { micro.found = true; micro.flash = 1; microText(); }
      if (!micro.found && !micro.done && !S.targets.length && micro.seen.size >= 16) { micro.done = true; microText(); }
    }
    function microPan(dx, dy) {
      micro.px = Math.max(0, Math.min(SW - MW, micro.px + dx));
      micro.py = Math.max(0, Math.min(SH - MH, micro.py + dy));
      microCheck(); drawMicroView();
    }
    DD.microDebug = micro;
    DD.microPan = (dx, dy) => microPan(dx, dy);
    function showMicro(res, seed, sampleT) {
      const key = seed;
      if (micro.key === key) return;
      micro.key = key; micro.res = res;
      micro.slide = buildSlide(res, seed);
      micro.px = (SW - MW) / 2; micro.py = (SH - MH) / 2;
      micro.found = false; micro.done = false; micro.seen = new Set(); micro.flash = 0;
      micro.start = performance.now(); micro.hint = false; micro.sampleT = sampleT;
      microCheck(); microText(); drawMicroView();
    }
    {
      let drag = null;
      microC.addEventListener('pointerdown', (e) => { drag = { x: e.clientX, y: e.clientY }; microC.setPointerCapture(e.pointerId); microC.focus(); });
      microC.addEventListener('pointermove', (e) => { if (!drag) return; microPan(drag.x - e.clientX, drag.y - e.clientY); drag = { x: e.clientX, y: e.clientY }; });
      const end = () => { drag = null; };
      microC.addEventListener('pointerup', end); microC.addEventListener('pointercancel', end);
      microC.addEventListener('keydown', (e) => {
        const st = 24, k = { ArrowLeft: [-st, 0], ArrowRight: [st, 0], ArrowUp: [0, -st], ArrowDown: [0, st] }[e.key];
        if (k) { e.preventDefault(); e.stopPropagation(); microPan(k[0], k[1]); }
      });
      // co 50 ms: wygaszanie pierścienia, podpowiedź po dłuższym szukaniu, zdjęcie patogenu dopiero po znalezieniu
      setInterval(() => {
        if (!micro.slide) return;
        let redraw = false;
        if (micro.flash > 0) { micro.flash = Math.max(0, micro.flash - 0.08); redraw = true; }
        if (!micro.found && micro.slide.targets.length && !$('res-micro').hidden) {
          if (!micro.hint && performance.now() - micro.start > HINT_AFTER) micro.hint = true;
          if (micro.hint) redraw = true;
        }
        if (redraw) drawMicroView();
        const fig = $('test-photo');
        const show = micro.found && fig.dataset.ready === String(micro.sampleT);
        if (fig.hidden === show) fig.hidden = !show;
      }, 50);
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
      // gdy serce zwalnia, załamki maleją; po zatrzymaniu zapis biegnie dalej jako linia płaska
      const amp = Math.min(1, (s.hr ?? 1) * 1.5);
      for (let i = 1; i <= steps; i++) {
        const p = (lastPhase + (ph - lastPhase) * i / steps) % 1;
        trace[head] = ecgValue(p) * amp; head = (head + 1) % trace.length;
      }
      if ((s.hr ?? 1) < 0.3 && s.running) for (let i = 0; i < 2; i++) { trace[head] = 0; head = (head + 1) % trace.length; }
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
      // drukarka: nowy wydruk wysuwa się na górę stosu
      const anyPrint = !!(T.crp.res || T.culture.res || T.echo.res || T.abg.res || (T.usg && T.usg.res));
      $('print-empty').hidden = anyPrint;
      const slips = document.querySelector('.slips');
      for (const k of ['crp', 'culture', 'echo', 'usg', 'abg']) {
        const R = T[k]; if (!R || !R.res) continue;
        const el = $('res-' + k);
        if (el.dataset.t !== String(R.resultT)) {
          el.dataset.t = String(R.resultT);
          slips.prepend(el);
          el.classList.remove('printing'); void el.offsetWidth; el.classList.add('printing');
          const led = $('print-led'); led.classList.remove('on'); void led.offsetWidth; led.classList.add('on');
        }
      }
      if (T.micro && T.micro.res) {
        $('res-micro').hidden = false; $('res-micro').querySelector('.res-time').textContent = 'pobranie ' + mmss(T.micro.sampleT);
        showMicro(T.micro.res, T.micro.sampleT + 1, T.micro.sampleT);
      } else $('res-micro').hidden = true;
      const time = (el, t) => { el.querySelector('.res-time').textContent = 'pobranie ' + mmss(t.sampleT); };
      if (T.usg && T.usg.res) {
        $('res-usg').hidden = false; time($('res-usg'), T.usg);
        drawUsg(T.usg.res);
        const C0 = T.usg.res.colonies, nL = C0.filter((c) => c[4] === 'liver').length, nK = C0.filter((c) => c[4] === 'kidney').length, nO = C0.length - nL - nK;
        $('res-usg-l').textContent = C0.length ? `Ogniska w wątrobie: ${nL}, w nerce: ${nK}, w naczyniach brzucha: ${nO}` : 'Bez widocznych zmian';
      } else $('res-usg').hidden = true;
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

    // film na koniec rundy: media/doctor.mp4 (wygrał lekarz) albo media/priest.mp4 (wygrał patogen)
    const endFilm = (function () {
      const box = $('end-film'), vid = $('end-film-v');
      let forStats = null, st = 'none';
      function finish() { if (st !== 'playing') return; st = 'done'; vid.pause(); box.hidden = true; }
      vid.addEventListener('ended', finish);
      vid.addEventListener('error', finish);
      $('end-film-skip').addEventListener('click', finish);
      return {
        state(s) { if (forStats !== s.stats) { forStats = s.stats; st = 'none'; } return st; },
        play(s) {
          st = 'playing'; box.hidden = false;
          const name = s.over === 'doctor' ? 'doctor' : 'priest';
          // WebM (VP9) dla przeglądarek bez H.264, MP4 dla pozostałych
          vid.src = vid.canPlayType('video/webm; codecs="vp9, opus"') ? `media/${name}.webm` : `media/${name}.mp4`;
          vid.currentTime = 0; vid.muted = !(DD.Audio && DD.Audio.on);
          // dźwięk wymaga wcześniejszego gestu gracza; gdy przeglądarka odmówi, gramy bez dźwięku
          vid.play().catch(() => { vid.muted = true; vid.play().catch(finish); });
          setTimeout(finish, 9000);   // zabezpieczenie, gdyby film się nie skończył
        },
        reset() { if (st === 'playing') { vid.pause(); box.hidden = true; } st = 'none'; forStats = null; }
      };
    })();
    const spLabel = (s) => { const sp = C.species[s.species]; return sp ? `${sp.name.charAt(0).toLowerCase() + sp.name.slice(1)} (${sp.latin})` : (s.kind === 'virus' ? 'wirus' : 'bakteria'); };
    function update(s) {
      const d = s.doctor, b = s.bact;
      drawEcg(s);
      const fever = d.feverT > 0;
      $('v-hr').textContent = Math.round(C.bpm * (s.hr ?? 1));
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
        // lampka: zielona = gotowe, bursztynowa = w toku, szara = odnowienie / zablokowane
        const lamp = lampEls[t.kind];
        if (lamp && lamp.dataset.state !== el.dataset.state) lamp.dataset.state = el.dataset.state;
      }
      { // podsumowania na przyciskach menu
        const run = TESTS.filter((t) => d.tests[t.kind].state === 'running').length;
        const rdy = TESTS.filter((t) => testBtns[t.kind].dataset.state === 'ready').length;
        const ts = run ? `${run} w toku` : `${rdy} gotowe`;
        if ($('sum-tests').textContent !== ts) $('sum-tests').textContent = ts;
        const ar = ACTIONS.filter((a) => btns[a.cd].dataset.state === 'ready').length;
        const as = !d.unlocked ? 'po pierwszym wyniku' : `${ar} gotowe`;
        if ($('sum-actions').textContent !== as) $('sum-actions').textContent = as;
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
      { const sp = C.species[s.species]; const nm = sp ? sp.name.charAt(0).toLowerCase() + sp.name.slice(1) : (s.kind === 'virus' ? 'wirus' : 'bakteria');
        document.querySelectorAll('.js-kind-name').forEach((el) => { if (el.textContent !== nm) el.textContent = nm; }); }
      $('h-place').textContent = b.transit ? (DD.Heart.ROUTES[b.transit.to] || DD.Heart.ROUTES.body).name : b.place;
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
          $('h-contact').textContent = 'W mięśniu sercowym: przeciwciała cię tu nie dosięgną, leki działają słabiej. ' + colTxt + ' Do krwi wracasz, podpływając do ściany naczynia albo klawiszem Q.';
        } else if (b.burrowT > 0) {
          $('h-contact').textContent = `Wnikanie w ścianę: ${b.burrowT.toFixed(1).replace('.', ',')} s. Nie odpływaj od ściany. Q przerywa.`;
        } else {
          $('h-contact').textContent = (b.feeding ? 'Żerujesz na tkance, życie wraca. ' : 'Przy ścianie. ') + colTxt + (DD.Heart.organAt(b.x, b.y) === 'heart' ? ' Q: wnikanie w ścianę.' : '');
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
      if (b.transit) $('transit-text').textContent = (DD.Heart.ROUTES[b.transit.to] || DD.Heart.ROUTES.body).text;

      // koniec gry
      const end = $('end');
      // nowa runda (czas gry się cofnął) odblokowuje ekran końcowy po zamianie ról
      if (DD.Match && s.time < (update._lastT ?? 0) - 0.5) DD.Match.suppressEnd = false;
      update._lastT = s.time;
      // po zwycięstwie: najpierw film (lekarz albo ksiądz), potem ekran końcowy
      if (s.over && end.hidden && !(DD.Match && DD.Match.suppressEnd) && endFilm.state(s) !== 'done') {
        if (endFilm.state(s) === 'none') endFilm.play(s);
      } else if (s.over && end.hidden && !(DD.Match && DD.Match.suppressEnd)) {
        end.hidden = false;
        const kn = s.kind === 'virus' ? 'wirus' : 'bakteria';
        $('end-title').textContent = s.over === 'doctor' ? 'Wygrywa lekarz' : `Wygrywa ${kn}`;
        $('end-text').textContent = s.over === 'doctor'
          ? `Zakażenie wyleczone po ${mmss(s.time)}. Patogen: ${spLabel(s)}.`
          : `Pacjent w sepsie po ${mmss(s.time)}. Patogen: ${spLabel(s)}.`;
        renderStats(s);
        if (DD.Match) DD.Match.renderEnd();
        $('end-again').focus();
      }
      if (!s.over) { end.hidden = true; endFilm.reset(); if (DD.Match) DD.Match.suppressEnd = false; }
    }
    return { update };
  };
})();
