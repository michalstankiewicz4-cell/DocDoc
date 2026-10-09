# Kontekst projektu Patient Zero (dla Claude)

Ten plik pozwala wznowić pracę w nowej rozmowie bez utraty kontekstu. **Przeczytaj go w całości przed zmianami**
i aktualizuj sekcje „Stan” i „Lista zadań” po każdym wydaniu.

## Projekt

- **Gra:** Patient Zero (ze spacją; repo nazywa się PatientZero, wcześniej DocDoc). Asymetryczna gra przeglądarkowa na 2 osoby: patogen w ciele pacjenta kontra lekarz.
- **Autor:** Michał (Warszawa). Rozmawiamy po polsku.
- **Repo:** https://github.com/michalstankiewicz4-cell/PatientZero (dawniej `DocDoc`, GitHub przekierowuje stary adres).
- **Gra online:** https://michalstankiewicz4-cell.github.io/PatientZero/ (GitHub Pages, wdrożenie automatyczne po pushu na `main`).
- **Dokumentacja:** `README.md`, `docs/INSTRUKCJA.md` (gracze), `docs/ARCHITEKTURA.md` (kod), `CHANGELOG.md` (wersje),
  `docs/PLAN.md` (plan rozwoju — kolejne zadania bierz stąd, aktualizuj statusy).

## Zasady pracy (od Michała)

1. **Nie dodawaj własnych pomysłów do gry — tylko je proponuj.** Implementuj to, o co prosi Michał. Gdy potrzebna jest decyzja projektowa,
   wybierz najprostsze rozwiązanie zgodne z prośbą, opisz je w odpowiedzi jako decyzję do zmiany, a dodatkowe pomysły podaj jako propozycje.
2. **Po zakończeniu każdego punktu wysyłaj zmiany na GitHub** (commit + push na `main`).
3. **Wersjonowanie pilnowane przy każdym wydaniu:**
   - `node tools/bump.js X.Y.Z` (aktualizuje `js/version.js` i `?v=` w `index.html`),
   - wpis w `CHANGELOG.md` (nowa sekcja wersji + link porównania na dole),
   - 0.X.0 = nowa funkcja / zmiana zasad, 0.X.Y = poprawki, dokumentacja,
   - tag i Release tworzy GitHub Actions (`.github/workflows/release.yml`) po zmianie `js/version.js`.
4. **Dokumentacja na bieżąco:** każda zmiana zasad gry trafia do `docs/INSTRUKCJA.md`, zmiana budowy kodu do `docs/ARCHITEKTURA.md`.
5. **Przebieg gry ma wynikać z działań graczy.** Żadnych sztucznych etapów ani skryptowanych faz (decyzja Michała).
6. Interfejs i komentarze po polsku. Bogata, spójna grafika jest ważna.

## Środowisko (uwagi techniczne dla Claude)

- Push przez git działa tylko dla gałęzi. **Tagów nie da się wypchnąć** z sesji Claude (proxy zwraca 403), dlatego tagi robi workflow `release.yml`.
  Wersje sprzed automatu są w `tools/history-tags.txt`.
- Testy w kontenerze: Playwright + Chromium (`--use-angle=swiftshader`). cdnjs jest niedostępny, więc Three.js r128 pobieramy przez
  `npm pack three@0.128.0` i podstawiamy przez `page.route('**/three.min.js', ...)`. Render programowy jest bardzo wolny,
  więc czas symulacji w testach płynie wolniej niż w rzeczywistości. Do testu sieci używaj **dwóch osobnych przeglądarek**,
  bo karta w tle ma wstrzymane `requestAnimationFrame`.
- Logikę (stan, przepływ) da się testować w Node: ustaw `global.window = global` i wczytaj `config`, `heart-shape`, `flow`, `state`.
- WebRTC nie działa w podglądzie artefaktu claude.ai — gra sieciowa tylko z GitHub Pages albo z pliku.

## Stan (aktualizuj po każdym wydaniu)

Aktualna wersja: zobacz `js/version.js` i `CHANGELOG.md`.

Gotowe (szczegóły w `CHANGELOG.md` i `docs/INSTRUKCJA.md`):
- Serce w przekroju (SDF), prąd krwi zależny od cyklu serca, zastawki, struny ścięgniste, krążenie płucne i duże.
- Jama brzuszna: aorta zstępująca i brzuszna, żyła główna dolna, wątroba (zraziki, żyła wrotna, żyły wątrobowe), nerka (kora, piramidy, kłębuszki).
- Patogen: 3 bakterie i 3 wirusy (`config.species`, wybór ukryty przed lekarzem, rozpoznawany mikroskopem), kolonie zakładane klawiszem E (kolonie = „życia”), żerowanie,
  wnikanie w mięsień sercowy (Q, biom z kardiomiocytami), ukrycie w kolonii (F), mutacje (7–0), toksyny (T),
  pożywienie we krwi i rozmnożenie (R) — kopie są wabikami dla przeciwciał.
