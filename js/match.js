// Mecz z zamianą ról (gra na 2 osoby): 2 rundy, po pierwszej gracze zamieniają się rolami.
// Wynik prowadzi host i wysyła go gościowi. Przy remisie 1:1 wygrywa szybsze zwycięstwo.
(function () {
  const $ = (id) => document.getElementById(id);
  const ROLE = { bact: 'patogen', doc: 'lekarz' };
  const mmss = (t) => { const m = Math.floor(t / 60), s = Math.floor(t % 60); return `${m}:${s < 10 ? '0' : ''}${s}`; };

  const M = { results: [], recordedFor: null, suppressEnd: false };
  M.ROUNDS = 2;

  // host zapisuje wynik rundy: kto wygrał (host/gość) i jaką rolą
  M.record = function (s) {
    const N = DD.Net;
    if (N.mode !== 'host' || !s.over || M.recordedFor === s.stats) return;   // jedna runda = jeden obiekt statystyk
    if (M.results.length >= M.ROUNDS) return;
    M.recordedFor = s.stats;
    const winRole = s.over === 'doctor' ? 'doc' : 'bact';
    M.results.push({ winner: winRole === N.role ? 'host' : 'guest', role: winRole, time: Math.round(s.time) });
    N.sendReliable({ m: 'match', results: M.results });
  };

  // wynik z perspektywy tego gracza
  function me() { return DD.Net.mode === 'host' ? 'host' : 'guest'; }
  function summary() {
    const R = M.results, mine = R.filter((r) => r.winner === me()).length, theirs = R.length - mine;
    let verdict = '';
    if (R.length >= M.ROUNDS) {
      if (mine !== theirs) verdict = mine > theirs ? `Wygrywasz mecz ${mine}:${theirs}.` : `Przegrywasz mecz ${mine}:${theirs}.`;
      else {
        // remis: szybsze zwycięstwo wygrywa
        const myWin = R.find((r) => r.winner === me()), theirWin = R.find((r) => r.winner !== me());
        verdict = myWin.time === theirWin.time ? `Remis ${mine}:${theirs}, oba zwycięstwa w tym samym czasie.`
          : myWin.time < theirWin.time ? `Remis ${mine}:${theirs}, ale wygrywasz szybszym zwycięstwem (${mmss(myWin.time)} wobec ${mmss(theirWin.time)}).`
          : `Remis ${mine}:${theirs}, ale przeciwnik wygrał szybciej (${mmss(theirWin.time)} wobec ${mmss(myWin.time)}).`;
      }
    }
    return { mine, theirs, verdict };
  }

  // ekran końcowy: blok meczu i przyciski
  M.renderEnd = function () {
    const N = DD.Net, net = N.mode !== 'local';
    $('end-match').hidden = !net;
    $('end-swap').hidden = !net;
    if (!net) return;
    const R = M.results;
    $('end-match-rounds').innerHTML = R.map((r, i) => `<li><b>Runda ${i + 1}</b>: ${r.winner === me() ? 'wygrywasz' : 'wygrywa przeciwnik'} jako ${ROLE[r.role]} (${mmss(r.time)})</li>`).join('')
      || '<li>Wynik rundy jeszcze się zapisuje…</li>';
    const S = summary();
    $('end-match-verdict').textContent = S.verdict || `Runda ${R.length} z ${M.ROUNDS}. Stan meczu ${S.mine}:${S.theirs}.`;
    $('end-swap').textContent = R.length >= M.ROUNDS ? 'Nowy mecz (zamiana ról)' : 'Rewanż z zamianą ról';
  };

  // zamiana ról: gość prosi hosta, host zamienia i informuje gościa
  M.swap = function () {
    const N = DD.Net;
    if (N.mode === 'guest') { N.sendReliable({ m: 'swap' }); return; }
    if (N.mode !== 'host') return;
    if (M.results.length >= M.ROUNDS) M.results = [];   // nowy mecz
    N.role = N.otherRole(N.role);
    N.sendReliable({ m: 'role', role: N.otherRole(N.role), results: M.results });
    afterSwap();
  };
  function afterSwap() {
    const N = DD.Net;
    M.suppressEnd = true;
    $('end').hidden = true;
    DD.applyLayout(N.role);
    DD.updateKindPickers();
    if (N.mode === 'host') {
      $('start').hidden = false;
      DD.showOrganPick(true);
      $('start-net-status').textContent = `Runda ${M.results.length + 1} z ${M.ROUNDS}. Grasz teraz jako ${N.role === 'bact' ? 'patogen' : 'lekarz'}. Wybierz narząd, żeby zacząć.`;
    } else {
      $('wait-role').textContent = N.role === 'bact' ? 'Patogen' : 'Lekarz';
      $('wait').hidden = false;
      if (N.role === 'bact') DD.send({ type: 'bact.kind', kind: DD.chosenKind });
    }
  }
  // wiadomości od drugiego gracza (wywoływane z net.js)
  M.onMessage = function (m) {
    const N = DD.Net;
    if (m.m === 'swap' && N.mode === 'host') M.swap();
    else if (m.m === 'role' && N.mode === 'guest') { N.role = m.role; M.results = m.results || []; afterSwap(); }
    else if (m.m === 'match' && N.mode === 'guest') { M.results = m.results || []; if (!$('end').hidden) M.renderEnd(); }
  };

  DD.Match = M;
})();
