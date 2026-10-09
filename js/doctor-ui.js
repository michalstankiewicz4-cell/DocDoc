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
    { cmd: 'doc.antiviral',  key: '5', cd: 'antiviral',  name: 'Lek przeciwwirusowy',    desc: 'Hamuje namnażanie wirusa i go osłabia. Nie działa na bakterie.' },
    { cmd: 'doc.antifungal', key: 'Y', cd: 'antifungal', name: 'Lek przeciwgrzybiczy',   desc: 'Niszczy grzyby i kurczy grzybnię, wstrzymuje strzępki. Nie działa na bakterie ani wirusy.' },
    { cmd: 'doc.chemo',      key: '',  cd: 'chemo',      name: 'Chemioterapia',          desc: 'Cały organizm: niszczy komórki nowotworowe i kurczy guzy. Mocno obciąża pacjenta. Na drobnoustroje nie działa.' }
  ];
  const COOLDOWN = { antibodies: D.antibodies.cooldown, fever: D.fever.cooldown, abxA: D.abxA.cooldown, abxB: D.abxB.cooldown, antiviral: D.antiviral.cooldown, antifungal: D.antifungal.cooldown, chemo: D.chemo.cooldown };
  const TESTS = [
    { kind: 'crp', key: 'Z', short: 'CRP', name: 'CRP', desc: 'Szybkie, przybliżone: poziom stanu zapalnego.' },
    { kind: 'culture', key: 'X', short: 'Posiew', name: 'Posiew krwi', desc: 'Dokładna kolonizacja i zdjęcie miejsca pobrania.' },
    { kind: 'echo', key: 'C', short: 'Echo', name: 'Echo serca', desc: 'Położenie i wielkość kolonii na ścianach.' },
    { kind: 'usg', key: 'G', short: 'USG', name: 'USG jamy brzusznej', desc: 'Kolonie w wątrobie, nerce i naczyniach brzucha.' },
    { kind: 'abg', key: 'V', short: 'Antybiogram', name: 'Antybiogram', desc: 'Wrażliwość na leczenie. Wymaga dodatniego posiewu.' },
    { kind: 'micro', key: 'N', short: 'Mikroskop', name: 'Mikroskop', desc: 'Próbka krwi pod mikroskopem: rodzaj bakterii albo wirusa.' },
    { kind: 'cbc', key: 'U', short: 'Morfologia', name: 'Morfologia krwi', desc: 'Leukocyty i rozmaz: przewaga neutrofili (bakteria) albo limfocytów (wirus).' },
    { kind: 'pcr', key: 'I', short: 'PCR', name: 'PCR', desc: 'Materiał genetyczny patogenu we krwi: rodzaj bez szukania pod mikroskopem. Długo trwa.' },
    { kind: 'urine', key: 'O', short: 'Mocz', name: 'Badanie moczu', desc: 'Krwinki czerwone i bakterie w moczu: kolonie w nerce.' },
    { kind: 'ct', key: 'P', short: 'Tomografia', name: 'Tomografia komputerowa', desc: 'Całe ciało: dokładne położenie ognisk, także w mięśniu serca. Długie odnowienie.' },
    { kind: 'markers', key: '', short: 'Markery', name: 'Markery nowotworowe', desc: 'Białka wydzielane przez guzy: rosną z masą nowotworu. Norma poniżej 5 ng/ml.' },
    { kind: 'xray', key: '', short: 'RTG', name: 'RTG klatki piersiowej', desc: 'Szybkie, mało dokładne: powiększone serce i guzki w płucach (ogniska prawego serca).' },
    { kind: 'mri', key: '', short: 'Rezonans', name: 'Rezonans magnetyczny', desc: 'Całe ciało jak tomografia, do tego wielkość każdego ogniska (etap guza). Najdłuższe.' },
    { kind: 'biopsy', key: '', short: 'Biopsja', name: 'Biopsja', desc: 'Wycinek z narządu: co jest w tkance (ropień, zapalenie wirusowe, grzyb, rak). Stan pacjenta −3.', regions: [['heart', 'Serce'], ['liver', 'Wątroba'], ['kidney', 'Nerka']] }
  ];

  // ikony (obrys 24 × 24) dla pozycji menu
  const ICON = {
    antibodies: '<path d="M12 21v-8M12 13 6 6M12 13l6-7"/><circle cx="5" cy="5" r="1.6"/><circle cx="19" cy="5" r="1.6"/>',
    fever: '<path d="M10 14V5a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0Z"/><path d="M12 9v7"/>',
    abxA: '<rect x="3" y="9" width="18" height="6" rx="3" transform="rotate(-35 12 12)"/><path d="m9.5 8.4 5 7.2"/>',
    abxB: '<circle cx="12" cy="12" r="7"/><path d="M5 12h14"/>',
    antiviral: '<path d="m14 4 6 6M17 7l-9 9-4 1 1-4 9-9M4 20l3-3"/><path d="m11 10 3 3"/>',
    antifungal: '<path d="M4 12a8 5 0 0 1 16 0Z"/><path d="M10 12v7a2 2 0 0 0 4 0v-7"/>',
    chemo: '<path d="M8 3h8M9 3v4l-4 7a5 5 0 0 0 4.3 7.5h5.4A5 5 0 0 0 19 14l-4-7V3"/><path d="M8 14h8M10 17.5h4"/>',
    radio: '<circle cx="12" cy="12" r="2"/><path d="M12 10 9 4.8A8 8 0 0 0 4 12h6M14 12h6a8 8 0 0 0-5-7.2L12 10M11 13.7l-3 5.2a8 8 0 0 0 8 0l-3-5.2"/>',
    crp: '<path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3"/><path d="M7.5 14h9"/>',
    culture: '<ellipse cx="12" cy="13" rx="9" ry="5"/><path d="M3 13v2c0 2.8 4 5 9 5s9-2.2 9-5v-2"/><circle cx="9" cy="12" r="1"/><circle cx="14" cy="14" r="1"/>',
    echo: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z"/>',
    usg: '<path d="M4 20 12 6l8 14Z"/><path d="M9 3h6v3H9z"/>',
    abg: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="2"/><circle cx="15" cy="9" r="2"/><circle cx="12" cy="16" r="2"/>',
    micro: '<path d="M6 21h12M9 21v-3h6M14 4l-4 9 3 1.5 4-9zM12 18a6 6 0 0 0 6-6"/>',
    surgery: '<path d="M3 21 14 10M14 10l3-7 4 4-7 3"/>',
    cbc: '<path d="M8 3v13a4 4 0 0 0 8 0V3"/><path d="M7 3h10M8 11h8"/>',
    pcr: '<path d="M8 3c0 4 8 5 8 9s-8 5-8 9M16 3c0 4-8 5-8 9s8 5 8 9M9 7h6M9 17h6"/>',
    urine: '<path d="M7 4h10l-1 16H8z"/><path d="M7.4 10h9.2"/>',
    ct: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M3 20h18"/>',
    markers: '<path d="M4 20V10M9 20V6M14 20v-8M19 20V4"/><path d="M3 20h18"/>',
    xray: '<path d="M12 3v18M7 7c-3 1-4 4-4 7M17 7c3 1 4 4 4 7M8 10c-2 .5-3 2-3 4M16 10c2 .5 3 2 3 4M8 13c-1 .4-1.5 1.2-1.5 2.4M16 13c1 .4 1.5 1.2 1.5 2.4"/>',
    mri: '<rect x="2" y="5" width="20" height="14" rx="7"/><circle cx="12" cy="12" r="3.5"/><path d="M2 12h6.5M15.5 12H22"/>',
    biopsy: '<path d="M3 21l6-6M9 15l9-9 3 3-9 9zM14 6l4 4"/>'
  };
  const svg = (k) => `<svg class="ico" viewBox="0 0 24 24" aria-hidden="true">${ICON[k] || ''}</svg>`;
  // dla wiki lekarza (js/wiki.js)
  DD.DOC_ACTIONS = ACTIONS; DD.DOC_TESTS = TESTS; DD.docIcon = svg;

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
      b.innerHTML = `<span class="action-cd"></span>${svg(a.cd)}<span class="action-head"><span class="action-name">${a.name}</span>${a.key ? `<kbd>${a.key}</kbd>` : ''}</span><span class="action-desc">${a.desc}</span><span class="action-foot"><span class="action-state"></span><span class="action-eff"></span></span>`;
      b.addEventListener('click', () => { DD.send({ type: a.cmd }); pick(); });
      actionsEl.appendChild(b);
      btns[a.cd] = b;
    }
    // panel mutacji patogenu
    const MUTS = [
      { what: 'speed', key: '7', name: 'Szybkość' },
      { what: 'fever', key: '8', name: 'Odporność na gorączkę' },
      { what: 'capsule', key: '9', name: 'Otoczka (przeciwciała)' },
      { what: 'toxins', key: '0', name: 'Toksyny' },
      { what: 'mask', key: '6', name: 'Maskowanie objawów' }
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

    // radioterapia: przycisk na każdy obszar (w menu zabiegów)
    const RADIO = [{ region: 'heart', name: 'Serce' }, { region: 'liver', name: 'Wątroba' }, { region: 'kidney', name: 'Nerka' }];
    const radioBtns = {};
    for (const r of RADIO) {
      const b = document.createElement('button');
      b.className = 'surg-btn'; b.type = 'button'; b.setAttribute('role', 'menuitem');
      b.innerHTML = `${svg('radio')}<span>Radioterapia: ${r.name.toLowerCase()}</span>`;
      b.addEventListener('click', () => { DD.send({ type: 'doc.radio', region: r.region }); pick(); });
      $('radio').appendChild(b); radioBtns[r.region] = b;
    }

    // przeszczep narządu i amputacja (raz na rundę każdy)
    const PROC = [{ what: 'liver', name: 'Przeszczep wątroby' }, { what: 'kidney', name: 'Przeszczep nerki' }, { what: 'legs', name: 'Amputacja nóg' }];
    const procBtns = {};
    for (const p of PROC) {
      const b = document.createElement('button');
      b.className = 'surg-btn'; b.type = 'button'; b.setAttribute('role', 'menuitem');
      b.innerHTML = `${svg('surgery')}<span>${p.name}</span>`;
      b.addEventListener('click', () => { DD.send({ type: 'doc.proc', what: p.what }); pick(); });
      $('procs').appendChild(b); procBtns[p.what] = b;
    }

    const testBtns = {}, lampEls = {};
    for (const t of TESTS) {
      const b = document.createElement('button');
      b.className = 'test-btn'; b.id = 'test-' + t.kind; b.type = 'button'; b.setAttribute('role', 'menuitem');
      b.innerHTML = `<span class="test-bar" aria-hidden="true"><span></span></span>${svg(t.kind)}<span class="test-row"><span class="test-name">${t.name}</span>${t.key ? `<kbd>${t.key}</kbd>` : ''}</span><span class="test-desc">${t.desc}</span>`
        + (t.regions ? `<span class="test-regions">${t.regions.map(([r, n]) => `<span class="test-region" role="button" tabindex="0" data-region="${r}">${n}</span>`).join('')}</span>` : '')
        + '<span class="test-state"></span>';
      // biopsja: wybór narządu przyciskiem w pozycji menu
      b.addEventListener('click', (e) => {
        if (t.regions) { const r = e.target.closest('[data-region]'); if (!r) return; DD.send({ type: 'doc.test', kind: t.kind, region: r.dataset.region }); pick(); return; }
        DD.send({ type: 'doc.test', kind: t.kind }); pick();
      });
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

    // tomografia i rezonans: przekrój całego ciała (świat gry) w skali szarości, ogniska z dokładnym położeniem.
    // Rezonans: krew ciemna (brak sygnału z płynącej krwi), tkanki jasne, ognisko z pierścieniem wielkości.
    function makeBody(canvasId, mode) {
      const canvas = $(canvasId), W0 = DD.CONFIG.world, w = 180, h = 380;
      const box = { minX: W0.minX, maxX: W0.maxX, minY: W0.minY, maxY: W0.maxY };
      let bg = null;
      return function draw(res) {
        const H = DD.Heart, pr = Math.min(2, window.devicePixelRatio || 1);
        canvas.width = w * pr; canvas.height = h * pr; canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
        const ctx = canvas.getContext('2d'); ctx.setTransform(pr, 0, 0, pr, 0, 0);
        const sc = Math.min(w / (box.maxX - box.minX), h / (box.maxY - box.minY));
        const ox = (w - (box.maxX - box.minX) * sc) / 2, oy = (h - (box.maxY - box.minY) * sc) / 2;
        const toX = (x) => ox + (x - box.minX) * sc, toY = (y) => oy + (box.maxY - y) * sc;
        if (!bg) {
          bg = document.createElement('canvas'); bg.width = w; bg.height = h;
          const b = bg.getContext('2d'), img = b.createImageData(w, h);
          for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
            const x = box.minX + (i + 0.5 - ox) / sc, y = box.maxY - (j + 0.5 - oy) / sc, k = (j * w + i) * 4;
            let v = 6;
            if (x >= box.minX && x <= box.maxX && y >= box.minY && y <= box.maxY) {
              const d = H.sample(x, y), o = H.organAt(x, y), n = Math.random() * 6;
              const organ = o === 'liver' || o === 'kidney';
              v = mode === 'mri'
                ? (d < 0 ? 18 + n : d < 1.2 ? 120 + n : organ ? 175 + n : d < 7 ? 150 + n - d * 4 : 90 + n)
                : (d < 0 ? 205 + n : d < 1.2 ? 150 + n : organ ? 112 + n : d < 7 ? 92 + n - d * 3 : 46 + n);
            }
            img.data[k] = img.data[k + 1] = img.data[k + 2] = Math.max(0, Math.min(255, v)); img.data[k + 3] = 255;
          }
          b.putImageData(img, 0, 0);
        }
        ctx.drawImage(bg, 0, 0);
        for (const [x, y, size, inT] of res.colonies) {
          const px = toX(x), py = toY(y), r = 2 + size * 3;
          ctx.fillStyle = inT ? 'rgba(255, 255, 255, 0.85)' : '#fff';
          ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)'; ctx.lineWidth = 1;
          ctx.beginPath(); ctx.arc(px, py, r, 0, 6.283); ctx.fill(); ctx.stroke();
          if (mode === 'mri') { ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)'; ctx.beginPath(); ctx.arc(px, py, r + 2 + size * 2, 0, 6.283); ctx.stroke(); }
        }
        ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'; ctx.font = '10px system-ui, sans-serif';
        ctx.fillText('P', 4, 12); ctx.fillText('L', w - 10, 12);
      };
    }
    const drawCt = makeBody('res-ct-c', 'ct');
    const drawMri = makeBody('res-mri-c', 'mri');

    // RTG klatki piersiowej: żebra, płuca, sylwetka serca (powiększona przy dużej masie ognisk), guzki w płucach
    function drawXray(res) {
      const canvas = $('res-xray-c'), w = 220, h = 190, pr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = w * pr; canvas.height = h * pr; canvas.style.width = w + 'px'; canvas.style.height = h + 'px';
      const g = canvas.getContext('2d'); g.setTransform(pr, 0, 0, pr, 0, 0);
      g.fillStyle = '#0b0b0b'; g.fillRect(0, 0, w, h);
      const lung = (cx, s) => { const gr = g.createRadialGradient(cx, 95, 10, cx, 95, 80); gr.addColorStop(0, '#2a2a2a'); gr.addColorStop(1, '#575757');
        g.fillStyle = gr; g.beginPath(); g.ellipse(cx, 98, 48, 72, s * 0.08, 0, 6.283); g.fill(); };
      lung(62, 1); lung(158, -1);
      g.strokeStyle = 'rgba(220, 220, 220, 0.55)'; g.lineWidth = 3;
      for (let i = 0; i < 7; i++) { const y = 32 + i * 20;
        g.beginPath(); g.moveTo(108, y); g.quadraticCurveTo(40, y - 6, 18, y + 22); g.stroke();
        g.beginPath(); g.moveTo(112, y); g.quadraticCurveTo(180, y - 6, 202, y + 22); g.stroke(); }
      g.fillStyle = '#d8d8d8'; g.fillRect(104, 8, 12, 175);   // kręgosłup
      const k = res.bigHeart ? 1.35 : 1;   // sylwetka serca (przy powiększeniu szersza)
      g.fillStyle = 'rgba(235, 235, 235, 0.92)'; g.beginPath(); g.ellipse(118, 125, 34 * k, 30 * k, -0.4, 0, 6.283); g.fill();
      g.fillStyle = 'rgba(250, 250, 250, 0.95)';
      for (let i = 0; i < res.nodules; i++) { const a = i * 2.3; g.beginPath(); g.arc(i % 2 ? 150 + Math.cos(a) * 20 : 62 + Math.cos(a) * 20, 70 + Math.sin(a) * 28, 3.5, 0, 6.283); g.fill(); }
      g.fillStyle = 'rgba(255, 255, 255, 0.8)'; g.font = '10px system-ui, sans-serif'; g.fillText('P', 4, 12); g.fillText('L', w - 10, 12);
    }

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
      } else if (look === 'candida') {
        // drożdżaki: owalne komórki z pączkami i łańcuszek strzępki rzekomej (Gram-dodatnie, fioletowe)
        const m = 3 + Math.floor(R() * 4);
        for (let k = 0; k < m; k++) {
          const x = x0 + (R() - 0.5) * 22, y = y0 + (R() - 0.5) * 22, a = R() * 6.283;
          g.fillStyle = purple; g.beginPath(); g.ellipse(x, y, 5.2, 3.8, a, 0, 6.283); g.fill();
          if (R() < 0.6) { g.beginPath(); g.ellipse(x + Math.cos(a) * 6, y + Math.sin(a) * 6, 2.6, 2.1, a, 0, 6.283); g.fill(); }
        }
        let a = R() * 6.283, x = x0 + 6, y = y0 + 6;
        for (let k = 0; k < 5; k++) { g.fillStyle = '#5a2a8a'; g.beginPath(); g.ellipse(x, y, 5.5, 2.2, a, 0, 6.283); g.fill(); a += (R() - 0.5) * 0.5; x += Math.cos(a) * 10; y += Math.sin(a) * 10; }
      } else if (look === 'cancer') {
        // komórki atypowe: duże, nieregularne, z ciemnym jądrem i figurą podziału
        const m = 2 + Math.floor(R() * 3);
        for (let k = 0; k < m; k++) {
          const x = x0 + (R() - 0.5) * 30, y = y0 + (R() - 0.5) * 30, r = 10 + R() * 5;
          g.fillStyle = 'rgba(214, 160, 200, 0.85)'; g.beginPath();
          for (let q = 0; q < 9; q++) { const a = q / 9 * 6.283, rr = r * (0.8 + R() * 0.35); g[q ? 'lineTo' : 'moveTo'](x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
          g.closePath(); g.fill();
          g.fillStyle = '#3a1460'; g.beginPath(); g.ellipse(x + (R() - 0.5) * 3, y + (R() - 0.5) * 3, r * 0.55, r * 0.45, R() * 3, 0, 6.283); g.fill();
          g.fillStyle = '#7a3aa8'; g.beginPath(); g.arc(x + r * 0.15, y - r * 0.1, r * 0.14, 0, 6.283); g.fill();   // jąderko
        }
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
    DD.drawOrganism = drawOrganism;   // miniatury w wiki lekarza
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
          ['Sygnały chemiczne', String(S.signals || 0)],
          ...(s.kind === 'cancer' ? [['Przerzuty', String(S.metastases || 0)]] : []),
          ...(s.kind === 'fungus' ? [['Kolonie ze strzępek', String(S.hyphaColonies || 0)], ['Magazyny zarodników', String(S.sporeStores || 0)], ['Kolonie z zarodników', String(S.sporeColonies || 0)]] : []),
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
          ['Lek przeciwgrzybiczy', String(used.antifungal || 0)],
          ['Chemioterapia', String(used.chemo || 0)],
          ['Radioterapia', String(used.radio || 0)],
          ['Obrażenia od leków', num(S.dmgDrugs) + ' pkt'],
          ['Operacje zastawek', String(S.surgeries || 0)],
          ['Ogniska usunięte operacją', String(S.surgeryRemoved || 0)],
          ['Przeszczepy i amputacje', String(S.procs || 0)],
          ['Ogniska usunięte przeszczepem lub amputacją', String(S.procRemoved || 0)],
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
      const PRINTED = ['crp', 'culture', 'echo', 'usg', 'abg', 'cbc', 'pcr', 'urine', 'ct', 'markers', 'xray', 'mri', 'biopsy'];
      const anyPrint = PRINTED.some((k) => T[k] && T[k].res);
      $('print-empty').hidden = anyPrint;
      const slips = document.querySelector('.slips');
      for (const k of PRINTED) {
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
      if (T.cbc && T.cbc.res) {
        $('res-cbc').hidden = false; time($('res-cbc'), T.cbc);
        const r = T.cbc.res;
        $('res-cbc-v').textContent = String(r.wbc).replace('.', ',');
        $('res-cbc-l').textContent = (r.wbc > 10 ? 'Leukocytoza, ' : 'Leukocyty w normie, ') + ({ norm: 'rozmaz prawidłowy', neutro: 'przewaga neutrofili', lympho: 'przewaga limfocytów' })[r.diff];
      } else $('res-cbc').hidden = true;
      if (T.pcr && T.pcr.res) {
        $('res-pcr').hidden = false; time($('res-pcr'), T.pcr);
        const sp = T.pcr.res.found && C.species[T.pcr.res.species];
        $('res-pcr-v').textContent = sp ? sp.name : 'Ujemny';
        $('res-pcr-l').innerHTML = sp ? `<i>${sp.latin}</i>. <b>${sp.treat}</b>` : 'Nie wykryto materiału genetycznego patogenu we krwi.';
      } else $('res-pcr').hidden = true;
      if (T.urine && T.urine.res) {
        $('res-urine').hidden = false; time($('res-urine'), T.urine);
        const r = T.urine.res;
        $('res-urine-l').innerHTML = `<div><dt>Krwinki czerwone</dt><dd data-state="${r.rbc ? 'high' : 'ok'}">${r.rbc ? 'obecne' : 'nieobecne'}</dd></div>`
          + `<div><dt>Bakterie</dt><dd data-state="${r.bact ? 'high' : 'ok'}">${r.bact ? 'obecne' : 'nieobecne'}</dd></div>`
          + `<div><dt>Grzyby (drożdżaki)</dt><dd data-state="${r.fungi ? 'high' : 'ok'}">${r.fungi ? 'obecne' : 'nieobecne'}</dd></div>`;
      } else $('res-urine').hidden = true;
      if (T.ct && T.ct.res) {
        $('res-ct').hidden = false; time($('res-ct'), T.ct);
        drawCt(T.ct.res);
        const C0 = T.ct.res.colonies, n = (o) => C0.filter((c) => c[4] === o).length, nM = C0.filter((c) => c[3]).length;
        const nH = n('heart'), nL = n('liver'), nK = n('kidney'), nO = C0.length - nH - nL - nK;
        $('res-ct-l').textContent = C0.length ? `Ogniska w sercu: ${nH} (w mięśniu: ${nM}), w wątrobie: ${nL}, w nerce: ${nK}, w naczyniach: ${nO}` : 'Bez widocznych zmian';
      } else $('res-ct').hidden = true;
      if (T.markers && T.markers.res) {
        $('res-markers').hidden = false; time($('res-markers'), T.markers);
        const v = T.markers.res.value;
        $('res-markers-v').textContent = String(v).replace('.', ',');
        $('res-markers-l').textContent = v < 5 ? 'W normie' : v < 15 ? 'Podwyższone' : 'Bardzo wysokie';
      } else if ($('res-markers')) $('res-markers').hidden = true;
      if (T.xray && T.xray.res) {
        $('res-xray').hidden = false; time($('res-xray'), T.xray);
        const r = T.xray.res; drawXray(r);
        $('res-xray-l').textContent = !r.bigHeart && !r.nodules ? 'Bez widocznych zmian'
          : [r.bigHeart ? 'Powiększona sylwetka serca' : '', r.nodules ? `guzki w płucach: ${r.nodules}` : ''].filter(Boolean).join(', ');
      } else $('res-xray').hidden = true;
      if (T.mri && T.mri.res) {
        $('res-mri').hidden = false; time($('res-mri'), T.mri);
        drawMri(T.mri.res);
        const C0 = T.mri.res.colonies, ST = C.cancer.stages;
        const sm = C0.filter((c) => c[2] < ST[0]).length, md = C0.filter((c) => c[2] >= ST[0] && c[2] < ST[1]).length, lg = C0.length - sm - md;
        $('res-mri-l').textContent = C0.length ? `Ognisk: ${C0.length} (w mięśniu: ${C0.filter((c) => c[3]).length}). Małe ${sm}, średnie ${md}, duże ${lg}` : 'Bez widocznych zmian';
      } else $('res-mri').hidden = true;
      if (T.biopsy && T.biopsy.res) {
        $('res-biopsy').hidden = false; time($('res-biopsy'), T.biopsy);
        const r = T.biopsy.res, ORG = { heart: 'Serce', liver: 'Wątroba', kidney: 'Nerka' };
        const HIS = { bacteria: 'Ropień z bakteriami', virus: 'Zapalenie wirusowe (wtręty w komórkach)', fungus: 'Strzępki grzyba w tkance', cancer: 'Komórki nowotworowe (rak)' };
        $('res-biopsy-v').textContent = ORG[r.region];
        $('res-biopsy-l').textContent = r.finding ? HIS[r.finding] : 'Tkanka prawidłowa';
      } else $('res-biopsy').hidden = true;
      if (T.abg.res) {
        $('res-abg').hidden = false; time($('res-abg'), T.abg);
        const lbl = (r) => r < 0.2 ? ['wrażliwa', 'ok'] : r < 0.5 ? ['średnio wrażliwa', 'warm'] : ['oporna', 'high'];
        const R = T.abg.res;
        const rows = [['Przeciwciała', R.antibodies], ['Gorączka', R.fever], ['β-laktam', R.abxA], ['Makrolid', R.abxB], ['Przeciwgrzybiczy', R.antifungal ?? 0]];
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
    const KIND_NAME = { bacteria: 'bakteria', virus: 'wirus', fungus: 'grzyb', cancer: 'nowotwór' };
    const spLabel = (s) => { const sp = C.species[s.species]; return sp ? `${sp.name.charAt(0).toLowerCase() + sp.name.slice(1)} (${sp.latin})` : (KIND_NAME[s.kind] || 'bakteria'); };
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
        const PR = d.proc || { state: 'idle', done: {} };
        for (const p of PROC) {
          const el = procBtns[p.what];
          el.disabled = !d.unlocked || PR.state === 'running' || !!PR.done[p.what] || !s.running || !!s.over;
          el.dataset.active = PR.state === 'running' && PR.kind === p.what ? '1' : '0';
        }
        $('proc-state').textContent = PR.state === 'running' ? `Zabieg w toku: jeszcze ${Math.ceil(PR.t)} s` : '';
        const rcd = d.cd.radio || 0;
        for (const r of RADIO) {
          const el = radioBtns[r.region];
          el.disabled = !d.unlocked || rcd > 0 || !s.running || !!s.over;
          el.dataset.active = s.radio && s.radio.region === r.region ? '1' : '0';
        }
        $('radio-state').textContent = s.radio ? `Naświetlanie jeszcze ${Math.ceil(s.radio.t)} s` : rcd > 0 ? `Kolejna za ${Math.ceil(rcd)} s` : '';
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
        const cost = Math.round((C.patient.sideEffect[a.cd] || 0) * (DD.Game.patientOf(s).sideFx ?? 1));
        effEl.textContent = `Dawka ${Math.round(eff * 100)}%` + (cost ? `, stan pacjenta −${cost}` : '');
        effEl.dataset.level = eff > 0.75 ? 'full' : eff > 0.45 ? 'mid' : 'low';
      }

      if (s.log.length !== logCount || (s.log.length && s.log[s.log.length - 1].t !== update._lt)) {
        logCount = s.log.length; update._lt = s.log.length ? s.log[s.log.length - 1].t : 0;
        const ul = $('log');
        ul.innerHTML = '';
        for (let i = s.log.length - 1; i >= Math.max(0, s.log.length - 14); i--) {
          const e = s.log[i];
          if (e.who === 'bact') continue;   // ruchy patogenu: lekarz ich nie widzi (zna tylko objawy, wyniki i stan pacjenta)
          const li = document.createElement('li');
          li.dataset.who = e.who;
          li.innerHTML = `<time>${mmss(e.t)}</time><span>${e.text}</span>`;
          ul.appendChild(li);
        }
      }

      // HUD patogenu
      { const sp = C.species[s.species]; const nm = sp ? sp.name.charAt(0).toLowerCase() + sp.name.slice(1) : (KIND_NAME[s.kind] || 'bakteria');
        document.querySelectorAll('.js-kind-name').forEach((el) => { if (el.textContent !== nm) el.textContent = nm; }); }
      // wylosowany pacjent: oznaczenie w HUD i na karcie oraz plansza na początku rundy
      { const P = C.patients[s.ptype];
        if (P) {
          if ($('h-patient').textContent !== 'Pacjent: ' + P.name) $('h-patient').textContent = 'Pacjent: ' + P.name;
          if ($('doc-ptype').textContent !== P.name) $('doc-ptype').textContent = P.name;
          const rv = $('ptype-reveal'), show = s.running && !s.over && s.time < C.ui.revealTime;
          if (show && rv.dataset.pt !== s.ptype) {
            rv.dataset.pt = s.ptype;
            $('pr-name').textContent = P.name; $('pr-bact').textContent = P.bact; $('pr-doc').textContent = P.doc;
          }
          if (rv.hidden === show) rv.hidden = !show;
          if (!show) rv.dataset.pt = '';
        } }
      $('h-place').textContent = b.transit ? (DD.Heart.ROUTES[b.transit.to] || DD.Heart.ROUTES.body).name : b.place;
      $('h-hp').style.transform = `scaleX(${b.hp / C.bacteria.hp})`;
      $('h-hp-val').textContent = Math.ceil(b.hp);
      $('h-inf').style.transform = `scaleX(${b.infection / 100})`;
      $('h-inf-val').textContent = Math.floor(b.infection) + '%';
      const K = C.colony;
      const canFound = (b.contact || b.inTissue) && !b.transit && !b.dead;
      $('h-contact').hidden = !canFound;
      if (canFound) {
        const colTxt = b.colonyCd > 0 ? `Kolonia możliwa za ${Math.ceil(b.colonyCd)} s.` : b.hp > K.cost * DD.Game.patientOf(s).colonyCost + 1 ? `E zakłada kolonię (−${Math.round(K.cost * DD.Game.patientOf(s).colonyCost)} życia).` : 'Za mało życia na kolonię.';
        if (b.inTissue) {
          $('h-contact').textContent = 'W mięśniu sercowym: przeciwciała cię tu nie dosięgną, leki działają słabiej. ' + colTxt + ' Do krwi wracasz, podpływając do ściany naczynia albo klawiszem Q.';
        } else if (b.burrowT > 0) {
          $('h-contact').textContent = `Wnikanie w ścianę: ${b.burrowT.toFixed(1).replace('.', ',')} s. Nie odpływaj od ściany. Q przerywa.`;
        } else {
          $('h-contact').textContent = (b.feeding ? 'Żerujesz na tkance, życie wraca. ' : 'Przy ścianie. ') + colTxt + (DD.Heart.organAt(b.x, b.y) === 'heart' ? ' Q: wnikanie w ścianę.' : '');
        }
      }
      $('s-colonies-n').textContent = s.colonies.length;
      // rak: etap każdego guza wynika z jego wielkości
      if (s.kind === 'cancer') {
        const ST = C.cancer.stages; let sm = 0, md = 0, lg = 0;
        for (const c of s.colonies) { if (c.size < ST[0]) sm++; else if (c.size < ST[1]) md++; else lg++; }
        const t = `małe ${sm} · średnie ${md} · duże ${lg}`;
        if ($('s-tumors').textContent !== t) $('s-tumors').textContent = t;
      }
      $('s-tumors').hidden = s.kind !== 'cancer';
      // pożywienie i kopie
      const food = b.food || 0, ncop = (s.copies || []).length;
      $('h-food').style.transform = `scaleX(${food / 100})`;
      $('h-food-val').textContent = Math.floor(food);
      $('s-copies-n').textContent = ncop; $('s-copies-max').textContent = C.copies.max;
      // mutacje i zdolności
      const MC = C.mutations;
      $('mut-pts').textContent = (b.points || 0).toFixed(1).replace('.', ',');
      for (const m of MUTS) {
        // grzyb: klawisze 7, 8, 9, 0 mają inne mutacje (C.fungus.mutNames)
        const key = DD.Game.mutKey(s, m.what), nm = (s.kind === 'fungus' && C.fungus.mutNames[m.what]) || (s.kind === 'cancer' && C.cancer.mutNames[m.what]) || m.name;
        const lvl = (b.mut && b.mut[key]) || 0, max = MC[key].max, cost = MC.cost[lvl];
        const el = mutBtns[m.what];
        const nmEl = el.querySelector('span'); if (nmEl.dataset.nm !== nm) { nmEl.dataset.nm = nm; nmEl.textContent = nm; }
        // kropki poziomów i koszt w osobnych węzłach (koszt tłumaczy się jako „N pkt”)
        const lv = el.querySelector('.mut-lvl'), key2 = lvl + '/' + max + '/' + cost;
        if (lv.dataset.k !== key2) { lv.dataset.k = key2; lv.innerHTML = '●'.repeat(lvl) + '○'.repeat(max - lvl) + (lvl < max ? `<span class="mut-cost">${cost} pkt</span>` : ''); }
        el.disabled = lvl >= max || (b.points || 0) < cost;
        el.dataset.afford = !el.disabled ? '1' : '0';
      }
      const ab = [];
      if (b.hidden) ab.push(`<b>Ukryty w kolonii</b>: przeciwciała cię nie widzą. F wychodzi.`);
      else if (s.colonies.some((c) => !!c.inTissue === !!b.inTissue && Math.hypot(c.x - b.x, c.y - b.y) < C.hide.radius)) ab.push('F: ukryj się w kolonii.');
      if (food >= C.copies.cost && ncop < C.copies.max) ab.push(s.kind === 'fungus' ? '<b>R: wypuść zarodnik</b> (odciąga przeciwciała).' : s.kind === 'cancer' ? '<b>R: podziel się</b> (kopia odciąga przeciwciała).' : '<b>R: rozmnóż się</b> (kopia odciąga przeciwciała).');
      if (s.radio && DD.Heart.organAt(b.x, b.y) === s.radio.region) ab.push('<b>Naświetlanie!</b> Uciekaj z tego narządu.');
      if (s.kind === 'fungus' && !b.dead && s.colonies.some((c) => !c.store && !!c.inTissue === !!b.inTissue && Math.hypot(c.x - b.x, c.y - b.y) < C.fungus.storeRadius))
        ab.push(`E: magazyn zarodników z tej kolonii (−${C.fungus.storeCost} życia).`);
      { const X = C.signals, REG = { right: 'prawe serce', left: 'lewe serce', legs: 'nogi', liver: 'wątroba', kidney: 'nerka' };
        if (s.fakeSym) ab.push(`Fałszywy objaw (${REG[s.fakeSym.region]}) jeszcze ${Math.ceil(s.fakeSym.t)} s.`);
        else if (b.signalCd > 0) ab.push(`Sygnały chemiczne za ${Math.ceil(b.signalCd)} s.`);
        else ab.push(`B: sygnały chemiczne (fałszywy objaw, −${X.hpCost} życia).`); }
      if (b.mut && b.mut.toxins) ab.push(b.toxinCd > 0 ? `Toksyny za ${Math.ceil(b.toxinCd)} s.` : `T: toksyny (−${C.toxins.hpCost} życia, stan pacjenta −${C.toxins.patientDamage}, zakłócają badania).`);
      $('mut-ability').innerHTML = ab.map((x) => `<span>${x}</span>`).join(' ');   // osobne węzły (tłumaczenie zdań)
      $('respawn').hidden = !(b.dead > 0);
      if (b.dead > 0) $('respawn-t').textContent = Math.ceil(b.dead);
      let stuck = 0; for (const a of s.antibodies) if (a.stuck) stuck++;
      $('s-fever').hidden = !(d.temp > 37.4);
      // leki we krwi widziane przez patogen (z rzeczywistym działaniem)
      const DN = { abxA: 'β-laktam', abxB: 'makrolid', antiviral: 'lek przeciwwirusowy', antifungal: 'lek przeciwgrzybiczy', chemo: 'chemioterapia' };
      const active = Object.keys(DN).filter((k) => s.drugs[k] && s.drugs[k].t > 0);
      $('s-slow').hidden = active.length === 0;
      $('s-slow').textContent = active.map((k) => `${DN[k]}: ${s.drugs[k].eff > 0.05 ? 'działa ' + Math.round(s.drugs[k].eff * 100) + '%' : 'nie działa'}`).join(', ');
      $('s-ab').hidden = stuck === 0;
      $('s-ab-n').textContent = stuck;
      $('s-ab-near').hidden = !(s.antibodies.length > stuck && stuck === 0 && s.antibodies.some(a => Math.hypot(a.x - b.x, a.y - b.y) < 12));
      const RN = { antibodies: 'przeciwciała', fever: 'gorączka', abxA: 'β-laktam', abxB: 'makrolid', antiviral: 'przeciwwirusowy', antifungal: 'przeciwgrzybiczy', chemo: 'chemioterapia', radio: 'radioterapia' };
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
        const kn = KIND_NAME[s.kind] || 'bakteria';
        $('end-title').textContent = s.over === 'doctor' ? 'Wygrywa lekarz' : `Wygrywa ${kn}`;
        $('end-text').textContent = s.over === 'doctor'
          ? `Zakażenie wyleczone po ${mmss(s.time)}. Patogen: ${spLabel(s)}.`
          : s.kind === 'cancer' ? `Wyniszczenie nowotworowe po ${mmss(s.time)}. Patogen: ${spLabel(s)}.` : `Pacjent w sepsie po ${mmss(s.time)}. Patogen: ${spLabel(s)}.`;
        renderStats(s);
        if (DD.Match) DD.Match.renderEnd();
        $('end-again').focus();
      }
      if (!s.over) { end.hidden = true; endFilm.reset(); if (DD.Match) DD.Match.suppressEnd = false; }
    }
    return { update };
  };
})();
