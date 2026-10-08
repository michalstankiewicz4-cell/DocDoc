// Pętla gry: komendy -> stały krok symulacji -> render + UI.
(function () {
  const C = DD.CONFIG;

  function boot() {
    const $ = (id) => document.getElementById(id);
    try {
      DD.Heart.init();
      DD.Flow.init();
    } catch (e) { console.error(e); }

    let state = DD.Game.create();
    // geometria zastawek potrzebna do zbudowania sceny (mięśnie brodawkowate)
    state.running = true; DD.Game.step(state, 0); state.running = false;

    let view = null;
    try {
      view = DD.createView($('view-bacteria'), state);
    } catch (e) {
      console.error(e);
      $('gl-error').hidden = false;
    }
    const ui = DD.createUI();
    const minimap = DD.createMinimap($('minimap'));

    // dźwięk: włączany pierwszym gestem, przełącznik M lub przycisk
    const soundLabel = () => { $('sound-label').textContent = DD.Audio.on ? 'Dźwięk włączony' : 'Dźwięk wyłączony'; };
    soundLabel();
    $('btn-sound').addEventListener('click', () => { DD.Audio.toggle(); soundLabel(); $('btn-sound').blur(); });
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyM' && !e.repeat) { DD.Audio.toggle(); soundLabel(); }
      else DD.Audio.on && DD.Audio.init();
    });
    window.addEventListener('pointerdown', () => { if (DD.Audio.on) DD.Audio.init(); });

    // wybór narządu startowego
    document.querySelectorAll('[data-organ]').forEach((b) => {
      b.addEventListener('click', () => {
        if (b.disabled) return;
        DD.CommandBus.push({ type: 'game.start', organ: b.dataset.organ });
        $('start').hidden = true;
        if (view) { view.tx = C.bacteria.start.x; view.ty = C.bacteria.start.y; }
      });
    });
    $('end-again').addEventListener('click', () => {
      DD.CommandBus.push({ type: 'game.start', organ: 'heart' });
      $('end').hidden = true;
    });

    let acc = 0, last = performance.now();
    function frame(now) {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;
      acc += dt;
      let steps = 0;
      while (acc >= C.fixedDt && steps < 6) {
        DD.Input.poll();
        DD.CommandBus.drain((cmd) => DD.Game.apply(state, cmd));
        DD.Game.step(state, C.fixedDt);
        acc -= C.fixedDt; steps++;
      }
      if (!state.running) { // tło przed startem: serce bije
        state.time += dt; state.phase = (state.time * C.bpm / 60) % 1;
        state.contraction = DD.Flow.contraction(state.phase);
        DD.Heart.VALVES.forEach((v, i) => { state.valves[i].open = DD.Flow.valveOpen(v.type, state.phase); });
        DD.Game.updateValveGeometry(state);
      }
      if (view) view.frame(state, dt);
      minimap.draw(state, view);
      DD.Audio.update(state.phase);
      ui.update(state);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    DD.debug = { get state() { return state; }, view };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
