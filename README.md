# PatientZero

Asymetryczna gra przeglądarkowa na dwie osoby. **Patogen** płynie z krwią przez bijące serce i próbuje zainfekować pacjenta.
**Lekarz** nie widzi go wprost. Zleca badania, czyta objawy i dobiera leczenie.

**Zagraj:** https://michalstankiewicz4-cell.github.io/PatientZero/

Aktualna wersja jest na ekranie startowym gry i w [CHANGELOG.md](CHANGELOG.md).

## Szybki start

1. Otwórz stronę gry (albo lokalnie plik `index.html` — serwer nie jest potrzebny).
2. Wybierz tryb:
   - **Tryb deweloperski** — jeden gracz, oba ekrany naraz (lewa połowa: patogen, prawa: lekarz).
   - **Gra na 2 osoby** — każdy na swoim komputerze; łączycie się, wymieniając dwa kody przez komunikator.
3. Wybierz narząd startowy (na razie serce).

Sterowanie w skrócie: patogen `W` `A` `S` `D`, kółko myszy przybliża; lekarz `B` badanie, `1` `2` `3` leczenie.
Pełne zasady i sterowanie: [docs/INSTRUKCJA.md](docs/INSTRUKCJA.md).

## Dokumentacja

| Plik | Dla kogo | Co zawiera |
| --- | --- | --- |
| [docs/INSTRUKCJA.md](docs/INSTRUKCJA.md) | gracze | zasady, sterowanie, gra przez sieć, rozwiązywanie problemów |
| [docs/ARCHITEKTURA.md](docs/ARCHITEKTURA.md) | programiści | budowa kodu, stan i komendy, sieć, render, jak dodać funkcję |
| [CHANGELOG.md](CHANGELOG.md) | wszyscy | historia wersji |
| [CLAUDE.md](CLAUDE.md) | Claude | kontekst projektu do wznowienia pracy w nowej rozmowie |

## Technologia

Czysty HTML, CSS i JavaScript (bez bundlera), Three.js r128 z cdnjs, Web Audio, WebRTC.
Strona publikuje się sama na GitHub Pages przy każdym wypchnięciu na `main`, a zmiana wersji tworzy tag i wydanie (Release).