- Lekarz: sala z pacjentem i objawami z położenia kolonii, EKG z zaburzeniami rytmu, stan pacjenta, 6 badań (CRP, posiew,
  echo serca, USG jamy brzusznej, antybiogram, mikroskop), 5 leków (przeciwciała, gorączka, β-laktam, makrolid, przeciwwirusowy), oporność nabyta i naturalna,
  operacja zastawki, mikroskop z szukaniem patogenu na preparacie i zdjęciem z chwili pobrania, alarmy monitora.
- Dźwięk: patogen „pod wodą” (serce, szum krwi, kaszel), lekarz w sali (beep pulsoksymetru, alarmy, dzwonek wyniku).
- Tryb deweloperski i gra na 2 osoby (WebRTC + kody), statystyki połączenia, mecz z zamianą ról, statystyki końcowe.
- Wersjonowanie, CHANGELOG, automatyczne wydania, dokumentacja.

Warunki wygranej: patogen — stan pacjenta 0% (sepsa), lekarz — brak patogenu i kolonii.

## Lista zadań (zlecone przez Michała, kolejność od najłatwiejszego)

Status: [x] zrobione, [ ] do zrobienia.

- [x] Wersjonowanie + CHANGELOG
- [x] Dokumentacja: README, instrukcja, architektura
- [x] Plik kontekstu (ten plik)
- [x] Statystyki na ekranie końcowym
- [x] Dźwięk lekarza: szpitalne „beep”
- [x] Dźwięk patogenu: przytłumiony jak pod wodą, bicie serca, czasem kaszel
- [x] Stan pacjenta jako trzeci wskaźnik (patogen wygrywa przez sepsę), skutki uboczne leków
- [x] Kolonie jako „życia” patogenu + zakładanie kolonii kosztem % zdrowia, dodatkowe wskaźniki
- [x] Nowe badania: CRP (szybkie), posiew (dokładny), echo serca (pokazuje kolonie), antybiogram
- [x] Wybór patogenu: bakteria albo wirus; klasy antybiotyków
- [x] Przejście przez ścianę naczyń do tkanki (nowy, ładny biom), ukryte kolonie, z których odradza się patogen; lekarz musi je wykryć
- [x] Biofilm, mutacje, toksyny
- [x] Operacja zastawki
- [x] Pacjent na łóżku (grafika dla lekarza), objawy jako wskazówki, animacja laboratorium, alarmy monitora
- [x] Mecz z zamianą ról
- [x] Pożywienie we krwi, rozmnożenie, przeciwciała atakują kopie (v0.19.0)
- [x] Trzy ulepszenia: różne działanie pożywienia, czas życia kopii, komórki we krwi w posiewie (v0.20.0)
- [x] Rodzaje bakterii i wirusów na start, mikroskop dla lekarza (v0.21.0)
- [x] Układ krążenia rozszerzony o wątrobę i nerkę (v0.22.0)
- [x] Bez podglądu z opóźnieniem; zdjęcie przy mikroskopie; szukanie patogenu na preparacie (v0.23.0)
- [x] Start w nerce (v0.24.0)
- [x] Objawy: żółtaczka (wątroba), krew w moczu (nerka) (v0.25.0)
- [x] USG jamy brzusznej (v0.26.0)
- [x] Zoom prawie stały, delikatna regulacja kółkiem (v0.27.0)
- [x] Drobne różnice w rozgrywce między rodzajami patogenów (v0.28.0), minimapa ukryta (v0.28.1)
- [x] Start w wątrobie, strzałka-podpowiedź w mikroskopie, zdjęcie po znalezieniu (v0.29.0)
- [x] Rework ekranu lekarza: aparatura OIOM-u, rozwijane menu, pompa, sylwetka, drukarka (v0.30.0)
- [x] Uzupełnienie dokumentacji (v0.30.2)
- [x] Etapy 1–2 planu (`docs/PLAN.md`): poprawki, SEO, loader, zakończenie, filmy, tło (v0.31–0.33)
- [x] Losowanie pacjenta (v0.34.0), balans w `docs/BALANS.md`
- [ ] Dalej wg `docs/PLAN.md`: wybór języka PL/EN, ukrywanie informacji, nowe badania i leczenie, grzyb, rak, obszary poza krwiobiegiem
- [x] Poprawki: powrót z mięśnia, zamiana ról; pasek przewijania; ekran startowy, loader, nazwa; SEO (v0.30.3–v0.31.1)
- [x] Zakończenie rundy, filmy, zwijane statystyki (v0.32.0)

