# Zmiany

Format: [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/), numeracja: [SemVer](https://semver.org/lang/pl/).

Zasady numeracji w tym projekcie (do wersji 1.0.0):
- **0.X.0** — nowa funkcja albo zmiana zasad gry,
- **0.X.Y** — poprawki, dokumentacja, drobne zmiany bez wpływu na rozgrywkę.

Wersję zmienia `node tools/bump.js X.Y.Z`. Po wypchnięciu zmiany `js/version.js` GitHub Actions (`.github/workflows/release.yml`)
sam tworzy tag `vX.Y.Z` i wydanie (Release) z opisem z tego pliku.

## [Unreleased]

## [0.6.2] - 2026-10-08
### Dodane
- Dokumentacja: nowy README, instrukcja obsługi `docs/INSTRUKCJA.md`, opis budowy kodu `docs/ARCHITEKTURA.md`.

## [0.6.1] - 2026-10-08
### Dodane
- Automat wydań w GitHub Actions: tag i Release przy każdej zmianie wersji, tagi wsteczne dla 0.1.0–0.5.0.

## [0.6.0] - 2026-10-08
### Dodane
- Wersjonowanie: `js/version.js`, numer wersji na ekranie startowym, skrypt `tools/bump.js`.
- Parametr `?v=` przy plikach JS i CSS, żeby po aktualizacji przeglądarka nie używała starych plików z pamięci podręcznej.
- Ten plik zmian.

## [0.5.0] - 2026-10-08
### Dodane
- Podgląd pacjenta dla lekarza: gra bakterii z 5-sekundowym opóźnieniem w małym okienku.
- Zdjęcie miejsca, w którym była bakteria w chwili pobrania krwi, razem z wynikiem badania.

## [0.4.0] - 2026-10-08
### Dodane
- Wskaźnik połączenia (jakość, ping, paczki stanu/s) i panel szczegółów pod klawiszem `I`.
- Ostrzeżenie po 2 s bez danych z odliczaniem do rozłączenia.
- Komunikat „Drugi gracz opuścił grę” przy zamknięciu karty.
- Numery sekwencyjne paczek stanu: starsze paczki odrzucane, zgubione liczone.

## [0.3.1] - 2026-10-08
### Zmienione
- Nazwa gry: PatientZero (wcześniej DocDoc).

## [0.3.0] - 2026-10-08
### Dodane
- Gra na 2 osoby przez WebRTC z ręczną wymianą kodów (bez serwera gry).
- Ekran wyboru trybu: deweloperski (jeden ekran) albo gra na 2 osoby.
- Uprawnienia ról, układ pełnoekranowy dla każdej roli, wykrywanie zerwania połączenia.

## [0.2.0] - 2026-10-08
### Dodane
- Minimapa bakterii.
- Dźwięk bicia serca (Web Audio).
- Oporność na leki: każde kolejne użycie tego samego leczenia działa słabiej.

## [0.1.0] - 2026-10-08
### Dodane
- Prototyp: podzielony ekran, serce w przekroju (SDF), prąd krwi zależny od cyklu serca.
- Bakteria (WASD), zastawki, struny ścięgniste, przejścia przez krążenie płucne i duże.
- Lekarz: EKG, badanie krwi, przeciwciała, gorączka, antybiotyk.
- Grafika: tkanka z beleczkami, krwinki (instancing), bloom, głębia ostrości, aberracja, ACES.

[Unreleased]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.6.2...HEAD
[0.6.2]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.6.1...v0.6.2
[0.6.1]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/michalstankiewicz4-cell/PatientZero/releases/tag/v0.1.0
