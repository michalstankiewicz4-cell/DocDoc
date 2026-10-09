// Urządzenia w panelu lekarza rysowane na żywo (canvas 2D):
//  - pompa infuzyjna z kroplówką: worek, komora kroplowa, wyświetlacz z lekami, które są teraz we krwi,
//  - ekran z sylwetką pacjenta na siatce: obszary ciała z objawami świecą (bursztynowo / czerwono).
// Tylko czytają stan gry.
(function () {
  const C = DD.CONFIG, D = C.doctor;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  // leki widoczne na pompie: kolor jak w grze patogenu
  const DRUGS = [
    { k: 'antibodies', name: 'Przeciwciała', col: '#f2deb0' },
    { k: 'abxA', name: 'β-laktam', col: '#7fd0ff' },
    { k: 'abxB', name: 'Makrolid', col: '#b9a2ff' },
    { k: 'antiviral', name: 'Przeciwwirusowy', col: '#ff9ad0' },
    { k: 'fever', name: 'Gorączka', col: '#ffb347' }
  ];
  const AB_SHOW = 8;
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;   // przez tyle sekund po podaniu przeciwciał wlew widać na pompie

  function fit(cv, h) {
    const w = cv.clientWidth || 300, pr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(w * pr) || cv.height !== Math.round(h * pr)) { cv.width = Math.round(w * pr); cv.height = Math.round(h * pr); cv.style.height = h + 'px'; }
    const ctx = cv.getContext('2d'); ctx.setTransform(pr, 0, 0, pr, 0, 0);
    return { ctx, w, h };
  }
  // tekst przycięty do szerokości (z wielokropkiem)
  function fitText(ctx, txt, maxW) {
    txt = DD.t(txt);   // przycinamy tekst już przetłumaczony
    if (ctx.measureText(txt).width <= maxW) return txt;
    while (txt.length > 1 && ctx.measureText(txt + '…').width > maxW) txt = txt.slice(0, -1);
    return txt + '…';
  }
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
  }

  // aktywne wlewy: [{ name, col, left (s), frac (0..1 pozostało) }]
  function infusions(s) {
    const d = s.doctor, out = [];
    for (const g of DRUGS) {
      if (g.k === 'antibodies') {
        const since = D.antibodies.cooldown - (d.cd.antibodies || 0);
        if (d.cd.antibodies > 0 && since < AB_SHOW) out.push({ name: g.name, col: g.col, left: AB_SHOW - since, frac: 1 - since / AB_SHOW });
      } else if (g.k === 'fever') {
        if (d.feverT > 0) out.push({ name: g.name, col: g.col, left: d.feverT, frac: d.feverT / D.fever.duration });
      } else {
        const x = s.drugs && s.drugs[g.k];
        if (x && x.t > 0) out.push({ name: g.name, col: g.col, left: x.t, frac: x.t / D[g.k].duration });
      }
    }
    return out;
  }

  DD.createDevices = function () {
    const pumpC = $('pump'), bodyC = $('bodymap');
    let t = 0, drops = [], dropAcc = 0, lastPumpText = '';

    function drawPump(s, dt) {
      // wysokość jak monitor obok (gdy stoją w jednym rzędzie)
      const mon = document.querySelector('.half-doc .monitor');
      const wantH = mon && Math.abs(mon.getBoundingClientRect().top - pumpC.getBoundingClientRect().top) < 30 ? Math.max(236, mon.clientHeight - 14) : 236;
      const { ctx, w, h } = fit(pumpC, Math.round(wantH));
      ctx.clearRect(0, 0, w, h);
      const inf = s.running ? infusions(s) : [];
      const on = inf.length > 0;
      const mix = on ? inf[0].col : '#cfe6ee';
      // statyw i hak
      const bx = Math.max(34, Math.min(64, w * 0.2));
      ctx.strokeStyle = '#8c9893'; ctx.lineWidth = 3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(bx, 6); ctx.lineTo(bx, 20); ctx.moveTo(bx - 14, 8); ctx.lineTo(bx + 14, 8); ctx.stroke();
      // worek z płynem (poziom spada powoli, z kolorem leku, gdy trwa wlew)
      const level = 0.55 + 0.35 * Math.cos(s.time * 0.01);
      ctx.fillStyle = 'rgba(236, 246, 248, 0.92)'; rr(ctx, bx - 26, 20, 52, 82, 12); ctx.fill();
      ctx.strokeStyle = '#a9b8b5'; ctx.lineWidth = 1.5; rr(ctx, bx - 26, 20, 52, 82, 12); ctx.stroke();
      ctx.save(); rr(ctx, bx - 26, 20, 52, 82, 12); ctx.clip();
      const top = 20 + 82 * (1 - level);
      const g = ctx.createLinearGradient(0, top, 0, 102);
      g.addColorStop(0, on ? mix : 'rgba(176, 222, 236, 0.75)'); g.addColorStop(1, on ? 'rgba(255,255,255,0.55)' : 'rgba(150, 205, 222, 0.85)');
      ctx.fillStyle = g; ctx.fillRect(bx - 26, top, 52, 102 - top);
      ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillRect(bx - 18, 26, 5, 70);   // odblask
      ctx.restore();
      ctx.fillStyle = '#4f5d59'; ctx.font = '600 9px "Barlow Semi Condensed", system-ui, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(fitText(ctx, on ? inf[0].name : 'NaCl 0,9%', 50), bx, 62);
      // komora kroplowa
      ctx.fillStyle = '#c0ccc8'; ctx.fillRect(bx - 4, 102, 8, 8);
      ctx.fillStyle = 'rgba(236, 246, 248, 0.9)'; rr(ctx, bx - 9, 110, 18, 34, 5); ctx.fill();
      ctx.strokeStyle = '#a9b8b5'; ctx.lineWidth = 1; rr(ctx, bx - 9, 110, 18, 34, 5); ctx.stroke();
      ctx.fillStyle = on ? mix : '#b4dbe6'; ctx.fillRect(bx - 8, 135, 16, 8);
      // krople: szybciej, gdy trwa wlew
      dropAcc += dt * (on ? 2.4 + inf.length * 0.8 : 0.35);
      while (dropAcc > 1) { dropAcc -= 1; drops.push({ y: 0 }); }
      for (const dp of drops) dp.y += dt * 60;
      drops = drops.filter((dp) => dp.y < 22);
      ctx.fillStyle = on ? mix : '#9fd2e2';
      for (const dp of drops) { ctx.beginPath(); ctx.ellipse(bx, 113 + dp.y, 1.8, 2.6, 0, 0, 6.283); ctx.fill(); }
      // dren do pompy
      const px = bx + 36, pw = w - px - 6, py = 30, ph = h - 40;
      ctx.strokeStyle = 'rgba(190, 214, 220, 0.95)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(bx, 144); ctx.bezierCurveTo(bx, 200, px - 20, 210, px, h - 40); ctx.stroke();
      if (on) { ctx.strokeStyle = mix; ctx.lineWidth = 1.2; ctx.setLineDash([4, 6]); ctx.lineDashOffset = -t * 30; ctx.stroke(); ctx.setLineDash([]); }
      // obudowa pompy
      ctx.fillStyle = '#e4e8e3'; rr(ctx, px, py, pw, ph, 12); ctx.fill();
      ctx.strokeStyle = '#b8c1bc'; ctx.lineWidth = 1.5; rr(ctx, px, py, pw, ph, 12); ctx.stroke();
      ctx.fillStyle = '#56645f'; ctx.textAlign = 'left'; ctx.font = '600 11px "Barlow Semi Condensed", system-ui, sans-serif';
      ctx.fillText(fitText(ctx, 'Pompa infuzyjna', pw - 34), px + 12, py + 18);
      ctx.fillStyle = on ? '#3ee08a' : '#9aa6a1'; ctx.beginPath(); ctx.arc(px + pw - 16, py + 14, 4, 0, 6.283); ctx.fill();
      // ekran pompy
      const sx = px + 10, sy = py + 26, sw = pw - 20, sh = ph - 66;
      ctx.fillStyle = '#071a20'; rr(ctx, sx, sy, sw, sh, 6); ctx.fill();
      ctx.font = '600 12px "Barlow Semi Condensed", system-ui, sans-serif';
      if (!s.running) { ctx.fillStyle = '#5d8a95'; ctx.fillText(fitText(ctx, 'Czeka na pacjenta', sw - 16), sx + 8, sy + 22); }
      else if (!on) { ctx.fillStyle = '#5d8a95'; ctx.fillText(fitText(ctx, 'Brak wlewu leków', sw - 16), sx + 8, sy + 22); ctx.fillText('0 ml/h', sx + 8, sy + 40); }
      else {
        const rowH = Math.min(26, (sh - 10) / inf.length);
        inf.forEach((x, i) => {
          const y = sy + 8 + i * rowH;
          ctx.fillStyle = x.col; ctx.beginPath(); ctx.arc(sx + 12, y + 7, 3.5, 0, 6.283); ctx.fill();
          const sec = Math.ceil(x.left) + ' s', sw2 = ctx.measureText(sec).width;
          ctx.fillText(fitText(ctx, x.name, sw - 40 - sw2), sx + 22, y + 11);
          ctx.textAlign = 'right'; ctx.fillText(sec, sx + sw - 8, y + 11); ctx.textAlign = 'left';
          ctx.fillStyle = 'rgba(255,255,255,0.12)'; ctx.fillRect(sx + 22, y + 15, sw - 30, 3);
          ctx.fillStyle = x.col; ctx.fillRect(sx + 22, y + 15, (sw - 30) * clamp(x.frac, 0, 1), 3);
        });
      }
      // przyciski pompy (ozdobne)
      for (let i = 0; i < 3; i++) { ctx.fillStyle = i === 1 ? '#7fb8a4' : '#c9d1cd'; rr(ctx, px + 12 + i * 30, py + ph - 30, 24, 16, 5); ctx.fill(); }
      const txt = on ? 'We krwi: ' + inf.map((x) => `${x.name} ${Math.ceil(x.left)} s`).join(', ') : 'Brak leków we krwi';
      if (txt !== lastPumpText) { lastPumpText = txt; $('pump-text').textContent = txt; }
    }

    // ---------- sylwetka ----------
    // połowa obrysu ciała (x od osi, y od czubka głowy, w jednostkach wysokości), lustrzana
    const HALF = [[0.035, 0.14], [0.04, 0.17], [0.13, 0.195], [0.15, 0.22], [0.165, 0.36], [0.178, 0.5], [0.165, 0.535], [0.145, 0.5],
      [0.13, 0.37], [0.112, 0.27], [0.1, 0.34], [0.09, 0.42], [0.105, 0.5], [0.097, 0.62], [0.08, 0.8], [0.07, 0.94], [0.088, 0.97],
      [0.036, 0.975], [0.03, 0.94], [0.025, 0.8], [0.016, 0.6], [0.0, 0.56]];
    const ORG = {
      lungs: [[-0.047, 0.275, 0.036, 0.062, 0.1], [0.047, 0.275, 0.034, 0.06, -0.1]],
      heart: [[0.016, 0.3, 0.026, 0.03, 0.5]],
      liver: [[-0.032, 0.37, 0.058, 0.026, 0.15]],
      kidney: [[-0.046, 0.425, 0.016, 0.026, 0.2], [0.046, 0.425, 0.016, 0.026, -0.2]],
      legs: []
    };
    const LABEL = { lungs: 'Płuca', heart: 'Serce', liver: 'Wątroba', kidney: 'Nerka', legs: 'Nogi' };
    function bodyPath(ctx, cx, top, H) {
      const pts = HALF.map(([x, y]) => [cx + x * H, top + y * H]).concat(HALF.slice().reverse().map(([x, y]) => [cx - x * H, top + y * H]));
      ctx.beginPath();
      ctx.moveTo((pts[0][0] + pts[1][0]) / 2, (pts[0][1] + pts[1][1]) / 2);
      for (let i = 1; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
      ctx.closePath();
      ctx.moveTo(cx + 0.062 * H, top + 0.08 * H); ctx.arc(cx, top + 0.08 * H, 0.062 * H, 0, 6.283);
    }
    function drawBody(s, dt) {
      const { ctx, w, h } = fit(bodyC, 268);
      ctx.fillStyle = '#04101c'; ctx.fillRect(0, 0, w, h);
      // siatka jak na skanerze
      ctx.strokeStyle = 'rgba(40, 110, 220, 0.35)'; ctx.lineWidth = 1; ctx.beginPath();
      for (let x = (w % 14) / 2; x < w; x += 14) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); }
      for (let y = 4; y < h; y += 14) { ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); }
      ctx.stroke();
      const H = h * 0.94, top = h * 0.03, cx = w / 2;
      const sym = s.running ? DD.symptomList(s) : [];
      const lv = {};   // obszar -> 'warm' | 'high'
      for (const [, l, r] of sym) if (lv[r] !== 'high') lv[r] = l;
      const pulse = 0.6 + 0.4 * Math.sin(t * 5);
      const colOf = (l) => (l === 'high' ? `rgba(255, 74, 61, ${0.5 + 0.4 * pulse})` : 'rgba(255, 179, 71, 0.6)');
      // ciało: wypełnienie i świecący obrys (gorączka = cieplejszy obrys, bladość / sinica = blady)
      bodyPath(ctx, cx, top, H);
      ctx.fillStyle = 'rgba(60, 170, 255, 0.08)'; ctx.fill('evenodd');
      const outline = lv.body ? 'rgba(255, 170, 90, 0.95)' : lv.skin ? 'rgba(200, 220, 255, 0.95)' : 'rgba(92, 200, 255, 0.95)';
      ctx.shadowColor = outline; ctx.shadowBlur = 8; ctx.strokeStyle = outline; ctx.lineWidth = 1.6; ctx.stroke(); ctx.shadowBlur = 0;
      // nogi: podświetlenie w obrysie ciała
      if (lv.legs) {
        ctx.save(); bodyPath(ctx, cx, top, H); ctx.clip('evenodd');
        ctx.fillStyle = colOf(lv.legs); ctx.fillRect(cx - 0.12 * H, top + 0.62 * H, 0.24 * H, 0.36 * H); ctx.restore();
      }
      // narządy: przygaszone obrysy, świecące wypełnienie przy objawach
      for (const k in ORG) for (const [x, y, rx, ry, rot] of ORG[k]) {
        const on = lv[k] && !(k === 'kidney' && x > 0);   // w grze jest prawa nerka pacjenta (lewa strona ekranu)
        ctx.beginPath(); ctx.ellipse(cx + x * H, top + y * H, rx * H, ry * H, rot, 0, 6.283);
        if (on) { ctx.fillStyle = colOf(lv[k]); ctx.shadowColor = colOf(lv[k]); ctx.shadowBlur = 14; ctx.fill(); ctx.shadowBlur = 0; }
        ctx.strokeStyle = on ? 'rgba(255, 220, 180, 0.9)' : 'rgba(92, 200, 255, 0.45)'; ctx.lineWidth = 1; ctx.stroke();
      }
      // podpisy świecących obszarów
      ctx.font = '600 11px "Barlow Semi Condensed", system-ui, sans-serif'; ctx.fillStyle = '#ffd9b0';
      const LPOS = { lungs: [0.1, 0.23], heart: [0.07, 0.31], liver: [-0.2, 0.37], kidney: [-0.2, 0.44], legs: [0.1, 0.78] };
      for (const k in LPOS) if (lv[k]) { const [x, y] = LPOS[k]; ctx.textAlign = x < 0 ? 'right' : 'left'; ctx.fillText(LABEL[k], cx + x * H, top + y * H); }
      ctx.textAlign = 'left';
      // linia skanowania (jedyny ruch na ekranie; wyłączona przy ograniczeniu animacji)
      if (!reduced) {
      const sy = ((t * 0.25) % 1) * h;
      const g = ctx.createLinearGradient(0, sy - 18, 0, sy);
      g.addColorStop(0, 'rgba(92, 200, 255, 0)'); g.addColorStop(1, 'rgba(92, 200, 255, 0.22)');
      ctx.fillStyle = g; ctx.fillRect(0, sy - 18, w, 18);
      }
      if (!sym.length && s.running) { ctx.fillStyle = 'rgba(160, 210, 255, 0.7)'; ctx.fillText('Bez objawów', 8, h - 10); }
    }

    function update(s, dt) {
      t += dt;
      drawPump(s, dt);
      drawBody(s, dt);
    }
    return { update };
  };
})();
