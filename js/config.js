// PatientZero — konfiguracja prototypu v0
// Wszystkie liczby balansu w jednym miejscu, żeby łatwo je stroić.
window.DD = window.DD || {};

DD.CONFIG = {
  // Granice świata (jednostki gry). Serce ~110 x 110.
  world: { minX: -60, maxX: 60, minY: -58, maxY: 58 },
  sdfRes: 512,        // rozdzielczość mapy odległości (kolizje + render)
  flowRes: 160,       // rozdzielczość pola przepływu
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
      abg:     { duration: 18, cooldown: 30 }               // antybiogram: wrażliwość na leczenie (po dodatnim posiewie)
    },
    antibodies: { cooldown: 18, count: 36, life: 45, damage: 12, speed: 4.5, homingRadius: 14 },
    fever:      { cooldown: 30, duration: 20, temp: 39.6, dps: 1.6, infectionMul: 0.5 },
    slow:       { cooldown: 22, duration: 10, speedMul: 0.45 }
  },

  // oporność: każde użycie leku podnosi oporność o perUse (do max); skuteczność = 1 - oporność
  resistance: { perUse: 0.2, max: 0.8 },

  // podgląd lekarza: gra bakterii z opóźnieniem + zdjęcie miejsca pobrania krwi
  preview: { delay: 5, history: 30, rate: 20, maxCells: 700 },

  // kaszel pacjenta: szansa na sekundę = base + perInfection * kolonizacja(%)
  cough: { base: 0.004, perInfection: 0.0011 },

  // stan pacjenta (0..100). Na sekundę: -infectionDrain * kolonizacja, -feverDrain * gorączka,
  // +regen dopóki kolonizacja < regenStopsAt (%). sideEffect = jednorazowy koszt dawki leku.
  patient: { infectionDrain: 1.4, feverDrain: 0.35, regen: 0.25, regenStopsAt: 40,
    sideEffect: { antibodies: 2, fever: 1, slow: 4 } },

  camera: { fov: 40, zoomMin: 7, zoomMax: 75, zoomStart: 17 },

  cells: { maxRBC: 2600, density: 0.05, plasmaSpecks: 1400 }
};