Do zrobienia po testach Michała (nie zmieniać przed jego uwagami):
- Wygląd kardiomiocytów: wzory w `docs/reference/` (prążkowanie, centralne jądro, wstawki, rozgałęzione włókna, jasne przestrzenie między nimi).

Odrzucone przez Michała: sztuczne etapy zakażenia (przebieg ma wynikać z działań graczy).

Propozycje Claude czekające na decyzję Michała (nie wprowadzać bez prośby):
- sala w ciemniejszym, nocnym oświetleniu (pasowałaby do panelu OIOM-u),
- dźwięk drukarki przy nowym wyniku,
- zwijanie urządzeń w panelu lekarza,
- klawisz pokazujący i chowający minimapę w trakcie gry,
- widoczność kopii dla lekarza przy wirusie (np. w CRP), glukoza dająca chwilowe przyspieszenie.

## Decyzje projektowe do potwierdzenia przez Michała

Tu zapisuj decyzje, które Claude podjął sam przy realizacji zadań (zgodnie z zasadą 1), żeby Michał mógł je zmienić.

- Kod zaproszenia nie sprawdza zgodności wersji gry między graczami.
- Stan pacjenta: liczby w `config.patient` (spadek od kolonizacji, gorączki, koszt dawek, regeneracja poniżej 40% kolonizacji).
- Kolonie (`config.colony`): koszt 25 życia, wzrost ~45 s do pełnego rozmiaru, odrodzenie w największej kolonii, żerowanie przy ścianie odnawia życie. Przeciwciała atakują kolonie, antybiotyk wstrzymuje ich wzrost.
- Badania (`config.doctor.tests`): wynik liczony w chwili zlecenia (`pending`), ujawniany po czasie; gość dostaje go dopiero gotowy. `d.test` to alias posiewu (zgodność). Zdjęcie patogenu należy do mikroskopu.
- Wirus (`config.virus`): 70 życia, ruch ×0,8, wzrost kolonii ×1,3. Leki: β-laktam (bójczy), makrolid (statyczny), przeciwwirusowy; naturalna oporność bakterii wynika z rodzaju (skuteczność 20%), patrz „Rodzaje patogenów”.
- Zdjęcie z mikroskopu pokazuje kształt patogenu (zbliżenie 5,5 j.; duch w doctor-cam musi mieć `species`). Podgląd z opóźnieniem usunięty w v0.23.0 na prośbę Michała.
- Mikroskop (v0.23.0): preparat 720 × 600 px (3 × 3 pola), 3–8 skupisk poza polem startowym, trafienie = drobnoustrój < 34 px od środka; pusty preparat po obejrzeniu 16 z 20 pól.
- Mięsień (`config.tissue`): przy ścianie naczynia wolny pas bez komórek (`cellGap` 1,3), Q w mięśniu wraca do krwi, gdy SDF < `exitReach` (4,5); pas ściany 1,2 < SDF < 7,2, płaszczyzna ruchu z = 3,3 (powierzchnia przekroju), komórki z `js/tissue-cells.js` (wspólne dla kolizji i renderu). Wykrywanie kolonii w mięśniu: echo (niewyraźnie, ±2,5 j.) i CRP (zawiera całą kolonizację).
- Mutacje (`config.mutations`): punkty z przyrostu kolonii (1,6 pkt na 1,0 rozmiaru). Toksyny zakłócają badania pobrane w ciągu 15 s (CRP ×1,6 i 3× szum, echo ±4 j.).
- Operacja zastawki (`config.doctor.surgery`): 10 s, stan −15, promień 5 j., patogen w pobliżu −40 życia, odnowienie 60 s.
- Mecz: 2 rundy, remis 1:1 rozstrzyga szybsze zwycięstwo; wynik prowadzi host (`js/match.js`).
- Kaszel: szansa na sekundę rośnie z kolonizacją i masą kolonii w prawym sercu (`config.cough`), tylko dźwięk i obraz, bez wpływu na rozgrywkę.
- Pożywienie i kopie (`config.food`, `config.copies`): 170 drobin (od v0.22.0; wcześniej 110), glukoza +10, aminokwasy +15, lipidy +25; kopia za 100 pożywienia, najwyżej 6.
  Kopie dryfują z prądem (bez sterowania), nie zakładają kolonii, giną od jednego przeciwciała. Przeciwciało wybiera cel losowo spośród patogenu i kopii w zasięgu.
  Patogen nie je w mięśniu ani w ukryciu.
  Od v0.20.0: lipidy +4 życia, aminokwasy +0,15 pkt mutacji; kopia żyje 40 s (maleje przez ostatnie 4 s);
  posiew podaje liczbę komórek we krwi (oryginał we krwi + kopie), tylko przy bakterii (posiew wirusa jest ujemny).
