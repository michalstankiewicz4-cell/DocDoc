// Pętla gry: komendy -> stały krok symulacji -> render + UI.
// Tryby: lokalny (obie połowy na jednym ekranie), host (liczy symulację), gość (odtwarza stan od hosta).
(function () {
  const C = DD.CONFIG;

  function boot() {
    const $ = (id) => document.getElementById(id);
    const N = DD.Net;
    document.querySelectorAll('.js-version').forEach((el) => { DD.setText(el, DD.VERSION); });
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
    $('hud-map').hidden = !C.ui.minimap;   // minimapa ukryta, włącza ją C.ui.minimap
    const netStatus = DD.createNetStatus();
    const docCam = DD.createDoctorCam(state);
    const room = DD.createPatientRoom();
    const devices = DD.createDevices();

    // układ ekranu wg roli: obie połowy albo tylko swoja
    DD.applyLayout = function (role) {
      document.body.dataset.role = role;
      if (view) requestAnimationFrame(() => view.resize());
    };

    // dźwięk: włączany pierwszym gestem, przełącznik M lub przycisk
    const soundLabel = () => { DD.setText($('sound-label'), DD.Audio.on ? 'Dźwięk włączony' : 'Dźwięk wyłączony'); };
    soundLabel();
    $('btn-sound').addEventListener('click', () => { DD.Audio.toggle(); soundLabel(); $('btn-sound').blur(); });
    // głośność monitora lekarza (beep, alarmy, linia płaska)
    const beepShow = () => { const L = DD.Audio.beepLevel; DD.setText($('beep-lvl'), L ? '▮'.repeat(L) + '▯'.repeat(DD.Audio.BEEP_MAX - L) : '✕'); $('beep-lvl').title = L ? '' : 'Monitor wyciszony'; };
    beepShow();
    $('beep-down').addEventListener('click', (e) => { DD.Audio.setBeep(DD.Audio.beepLevel - 1); beepShow(); e.currentTarget.blur(); });
    $('beep-up').addEventListener('click', (e) => { DD.Audio.init(); DD.Audio.setBeep(DD.Audio.beepLevel + 1); beepShow(); e.currentTarget.blur(); });
    window.addEventListener('keydown', (e) => {
      if (e.target && e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'KeyM' && !e.repeat) { DD.Audio.toggle(); soundLabel(); }
      else if (e.code === 'Tab' && !/^(INPUT|SELECT)$/.test(e.target && e.target.tagName)) {
        e.preventDefault();   // Tab przełącza filtr pixel art zamiast przenosić fokus
        if (!e.repeat) DD.setPixelArt(DD.pixelArt + 1);   // zwykły → pixel art → styl z dokumentacji → zwykły
      }
      else if (DD.Audio.on) DD.Audio.init();
    });
    window.addEventListener('pointerdown', () => { if (DD.Audio.on) DD.Audio.init(); });

    // wybór narządu startowego (lokalnie albo host)
    document.querySelectorAll('[data-organ]').forEach((b) => {
      b.addEventListener('click', () => {
        if (b.disabled || N.mode === 'guest') return;
        // rodzaj patogenu wybiera gracz patogenu (lokalnie albo host-patogen); host-lekarz bierze wybór gościa
        DD.send({ type: 'game.start', organ: b.dataset.organ, kind: N.role === 'doc' ? undefined : DD.chosenKind });
        $('start').hidden = true;
        const st = DD.Heart.START[b.dataset.organ] || DD.Heart.START.heart;
        if (view) { view.tx = st.x; view.ty = st.y; }
      });
    });
    $('end-swap').addEventListener('click', () => DD.Match.swap());
    // powrót do menu: przeładowanie strony (w grze na 2 osoby kończy połączenie)
    $('end-menu').addEventListener('click', () => location.reload());
    $('end-again').addEventListener('click', () => {
      DD.send({ type: 'game.start', organ: state.organ || 'heart', kind: N.role === 'doc' ? undefined : DD.chosenKind });
      $('end').hidden = true;
    });

    // wybór trybu: deweloperski (jeden ekran) albo gra na 2 osoby (lobby)
    DD.showOrganPick = function (on) {
      $('mode-pick').hidden = on;
      $('organ-pick').hidden = !on;
    };
    $('mode-dev').addEventListener('click', () => { DD.Net.mode = 'local'; DD.Net.role = 'both'; DD.applyLayout('both'); DD.showOrganPick(true); });
    $('mode-back').addEventListener('click', () => DD.showOrganPick(false));

    // wybór rodzaju patogenu (zapamiętany w przeglądarce)
    DD.chosenKind = 'ecoli';
    try { const k = localStorage.getItem('patientzero-kind'); if (k) DD.chosenKind = DD.Game.speciesOf(k); } catch (e) { /* brak dostępu */ }
    const syncKind = () => document.querySelectorAll('.js-kind-pick button').forEach((x) => x.setAttribute('aria-pressed', String(x.dataset.kind === DD.chosenKind)));
    syncKind();
    document.querySelectorAll('.js-kind-pick button').forEach((btn) => btn.addEventListener('click', () => {
      DD.chosenKind = btn.dataset.kind; syncKind();
      try { localStorage.setItem('patientzero-kind', DD.chosenKind); } catch (e) { /* brak dostępu */ }
      DD.send({ type: 'bact.kind', kind: DD.chosenKind });
    }));
    // wybór widać tylko u gracza patogenu
    DD.updateKindPickers = function () {
      const pathogen = N.role !== 'doc';
      document.querySelectorAll('.js-kind-pick').forEach((el) => { el.hidden = !pathogen; });
    };
    DD.updateKindPickers();

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
        const prevT = state.time;
        N.guestFrame(state, dt);
        // nowa runda: start gry albo cofnięcie czasu (po meczu stan zostaje „running” z poprzedniej rundy)
        const newRound = state.running && !state.over && (!wasRunning || state.time < prevT - 0.5);
        if (newRound) { $('wait').hidden = true; $('end').hidden = true; if (view) { view.tx = state.bact.x; view.ty = state.bact.y; } }
        wasRunning = state.running;
      } else {
        simulate(dt, 6);
        if (state.over) DD.Match.record(state);
      }
      if (state.over && !$('end').hidden) DD.Match.renderEnd();

      // lekarz w trybie sieciowym nie widzi wnętrza serca — nie renderujemy 3D
      if (N.role !== 'doc') {
        if (view) view.frame(state, dt);
        if (C.ui.minimap) minimap.draw(state, view);
      }
      DD.Audio.update(state, N.role, dt);
      netStatus.update(dt);
      docCam.update(state, dt);
      if (N.role !== 'bact') { room.draw(state, dt); devices.update(state, dt); }
      ui.update(state);
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    DD.debug = { get state() { return state; }, view };
    // ekran ładowania znika, gdy wszystko jest gotowe
    { const L = document.getElementById('loader'); if (L) { L.classList.add('done'); setTimeout(() => L.remove(), 600); } }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
