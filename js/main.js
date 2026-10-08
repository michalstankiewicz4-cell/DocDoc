// Pętla gry: komendy -> stały krok symulacji -> render + UI.
// Tryby: lokalny (obie połowy na jednym ekranie), host (liczy symulację), gość (odtwarza stan od hosta).
(function () {
  const C = DD.CONFIG;

  function boot() {
    const $ = (id) => document.getElementById(id);
    const N = DD.Net;
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
    const netStatus = DD.createNetStatus();

    // układ ekranu wg roli: obie połowy albo tylko swoja
    DD.applyLayout = function (role) {
      document.body.dataset.role = role;
      if (view) requestAnimationFrame(() => view.resize());
    };

    // dźwięk: włączany pierwszym gestem, przełącznik M lub przycisk
    const soundLabel = () => { $('sound-label').textContent = DD.Audio.on ? 'Dźwięk włączony' : 'Dźwięk wyłączony'; };
    soundLabel();
    $('btn-sound').addEventListener('click', () => { DD.Audio.toggle(); soundLabel(); $('btn-sound').blur(); });
    window.addEventListener('keydown', (e) => {
      if (e.target && e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'KeyM' && !e.repeat) { DD.Audio.toggle(); soundLabel(); }
      else if (DD.Audio.on) DD.Audio.init();
    });
    window.addEventListener('pointerdown', () => { if (DD.Audio.on) DD.Audio.init(); });

    // wybór narządu startowego (lokalnie albo host)
    document.querySelectorAll('[data-organ]').forEach((b) => {
      b.addEventListener('click', () => {
        if (b.disabled || N.mode === 'guest') return;
        DD.send({ type: 'game.start', organ: b.dataset.organ });
        $('start').hidden = true;
        if (view) { view.tx = C.bacteria.start.x; view.ty = C.bacteria.start.y; }
      });
    });
    $('end-again').addEventListener('click', () => {
      DD.send({ type: 'game.start', organ: 'heart' });
      $('end').hidden = true;
    });

    // wybór trybu: deweloperski (jeden ekran) albo gra na 2 osoby (lobby)
    DD.showOrganPick = function (on) {
      $('mode-pick').hidden = on;
      $('organ-pick').hidden = !on;
    };
    $('mode-dev').addEventListener('click', () => { DD.Net.mode = 'local'; DD.Net.role = 'both'; DD.applyLayout('both'); DD.showOrganPick(true); });
    $('mode-back').addEventListener('click', () => DD.showOrganPick(false));

    DD.Lobby.init();

    let acc = 0, last = performance.now(), wasRunning = false;

    // krok symulacji (host i tryb lokalny); maxSteps większy, gdy nadrabiamy czas w tle
    function simulate(dt, maxSteps) {
      acc += dt;
      let steps = 0;
      while (acc >= C.fixedDt && steps < maxSteps) {
        DD.Input.poll();
        DD.CommandBus.drain((cmd) => DD.Game.apply(state, cmd));
        DD.Game.step(state, C.fixedDt);
        acc -= C.fixedDt; steps++;
      }
      if (steps >= maxSteps) acc = 0;
      if (!state.running) { // tło przed startem: serce bije
        state.time += dt; state.phase = (state.time * C.bpm / 60) % 1;
        state.contraction = DD.Flow.contraction(state.phase);
        DD.Heart.VALVES.forEach((v, i) => { state.valves[i].open = DD.Flow.valveOpen(v.type, state.phase); });
        DD.Game.updateValveGeometry(state);
      }
      N.hostTick(state, dt);
    }

    // host w ukrytej karcie: przeglądarka wstrzymuje animację, więc symulację pcha zwykły zegar
    setInterval(() => {
      if (N.mode !== 'host' || !document.hidden) return;
      const now = performance.now();
      const dt = Math.min(2, (now - last) / 1000); last = now;
      simulate(dt, 150);
    }, 100);

    function frame(now) {
      const dt = Math.min(0.1, (now - last) / 1000); last = now;

      if (N.mode === 'guest') {
        DD.Input.poll();
        N.guestFrame(state, dt);
        if (state.running && !wasRunning) { $('wait').hidden = true; if (view) { view.tx = state.bact.x; view.ty = state.bact.y; } }
        wasRunning = state.running;
      } else {
        simulate(dt, 6);
      }

      // lekarz w trybie sieciowym nie widzi wnętrza serca — nie renderujemy 3D
      if (N.role !== 'doc') {
        if (view) view.frame(state, dt);
        minimap.draw(state, view);
      }
      DD.Audio.update(state.phase);
      netStatus.update(dt);
      ui.update(state);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    DD.debug = { get state() { return state; }, view };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
