// Lobby gry sieciowej: tworzenie gry (host) i dołączanie (gość) przez wymianę dwóch kodów.
(function () {
  const $ = (id) => document.getElementById(id);
  const ROLE_NAME = { bact: 'Bakteria', doc: 'Lekarz' };

  function status(text, kind) {
    const el = $('lobby-status');
    el.textContent = text || '';
    el.dataset.kind = kind || '';
  }
  async function copy(textarea, btn) {
    const done = () => { const t = btn.textContent; btn.textContent = 'Skopiowano'; setTimeout(() => { btn.textContent = t; }, 1500); };
    try { await navigator.clipboard.writeText(textarea.value); done(); }
    catch (e) { textarea.focus(); textarea.select(); status('Kod jest zaznaczony. Skopiuj go skrótem Ctrl+C.', 'info'); }
  }
  function show(which) {
    $('start').hidden = which !== 'start';
    $('lobby').hidden = which !== 'host' && which !== 'join';
    $('lobby-host').hidden = which !== 'host';
    $('lobby-join').hidden = which !== 'join';
    status('');
  }

  DD.Lobby = {
    init() {
      const N = DD.Net;

      $('net-host').addEventListener('click', () => show('host'));
      $('net-join').addEventListener('click', () => show('join'));
      $('lobby-back').addEventListener('click', () => { N.close(); N.mode = 'local'; N.role = 'both'; resetHost(); resetJoin(); show('start'); });

      // ---- host ----
      function resetHost() {
        $('host-offer').value = ''; $('host-answer').value = '';
        $('host-copy').disabled = true; $('host-connect').disabled = true;
        document.querySelectorAll('[data-host-role]').forEach((b) => b.setAttribute('aria-pressed', 'false'));
      }
      resetHost();
      document.querySelectorAll('[data-host-role]').forEach((btn) => {
        btn.addEventListener('click', async () => {
          document.querySelectorAll('[data-host-role]').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
          $('host-offer').value = ''; $('host-copy').disabled = true; $('host-connect').disabled = true;
          status('Przygotowuję kod zaproszenia…', 'info');
          try {
            const code = await N.host(btn.dataset.hostRole);
            $('host-offer').value = code;
            $('host-copy').disabled = false; $('host-connect').disabled = false;
            status(`Grasz jako ${ROLE_NAME[N.role]}. Wyślij kod drugiemu graczowi.`, 'info');
          } catch (e) { status(e.message || 'Nie udało się przygotować kodu.', 'error'); }
        });
      });
      $('host-copy').addEventListener('click', () => copy($('host-offer'), $('host-copy')));
      $('host-connect').addEventListener('click', async () => {
        if (!$('host-answer').value.trim()) { status('Wklej kod odpowiedzi od drugiego gracza.', 'error'); return; }
        status('Łączę…', 'info');
        try {
          await N.acceptAnswer($('host-answer').value);
          setTimeout(() => { if (!N.connected) status('Nie udało się połączyć. Sprawdźcie, czy kody są kompletne, i spróbujcie jeszcze raz. W niektórych sieciach (firmowych, części mobilnych) bezpośrednie połączenie jest zablokowane.', 'error'); }, 12000);
        } catch (e) { status(e.message || 'Kod odpowiedzi jest niepoprawny.', 'error'); }
      });

      // ---- gość ----
      function resetJoin() { $('join-offer').value = ''; $('join-answer').value = ''; $('join-copy').disabled = true; }
      resetJoin();
      $('join-make').addEventListener('click', async () => {
        if (!$('join-offer').value.trim()) { status('Wklej kod zaproszenia od hosta.', 'error'); return; }
        status('Przygotowuję kod odpowiedzi…', 'info');
        try {
          const code = await N.join($('join-offer').value);
          $('join-answer').value = code; $('join-copy').disabled = false;
          status(`Grasz jako ${ROLE_NAME[N.role]}. Odeślij kod hostowi. Połączenie zestawi się samo.`, 'info');
        } catch (e) { status(e.message || 'Kod zaproszenia jest niepoprawny.', 'error'); }
      });
      $('join-copy').addEventListener('click', () => copy($('join-answer'), $('join-copy')));

      // ---- połączono / rozłączono ----
      N.onConnected = () => {
        DD.applyLayout(N.role);
        $('lobby').hidden = true;
        if (N.mode === 'host') {
          $('start').hidden = false;
          document.body.dataset.net = 'host';
          DD.updateKindPickers();
          DD.showOrganPick(true);
          $('start-net-status').textContent = `Połączono z drugim graczem. Grasz jako ${ROLE_NAME[N.role]}. Wybierz narząd, żeby zacząć.`;
        } else {
          document.body.dataset.net = 'guest';
          DD.updateKindPickers();
          if (N.role === 'bact') DD.send({ type: 'bact.kind', kind: DD.chosenKind });
          $('wait-role').textContent = ROLE_NAME[N.role];
          $('wait').hidden = false;
        }
      };
      N.onClosed = (reason) => {
        if (reason === 'left') {
          $('net-lost-title').textContent = 'Drugi gracz opuścił grę';
          $('net-lost-text').textContent = 'Drugi gracz zamknął kartę z grą. Żeby zagrać znowu, wróćcie do menu i wymieńcie nowe kody.';
        }
        $('net-lost').hidden = false;
      };
      $('net-lost-reload').addEventListener('click', () => location.reload());
    }
  };
})();
