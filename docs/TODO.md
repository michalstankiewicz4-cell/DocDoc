# TODO — na przyszłość

Lista rzeczy do zrobienia kiedyś: pomysły Michała, propozycje Claude czekające na decyzję i sprawy techniczne.
Plan bieżących etapów jest w [PLAN.md](PLAN.md), liczby balansu w [BALANS.md](BALANS.md).
Oznaczenia: **[M]** pomysł Michała, **[C]** propozycja Claude (wprowadzać dopiero po zgodzie Michała), **[T]** sprawa techniczna lub do sprawdzenia.

## Tryby gry

Są już: tryb deweloperski (jedna osoba steruje obiema stronami) i gra na 2 osoby przez sieć.

- [ ] **[M]** **Tryb PvE** — gra w pojedynkę przeciw komputerowi sterowanemu prostymi regułami (bot):
  - bot-lekarz: zleca badania po objawach, dobiera lek do wyniku (mikroskop, PCR, posiew), robi zabiegi, gdy obrazowanie pokaże ogniska,
  - bot-patogen: płynie do ścian, zakłada kolonie, kupuje mutacje, ucieka przed przeciwciałami, ukrywa się w koloniach,
  - poziomy trudności (np. opóźnienie reakcji bota, czy „widzi” więcej niż gracz).
- [ ] **[M]** **Tryb PvAI** — gra przeciw sztucznej inteligencji (model językowy), która dostaje to samo, co widzi gracz (objawy, wyniki, dziennik — albo HUD patogenu) i co kilka sekund decyduje o ruchu; może komentować swoje decyzje.
- [ ] **[M]** **Multiplayer przez Supabase** — zamiast ręcznej wymiany kodów WebRTC: lobby z listą gier i dołączaniem jednym kliknięciem (Supabase Realtime do sygnalizacji / synchronizacji), konta graczy, ranking i historia meczów, mecze z losowym przeciwnikiem. Obecne połączenie WebRTC może zostać jako tryb bez serwera.
- [ ] **[T]** Przy obu trybach: wybór strony (gram patogenem / lekarzem) na ekranie startowym, bot korzysta z tych samych komend co gracz (`DD.send`), więc nie dostaje przewagi poza zasadami.

## Ulepszenie UI lekarza (następna sesja)

- [ ] **[M]** Nowy wygląd panelu lekarza według wzorów w `docs/reference/ui-lekarza/`:
  - `wzor-1-panel-neon.jpg` — obecny układ w stylu neonowego panelu (świecące ramki, ciemnogranatowe tło, ścieżki obwodów w tle, pompa obok monitora, kamera sali z aparaturą),
  - `wzor-2-medcore.png` — rozbudowany panel szpitalny: menu boczne (Przegląd, Objawy, Badanie, Badania, Leczenie, Zabiegi, Wyniki, Dziennik), więcej parametrów życiowych (SpO₂, ciśnienie, oddech), lista objawów z paskami nasilenia, wyniki z zakładkami (krew / obrazowanie / inne), szybkie akcje, pasek ostrzeżeń na dole,
  - `wzor-3-sylwetka-holo.jpg` — holograficzna sylwetka ze szkieletem i płucami (do „badania” pacjenta i mapy objawów).
- [ ] **[T]** Przed zmianą: ustalić z Michałem, które elementy ze wzorów przenieść (część, np. SpO₂ czy ciśnienie, to nowe dane w grze).

## Operacje i zabiegi

Są już: operacja zastawki, radioterapia narządu, przeszczep wątroby i nerki, amputacja nóg.

- [ ] **[M]** Więcej operacji (lista do wyboru przez Michała):
  - [ ] **[C]** wycięcie guza (resekcja) — usuwa jeden guz wskazany na tomografii lub rezonansie,
  - [ ] **[C]** drenaż ropnia — usuwa kolonię bakterii w narządzie, tańszy niż przeszczep,
  - [ ] **[C]** wymiana zastawki (proteza) — trwałe usunięcie ognisk przy zastawce, ale nowa zastawka łatwiej się zakaża,
  - [ ] **[C]** dializa — przejmuje pracę nerek przy niewydolności nerek (zatrzymuje spadek stanu),
  - [ ] **[C]** plazmafereza — oczyszcza krew z kopii, zarodników i toksyn,
  - [ ] **[C]** cewnik / wkłucie centralne — szybsze podanie leków, ale ryzyko nowego ogniska.
- [ ] **[C]** Animacja przebiegu operacji na ekranie lekarza (np. widok z kamery laparoskopowej).
- [ ] **[C]** Skróty klawiszowe dla zabiegów i nowych badań (wszystkie litery są zajęte — np. `Shift` + klawisz albo klawisze funkcyjne).

