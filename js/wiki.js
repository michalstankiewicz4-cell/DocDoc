// Wiki lekarza: baza wiedzy w grze (patogeny, badania, leczenie, objawy, pacjenci, inne).
// Nie instrukcja — zbiór faktów, które lekarz może sprawdzić w trakcie rundy. Liczby czytane z DD.CONFIG.
// Teksty są dwujęzyczne (T(pl, en)), nazwy z konfiguracji tłumaczy DD.t.
(function () {
  'use strict';
  const C = DD.CONFIG, D = C.doctor;
  const $ = (id) => document.getElementById(id);
  const EN = () => DD.lang === 'en';
  const T = (pl, en) => (EN() ? en : pl);
  const tr = (s) => DD.t(s);
  const pct = (v) => Math.round(v * 100) + '%';
  const sgn = (v) => (v > 0 ? '+' : '−') + Math.abs(Math.round(v * 100)) + '%';
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

  const KIND = {
    bacteria: [T('Bakteria', 'Bacterium'), '#6fe3b4'],
    virus: [T('Wirus', 'Virus'), '#c9a2ff'],
    fungus: [T('Grzyb', 'Fungus'), '#f0e2b8'],
    cancer: [T('Nowotwór', 'Cancer'), '#e58aa8']
  };
  const GRAM = { staph: '+', strep: '+', ecoli: '−', candida: '+' };

  // ---------- treść sekcji ----------
  function sectionPathogens() {
    const kinds = [
      ['bacteria', T('Komórki z własnym metabolizmem. Kolonie tworzą biofilm na ścianach. Rosną na posiewie, w rozmazie przeważają neutrofile. Leczenie: antybiotyki (β-laktam bójczy, makrolid statyczny).',
        'Cells with their own metabolism. Colonies form biofilm on the walls. They grow in culture, neutrophils dominate the differential. Treatment: antibiotics (bactericidal β-lactam, bacteriostatic macrolide).')],
      ['virus', T(`Mniejsze (${C.virus.hp} życia zamiast ${C.bacteria.hp}), wolniejsze (×${String(C.virus.speedMul).replace('.', ',')}), kolonie rosną szybciej (×${String(C.virus.growthMul).replace('.', ',')}). Posiew zawsze ujemny, CRP mimo to rośnie, w rozmazie przeważają limfocyty. Antybiotyki nie działają.`,
        `Smaller (${C.virus.hp} vitality instead of ${C.bacteria.hp}), slower (×${C.virus.speedMul}), colonies grow faster (×${C.virus.growthMul}). Culture always negative while CRP still rises, lymphocytes dominate. Antibiotics do not work.`)],
      ['fungus', T(`Grzybnia: z każdej kolonii na ścianie rośnie strzępka; po ${C.fungus.branchLen} j. na jej końcu powstaje nowa kolonia (do ${C.fungus.maxColonies}). Magazyny zarodników wypuszczają zarodniki do krwi i są słabo wrażliwe na leki (×${String(C.fungus.storeShrink).replace('.', ',')}). Posiew dodatni, neutrofile, grzyby w moczu. Działa tylko lek przeciwgrzybiczy.`,
        `Mycelium: a hypha grows from every wall colony; after ${C.fungus.branchLen} u. a new colony forms at its tip (up to ${C.fungus.maxColonies}). Spore stores release spores into the blood and resist drugs (×${C.fungus.storeShrink}). Culture positive, neutrophils, fungi in urine. Only the antifungal works.`)],
      ['cancer', T(`Komórki pacjenta: posiew, PCR i rozmaz bez zmian, w mikroskopie komórki atypowe. Kolonie to guzy: bez własnych naczyń zatrzymują się na małym rozmiarze (${String(C.cancer.smallCap).replace('.', ',')}); po angiogenezie rosną dalej (średni od ${String(C.cancer.stages[0]).replace('.', ',')}, duży od ${String(C.cancer.stages[1]).replace('.', ',')}). Duże guzy wyłączają narząd i dają przerzuty. Działają chemio- i radioterapia; przeciwciała o połowę słabiej.`,
        `The patient’s own cells: culture, PCR and differential unchanged, atypical cells under the microscope. Colonies are tumours: without their own vessels they stop at a small size (${C.cancer.smallCap}); after angiogenesis they keep growing (medium from ${C.cancer.stages[0]}, large from ${C.cancer.stages[1]}). Large tumours shut organs down and metastasise. Chemo- and radiotherapy work; antibodies at half strength.`)]
    ];
    let h = `<h3>${T('Rodzaje', 'Types')}</h3><div class="wk-grid wk-grid-3">`;
    for (const [k, txt] of kinds) {
      h += `<article class="wk-card"><img class="wk-shot" src="img/wiki/colony-${k}.jpg" alt="" loading="lazy">
        <h4><span class="wk-dot" style="background:${KIND[k][1]}"></span>${KIND[k][0]}</h4><p>${txt}</p></article>`;
    }
    h += `</div><h3>${T('Gatunki', 'Species')}</h3><div class="wk-list">`;
    for (const id in C.species) {
      const sp = C.species[id], traits = [];
      if ((sp.speed ?? 1) !== 1) traits.push(T(`ruch ${sgn(sp.speed - 1)}`, `movement ${sgn(sp.speed - 1)}`));
      if ((sp.growth ?? 1) !== 1) traits.push(T(`wzrost kolonii ${sgn(sp.growth - 1)}`, `colony growth ${sgn(sp.growth - 1)}`));
      if ((sp.biofilm ?? 1) !== 1) traits.push(T(`przeciwciała niszczą kolonie o ${pct(1 - sp.biofilm)} słabiej`, `antibodies damage colonies ${pct(1 - sp.biofilm)} less`));
      if (sp.natural) traits.push(T(`naturalna oporność: ${sp.natural === 'abxA' ? 'β-laktam' : 'makrolid'} (${pct(D.naturalResistance)} skuteczności)`, `natural resistance: ${sp.natural === 'abxA' ? 'β-lactam' : 'macrolide'} (${pct(D.naturalResistance)} efficacy)`));
      if (sp.kind === 'virus') traits.push(T(`lek przeciwwirusowy: ${pct(sp.antiviral ?? 1)}`, `antiviral: ${pct(sp.antiviral ?? 1)}`));
      const tests = sp.kind === 'cancer' ? T('posiew i PCR ujemne · rozmaz prawidłowy · komórki atypowe', 'culture and PCR negative · normal differential · atypical cells')
        : sp.kind === 'virus'
        ? T('posiew ujemny · limfocyty · mikroskop elektronowy', 'culture negative · lymphocytes · electron microscope')
        : T(`posiew dodatni · neutrofile · Gram${GRAM[id] || ''}`, `culture positive · neutrophils · Gram${GRAM[id] || ''}`);
      h += `<article class="wk-row">
        <img class="wk-thumb" src="img/wiki/pathogen-${id}.jpg" alt="" loading="lazy">
        <canvas class="wk-thumb wk-micro" data-species="${id}" width="96" height="96"></canvas>
        <div class="wk-body">
          <h4>${esc(tr(sp.name))} <small><i>${esc(tr(sp.latin))}</i></small> <span class="wk-tag" style="--c:${KIND[sp.kind][1]}">${KIND[sp.kind][0]}</span></h4>
          <p><b>${T('Mikroskop', 'Microscope')}:</b> ${esc(tr(sp.micro))}</p>
          <p><b>${T('Leczenie', 'Treatment')}:</b> ${esc(tr(sp.treat))}</p>
          <p class="wk-dim">${tests}${traits.length ? ' · ' + traits.join(' · ') : ''}</p>
        </div></article>`;
    }
    return h + '</div>';
  }

  const TEST_INFO = {
    crp: [T('Białko ostrej fazy. Rośnie z kolonizacją (także przy wirusie i grzybie), ale z szumem pomiaru. Monitor wylicza z niego szacunek zakażenia „≈”. Toksyny zawyżają wynik, maskowanie go obniża.',
      'Acute-phase protein. Rises with colonization (also with viruses and fungi) but is noisy. The monitor estimates infection “≈” from it. Toxins inflate it, masking lowers it.')],
    culture: [T('Hodowla z krwi: dokładna kolonizacja i liczba komórek patogenu we krwi (oryginał + kopie / zarodniki). Wirus nie rośnie na podłożu — wynik ujemny. Dodatni posiew odblokowuje antybiogram.',
      'Blood culture: exact colonization and number of pathogen cells in the blood (original + copies / spores). Viruses do not grow — negative result. A positive culture unlocks the antibiogram.')],
    echo: [T('Obraz samego serca. Kolonie na ścianach jako jasne ogniska; kolonie w mięśniu tylko jako niewyraźne zgrubienia (położenie przybliżone). Każde ognisko wykrywane osobno.',
      'Image of the heart only. Wall colonies show as bright foci; colonies in the muscle only as blurry thickenings (approximate position). Each focus is detected separately.'), 'test-echo.png'],
    usg: [T('Obraz wątroby, nerki i naczyń brzucha. Ogniska z podziałem na narządy.', 'Image of the liver, kidney and abdominal vessels. Foci split by organ.'), 'test-usg.png'],
    abg: [T('Skuteczność kolejnej dawki każdego leczenia z uwzględnieniem oporności nabytej i naturalnej. Wymaga dodatniego posiewu.', 'Efficacy of the next dose of each treatment, including acquired and natural resistance. Requires a positive culture.')],
    micro: [T('Preparat krwi do przeszukania. Rodzaj patogenu i podpowiedź leczenia po znalezieniu drobnoustroju. Pusty, gdy patogen nie płynął we krwi i nie ma kopii ani kolonii poza mięśniem.',
      'Blood smear to search. Pathogen type and treatment hint once you find the microbe. Empty when the pathogen was not in the blood and there are no copies or colonies outside the muscle.')],
    cbc: [T('Leukocyty rosną z zakażeniem. Rozmaz (od ~8% zakażenia): neutrofile — bakteria lub grzyb, limfocyty — wirus.', 'White cells rise with infection. Differential (from ~8% infection): neutrophils — bacterium or fungus, lymphocytes — virus.')],
    pcr: [T('Materiał genetyczny patogenu we krwi: rodzaj bez szukania pod mikroskopem. Te same warunki wykrycia co mikroskop.', 'Pathogen genetic material in the blood: the type without searching the smear. Same detection conditions as the microscope.')],
    urine: [T(`Krwinki czerwone, bakterie i grzyby w moczu, gdy w nerce są kolonie (masa > ${String(D.tests.urine.minMass).replace('.', ',')}). Potwierdza albo podważa objaw „krew w moczu”.`, `Red cells, bacteria and fungi in the urine when the kidney has colonies (mass > ${D.tests.urine.minMass}). Confirms or questions the “blood in urine” symptom.`)],
    ct: [T('Przekrój całego ciała: dokładne położenie wszystkich ognisk, także w mięśniu serca.', 'Whole-body slice: exact position of all foci, including the heart muscle.'), 'test-ct.png']
  };
  function sectionTests() {
    let h = `<p class="wk-lead">${T('Wynik opisuje chwilę pobrania próbki, nie chwilę odczytu. Badania mogą biec równolegle. Pierwszy wynik odblokowuje leczenie.',
      'A result describes the moment the sample was taken, not when it is read. Tests can run in parallel. The first result unlocks treatment.')}</p><div class="wk-list">`;
    for (const t of DD.DOC_TESTS) {
      const cfg = D.tests[t.kind], info = TEST_INFO[t.kind] || [''];
      const meta = [T(`czas ${cfg.duration} s`, `time ${cfg.duration} s`), T(`odnowienie ${cfg.cooldown} s`, `cooldown ${cfg.cooldown} s`)];
      if (cfg.sens) meta.push(T(`czułość ${pct(cfg.sens)}`, `sensitivity ${pct(cfg.sens)}`));
      h += `<article class="wk-row">${info[1] ? `<img class="wk-thumb wk-img" src="img/wiki/${info[1]}" alt="" loading="lazy">` : `<span class="wk-thumb wk-icon">${DD.docIcon(t.kind)}</span>`}
        <div class="wk-body"><h4>${esc(tr(t.name))} <kbd>${t.key}</kbd></h4><p>${info[0]}</p><p class="wk-dim">${meta.join(' · ')}</p></div></article>`;
    }
    h += `</div><h3>${T('Co zakłóca badania', 'What disrupts tests')}</h3><ul class="wk-ul">
      <li>${T(`Toksyny patogenu: przez ${C.toxins.distortion} s CRP ×1,6 i 3× większy szum, echo i USG przesunięte o ±4 j.`, `Pathogen toxins: for ${C.toxins.distortion} s CRP ×1.6 with 3× noise, echo and ultrasound shifted by ±4 u.`)}</li>
      <li>${T(`Maskowanie (mutacja patogenu): czułość niższa o ${pct(C.mutations.mask.sens)} na poziom, CRP i leukocyty niższe o ${pct(C.mutations.mask.crp)}.`, `Masking (pathogen mutation): sensitivity ${pct(C.mutations.mask.sens)} lower per level, CRP and white cells ${pct(C.mutations.mask.crp)} lower.`)}</li>
      <li>${T('Czułość poniżej 100% oznacza wyniki fałszywie ujemne — badanie warto powtórzyć.', 'Sensitivity below 100% means false negatives — repeat the test.')}</li></ul>`;
    return h;
  }

  const DRUG_INFO = {
    antibodies: [T('Immunoglobuliny w całym krwiobiegu. Szukają patogenu, kopii i kolonii na ścianach; nie odróżniają oryginału od kopii. Nie docierają do mięśnia ani do patogenu ukrytego w kolonii.', 'Immunoglobulins throughout the bloodstream. They seek the pathogen, copies and wall colonies; they cannot tell the original from copies. They do not reach the muscle or a pathogen hidden in a colony.'), '#f2deb0', T('wszystkie', 'all')],
    fever: [T(`Temperatura do ${String(D.fever.temp).replace('.', ',')} °C przez ${D.fever.duration} s. Rani patogen i spowalnia wzrost kolonii, ale też obciąża pacjenta.`, `Temperature up to ${D.fever.temp} °C for ${D.fever.duration} s. Damages the pathogen and slows colony growth, but also strains the patient.`), '#ffb347', T('wszystkie', 'all')],
    abxA: [T('Bakteriobójczy: rani bakterię i kurczy kolonie.', 'Bactericidal: damages the bacterium and shrinks colonies.'), '#7fd0ff', T('bakterie', 'bacteria')],
    abxB: [T('Bakteriostatyczny: spowalnia bakterię i wstrzymuje wzrost kolonii.', 'Bacteriostatic: slows the bacterium and stops colony growth.'), '#b9a2ff', T('bakterie', 'bacteria')],
    antiviral: [T('Rani wirusa, spowalnia go i wstrzymuje wzrost kolonii. Skuteczność zależy od wirusa.', 'Damages the virus, slows it and stops colony growth. Efficacy depends on the virus.'), '#ff9ad0', T('wirusy', 'viruses')],
    antifungal: [T('Rani grzyba, kurczy grzybnię i wstrzymuje strzępki; magazyny zarodników słabiej.', 'Damages the fungus, shrinks the mycelium and stops hyphae; spore stores less.'), '#a8e07a', T('grzyby', 'fungi')],
    chemo: [T('Działa w całym organizmie: rani komórkę nowotworową i kurczy wszystkie guzy, także w mięśniu (słabiej). Najmocniej obciąża pacjenta. Bez skrótu klawiszowego (menu Leczenie).', 'Works throughout the body: damages the cancer cell and shrinks all tumours, also in the muscle (less). Strains the patient most. No keyboard shortcut (Treatment menu).'), '#ff7aa8', T('nowotwór', 'cancer')]
  };
  function sectionDrugs() {
    let h = '<div class="wk-list">';
    for (const a of DD.DOC_ACTIONS) {
      const cfg = D[a.cd], info = DRUG_INFO[a.cd] || ['', '#ccc', ''];
      const meta = [T(`działa na: ${info[2]}`, `works on: ${info[2]}`)];
      if (cfg.duration) meta.push(T(`czas działania ${cfg.duration} s`, `lasts ${cfg.duration} s`));
      meta.push(T(`odnowienie ${cfg.cooldown} s`, `cooldown ${cfg.cooldown} s`), T(`stan pacjenta −${C.patient.sideEffect[a.cd] || 0}`, `patient condition −${C.patient.sideEffect[a.cd] || 0}`));
      h += `<article class="wk-row"><span class="wk-thumb wk-icon" style="color:${info[1]}">${DD.docIcon(a.cd)}</span>
        <div class="wk-body"><h4>${esc(tr(a.name))} <kbd>${a.key}</kbd></h4><p>${info[0]}</p><p class="wk-dim">${meta.join(' · ')}</p></div></article>`;
    }
    const R = C.resistance, steps = [];
    for (let i = 0, r = 0; i < 6; i++) { steps.push(pct(1 - r)); r = Math.min(R.max, r + R.perUse); }
    const SU = D.surgery;
    h += `</div><h3>${T('Oporność', 'Resistance')}</h3><ul class="wk-ul">
      <li>${T(`Nabyta: każda kolejna dawka tego samego leczenia działa słabiej: ${steps.join(', ')}…`, `Acquired: every further dose of the same treatment works weaker: ${steps.join(', ')}…`)}</li>
      <li>${T(`Naturalna: gronkowiec MRSA — β-laktam, E. coli — makrolid (${pct(D.naturalResistance)} skuteczności).`, `Natural: MRSA staph — β-lactam, E. coli — macrolide (${pct(D.naturalResistance)} efficacy).`)}</li>
      <li>${T('Leki słabiej docierają do kolonii w mięśniu serca.', 'Drugs reach colonies in the heart muscle less well.')}</li></ul>
      <h3>${T('Radioterapia', 'Radiotherapy')}</h3><p>${T(`Naświetla jeden narząd (serce, wątroba albo nerka) przez ${D.radio.duration} s: mocno kurczy guzy w nim i rani komórkę nowotworową, jeśli w nim jest. Stan pacjenta −${C.patient.sideEffect.radio}, kolejna po ${D.radio.cooldown} s. Menu Zabiegi. Na drobnoustroje nie działa.`,
        `Irradiates one organ (heart, liver or kidney) for ${D.radio.duration} s: strongly shrinks tumours there and damages the cancer cell if it is inside. Patient condition −${C.patient.sideEffect.radio}, next after ${D.radio.cooldown} s. Procedures menu. No effect on microbes.`)}</p>
      <h3>${T('Operacja zastawki', 'Valve surgery')}</h3><p>${T(`Trwa ${SU.duration} s, stan pacjenta −${SU.patientCost}. Usuwa ogniska w promieniu ${String(SU.radius).replace('.', ',')} j. od zastawki (także w ścianie), patogen w pobliżu traci ${SU.pathogenDamage} życia. Kolejna po ${SU.cooldown} s. Klawisze H, J, K, L.`,
        `Takes ${SU.duration} s, patient condition −${SU.patientCost}. Removes foci within ${SU.radius} u. of the valve (also in the wall); a pathogen nearby loses ${SU.pathogenDamage} vitality. Next after ${SU.cooldown} s. Keys H, J, K, L.`)}</p>`;
    return h;
  }

  function sectionSymptoms() {
    const rows = [
      [T('Kaszel', 'Cough'), T('kolonie w prawym sercu (krążenie płucne)', 'colonies in the right heart (pulmonary circulation)')],
      [T('Duszność', 'Shortness of breath'), T('więcej kolonii w prawym sercu albo zły stan pacjenta', 'more colonies in the right heart or poor patient condition')],
      [T('Zaburzenia rytmu serca', 'Heart rhythm disorder'), T('kolonie w lewym sercu; widać je też na EKG', 'colonies in the left heart; also visible on the ECG')],
      [T('Obrzęk nóg', 'Leg swelling'), T('kolonie przy żyle głównej dolnej', 'colonies at the inferior vena cava')],
      [T('Żółtaczka', 'Jaundice'), T('kolonie w wątrobie (żółte białka oczu, skóra)', 'colonies in the liver (yellow eyes, skin)')],
      [T('Krew w moczu', 'Blood in urine'), T('kolonie w nerce (czerwony mocz w worku)', 'colonies in the kidney (red urine in the bag)')],
      [T('Gorączka, poty', 'Fever, sweating'), T('temperatura od 37,8 °C', 'temperature from 37.8 °C')],
      [T('Bladość, sinica', 'Pallor, cyanosis'), T('stan pacjenta poniżej 55% / 25%', 'patient condition below 55% / 25%')],
      [T('Chudnięcie, osłabienie', 'Weight loss, weakness'), T('nowotwór w zaawansowanym stadium', 'advanced cancer')],
      [T('Niewydolność serca / wątroby / nerek', 'Heart / liver / kidney failure'), T(`guzy o masie od ${String(C.cancer.organFail).replace('.', ',')} w narządzie; dodatkowo pogarszają stan pacjenta`, `tumours with mass from ${C.cancer.organFail} in the organ; they also worsen the patient`)]
    ];
    return `<img class="wk-wide" src="img/wiki/room.png" alt="" loading="lazy">
      <table class="wk-table"><thead><tr><th>${T('Objaw', 'Symptom')}</th><th>${T('Przyczyna', 'Cause')}</th></tr></thead><tbody>
      ${rows.map(([a, b]) => `<tr><td>${a}</td><td>${b}</td></tr>`).join('')}</tbody></table>
      <ul class="wk-ul"><li>${T('Objaw pojawia się, gdy masa kolonii w danym obszarze przekroczy próg; przy dużej masie jest nasilony (czerwony).', 'A symptom appears when colony mass in an area passes a threshold; with large mass it is severe (red).')}</li>
      <li>${T(`Fałszywe objawy: patogen może przez ${C.signals.duration} s wywołać objaw w obszarze bez kolonii (sygnały chemiczne). Echo, USG, tomografia i badanie moczu go nie potwierdzą.`, `False symptoms: the pathogen can cause a symptom for ${C.signals.duration} s in an area without colonies (chemical signals). Echo, ultrasound, CT and urinalysis will not confirm it.`)}</li>
      <li>${T('Maskowanie osłabia objawy — brak objawów nie znaczy, że nie ma zakażenia.', 'Masking weakens symptoms — no symptoms does not mean no infection.')}</li></ul>`;
  }

  function sectionPatients() {
    const P = C.patients;
    let h = `<table class="wk-table"><thead><tr><th>${T('Pacjent', 'Patient')}</th><th>${T('Dla lekarza', 'For the doctor')}</th><th>${T('Dla patogenu', 'For the pathogen')}</th></tr></thead><tbody>`;
    for (const id in P) h += `<tr><td><b>${esc(tr(P[id].name))}</b></td><td>${esc(tr(P[id].doc))}</td><td>${esc(tr(P[id].bact))}</td></tr>`;
    return h + '</tbody></table>';
  }

  function sectionOther() {
    return `<ul class="wk-ul">
      <li>${T('Stan pacjenta spada od zakażenia, gorączki i każdej dawki leczenia; rośnie sam, dopóki kolonizacja jest niska. 0% = sepsa (wygrywa patogen).', 'Patient condition drops from infection, fever and every treatment dose; it recovers by itself while colonization is low. 0% = sepsis (the pathogen wins).')}</li>
      <li>${T('Lekarz wygrywa, gdy nie ma ani patogenu, ani kolonii. Kolonie to „życia” patogenu: po zniszczeniu odradza się w największej kolonii (grzyb — w magazynie zarodników).', 'The doctor wins when there is no pathogen and no colonies. Colonies are the pathogen’s “lives”: when destroyed it respawns in the largest colony (fungus — in a spore store).')}</li>
      <li>${T('Kolonie w mięśniu serca są ukryte przed przeciwciałami; widać je w echu (niewyraźnie), w tomografii i w CRP.', 'Colonies in the heart muscle are hidden from antibodies; they show in echo (blurry), CT and CRP.')}</li>
      <li>${T('Kopie patogenu i zarodniki grzyba to wabiki: przeciwciało niszczy kopię zamiast oryginału. Posiew liczy je jako komórki we krwi.', 'Pathogen copies and fungal spores are decoys: an antibody destroys a copy instead of the original. Culture counts them as cells in the blood.')}</li>
      <li>${T('Dziennik lekarza nie pokazuje ruchów patogenu — tylko objawy, wyniki i stan pacjenta.', 'The doctor’s log does not show pathogen movements — only symptoms, results and patient condition.')}</li></ul>`;
  }

  const SECTIONS = [
    ['pathogens', () => T('Patogeny', 'Pathogens'), sectionPathogens],
    ['tests', () => T('Badania', 'Tests'), sectionTests],
    ['drugs', () => T('Leki i zabiegi', 'Drugs and procedures'), sectionDrugs],
    ['symptoms', () => T('Objawy', 'Symptoms'), sectionSymptoms],
    ['patients', () => T('Pacjenci', 'Patients'), sectionPatients],
    ['other', () => T('Inne', 'Other'), sectionOther]
  ];

  // miniatura z mikroskopu (ten sam rysunek co preparat lekarza)
  function drawMicro(cv) {
    const sp = C.species[cv.dataset.species], g = cv.getContext('2d'), w = cv.width, h = cv.height;
    const em = sp.kind === 'virus';
    g.fillStyle = em ? '#9a9a96' : '#f6ebe5'; g.fillRect(0, 0, w, h);
    let sd = 7;
    const R = () => { sd = sd * 16807 % 2147483647; return (sd - 1) / 2147483646; };
    if (!em) for (let i = 0; i < 6; i++) { const x = R() * w, y = R() * h; g.fillStyle = 'rgba(226, 150, 150, 0.5)'; g.beginPath(); g.arc(x, y, 10, 0, 6.283); g.fill(); }
    else for (let i = 0; i < 900; i++) { const v = 120 + R() * 70; g.fillStyle = `rgba(${v},${v},${v - 4},0.5)`; g.fillRect(R() * w, R() * h, 2, 2); }
    if (DD.drawOrganism) DD.drawOrganism(g, cv.dataset.species, w / 2, h / 2, R);
  }

  let current = 'pathogens';
  function render() {
    $('wiki-nav').innerHTML = SECTIONS.map(([id, name]) => `<button type="button" data-sec="${id}" aria-pressed="${id === current}">${name()}</button>`).join('');
    const sec = SECTIONS.find((x) => x[0] === current);
    $('wiki-body').innerHTML = `<h2 class="wk-title">${sec[1]()}</h2>` + sec[2]();
    $('wiki-body').querySelectorAll('canvas.wk-micro').forEach(drawMicro);
    $('wiki-body').scrollTop = 0;
  }
  function place() {
    // okno wiki nad panelem lekarza (w trybie deweloperskim tylko prawa połowa)
    const doc = document.querySelector('.half-doc'), r = doc.getBoundingClientRect(), box = $('wiki');
    box.style.left = Math.max(0, r.left) + 'px'; box.style.width = Math.min(window.innerWidth, r.width) + 'px';
  }
  DD.Wiki = {
    open() { place(); render(); $('wiki').hidden = false; $('wiki-btn').setAttribute('aria-expanded', 'true'); $('wiki-close').focus(); },
    close() { $('wiki').hidden = true; $('wiki-btn').setAttribute('aria-expanded', 'false'); },
    toggle() { if ($('wiki').hidden) this.open(); else this.close(); }
  };
  document.addEventListener('DOMContentLoaded', () => {
    $('wiki-btn').addEventListener('click', () => DD.Wiki.toggle());
    $('wiki-close').addEventListener('click', () => DD.Wiki.close());
    $('wiki-nav').addEventListener('click', (e) => { const b = e.target.closest('[data-sec]'); if (b) { current = b.dataset.sec; render(); } });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('wiki').hidden) DD.Wiki.close(); });
    window.addEventListener('resize', () => { if (!$('wiki').hidden) place(); });
  });
})();