- Rodzaje patogenów (`config.species`): wygląd, wrażliwość na leki i od v0.28.0 mnożniki speed / growth / biofilm (gronkowiec 0,85 / 1 / 0,6; paciorkowiec 1 / 1,25 / 1; E. coli 1,15 / 1 / 1; grypa 1,1 / 1 / 1; Coxsackie 0,9 / 1,25 / 1; adeno 1 / 0,9 / 0,75).
  Gronkowiec MRSA oporny na β-laktam, E. coli na makrolid, paciorkowiec bez oporności; lek przeciwwirusowy: grypa 1,0, adenowirus 0,6, Coxsackie 0,2.
  Mikroskop (6 s, odnowienie 15 s) wykrywa rodzaj, gdy patogen płynie we krwi albo są kopie lub kolonie poza mięśniem; podaje podpowiedź leczenia.
  Dawne wartości 'bacteria' / 'virus' w komendach i localStorage mapują się na E. coli / adenowirusa.
- Wątroba i nerka (v0.22.0): świat x −60..76, y −236..58; nerka prawa (pod wątrobą), żyła wrotna zasilana z jelit (tętnica krezkowa).
  Wnikanie Q tylko w sercu; echo tylko serce, USG (G, 8 s, odnowienie 25 s) tylko jama brzuszna, ten sam szum przy toksynach (±4 j.); regiony objawów 'liver'/'kidney'/'abdomen'.
  Wyjście górą aorty → żyła główna górna; dół aorty → nogi → żyła główna dolna; tętnica krezkowa → jelita → żyła wrotna.
  Pożywienie 170, przeciwciała 56 na dawkę, pożywienie po 90 s bez zjedzenia przenosi się w inne miejsce.
  Głębokość kanałów w narządach mniejsza (dno −1,8, wierzch 1,4) niż w sercu.
- Start w nerce (`Heart.START.kidney`): punkt na tętnicy łukowatej (kąt 2,1 rad). Start w wątrobie (`START.liver`): żyła centralna środkowego zrazika. Strzałka w mikroskopie po 15 s (`HINT_AFTER`); zdjęcie patogenu widoczne dopiero po znalezieniu.
- Minimapa patogenu ukryta na prośbę Michała (nie usuwać kodu): `config.ui.minimap = false`.
- Ekran lekarza (v0.30.0, styl wybrany przez Michała: „ciemny monitor medyczny” + sylwetka): kolory kanałów w `.half-doc` (CSS), wybór z menu od razu zleca, przeciwciała widać na pompie 8 s po podaniu, sylwetka podświetla obszary z `DD.symptomList` (prawa nerka pacjenta).
- Zakończenie (v0.32.0): 5 s (`config.ending`); przy wygranej lekarza serce nie staje (tylko pauza), pisk monitora tylko przy sepsie. Film: WebM, gdy przeglądarka go obsługuje, inaczej MP4; bez wcześniejszego gestu gra bez dźwięku; przycisk „Pomiń”.
- Zoom (`config.camera`): 17, kółkiem 14–21 (Michał: „tylko delikatna regulacja”). W mięśniu kamera nadal zbliża się automatycznie (×0,6).
- Pacjenci (`config.patients`, v0.34.0): losowanie równomierne przez hosta (`cmd.patient` wymusza), mnożniki i uzasadnienie w `docs/BALANS.md`; brak pożywienia „mało” dałem seniorowi (×0,6), diabetykowi więcej pożywienia (×1,4) i 70% glukozy. Plansza 4,5 s (`config.ui.revealTime`).
- Objawy (`js/patient-room.js`): progi masy kolonii w obszarach z `Heart.regionOf` (prawe serce > 0,2 kaszel, > 0,35 duszność; lewe > 0,35 zaburzenia rytmu; żyła główna dolna > 0,25 obrzęk; wątroba > 0,3 żółtaczka; nerka > 0,3 krew w moczu; > 0,9 objaw nasilony).
