// Dźwięk bicia serca syntezowany w Web Audio (bez plików).
// "Lub" (S1) = zamknięcie zastawek przedsionkowo-komorowych na początku skurczu,
// "dub" (S2) = zamknięcie zastawek półksiężycowatych na końcu skurczu.
// Wszystko przechodzi przez filtr dolnoprzepustowy — słyszymy serce "od środka", przez krew.
(function () {
  const A = { ctx: null, on: true, master: null, out: null, lastPhase: 0 };
  try { A.on = localStorage.getItem('patientzero-sound') !== 'off'; } catch (e) { /* brak dostępu */ }

  // przeglądarki pozwalają włączyć dźwięk dopiero po geście użytkownika
  A.init = function () {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!A.ctx) {
      A.ctx = new AC();
      const lp = A.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 0.7;
      const comp = A.ctx.createDynamicsCompressor();
      A.master = A.ctx.createGain(); A.master.gain.value = A.on ? 0.9 : 0;
      lp.connect(comp); comp.connect(A.master); A.master.connect(A.ctx.destination);
      A.out = lp;
      // krótki szum do "mokrej" warstwy uderzenia
      const len = Math.floor(A.ctx.sampleRate * 0.25);
      A.noise = A.ctx.createBuffer(1, len, A.ctx.sampleRate);
      const ch = A.noise.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    }
    if (A.ctx.state === 'suspended') A.ctx.resume();
  };

  function thump(strength, f0, f1, dur) {
    const c = A.ctx, t = c.currentTime + 0.01;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(strength, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(A.out);
    o.start(t); o.stop(t + dur + 0.02);

    const n = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain();
    n.buffer = A.noise; nf.type = 'lowpass'; nf.frequency.value = 220;
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(strength * 0.6, t + 0.006);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.6);
    n.connect(nf); nf.connect(ng); ng.connect(A.out);
    n.start(t); n.stop(t + dur);
  }

  // wywoływane co klatkę z fazą cyklu serca
  A.update = function (phase) {
    if (!A.ctx || !A.on || A.ctx.state !== 'running') { A.lastPhase = phase; return; }
    const p0 = A.lastPhase, p1 = phase;
    const crossed = (x) => (p0 <= p1) ? (p0 < x && p1 >= x) : (p0 < x || p1 >= x);
    if (crossed(0.13)) thump(0.9, 68, 34, 0.17);   // lub
    if (crossed(0.45)) thump(0.6, 92, 48, 0.12);   // dub
    A.lastPhase = phase;
  };

  A.toggle = function () {
    A.on = !A.on;
    try { localStorage.setItem('patientzero-sound', A.on ? 'on' : 'off'); } catch (e) { /* brak dostępu */ }
    if (A.on) A.init();
    if (A.master) A.master.gain.setTargetAtTime(A.on ? 0.9 : 0, A.ctx.currentTime, 0.05);
    return A.on;
  };

  DD.Audio = A;
})();
