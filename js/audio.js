// Dźwięk syntezowany w Web Audio (bez plików). Dwie warstwy zależne od roli gracza:
//
//  PATOGEN (rola 'bact'): wnętrze ciała — wszystko przytłumione filtrem dolnoprzepustowym, jak pod wodą.
//    - bicie serca: "lub" (S1, zamknięcie zastawek przedsionkowo-komorowych) i "dub" (S2, zamknięcie półksiężycowatych)
//    - szum płynącej krwi: głośniejszy w skurczu i w silnym prądzie
//    - kaszel pacjenta słyszany od środka (częstszy przy większym zakażeniu)
//
//  LEKARZ (rola 'doc'): sala szpitalna.
//    - pulsoksymetr: krótkie "beep" przy każdym uderzeniu serca (załamek R)
//    - alarm monitora przy gorączce od 39 °C
//    - dzwonek, gdy przychodzi wynik badania
//    - kaszel pacjenta słyszany w sali
//
// W trybie deweloperskim ('both') słychać obie warstwy, lekarza ciszej.
(function () {
  const A = { ctx: null, on: true, master: null, lastPhase: 0 };
  try { A.on = localStorage.getItem('patientzero-sound') !== 'off'; } catch (e) { /* brak dostępu */ }

  // przeglądarki pozwalają włączyć dźwięk dopiero po geście użytkownika
  A.init = function () {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    if (!A.ctx) {
      const c = A.ctx = new AC();
      A.master = c.createGain(); A.master.gain.value = A.on ? 0.9 : 0;
      const comp = c.createDynamicsCompressor();
      comp.connect(A.master); A.master.connect(c.destination);

      // warstwa patogenu: "pod wodą"
      A.inside = c.createGain();
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 0.7;
      A.inside.connect(lp); lp.connect(comp);

      // warstwa lekarza: sala (lekki pogłos z krótkiego opóźnienia)
      A.room = c.createGain();
      const dl = c.createDelay(0.5); dl.delayTime.value = 0.09;
      const fb = c.createGain(); fb.gain.value = 0.22;
      const wet = c.createGain(); wet.gain.value = 0.35;
      A.room.connect(comp); A.room.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(comp);

      // szum krwi: zapętlony szum przez filtry, głośność sterowana co klatkę
      const flowLen = c.sampleRate * 2, flowBuf = c.createBuffer(1, flowLen, c.sampleRate), fd = flowBuf.getChannelData(0);
      let last = 0;
      for (let i = 0; i < flowLen; i++) { last = last * 0.985 + (Math.random() * 2 - 1) * 0.12; fd[i] = last; } // szum "brązowy"
      const flow = c.createBufferSource(); flow.buffer = flowBuf; flow.loop = true;
      const flp = c.createBiquadFilter(); flp.type = 'lowpass'; flp.frequency.value = 260;
      A.flowGain = c.createGain(); A.flowGain.gain.value = 0;
      flow.connect(flp); flp.connect(A.flowGain); A.flowGain.connect(A.inside);
      flow.start();

      const len = Math.floor(c.sampleRate * 0.6);
      A.noise = c.createBuffer(1, len, c.sampleRate);
      const ch = A.noise.getChannelData(0);
      for (let i = 0; i < len; i++) ch[i] = Math.random() * 2 - 1;
    }
    if (A.ctx.state === 'suspended') A.ctx.resume();
  };

  function env(g, t, peak, attack, dur) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  }

  // ---------- patogen ----------
  function thump(strength, f0, f1, dur) {
    const c = A.ctx, t = c.currentTime + 0.01;
    const o = c.createOscillator(), g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    env(g, t, strength, 0.008, dur);
    o.connect(g); g.connect(A.inside);
    o.start(t); o.stop(t + dur + 0.02);
    const n = c.createBufferSource(), nf = c.createBiquadFilter(), ng = c.createGain();
    n.buffer = A.noise; nf.type = 'lowpass'; nf.frequency.value = 220;
    env(ng, t, strength * 0.6, 0.006, dur * 0.6);
    n.connect(nf); nf.connect(ng); ng.connect(A.inside);
    n.start(t); n.stop(t + dur);
  }

  // kaszel: dwa szybkie wydechy szumu przez filtr pasmowy (w sali jaśniej, od środka głucho)
  function cough(dest, center, q, vol) {
    const c = A.ctx, t0 = c.currentTime + 0.02;
    [0, 0.24].forEach((off, i) => {
      const t = t0 + off;
      const n = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
      n.buffer = A.noise; f.type = 'bandpass'; f.frequency.setValueAtTime(center * (i ? 0.85 : 1), t);
      f.frequency.exponentialRampToValueAtTime(center * 0.6, t + 0.25); f.Q.value = q;
      env(g, t, vol * (i ? 0.7 : 1), 0.012, 0.28);
      n.connect(f); f.connect(g); g.connect(dest);
      n.start(t); n.stop(t + 0.32);
    });
  }

  // ---------- lekarz ----------
  function tone(freq, start, dur, vol, type) {
    const c = A.ctx, o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(vol, start + 0.006);
    g.gain.setValueAtTime(vol, start + dur - 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    o.connect(g); g.connect(A.room);
    o.start(start); o.stop(start + dur + 0.02);
  }
  function pulseBeep() { tone(880, A.ctx.currentTime + 0.01, 0.07, 0.16); }
  // alarm średniego priorytetu: trzy tony (jak w monitorach zgodnych z IEC 60601-1-8)
  function feverAlarm() {
    const t = A.ctx.currentTime + 0.02;
    [523, 659, 784].forEach((f, i) => tone(f, t + i * 0.2, 0.15, 0.11, 'triangle'));
  }
  function resultChime() {
    const t = A.ctx.currentTime + 0.02;
    tone(988, t, 0.12, 0.12); tone(1319, t + 0.13, 0.22, 0.1);
  }

  // ---------- wywoływane co klatkę ----------
  let alarmT = 0, lastTestState = 0, lastCoughs = 0;
  A.update = function (s, role, dt) {
    const phase = s.phase;
    const p0 = A.lastPhase, p1 = phase;
    A.lastPhase = phase;
    const seq = s.doctor.resultSeq || 0;
    const resultNow = seq > lastTestState;
    lastTestState = seq;
    const coughNow = s.coughs > lastCoughs;
    lastCoughs = s.coughs;
    if (!A.ctx || !A.on || A.ctx.state !== 'running') return;

    const hearInside = role !== 'doc';
    const hearRoom = role !== 'bact';
    A.inside.gain.value = hearInside ? 1 : 0;
    A.room.gain.value = hearRoom ? (role === 'both' ? 0.55 : 1) : 0;

    const crossed = (x) => (p0 <= p1) ? (p0 < x && p1 >= x) : (p0 < x || p1 >= x);
    if (hearInside && crossed(0.13)) thump(0.9, 68, 34, 0.17);   // lub
    if (hearInside && crossed(0.45)) thump(0.6, 92, 48, 0.12);   // dub
    if (hearRoom && s.running && crossed(0.14)) pulseBeep();     // załamek R

    // szum krwi: skurcz + prędkość prądu przy patogenie
    if (hearInside) {
      const b = s.bact, sp = Math.hypot(b.fx || 0, b.fy || 0);
      const target = s.running && !b.transit ? 0.18 + 0.35 * s.contraction + Math.min(0.5, sp / 40) : 0.12;
      A.flowGain.gain.setTargetAtTime(target, A.ctx.currentTime, 0.08);
    } else A.flowGain.gain.setTargetAtTime(0, A.ctx.currentTime, 0.1);

    if (coughNow && s.running) {
      if (hearInside) cough(A.inside, 260, 1.2, 1.4);
      if (hearRoom) cough(A.room, 900, 1.6, 0.9);
    }

    if (hearRoom && s.running) {
      alarmT -= dt;
      if (s.doctor.temp >= 39 && alarmT <= 0) { feverAlarm(); alarmT = 6; }
      if (resultNow) resultChime();
    }
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
