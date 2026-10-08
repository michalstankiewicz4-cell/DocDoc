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

  infection: {
    ratePerSec: 2.0,    // % kolonizacji na sekundę kontaktu z tkanką
    colonyEvery: 6      // co ile % powstaje widoczna kolonia
  },

  doctor: {
    testDuration: 12,   // s — badanie krwi
    testCooldown: 20,
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

  camera: { fov: 40, zoomMin: 7, zoomMax: 75, zoomStart: 17 },

  cells: { maxRBC: 2600, density: 0.05, plasmaSpecks: 1400 }
};
