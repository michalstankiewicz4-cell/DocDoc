# Patient Zero
<img width="1893" height="1198" alt="image" src="https://github.com/user-attachments/assets/50346180-d10a-4ee9-8088-bdcba57ebb2f" />
Asymetryczna gra przeglądarkowa na dwie osoby. **Patogen** — jedna z trzech bakterii, jeden z trzech wirusów, grzyb (Candida)
albo nowotwór — płynie z krwią przez bijące serce, wątrobę i nerkę, zakłada kolonie (u grzyba grzybnię, u raka guzy)
i próbuje doprowadzić pacjenta do sepsy albo wyniszczenia.
**Lekarz** nie widzi go wprost. Przy aparaturze OIOM-u zleca badania (CRP, posiew, echo serca, USG, antybiogram, mikroskop,
morfologia, PCR, badanie moczu, tomografia), czyta objawy — czasem fałszywe — i dobiera leczenie: przeciwciała, gorączkę,
antybiotyki, leki przeciwwirusowe i przeciwgrzybicze, chemio- i radioterapię, operację zastawki. Pomaga mu wbudowana wiki.
Na początku rundy gra losuje pacjenta (jeden z 11: dziecko, senior, sportowiec, diabetyk, po przeszczepie, alergik, palacz, alkoholik, astmatyk, otyłość, ciąża), co zmienia szanse obu stron.
Gra jest po angielsku i po polsku.

*Browser game for two players: a pathogen in the bloodstream versus a doctor in the ICU — biology, medicine and WebRTC multiplayer.*

**Zagraj:** https://michalstankiewicz4-cell.github.io/PatientZero/

Aktualna wersja jest na ekranie startowym gry i w [CHANGELOG.md](CHANGELOG.md).

## Szybki start

1. Otwórz stronę gry (albo lokalnie plik `index.html` — serwer nie jest potrzebny).
2. Wybierz tryb:
   - **Tryb deweloperski** — jeden gracz, oba ekrany naraz (lewa połowa: patogen, prawa: lekarz).
   - **Gra na 2 osoby** — każdy na swoim komputerze; łączycie się, wymieniając dwa kody przez komunikator.
3. Gracz patogenu wybiera rodzaj patogenu (lekarz go nie zna), a potem narząd startowy: serce, nerkę albo wątrobę.
4. Język zmienia przełącznik z flagami (EN / PL) na ekranie startowym.

Sterowanie w skrócie:
- **patogen:** `W` `A` `S` `D` ruch, `E` kolonia (u grzyba przy kolonii: magazyn zarodników), `Q` wnikanie w ścianę serca, `F` ukrycie, `R` rozmnożenie, `B` sygnały chemiczne (fałszywy objaw), `7`–`0` i `6` mutacje, `T` toksyny, kółko myszy lekko reguluje przybliżenie, `Tab` filtr pixel art (zwykły → pixel art → styl retro → zwykły);
- **lekarz:** `Z` `X` `C` `G` `V` `N` `U` `I` `O` `P` badania, `1`–`5` i `Y` leczenie, `H` `J` `K` `L` operacja zastawki; chemioterapia, radioterapia i wszystko inne także z rozwijanych menu w panelu. Przycisk „Wiki” otwiera bazę wiedzy.
Pełne zasady i sterowanie: [docs/INSTRUKCJA.md](docs/INSTRUKCJA.md).

## Dokumentacja

| Plik | Dla kogo | Co zawiera |
| --- | --- | --- |
| [docs/INSTRUKCJA.md](docs/INSTRUKCJA.md) | gracze | zasady, sterowanie, gra przez sieć, rozwiązywanie problemów |
| [docs/ARCHITEKTURA.md](docs/ARCHITEKTURA.md) | programiści | budowa kodu, stan i komendy, sieć, render, język, jak dodać funkcję |
| [docs/BALANS.md](docs/BALANS.md) | projektanci | liczby balansu (pacjenci, badania, grzyb, nowotwór) z uzasadnieniem |
| [docs/PLAN.md](docs/PLAN.md) | wszyscy | plan rozwoju i statusy kolejnych aktualizacji |
| [docs/TODO.md](docs/TODO.md) | wszyscy | na przyszłość: operacje, cały organizm, propozycje, sprawy techniczne |
| [CHANGELOG.md](CHANGELOG.md) | wszyscy | historia wersji |
| [CLAUDE.md](CLAUDE.md) | Claude | kontekst projektu do wznowienia pracy w nowej rozmowie |

## Technologia

Czysty HTML, CSS i JavaScript (bez bundlera), Three.js r128 z cdnjs, Web Audio, WebRTC, Canvas 2D (panel lekarza),
tłumaczenie interfejsu przy wyświetlaniu (`js/i18n.js` + słownik `js/lang/en.js`).
Strona publikuje się sama na GitHub Pages przy każdym wypchnięciu na `main`, a zmiana wersji tworzy tag i wydanie (Release).