## Full body explore (cały organizm)

Teraz mapa to serce, wątroba i nerka; płuca, głowa, ręce, nogi i jelita są tylko „tranzytem” (ekran przejazdu).
Na ekranie wyboru narządu są nieaktywne kafelki: Głowa, Tułów, Ręka, Skóra.

- [ ] **[M]** Płuca jako obszar mapy (etap 9 planu): pęcherzyki, naczynia płucne, kolonie w płucach; wtedy palacz i astmatyk dostaną zmiany w płucach, RTG pokaże prawdziwe ogniska w płucach.
- [ ] **[M]** Głowa i mózg (start „Głowa”): bariera krew–mózg, objawy neurologiczne (bóle głowy, drgawki, zaburzenia świadomości).
- [ ] **[M]** Kończyny (start „Ręka”, nogi): tętnice i żyły kończyn, obrzęki, amputacja jako prawdziwe usunięcie obszaru mapy.
- [ ] **[M]** Skóra (start „Skóra”): wejście patogenu przez ranę, odczyny skórne.
- [ ] **[M]** Jelita i inne narządy jamy brzusznej (śledziona, trzustka, pęcherzyk żółciowy).
- [ ] **[M]** Obszary poza krwiobiegiem (tkanki, drogi oddechowe) — potrzebne dla astmy, palacza i grzyba.
- [ ] **[T]** Mapa całego ciała dla lekarza (sylwetka z zaznaczeniem badanych obszarów) i dla patogenu (minimapa jest ukryta — włączenie klawiszem to propozycja niżej).

## Patogeny i pacjenci

- [ ] **[M]** Więcej rodzajów grzybów (np. Aspergillus — kropidlak) i nowotworów (np. białaczka we krwi, chłoniak).
- [ ] **[C]** Kolejne bakterie i wirusy (np. gruźlica — powolna, ukryta; HIV — osłabia odporność pacjenta w czasie gry).
- [ ] **[C]** Pacjent ze schorzeniami łączonymi (np. senior + diabetyk).

## Pixel art (Tab, od v0.46.0)

Jest: pikselizacja widoku 3D, mniej odcieni, dithering (kroki 1–2).
- [ ] **[M]** Krok 3: czarne kontury obiektów (krwinki, patogen, kolonie) — decyzja po testach.
- [ ] **[M]** Krok 4: panel lekarza i HUD w stylu pixel art (pikselowa czcionka, kanciaste ramki, EKG / sala / USG w niskiej rozdzielczości).

## Propozycje Claude czekające na decyzję Michała

- [ ] **[C]** Sala w ciemniejszym, nocnym oświetleniu (pasowałaby do panelu OIOM-u).
- [ ] **[C]** Dźwięk drukarki przy nowym wyniku.
- [ ] **[C]** Zwijanie urządzeń w panelu lekarza.
- [ ] **[C]** Klawisz pokazujący i chowający minimapę patogenu w trakcie gry.
- [ ] **[C]** Widoczność kopii dla lekarza przy wirusie (np. w CRP); glukoza dająca chwilowe przyspieszenie.
- [ ] **[C]** Wykrywanie języka przeglądarki przy pierwszej wizycie (zamiast zawsze angielskiego).
- [ ] **[C]** Kropka dziesiętna w wersji angielskiej (teraz 36,9 °C zamiast 36.9 °C).

## Do zrobienia po testach Michała

- [ ] **[M]** Wygląd kardiomiocytów według wzorów w `docs/reference/` (prążkowanie, centralne jądro, wstawki, rozgałęzione włókna, jasne przestrzenie).
- [ ] **[T]** Balans: czy „po przeszczepie” nie jest za trudny dla lekarza, czy dziecko nie kończy się za szybko, tempo grzybni i guzów, liczby nowych pacjentów (v0.44.0) — tabele w `BALANS.md`.

## Sprawy techniczne

- [ ] **[T]** Kod zaproszenia nie sprawdza zgodności wersji gry między graczami — dodać ostrzeżenie przy różnych wersjach.
- [ ] **[T]** Zdjęcia w wiki dla nowych badań (RTG, rezonans) i zabiegów; skrypt Playwright z `img/wiki/`.
- [ ] **[T]** Automatyczne testy logiki w Node (np. `tools/test.js`) uruchamiane w GitHub Actions przed wydaniem.
- [ ] **[T]** Wydajność na słabszych komputerach (liczba kolonii, strzępek i naczyń guzów rysowanych naraz).
