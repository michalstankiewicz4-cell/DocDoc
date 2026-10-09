// Wskaźnik połączenia (róg ekranu), ostrzeżenie o słabym połączeniu i panel szczegółów (klawisz I).
(function () {
  const $ = (id) => document.getElementById(id);
  const LABEL = { good: 'Dobre połączenie', weak: 'Słabe połączenie', stalled: 'Brak danych', lost: 'Rozłączono' };
  const ROLE = { bact: 'Bakteria', doc: 'Lekarz', both: 'Obie role' };

  function kb(n) { return n < 1024 ? n + ' B' : n < 1048576 ? (n / 1024).toFixed(1).replace('.', ',') + ' kB' : (n / 1048576).toFixed(2).replace('.', ',') + ' MB'; }

  DD.createNetStatus = function () {
    const N = DD.Net, S = N.stats;
    const badge = $('net-badge'), details = $('net-details'), weak = $('net-weak');
    let open = false, acc = 0;

    function toggle(force) {
      open = typeof force === 'boolean' ? force : !open;
      details.hidden = !open;
      badge.setAttribute('aria-expanded', String(open));
    }
    badge.addEventListener('click', () => toggle());
    window.addEventListener('keydown', (e) => {
      if (e.target && e.target.tagName === 'TEXTAREA') return;
      if (e.code === 'KeyI' && !e.repeat && N.mode !== 'local' && N.role !== 'doc') toggle();   // u lekarza I to PCR
    });

    function update(dt) {
      const active = N.mode !== 'local' && (N.connected || N.stats.recvSnaps > 0 || N.stats.sentSnaps > 0);
      badge.hidden = !active;
      if (!active) { weak.hidden = true; details.hidden = true; return; }
      N.updateSilence();
      const q = N.quality();

      // ostrzeżenie: od 2 s ciszy do zerwania (6 s)
      weak.hidden = !(N.connected && q === 'stalled');
      if (!weak.hidden) DD.setText($('net-weak-t'), Math.max(0, Math.ceil((6000 - S.silence) / 1000)));

      acc += dt;
      if (acc < 0.25) return;
      acc = 0;
      badge.dataset.q = q;
      DD.setText($('nb-label'), LABEL[q]);
      DD.setText($('nb-ping'), S.rtt == null ? '— ms' : Math.round(S.rtt) + ' ms');
      DD.setText($('nb-rate'), S.snapRate + '/s');

      if (!open) return;
      const lossBase = S.recvSnaps + S.lostSnaps;
      DD.setText($('nd-role'), `${ROLE[N.role]} (${N.mode === 'host' ? 'host, liczy symulację' : 'gość'})`);
      DD.setText($('nd-route'), S.route);
      DD.setText($('nd-ping'), S.rtt == null ? '—' : Math.round(S.rtt) + ' ms');
      DD.setText($('nd-silence'), (S.silence / 1000).toFixed(1).replace('.', ',') + ' s');
      DD.setText($('nd-rate'), N.mode === 'host' ? `${S.snapRate}/s wysyłane` : `${S.snapRate}/s odbierane`);
      DD.setText($('nd-lost'), N.mode === 'host' ? 'liczy gość' : `${S.lostSnaps} z ${lossBase} (${lossBase ? ((S.lostSnaps / lossBase) * 100).toFixed(1).replace('.', ',') : '0'}%)`);
      DD.setText($('nd-sent'), `${kb(S.bytesSent)} w ${S.msgsSent} wiadomościach`);
      DD.setText($('nd-recv'), `${kb(S.bytesRecv)} w ${S.msgsRecv} wiadomościach`);
    }
    return { update };
  };
})();
