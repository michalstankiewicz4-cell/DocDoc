# Zmiany

Format: [Keep a Changelog](https://keepachangelog.com/pl/1.1.0/), numeracja: [SemVer](https://semver.org/lang/pl/).

Zasady numeracji w tym projekcie (do wersji 1.0.0):
- **0.X.0** — nowa funkcja albo zmiana zasad gry,
- **0.X.Y** — poprawki, dokumentacja, drobne zmiany bez wpływu na rozgrywkę.

Wersję zmienia `node tools/bump.js X.Y.Z`. Po wypchnięciu zmiany `js/version.js` GitHub Actions (`.github/workflows/release.yml`)
sam tworzy tag `vX.Y.Z` i wydanie (Release) z opisem z tego pliku.

## [Unreleased]

## [0.22.0] - 2026-10-09
### Dodane
- **Jama brzuszna: wątroba i nerka.** Mapa sięga pod przeponę. Aorta zstępująca odchodzi od łuku aorty, okrąża serce i schodzi do brzucha; żyła główna dolna płynie od nerki przez wątrobę do prawego przedsionka.
- **Wątroba:** zraziki (płytki hepatocytów wokół żyły centralnej), tętnica wątrobowa, żyła wrotna (wlot z jelit przez tętnicę krezkową górną), żyły wątrobowe, pęcherzyk żółciowy. Czerwonobrązowy miąższ z siateczką zrazików.
- **Nerka:** kora (ziarnista, z kłębuszkami), piramidy rdzenia (prążkowane), tętnice i żyły międzypłatowe, tętnica łukowata, tętnica i żyła nerkowa, miedniczka i moczowód.
- Nazwy nowych miejsc w HUD (np. „Zraziki wątroby”, „Tętnica łukowata”, „Kłębuszek nerkowy”), nowe drogi poza mapą: kończyny dolne, jelita.
- Minimapa przełącza się między sercem a jamą brzuszną.
- Prąd krwi w zrazikach i nerce liczony z rozkładu ciśnienia (opływa przeszkody).
### Zmienione
- Wnikanie w ścianę (`Q`) działa tylko w sercu. Echo pokazuje tylko kolonie w sercu.
- Wyjście górą aorty prowadzi do żyły głównej górnej (żyła główna dolna dostaje krew z nóg i nerki).
- Więcej pożywienia (170) i przeciwciał na dawkę (56), bo krwiobieg jest większy; pożywienie, które nie zostało zjedzone przez 90 s, pojawia się w innym miejscu.
- Płaszczyzna tkanki podzielona na 4 pasy pomijane poza kadrem.

## [0.21.0] - 2026-10-09
### Dodane
- **Rodzaje patogenów na starcie:** bakterie — gronkowiec złocisty (MRSA, grona ziarenkowców), paciorkowiec (łańcuszek), pałeczka okrężnicy (pałeczka z witkami); wirusy — grypa (kulisty z kolcami), Coxsackie B (mały dwudziestościan), adenowirus (dwudziestościan z włóknami). Każdy ma własny wygląd 3D.
- Wrażliwość na leki zależy od rodzaju: gronkowiec oporny na β-laktamy, pałeczka okrężnicy na makrolidy, paciorkowiec wrażliwy na oba; lek przeciwwirusowy działa na grypę w 100%, na adenowirusa w 60%, na Coxsackie B w 20%.
- **Mikroskop** (`N`): próbka krwi pod mikroskopem po 6 s — bakterie w barwieniu Grama, wirusy w mikroskopie elektronowym; nazwa rodzaju, opis i podpowiedź leczenia. Pusty wynik, gdy patogen, jego kopie ani kolonie na ścianach naczyń nie były we krwi. W sali na stole laboratoryjnym pracuje mikroskop.
### Zmienione
- Naturalna oporność bakterii wynika z rodzaju, a nie z losowania.
- HUD i ekran końcowy podają nazwę rodzaju patogenu.

## [0.20.0] - 2026-10-09
### Dodane
- **Różne działanie pożywienia:** lipidy dodatkowo leczą (+4 życia), aminokwasy dają punkty mutacji (+0,15), glukoza tylko napełnia pasek.
- **Kopie żyją 40 s:** w ostatnich 4 s maleją, potem obumierają. Nowa statystyka końcowa: kopie obumarłe.
- **Posiew pokazuje komórki we krwi:** dodatni posiew podaje liczbę komórek bakterii we krwi (patogen, jeśli płynie we krwi, i jego kopie) — wskazówka dla lekarza, że patogen się rozmnaża.

## [0.19.0] - 2026-10-09
### Dodane
- **Pożywienie we krwi:** glukoza (białe kryształki), aminokwasy (bursztynowe kuleczki) i lipidy (żółte kropelki) płyną z prądem. Patogen zjada je, wpływając w nie, i napełnia pasek „Pożywienie” (+10 / +15 / +25 do 100).
- **Rozmnożenie** (`R`): za pełny pasek pożywienia powstaje kopia patogenu (najwyżej 6), która dryfuje z prądem krwi.
- **Kopie jako wabiki:** przeciwciało wybiera cel losowo spośród patogenu i kopii w zasięgu; trafiona kopia ginie razem z przeciwciałem.
- Kopie na minimapie i w podglądzie lekarza, licznik kopii w HUD, nowe statystyki końcowe (zjedzone pożywienie, kopie, przeciwciała zwiedzione przez kopie).

## [0.18.0] - 2026-10-08
### Dodane
- **Mecz z zamianą ról** w grze na 2 osoby: 2 rundy; po pierwszej przycisk „Rewanż z zamianą ról” zamienia graczy rolami (może go nacisnąć każdy z graczy), po drugiej „Nowy mecz”.
- Blok meczu na ekranie końcowym z perspektywy gracza: wyniki rund (kto wygrał, jaką rolą, w jakim czasie) i werdykt. Przy remisie 1:1 wygrywa szybsze zwycięstwo.
- Wynik meczu prowadzi host i przesyła go gościowi.

## [0.17.0] - 2026-10-08
### Dodane
- **Sala z pacjentem** w panelu lekarza (rysowana na żywo): pacjent na łóżku oddycha w tempie zależnym od stanu, gorączki i kolonii w prawym sercu, kaszle, poci się przy gorączce, blednieje i sinieje przy złym stanie; kroplówka kapie, gdy lek jest we krwi; monitor na ścianie miga przy alarmie.
- **Objawy jako wskazówki** wynikające z położenia kolonii: prawe serce → kaszel i duszność, lewe serce → pobudzenia przedwczesne na EKG (zaburzenia rytmu), żyła główna dolna → obrzęk nóg; do tego gorączka, bladość, sinica. Lista objawów pod salą.
- **Laboratorium**: w czasie badań kręci się wirówka (CRP), na szalce rosną kolonie (posiew; przy wirusie nic nie rośnie), krążki antybiogramu dostają strefy zahamowania, a głowica USG leży na klatce pacjenta (echo).
- **Alarmy monitora**: przy stanie pacjenta poniżej 30% albo gorączce od 39 °C karta monitora pulsuje na czerwono; przy stanie krytycznym gra alarm wysokiego priorytetu (pięć szybkich tonów co 3 s).
### Zmienione
- Kaszel zależy głównie od kolonii w prawym sercu (krążenie płucne), a mniej od ogólnej kolonizacji.

## [0.16.0] - 2026-10-08
### Dodane
- **Operacja zastawki** (`H` trójdzielna, `J` mitralna, `K` pnia płucnego, `L` aorty albo przyciski): zabieg trwa 10 s, obciąża pacjenta (stan −15) i po zakończeniu usuwa wszystkie ogniska w promieniu 5 j. od zastawki, także w ścianie. Patogen w pobliżu traci 40 życia. Kolejna operacja po 60 s.
- Statystyki: liczba operacji i usuniętych nimi ognisk.
- Wzorcowe obrazy kardiomiocytów w `docs/reference/` (do dopracowania grafiki biomu po testach).

## [0.15.0] - 2026-10-08
### Dodane
- **Ukrycie w kolonii** (`F`): bakteria chowa się w biofilmie, wirus w zakażonej komórce. Przeciwciała jej nie widzą, ale nie może się ruszać; nadal żeruje, gorączka i leki działają. Zniszczenie kolonii wyrzuca patogen z ukrycia.
- **Mutacje** (`7`–`0`) za punkty z przyrostu kolonii: szybkość (3 poziomy), odporność na gorączkę (2), otoczka przeciw przeciwciałom (2), toksyny (1). Koszt kolejnych poziomów: 1, 2, 3 punkty.
- **Toksyny** (`T`, po mutacji): kosztują 10 życia, obniżają stan pacjenta o 6 i przez 15 s zakłócają badania pobrane w tym czasie (zawyżone, rozrzucone CRP, przesunięte ogniska w echu).
- Antybiogram uwzględnia otoczkę i odporność na gorączkę.
- Panel mutacji w HUD patogenu; nowe statystyki: mutacje, toksyny, czas w ukryciu.

## [0.14.0] - 2026-10-08
### Dodane
- Nowy biom: **mięsień sercowy**. Przy ścianie `Q` rozpoczyna wnikanie (bakteria 2,5 s, wirus 1 s); odpłynięcie od ściany albo drugie `Q` je przerywa.
- W mięśniu: ruch bez prądu krwi, wolniejszy, między kardiomiocytami (komórki są przeszkodami); kamera zbliża się do przekroju ściany.
- Grafika biomu: kardiomiocyty z prążkowaniem poprzecznym, jądrami i wstawkami, włókna kolagenu; krew z krwinkami widoczna obok przekroju.
- Ukryte kolonie w mięśniu: przeciwciała do nich nie docierają, antybiotyki i lek przeciwwirusowy działają na nie o połowę słabiej. Patogen odradza się w nich także po śmierci.
- Echo serca pokazuje kolonie w mięśniu tylko jako niewyraźne zgrubienia ściany w przybliżonym miejscu.
- Patogen w mięśniu stale żeruje (odzyskuje życie) i jest niewidoczny dla przeciwciał.
- Statystyka „Wniknięcia w ścianę serca”; kolonie w mięśniu na minimapie jako pierścienie.

## [0.13.0] - 2026-10-08
### Dodane
- Wybór patogenu: **bakteria** albo **wirus** (gracz patogenu wybiera przed startem; lekarz nie wie, który). Wirus: kapsyd z wypustkami, mniej życia, wolniejszy, szybciej namnażające się kolonie (fioletowe skupiska zakażonych komórek).
- Klasy leków zamiast jednego antybiotyku:
  - `3` **β-laktam** — bakteriobójczy: niszczy bakterię i kurczy kolonie,
  - `4` **makrolid** — bakteriostatyczny: spowalnia bakterię i wstrzymuje wzrost kolonii,
  - `5` **lek przeciwwirusowy** — hamuje i osłabia wirusa.
  Antybiotyki nie działają na wirusa, lek przeciwwirusowy na bakterię.
- Naturalna oporność: bakteria jest losowo odporna na jedną klasę antybiotyków (ukryte, ujawnia antybiogram).
- Patogen widzi w HUD, które leki są we krwi i czy na niego działają.
### Zmienione
- Posiew przy wirusie jest ujemny („brak wzrostu bakterii”).
- Antybiogram pokazuje skuteczność przeciwciał, gorączki i obu klas antybiotyków.
- Każda runda jest inna (losowość z nowym ziarnem przy starcie).

## [0.12.0] - 2026-10-08
### Dodane
- Cztery badania, które mogą biec równolegle; każdy wynik opisuje chwilę pobrania próbki:
  - **CRP** (`Z`, 4 s): szybkie, przybliżone — poziom stanu zapalnego z szumem pomiaru,
  - **Posiew krwi** (`X` lub `B`, 12 s): dokładna kolonizacja i zdjęcie miejsca pobrania,
  - **Echo serca** (`C`, 8 s): obraz w stylu USG z kolonii widocznych jako jasne ogniska,
  - **Antybiogram** (`V`, 18 s, po dodatnim posiewie): wrażliwość patogenu na każde leczenie.
- Karty wyników badań w panelu lekarza; parametr „Zakażenie” na monitorze pokazuje wynik dokładny (posiew) albo szacunek (≈, z CRP).
### Zmienione
- Pierwszy wynik dowolnego badania odblokowuje leczenie.

## [0.11.0] - 2026-10-08
### Dodane
- Zakładanie kolonii klawiszem `E` przy ścianie, kosztem 25 punktów życia patogenu.
- Kolonie rosną same; kolonizacja to suma ich rozmiarów.
- Żerowanie: kontakt ze ścianą odnawia życie patogenu.
- Kolonie jako „życia”: zniszczony patogen odradza się po 3 s w największej kolonii, która traci część masy.
- Przeciwciała atakują też kolonie, gdy patogenu nie ma w pobliżu. Antybiotyk wstrzymuje wzrost kolonii, gorączka go spowalnia.
- Licznik kolonii w HUD, kolonie na minimapie wielkością odpowiadają rozmiarowi, nowe statystyki (założone i zniszczone kolonie, odrodzenia).
### Zmienione
- Lekarz wygrywa dopiero wtedy, gdy nie ma ani patogenu, ani kolonii.
- Kolonizacja nie rośnie już od samego kontaktu ze ścianą, tylko z kolonii.

## [0.10.0] - 2026-10-08
### Dodane
- Stan pacjenta (0–100%): spada od zakażenia, gorączki i skutków ubocznych leków, powoli wraca, dopóki kolonizacja jest mała.
- Każda dawka leczenia ma koszt dla pacjenta, widoczny na przycisku.
- Stan pacjenta na monitorze lekarza, w HUD bakterii i w statystykach końcowych.
### Zmienione
- Bakteria wygrywa, gdy stan pacjenta spadnie do 0 (sepsa), a nie przy 100% kolonizacji. Kolonizacja zatrzymuje się na 100% i dalej obciąża pacjenta.

## [0.9.0] - 2026-10-08
### Dodane
- Dźwięk patogenu „pod wodą”: szum płynącej krwi, głośniejszy w skurczu i w silnym prądzie.
- Kaszel pacjenta: im większa kolonizacja, tym częstszy. Patogen słyszy go głucho od środka, lekarz wyraźnie w sali.
- Ustawienia kaszlu w `config.js` (`cough`).

## [0.8.0] - 2026-10-08
### Dodane
- Dźwięk lekarza (sala szpitalna): „beep” pulsoksymetru przy każdym uderzeniu serca, alarm monitora przy gorączce od 39 °C, dzwonek przy wyniku badania.
### Zmienione
- Dźwięk zależy od roli: patogen słyszy serce od środka, lekarz salę szpitalną; w trybie deweloperskim obie warstwy.

## [0.7.0] - 2026-10-08
### Dodane
- Statystyki rundy na ekranie końcowym: dla bakterii (droga, kolonizacja, kolonie, czas przy ścianie, przejścia przez zastawki, krążenia, odwiedzone jamy, najmniej życia) i dla lekarza (badania, czas pierwszego badania i leczenia, użyte leki, trafienia i obrażenia).
- Statystyki przesyłane do gościa w grze na 2 osoby.

## [0.6.3] - 2026-10-08
### Dodane
- `CLAUDE.md`: kontekst projektu do wznowienia pracy w nowej rozmowie (zasady pracy, stan, lista zadań, decyzje).

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

[Unreleased]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.22.0...HEAD
[0.22.0]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.21.0...v0.22.0
[0.21.0]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.20.0...v0.21.0
[0.20.0]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.19.0...v0.20.0
[0.19.0]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.18.0...v0.19.0
[0.18.0]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.17.0...v0.18.0
[0.17.0]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.16.0...v0.17.0
[0.16.0]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.15.0...v0.16.0
[0.15.0]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.14.0...v0.15.0
[0.14.0]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.13.0...v0.14.0
[0.13.0]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.12.0...v0.13.0
[0.12.0]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.11.0...v0.12.0
[0.11.0]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.10.0...v0.11.0
[0.10.0]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.9.0...v0.10.0
[0.9.0]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.6.3...v0.7.0
[0.6.3]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.6.2...v0.6.3
[0.6.2]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.6.1...v0.6.2
[0.6.1]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.6.0...v0.6.1
[0.6.0]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.3.1...v0.4.0
[0.3.1]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/michalstankiewicz4-cell/PatientZero/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/michalstankiewicz4-cell/PatientZero/releases/tag/v0.1.0
