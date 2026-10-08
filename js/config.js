// PatientZero — konfiguracja prototypu v0
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
      crp:     { duration: 4,  cooldown: 10, noise: 12 },   // szybkie, przybliżone (szum ±noise mg/l)
      culture: { duration: 12, cooldown: 20 },              // posiew: dokładna kolonizacja + zdjęcie miejsca
      echo:    { duration: 8,  cooldown: 25 },              // echo serca: położenie i wielkość kolonii
      abg:     { duration: 18, cooldown: 30 },              // antybiogram: wrażliwość na leczenie (po dodatnim posiewie)
      micro:   { duration: 6,  cooldown: 15 },              // mikroskop: rodzaj patogenu w próbce krwi
      usg:     { duration: 8,  cooldown: 25 }               // USG jamy brzusznej: kolonie w wątrobie, nerce i naczyniach brzucha
    },
    antibodies: { cooldown: 18, count: 56, life: 45, damage: 12, speed: 4.5, homingRadius: 14 },
    fever:      { cooldown: 30, duration: 20, temp: 39.6, dps: 1.6, infectionMul: 0.5 },
    abxA:       { cooldown: 22, duration: 8, dps: 2.6, colonyShrink: 0.025 },  // β-laktam: bakteriobójczy
    abxB:       { cooldown: 22, duration: 10, speedMul: 0.45 },               // makrolid: bakteriostatyczny
    antiviral:  { cooldown: 22, duration: 10, dps: 1.8, speedMul: 0.6 },      // lek przeciwwirusowy: tylko na wirusa
    naturalResistance: 0.2,  // skuteczność antybiotyku z klasy, na którą bakteria jest naturalnie oporna
    // operacja zastawki: po `duration` s usuwa kolonie w promieniu `radius` od zastawki
    surgery: { duration: 10, cooldown: 60, radius: 5, patientCost: 15, pathogenDamage: 40 }
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
    sideEffect: { antibodies: 2, fever: 1, abxA: 4, abxB: 4, antiviral: 4 } },

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
                 micro: 'Wiriony w kształcie dwudziestościanu z długimi włóknami.', treat: 'Lek przeciwwirusowy działa częściowo (60%).' }
  },
  defaultSpecies: { bacteria: 'ecoli', virus: 'adeno' },

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
    cost: [1, 2, 3]                            // koszt kolejnych poziomów
  },
  toxins: { cooldown: 25, hpCost: 10, patientDamage: 6, distortion: 15 },  // T: stan pacjenta −6, badania zakłócone przez 15 s

  // pożywienie we krwi: patogen zjada je, wpływając w nie; pełny pasek pożywienia pozwala się rozmnożyć (R)
  food: {
    count: 170, eatRadius: 0.6, maxAge: 90,
    kinds: { glucose: 10, amino: 15, lipid: 25 },  // ile pożywienia daje każdy rodzaj
    lipidHp: 4,          // lipidy dodatkowo leczą (życie)
    aminoPoints: 0.15    // aminokwasy dodatkowo dają punkty mutacji
  },
  // kopie patogenu: wabiki dla przeciwciał (płyną z prądem, giną od jednego trafienia)
  copies: { max: 6, cost: 100, swim: 2.5, life: 40, fade: 4 },   // kopia żyje `life` s, w ostatnich `fade` s maleje

  // minimapa patogenu: ukryta (kod zostaje; true = pokazuj)
  ui: { minimap: false },

  camera: { fov: 40, zoom: 17, zoomMin: 14, zoomMax: 21 },   // zoom kamery patogenu: kółko myszy reguluje go tylko delikatnie

  cells: { maxRBC: 2600, density: 0.05, plasmaSpecks: 1400 }
};
