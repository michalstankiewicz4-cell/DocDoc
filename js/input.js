// Źródła komend lokalnych: klawiatura (bakteria + skróty lekarza).
// Komendy idą przez DD.send: lokalnie do DD.CommandBus, u gościa sieciowego do hosta.
(function () {
  const keys = new Set();
  const BACT_KEYS = { KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1 };
  const BACT_ACTIONS = { KeyE: 'bact.colony', KeyQ: 'bact.burrow', KeyF: 'bact.hide', KeyT: 'bact.toxin' };
  const MUT_KEYS = { Digit7: 'speed', Digit8: 'fever', Digit9: 'capsule', Digit0: 'toxins' };
  const DOC_KEYS = { Digit1: 'doc.antibodies', Digit2: 'doc.fever', Digit3: 'doc.abxA', Digit4: 'doc.abxB', Digit5: 'doc.antiviral' };
  // badania: Z CRP, X (albo B) posiew, C echo, V antybiogram
  const TEST_KEYS = { KeyZ: 'crp', KeyX: 'culture', KeyB: 'culture', KeyC: 'echo', KeyV: 'abg' };
  // operacja zastawki: H trójdzielna, J mitralna, K pnia płucnego, L aorty
  const SURG_KEYS = { KeyH: 'tricuspid', KeyJ: 'mitral', KeyK: 'pulmonary', KeyL: 'aortic' };

  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (BACT_KEYS[e.code]) { keys.add(e.code); e.preventDefault(); }
    if (DOC_KEYS[e.code] && !e.repeat) DD.send({ type: DOC_KEYS[e.code] });
    if (TEST_KEYS[e.code] && !e.repeat) DD.send({ type: 'doc.test', kind: TEST_KEYS[e.code] });
    if (BACT_ACTIONS[e.code] && !e.repeat) DD.send({ type: BACT_ACTIONS[e.code] });
    if (MUT_KEYS[e.code] && !e.repeat) DD.send({ type: 'bact.mutate', what: MUT_KEYS[e.code] });
    if (SURG_KEYS[e.code] && !e.repeat) DD.send({ type: 'doc.surgery', valve: SURG_KEYS[e.code] });
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  let lastX = 0, lastY = 0, lastSent = 0;
  DD.Input = {
    // komenda przy zmianie kierunku + co 0,3 s dla pewności (np. po restarcie rundy)
    poll() {
      const x = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
      const y = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
      const now = performance.now();
      if (x !== lastX || y !== lastY || now - lastSent > 300) {
        lastX = x; lastY = y; lastSent = now;
        DD.send({ type: 'bact.input', x, y });
      }
    }
  };
})();
