// Minimapa bakterii: sylwetka serca z mapy SDF, pozycja bakterii, kadr kamery, kolonie.
(function () {
  const C = DD.CONFIG, H = DD.Heart;
  const W = C.world;
  const LABELS = [
    { t: 'PP', x: -28, y: 8 }, { t: 'PK', x: -15, y: -27 },
    { t: 'LP', x: 32, y: 20 }, { t: 'LK', x: 20, y: -19 }
  ];

  DD.createMinimap = function (canvas) {
    const cw = 220, ch = Math.round(cw * (W.maxY - W.minY) / (W.maxX - W.minX));
    const pr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = cw * pr; canvas.height = ch * pr;
    canvas.style.width = cw + 'px'; canvas.style.height = ch + 'px';
    const ctx = canvas.getContext('2d');

    // sylwetka liczona raz
    const bg = document.createElement('canvas');
    bg.width = cw * pr; bg.height = ch * pr;
    const bctx = bg.getContext('2d');
    const img = bctx.createImageData(bg.width, bg.height);
    for (let j = 0; j < bg.height; j++) for (let i = 0; i < bg.width; i++) {
      const x = W.minX + (i + 0.5) / bg.width * (W.maxX - W.minX);
      const y = W.maxY - (j + 0.5) / bg.height * (W.maxY - W.minY);
      const d = H.sample(x, y);
      const k = (j * bg.width + i) * 4;
      let r = 0, g = 0, b = 0, a = 0;
      if (d < 0) { const t = Math.min(1, -d / 8); r = 120 - t * 50; g = 18; b = 22; a = 235; }
      else if (d < 0.9) { r = 246; g = 170; b = 156; a = 255; }
      else if (d < 7.5) { r = 52; g = 14; b = 16; a = 200; }
      else if (d < 8.5) { r = 92; g = 40; b = 30; a = 140; }
      img.data[k] = r; img.data[k + 1] = g; img.data[k + 2] = b; img.data[k + 3] = a;
    }
    bctx.putImageData(img, 0, 0);

    const toX = (x) => (x - W.minX) / (W.maxX - W.minX) * cw;
    const toY = (y) => (W.maxY - y) / (W.maxY - W.minY) * ch;

    function draw(s, view) {
      ctx.setTransform(pr, 0, 0, pr, 0, 0);
      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(bg, 0, 0, cw, ch);

      ctx.font = '700 10px "Atkinson Hyperlegible", system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255, 220, 210, 0.55)';
      for (const L of LABELS) ctx.fillText(L.t, toX(L.x), toY(L.y));

      // kolonie
      ctx.fillStyle = '#c6e66a';
      ctx.strokeStyle = '#c6e66a'; ctx.lineWidth = 1.5;
      for (const c of s.colonies) {
        ctx.beginPath(); ctx.arc(toX(c.x), toY(c.y), 1.6 + 2.6 * (c.size ?? 1), 0, 6.283);
        if (c.inTissue) ctx.stroke(); else ctx.fill();   // w mięśniu: pierścień
      }

      // kadr kamery
      if (view) {
        const vh = 2 * view.zoom * Math.tan(C.camera.fov * Math.PI / 360);
        const vw = vh * view.camera.aspect;
        const x0 = toX(view.tx - vw / 2), y0 = toY(view.ty + vh / 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'; ctx.lineWidth = 1;
        ctx.strokeRect(x0 + 0.5, y0 + 0.5, vw / (W.maxX - W.minX) * cw, vh / (W.maxY - W.minY) * ch);
      }

      // bakteria
      const b = s.bact;
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
