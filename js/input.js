// Źródła komend lokalnych: klawiatura (bakteria + skróty lekarza).
// Sieć w przyszłości: osobne źródło, które wrzuca te same komendy do DD.CommandBus.
(function () {
  const keys = new Set();
  const BACT_KEYS = { KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1 };
  const DOC_KEYS = { KeyB: 'doc.test', Digit1: 'doc.antibodies', Digit2: 'doc.fever', Digit3: 'doc.slow' };

  window.addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    if (BACT_KEYS[e.code]) { keys.add(e.code); e.preventDefault(); }
    if (DOC_KEYS[e.code] && !e.repeat) DD.CommandBus.push({ type: DOC_KEYS[e.code] });
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  let lastX = 0, lastY = 0;
  DD.Input = {
    // wywoływane co krok symulacji; komenda tylko przy zmianie (oszczędza pasmo w trybie sieciowym)
    poll() {
      const x = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0);
      const y = (keys.has('KeyW') ? 1 : 0) - (keys.has('KeyS') ? 1 : 0);
      if (x !== lastX || y !== lastY) {
        lastX = x; lastY = y;
        DD.CommandBus.push({ type: 'bact.input', x, y });
      }
    }
  };
})();
