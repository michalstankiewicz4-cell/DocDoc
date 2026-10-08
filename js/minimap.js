// Minimapa patogenu: sylwetka z mapy SDF, pozycja patogenu, kadr kamery, kolonie i kopie.
// Dwa widoki: serce albo jama brzuszna (wątroba, nerka) — wybierany według miejsca, w którym jest patogen.
(function () {
  const C = DD.CONFIG, H = DD.Heart;
  const VIEWS = {
    heart: {
      name: 'Serce', box: H.HEART_BOX,
      labels: [{ t: 'PP', x: -28, y: 8 }, { t: 'PK', x: -15, y: -27 }, { t: 'LP', x: 32, y: 20 }, { t: 'LK', x: 20, y: -19 }]
    },
    abdomen: {
      name: 'Jama brzuszna', box: H.ABDOMEN_BOX,
      labels: [{ t: 'WĄTROBA', x: -30, y: -112 }, { t: 'NERKA', x: -40, y: -232 }, { t: 'AORTA', x: 50, y: -190 }, { t: 'ŻGD', x: -55, y: -140 }]
    }
  };

  DD.createMinimap = function (canvas) {
    const HB = H.HEART_BOX;
    const cw = 220, ch = Math.round(cw * (HB.maxY - HB.minY) / (HB.maxX - HB.minX));
    const pr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = cw * pr; canvas.height = ch * pr;
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    const ctx = canvas.getContext('2d');

    // skala i przesunięcie każdego widoku (cały wycinek mieści się w płótnie, wyśrodkowany)
    for (const k in VIEWS) {
      const V = VIEWS[k], B = V.box;
      V.sc = Math.min(cw / (B.maxX - B.minX), ch / (B.maxY - B.minY));
      V.ox = (cw - (B.maxX - B.minX) * V.sc) / 2; V.oy = (ch - (B.maxY - B.minY) * V.sc) / 2;
      V.toX = (x) => V.ox + (x - B.minX) * V.sc;
      V.toY = (y) => V.oy + (B.maxY - y) * V.sc;
      V.bg = null;
    }
    // sylwetka liczona raz dla każdego widoku (przy pierwszym użyciu)
    function background(V) {
      if (V.bg) return V.bg;
      const bg = document.createElement('canvas');
      bg.width = cw * pr; bg.height = ch * pr;
      const bctx = bg.getContext('2d');
      const img = bctx.createImageData(bg.width, bg.height);
      const W = C.world;
      for (let j = 0; j < bg.height; j++) for (let i = 0; i < bg.width; i++) {
        const x = V.box.minX + ((i + 0.5) / pr - V.ox) / V.sc;
        const y = V.box.maxY - ((j + 0.5) / pr - V.oy) / V.sc;
        if (x < W.minX || x > W.maxX || y < W.minY || y > W.maxY) continue;
        const d = H.sample(x, y);
        const k = (j * bg.width + i) * 4;
        let r = 0, g = 0, b = 0, a = 0;
        if (d < 0) { const t = Math.min(1, -d / 8); r = 120 - t * 50; g = 18; b = 22; a = 235; }
        else if (d < 0.9) { r = 246; g = 170; b = 156; a = 255; }
        else {
          const o = H.organAt(x, y);
          if (o === 'liver') { r = 96; g = 36; b = 22; a = 230; }
          else if (o === 'kidney') { r = 112; g = 30; b = 26; a = 230; }
          else if (d < 7.5) { r = 52; g = 14; b = 16; a = 200; }
          else if (d < 8.5) { r = 92; g = 40; b = 30; a = 140; }
        }
        img.data[k] = r; img.data[k + 1] = g; img.data[k + 2] = b; img.data[k + 3] = a;
      }
      bctx.putImageData(img, 0, 0);
      V.bg = bg;
      return bg;
    }

    let cur = 'heart';
    function draw(s, view) {
      const b = s.bact;
      // widok: serce albo brzuch (z małą histerezą, żeby nie migało na granicy)
      if (!b.transit) { if (b.y < HB.minY - 2) cur = 'abdomen'; else if (b.y > HB.minY + 2) cur = 'heart'; }
      const V = VIEWS[cur], toX = V.toX, toY = V.toY;
      ctx.setTransform(pr, 0, 0, pr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(background(V), 0, 0, cw, ch);

      ctx.font = '700 10px "Atkinson Hyperlegible", system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255, 220, 210, 0.55)';
      for (const L of V.labels) ctx.fillText(L.t, toX(L.x), toY(L.y));
      ctx.textAlign = 'left'; ctx.fillStyle = 'rgba(255, 230, 220, 0.75)';
      ctx.fillText(V.name, 6, 10);

      // kolonie
      ctx.fillStyle = '#c6e66a';
      ctx.strokeStyle = '#c6e66a'; ctx.lineWidth = 1.5;
      for (const c of s.colonies) {
        ctx.beginPath(); ctx.arc(toX(c.x), toY(c.y), 1.6 + 2.6 * (c.size ?? 1), 0, 6.283);
        if (c.inTissue) ctx.stroke(); else ctx.fill();   // w mięśniu: pierścień
      }

      // kopie patogenu (przyciemnione)
      ctx.fillStyle = 'rgba(111, 227, 180, 0.55)';
      for (const c of s.copies || []) { ctx.beginPath(); ctx.arc(toX(c.x), toY(c.y), 2.2, 0, 6.283); ctx.fill(); }

      // kadr kamery
      if (view) {
        const vh = 2 * view.zoom * Math.tan(C.camera.fov * Math.PI / 360);
        const vw = vh * view.camera.aspect;
        const x0 = toX(view.tx - vw / 2), y0 = toY(view.ty + vh / 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; ctx.lineWidth = 1;
        ctx.strokeRect(x0 + 0.5, y0 + 0.5, vw * V.sc, vh * V.sc);
      }

      // patogen
      if (!b.transit) {
        const bx = toX(b.x), by = toY(b.y);
        const pulse = 4 + 2.5 * (0.5 + 0.5 * Math.sin(s.time * 6));
        ctx.fillStyle = 'rgba(111, 227, 180, 0.25)';
        ctx.beginPath(); ctx.arc(bx, by, pulse + 3, 0, 6.283); ctx.fill();
        ctx.fillStyle = '#6fe3b4';
        ctx.beginPath(); ctx.arc(bx, by, 3.2, 0, 6.283); ctx.fill();
        ctx.strokeStyle = '#6fe3b4'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(b.dir) * 9, by - Math.sin(b.dir) * 9); ctx.stroke();
      }
    }
    return { draw };
  };
})();
