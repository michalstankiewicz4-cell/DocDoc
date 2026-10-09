# PatientZero

Asymetryczna gra przeglądarkowa na dwie osoby. **Patogen** (jedna z trzech bakterii albo jeden z trzech wirusów) płynie z krwią
przez bijące serce, wątrobę i nerkę, zakłada kolonie i próbuje doprowadzić pacjenta do sepsy.
**Lekarz** nie widzi go wprost. Przy aparaturze OIOM-u zleca badania (CRP, posiew, echo serca, USG jamy brzusznej, antybiogram, mikroskop),
czyta objawy i dobiera leczenie.

**Zagraj:** https://michalstankiewicz4-cell.github.io/PatientZero/

Aktualna wersja jest na ekranie startowym gry i w [CHANGELOG.md](CHANGELOG.md).

## Szybki start

1. Otwórz stronę gry (albo lokalnie plik `index.html` — serwer nie jest potrzebny).
2. Wybierz tryb:
   - **Tryb deweloperski** — jeden gracz, oba ekrany naraz (lewa połowa: patogen, prawa: lekarz).
   - **Gra na 2 osoby** — każdy na swoim komputerze; łączycie się, wymieniając dwa kody przez komunikator.
3. Gracz patogenu wybiera rodzaj patogenu (lekarz go nie zna), a potem narząd startowy: serce, nerkę albo wątrobę.

Sterowanie w skrócie:
- **patogen:** `W` `A` `S` `D` ruch, `E` kolonia, `Q` wnikanie w ścianę serca, `F` ukrycie, `R` rozmnożenie, `7`–`0` mutacje, `T` toksyny, kółko myszy lekko reguluje przybliżenie;
- **lekarz:** `Z` `X` `C` `G` `V` `N` badania, `1`–`5` leczenie, `H` `J` `K` `L` operacja zastawki (wszystko także z rozwijanych menu w panelu).
Pełne zasady i sterowanie: [docs/INSTRUKCJA.md](docs/INSTRUKCJA.md).

## Dokumentacja

| Plik | Dla kogo | Co zawiera |
| --- | --- | --- |
| [docs/INSTRUKCJA.md](docs/INSTRUKCJA.md) | gracze | zasady, sterowanie, gra przez sieć, rozwiązywanie problemów |
| [docs/ARCHITEKTURA.md](docs/ARCHITEKTURA.md) | programiści | budowa kodu, stan i komendy, sieć, render, jak dodać funkcję |
| [CHANGELOG.md](CHANGELOG.md) | wszyscy | historia wersji |
| [CLAUDE.md](CLAUDE.md) | Claude | kontekst projektu do wznowienia pracy w nowej rozmowie |

## Technologia

Czysty HTML, CSS i JavaScript (bez bundlera), Three.js r128 z cdnjs, Web Audio, WebRTC, Canvas 2D (panel lekarza).
Strona publikuje się sama na GitHub Pages przy każdym wypchnięciu na `main`, a zmiana wersji tworzy tag i wydanie (Release).
