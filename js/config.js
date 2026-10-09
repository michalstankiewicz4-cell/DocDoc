// Patient Zero — konfiguracja prototypu v0
// Wszystkie liczby balansu w jednym miejscu, żeby łatwo je stroić.
window.DD = window.DD || {};

DD.CONFIG = {
  // Granice świata (jednostki gry). Serce ~110 x 110 na górze, pod nim jama brzuszna z wątrobą i nerką.
  world: { minX: -60, maxX: 76, minY: -236, maxY: 58 },
  sdfCell: 0.235,     // rozmiar komórki mapy odległości (kolizje + render)
  flowCell: 0.5,      // rozmiar komórki pola przepływu
  bpm: 72,            // tętno
  fixedDt: 1 / 60,    // krok symulacji

  depth: { floor: -5, top: 3, play: 0 },

  bacteria: {
    radius: 0.32,
    accel: 42,
    maxSpeed: 7,
    drag: 5,
    flowCoupling: 0.85, // jak mocno prąd krwi znosi bakterię
    hp: 100,
    start: { x: -29, y: 34 } // żyła główna górna, wlot do prawego przedsionka
  },

  // kolonie: zakładane klawiszem E przy ścianie kosztem życia; rosną same; kolonizacja = suma rozmiarów * infectionPerSize
  colony: {
    cost: 25, cooldown: 2, startSize: 0.25, growth: 0.022, infectionPerSize: 20,
    feed: 3.5,                                   // życie/s odzyskiwane przy kontakcie ze ścianą
    respawnDelay: 3, respawnHp: 60, respawnCost: 0.3,
    abDamage: 0.12                               // ile rozmiaru kolonii zabiera jedno przeciwciało
  },

  doctor: {
    // badania: czas do wyniku i odstęp przed powtórzeniem (s). Wyniki opisują chwilę pobrania.
    tests: {
      // sens: czułość — szansa, że badanie wykryje to, co jest (posiew, mikroskop: patogen; echo, USG: każde ognisko osobno)
      crp:     { duration: 4,  cooldown: 10, noise: 12 },   // szybkie, przybliżone (szum ±noise mg/l)
      culture: { duration: 12, cooldown: 20, sens: 0.85 },  // posiew: dokładna kolonizacja + zdjęcie miejsca
      echo:    { duration: 8,  cooldown: 25, sens: 0.85 },  // echo serca: położenie i wielkość kolonii
      abg:     { duration: 18, cooldown: 30 },              // antybiogram: wrażliwość na leczenie (po dodatnim posiewie)
      micro:   { duration: 6,  cooldown: 15, sens: 0.85 },  // mikroskop: rodzaj patogenu w próbce krwi
      usg:     { duration: 8,  cooldown: 25, sens: 0.85 },  // USG jamy brzusznej: kolonie w wątrobie, nerce i naczyniach brzucha
      cbc:     { duration: 5,  cooldown: 15, noise: 1.2 },  // morfologia: leukocyty (G/l) i przewaga neutrofili (bakteria) / limfocytów (wirus)
      pcr:     { duration: 25, cooldown: 45, sens: 0.95 },  // PCR: materiał genetyczny patogenu we krwi → rodzaj (bez szukania pod mikroskopem)
      urine:   { duration: 4,  cooldown: 15, sens: 0.85, minMass: 0.1 },  // badanie moczu: krwinki czerwone i bakterie, gdy są kolonie w nerce
      ct:      { duration: 15, cooldown: 60, sens: 0.95 },  // tomografia: całe ciało, dokładne położenie, także kolonie w mięśniu
      markers: { duration: 6,  cooldown: 20, noise: 1.5 },  // markery nowotworowe (ng/ml): rosną z masą guzów; norma < 5
      xray:    { duration: 5,  cooldown: 20, sens: 0.7, bigHeart: 1.0 },  // RTG klatki: powiększone serce (masa ognisk w sercu ≥ bigHeart), guzki w płucach z prawego serca
      mri:     { duration: 25, cooldown: 60, sens: 0.98 },  // rezonans: jak tomografia, do tego wielkość (etap) każdego ogniska
      biopsy:  { duration: 12, cooldown: 45, sens: 0.9, patientCost: 3 }   // biopsja narządu (serce / wątroba / nerka): rodzaj zmian w tkance
    },
    antibodies: { cooldown: 18, count: 56, life: 45, damage: 12, speed: 4.5, homingRadius: 14 },
    fever:      { cooldown: 30, duration: 20, temp: 39.6, dps: 1.6, infectionMul: 0.5 },
    abxA:       { cooldown: 22, duration: 8, dps: 2.6, colonyShrink: 0.025 },  // β-laktam: bakteriobójczy
    abxB:       { cooldown: 22, duration: 10, speedMul: 0.45 },               // makrolid: bakteriostatyczny
    antiviral:  { cooldown: 22, duration: 10, dps: 1.8, speedMul: 0.6 },      // lek przeciwwirusowy: tylko na wirusa
    antifungal: { cooldown: 22, duration: 10, dps: 2.0, colonyShrink: 0.022 }, // lek przeciwgrzybiczy (flukonazol): tylko na grzyba, kurczy grzybnię
    chemo:      { cooldown: 40, duration: 12, dps: 1.6, colonyShrink: 0.035 }, // chemioterapia: cały organizm, tylko na nowotwór, mocno obciąża pacjenta
    radio:      { cooldown: 35, duration: 8, colonyShrink: 0.11, dps: 4 },     // radioterapia: jeden obszar (serce / wątroba / nerka), tylko na nowotwór
    naturalResistance: 0.2,  // skuteczność antybiotyku z klasy, na którą bakteria jest naturalnie oporna
    // operacja zastawki: po `duration` s usuwa kolonie w promieniu `radius` od zastawki
    surgery: { duration: 10, cooldown: 60, radius: 5, patientCost: 15, pathogenDamage: 40 },
    // przeszczep narządu (wątroba, nerka) i amputacja nóg: raz na rundę każdy, usuwa wszystkie ogniska w narządzie / obszarze
    transplant: { duration: 20, patientCost: 25, pathogenDamage: 60 },
    amputation: { duration: 15, patientCost: 30, pathogenDamage: 80 }
  },

  // oporność: każde użycie leku podnosi oporność o perUse (do max); skuteczność = 1 - oporność
  resistance: { perUse: 0.2, max: 0.8 },

  // zdjęcie patogenu w chwili pobrania krwi (wynik mikroskopu): historia stanu i lekki widok 3D
  preview: { history: 30, rate: 20, maxCells: 700 },

  // kaszel pacjenta: szansa na sekundę = base + perInfection * kolonizacja(%)
  cough: { base: 0.004, perInfection: 0.0007, perRightMass: 0.035 },

  // stan pacjenta (0..100). Na sekundę: -infectionDrain * kolonizacja, -feverDrain * gorączka,
  // +regen dopóki kolonizacja < regenStopsAt (%). sideEffect = jednorazowy koszt dawki leku.
  patient: { infectionDrain: 1.4, feverDrain: 0.35, regen: 0.25, regenStopsAt: 40,
    sideEffect: { antibodies: 2, fever: 1, abxA: 4, abxB: 4, antiviral: 4, antifungal: 4, chemo: 9, radio: 5 } },

  // rodzaje patogenów do wyboru na starcie. natural = klasa antybiotyku, na którą bakteria jest naturalnie oporna;
  // antiviral = skuteczność leku przeciwwirusowego na danego wirusa. Lekarz rozpoznaje rodzaj pod mikroskopem.
  // Drobne różnice w rozgrywce (mnożniki ponad różnice bakteria / wirus): speed = szybkość ruchu,
  // growth = wzrost kolonii, biofilm = ile kolonii zabiera jedno przeciwciało (mniej = mocniejszy biofilm).
  species: {
    staph:     { kind: 'bacteria', name: 'Gronkowiec złocisty', latin: 'Staphylococcus aureus, szczep MRSA', natural: 'abxA', speed: 0.85, growth: 1.0, biofilm: 0.6,
                 micro: 'Gram-dodatnie ziarenkowce w gronach.', treat: 'Szczep oporny na β-laktamy, wrażliwy na makrolidy.' },
    strep:     { kind: 'bacteria', name: 'Paciorkowiec', latin: 'Streptococcus pyogenes', natural: null, speed: 1.0, growth: 1.25, biofilm: 1.0,
                 micro: 'Gram-dodatnie ziarenkowce w łańcuszkach.', treat: 'Wrażliwy na β-laktamy i makrolidy.' },
    ecoli:     { kind: 'bacteria', name: 'Pałeczka okrężnicy', latin: 'Escherichia coli', natural: 'abxB', speed: 1.15, growth: 1.0, biofilm: 1.0,
                 micro: 'Gram-ujemne pałeczki z witkami.', treat: 'Naturalnie oporna na makrolidy, wrażliwa na β-laktamy.' },
    flu:       { kind: 'virus', name: 'Wirus grypy', latin: 'Influenza A', antiviral: 1.0, speed: 1.1, growth: 1.0, biofilm: 1.0,
                 micro: 'Kuliste wiriony z otoczką i gęstymi kolcami białkowymi.', treat: 'Lek przeciwwirusowy działa w pełni.' },
    coxsackie: { kind: 'virus', name: 'Wirus Coxsackie B', latin: 'Enterovirus B', antiviral: 0.2, speed: 0.9, growth: 1.25, biofilm: 1.0,
                 micro: 'Bardzo małe, gładkie wiriony bez otoczki.', treat: 'Brak swoistego leku: lek przeciwwirusowy działa słabo (20%).' },
    adeno:     { kind: 'virus', name: 'Adenowirus', latin: 'Adenoviridae', antiviral: 0.6, speed: 1.0, growth: 0.9, biofilm: 0.75,
                 micro: 'Wiriony w kształcie dwudziestościanu z długimi włóknami.', treat: 'Lek przeciwwirusowy działa częściowo (60%).' },
    candida:   { kind: 'fungus', name: 'Drożdżak Candida', latin: 'Candida albicans', speed: 0.8, growth: 1.0, biofilm: 0.8,
                 micro: 'Owalne, pączkujące komórki drożdżaków i strzępki rzekome (Gram-dodatnie).', treat: 'Wrażliwy na lek przeciwgrzybiczy. Antybiotyki i lek przeciwwirusowy nie działają.' },
    cancer:    { kind: 'cancer', name: 'Komórka nowotworowa', latin: 'Carcinoma (rak)', speed: 0.7, growth: 0.9, biofilm: 0.5,
                 micro: 'Duże komórki atypowe: powiększone, ciemne jądra, liczne podziały.', treat: 'Chemioterapia i radioterapia. Antybiotyki, leki przeciwwirusowe i przeciwgrzybicze nie działają.' }
  },
  defaultSpecies: { bacteria: 'ecoli', virus: 'adeno', fungus: 'candida', cancer: 'cancer' },

  // rak: kolonie to guzy. Bez własnych naczyń guz nie przekracza smallCap; angiogeneza (mutacja 9) pozwala rosnąć do maxSize.
  // Wielkość guza (nie skrypt) decyduje o etapie: mały < stages[0] ≤ średni < stages[1] ≤ duży.
  cancer: {
    smallCap: 0.6, maxSize: 2, stages: [0.5, 1.2], infectionMul: 0.5,   // zaawansowanie choroby liczone z połowy masy guzów
    divStep: 0.35,          // szybsze podziały (7): +35% wzrostu guzów na poziom
    apoStep: 0.3,           // wyłączenie apoptozy (8): −30% skutków chemio-, radioterapii i przeciwciał na poziom
    metaPeriod: 25, metaMinSize: 1,   // przerzuty (0): guz od rozmiaru 1 wypuszcza co 25 s komórkę do krwi, która osiada i zakłada nowy guz
    organFail: 1.5, failDrain: 0.25,  // masa guzów w narządzie, od której narząd przestaje pracować (dodatkowy spadek stanu / s)
    mutNames: { speed: 'Szybsze podziały', fever: 'Wyłączenie apoptozy', capsule: 'Własne naczynia (angiogeneza)', toxins: 'Przerzuty' }
  },

  // grzyb: kolonie puszczają strzępki wzdłuż ścian (jak korzenie); na końcu strzępki wyrasta nowa kolonia.
  // E przy własnej kolonii zamienia ją w magazyn zarodników (wypuszcza zarodniki do krwi, odrodzenie w magazynie).
  fungus: {
    hyphaRate: 0.16,      // przyrost strzępki (j./s) przy kolonii pełnej wielkości
    branchLen: 7,         // długość strzępki, po której na jej końcu wyrasta nowa kolonia
    maxColonies: 16,      // powyżej tej liczby kolonii strzępki rosną, ale nie zakładają nowych
    storeCost: 10, storeRadius: 1.6, storePeriod: 20, storeShrink: 0.3,   // magazyn: koszt życia, zasięg E, zarodnik co 20 s, leki słabiej (×0,3)
    sporeSettle: 3,       // zarodnik (mutacja 0) osiada na ścianie po tylu sekundach w krwi
    mutNames: { speed: 'Strzępki przebijające tkanki', fever: 'Odporność na leki', capsule: 'Ukrywanie przed odpornością', toxins: 'Zarodniki z krwią' }
  },

  // wirus: mniej życia, wolniejszy (bez wici), szybciej namnażające się kolonie, mniejszy
  virus: { hp: 70, speedMul: 0.8, growthMul: 1.3, radius: 0.26 },

  // ściana serca (mięsień): wnikanie klawiszem Q przy ścianie, ruch między komórkami
  tissue: {
    minD: 1.2, maxD: 7.2,          // pas mięśnia w jednostkach SDF (odległość od światła naczynia)
    enterD: 2.0, exitD: 1.35,      // gdzie patogen pojawia się po wniknięciu / kiedy wypada do krwi
    z: 3.3,                        // wysokość płaszczyzny ruchu (powierzchnia przekroju mięśnia)
    burrow: { bacteria: 2.5, virus: 1.0 },   // czas wnikania (s)
    speedMul: { bacteria: 0.35, virus: 0.45 },
    grid: 1.55, cellLength: 2.3, cellRadius: 0.36,
    cellGap: 1.3,                  // pas bez komórek przy ścianie naczynia (droga powrotu do krwi)
    exitReach: 4.5,                // Q w mięśniu wyprowadza do krwi, gdy naczynie jest bliżej niż tyle (SDF)
    drugPenetration: 0.5           // ułamek działania antybiotyków / leku przeciwwirusowego na kolonie w tkance
  },

  // zdolności patogenu
  hide: { radius: 2.2 },                       // F: ukrycie w kolonii (odporność na przeciwciała, brak ruchu)
  mutations: {
    perGrowth: 1.6,                            // punkty mutacji za 1,0 przyrostu rozmiaru kolonii
    speed:   { max: 3, step: 0.15 },           // +15% szybkości na poziom
    fever:   { max: 2, step: 0.3 },            // −30% obrażeń od gorączki na poziom
    capsule: { max: 2, step: 0.3 },            // otoczka: −30% obrażeń od przeciwciał na poziom
    toxins:  { max: 1 },                       // odblokowuje toksyny (T)
    pierce:  { max: 1 },                       // grzyb (7): nowe kolonie na końcach strzępek wrastają w mięsień serca
    drugres: { max: 2, step: 0.3 },            // grzyb (8): −30% działania leku przeciwgrzybiczego na poziom
    spores:  { max: 1 },
    divide:  { max: 2 },                       // rak (7): szybsze podziały
    apoptosis: { max: 2 },                     // rak (8): wyłączenie apoptozy
    angio:   { max: 1 },                       // rak (9): własne naczynia krwionośne — guzy mogą rosnąć powyżej smallCap
    meta:    { max: 1 },                       // rak (0): przerzuty                       // grzyb (0): zarodniki we krwi osiadają na ścianach i zakładają kolonie
    mask:    { max: 2, symptom: 0.3, sens: 0.15, crp: 0.2 },  // maskowanie (6): na poziom −30% objawów, −15 pkt proc. czułości badań, −20% CRP
    cost: [1, 2, 3]                            // koszt kolejnych poziomów
  },
  toxins: { cooldown: 25, hpCost: 10, patientDamage: 6, distortion: 15 },  // T: stan pacjenta −6, badania zakłócone przez 15 s
  // B: sygnały chemiczne — fałszywy objaw w obszarze bez kolonii (masa udawana w objawach; badania obrazowe go nie potwierdzą)
  signals: { cooldown: 30, hpCost: 5, duration: 20, mass: 0.5, regions: ['right', 'left', 'legs', 'liver', 'kidney'] },

  // pożywienie we krwi: patogen zjada je, wpływając w nie; pełny pasek pożywienia pozwala się rozmnożyć (R)
  food: {
    count: 170, eatRadius: 0.6, maxAge: 90,
    kinds: { glucose: 10, amino: 15, lipid: 25 },  // ile pożywienia daje każdy rodzaj
    lipidHp: 4,          // lipidy dodatkowo leczą (życie)
    aminoPoints: 0.15    // aminokwasy dodatkowo dają punkty mutacji
  },
  // kopie patogenu: wabiki dla przeciwciał (płyną z prądem, giną od jednego trafienia)
  copies: { max: 6, cost: 100, swim: 2.5, life: 40, fade: 4 },   // kopia żyje `life` s, w ostatnich `fade` s maleje

  // losowanie pacjenta na początku rundy (środowisko gry). Mnożniki względem normy (1 = bez zmian):
  // growth — wzrost kolonii, colonyCost — koszt kolonii (życie patogenu), symptom — siła objawów (więcej = wcześniej widać),
  // drug — skuteczność leków (antybiotyki, przeciwwirusowy, gorączka), ab — skuteczność przeciwciał, regen — regeneracja pacjenta,
  // drain — utrata stanu od zakażenia, testCd — odnowienie badań, food — ilość pożywienia we krwi, glucose — udział glukozy w pożywieniu.
  // Uzasadnienie liczb: docs/BALANS.md
  patients: {
    child:      { name: 'Dziecko', growth: 1.25, colonyCost: 1, symptom: 1.6, drug: 1, ab: 1, regen: 1.2, drain: 1, testCd: 1, food: 1, glucose: 0.33,
                  bact: 'Patogen szybciej się rozprzestrzenia (kolonie rosną szybciej).', doc: 'Objawy pojawiają się wcześniej, organizm szybciej się regeneruje.' },
    senior:     { name: 'Senior', growth: 1.1, colonyCost: 0.7, symptom: 0.75, drug: 0.75, ab: 0.85, regen: 0.6, drain: 1, testCd: 1, food: 0.6, glucose: 0.33,
                  bact: 'Łatwiejsza kolonizacja (tańsze kolonie), ale mniej pożywienia we krwi.', doc: 'Leczenie działa słabiej, objawy są słabsze, regeneracja wolniejsza.' },
    athlete:    { name: 'Sportowiec', growth: 0.75, colonyCost: 1.2, symptom: 1, drug: 1, ab: 1.3, regen: 1.8, drain: 0.8, testCd: 1, food: 1, glucose: 0.33,
                  bact: 'Wolniejsza kolonizacja (kolonie rosną wolniej i kosztują więcej).', doc: 'Silniejsza odporność: przeciwciała działają mocniej, szybsza regeneracja.' },
    diabetic:   { name: 'Diabetyk', growth: 1.3, colonyCost: 1, symptom: 1, drug: 1, ab: 0.9, regen: 0.4, drain: 1.15, testCd: 1, food: 1.4, glucose: 0.7,
                  bact: 'Szybszy rozwój infekcji, dużo glukozy we krwi.', doc: 'Wolniejsze gojenie, zakażenie szybciej pogarsza stan pacjenta.' },
    transplant: { name: 'Po przeszczepie', growth: 1.35, colonyCost: 0.5, symptom: 1, drug: 1, ab: 0.55, regen: 0.8, drain: 1.1, testCd: 0.6, food: 1, glucose: 0.33,
                  bact: 'Bardzo łatwa kolonizacja (kolonie za pół ceny, szybki wzrost).', doc: 'Osłabiony układ odpornościowy (słabe przeciwciała), ale częstsze badania kontrolne (krótsze odnowienie badań).' },
    // v0.44.0 — sideFx: mnożnik kosztu leczenia dla stanu pacjenta; organGrowth: wzrost kolonii w danym narządzie
    allergy:    { name: 'Alergik', growth: 1, colonyCost: 1, symptom: 1.3, drug: 1, ab: 1.3, regen: 1, drain: 1, testCd: 1, food: 1, glucose: 0.33, sideFx: 1.6,
                  bact: 'Silna odpowiedź odpornościowa: przeciwciała groźniejsze, objawy wyraźniejsze.', doc: 'Mocne przeciwciała i wyraźne objawy, ale każde leczenie bardziej obciąża pacjenta (reakcje alergiczne).' },
    smoker:     { name: 'Palacz', growth: 1.1, colonyCost: 1, symptom: 1.2, drug: 1, ab: 0.9, regen: 0.7, drain: 1.1, testCd: 1, food: 1, glucose: 0.33, organGrowth: { heart: 1.2 },
                  bact: 'Kolonie w sercu rosną szybciej, odporność słabsza.', doc: 'Częsty kaszel (objawy z płuc wyraźniejsze), wolniejsza regeneracja.' },
    alcoholic:  { name: 'Alkoholik', growth: 1, colonyCost: 0.9, symptom: 1, drug: 0.85, ab: 0.9, regen: 0.7, drain: 1.1, testCd: 1, food: 0.8, glucose: 0.33, organGrowth: { liver: 1.6 },
                  bact: 'Uszkodzona wątroba: kolonie w wątrobie rosną dużo szybciej, kolonie trochę tańsze.', doc: 'Leki działają słabiej (wątroba gorzej je przetwarza), wolniejsza regeneracja.' },
    asthma:     { name: 'Astmatyk', growth: 1, colonyCost: 1, symptom: 1.4, drug: 1, ab: 1.1, regen: 0.9, drain: 1.1, testCd: 1, food: 1, glucose: 0.33, sideFx: 1.2,
                  bact: 'Każdy objaw z płuc i serca jest groźniejszy dla pacjenta.', doc: 'Duszność i kaszel pojawiają się wcześnie; leczenie trochę bardziej obciąża.' },
    obese:      { name: 'Otyłość', growth: 1.1, colonyCost: 0.85, symptom: 0.9, drug: 0.8, ab: 1, regen: 0.8, drain: 1.1, testCd: 1, food: 1.3, glucose: 0.45,
                  bact: 'Więcej pożywienia we krwi, tańsze kolonie.', doc: 'Leki rozkładają się w większej masie ciała (słabsze), objawy mniej widoczne.' },
    pregnant:   { name: 'Ciąża', growth: 1, colonyCost: 1, symptom: 1, drug: 1, ab: 0.8, regen: 1.1, drain: 1, testCd: 1, food: 1.2, glucose: 0.4, sideFx: 1.8,
                  bact: 'Odporność wyciszona (tolerancja ciąży): przeciwciała słabsze.', doc: 'Leki i zabiegi znacznie bardziej obciążają pacjentkę; organizm dobrze się regeneruje.' }
  },

  // zakończenie rundy: tyle sekund od zwycięstwa do ekranu końcowego (serce zwalnia, prąd ustaje, monitor piszczy i cichnie)
  ending: { duration: 5 },

  // minimapa patogenu: ukryta (kod zostaje; true = pokazuj)
  ui: { minimap: false, revealTime: 4.5 },

  camera: { fov: 40, zoom: 17, zoomMin: 14, zoomMax: 21 },   // zoom kamery patogenu: kółko myszy reguluje go tylko delikatnie

  cells: { maxRBC: 2600, density: 0.05, plasmaSpecks: 1400,
    // elementy tła (tylko wygląd, bez wpływu na grę): liczba w oknie kamery
    extras: { bubbles: 26, platelets: 34, leukocytes: 2 } }
};
