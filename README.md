# PatientZero

Asymetryczna gra na dwie osoby: **bakteria** próbuje zainfekować ciało, **lekarz** diagnozuje i leczy.
Jedna arena (serce). Dwa tryby: deweloperski (jeden gracz na obu połówkach ekranu) i gra na 2 osoby przez sieć.

## Uruchomienie

Zagraj online: https://michalstankiewicz4-cell.github.io/PatientZero/

Lokalnie: otwórz `index.html` w przeglądarce (Chrome, Edge, Firefox). Serwer nie jest potrzebny, bo skrypty są zwykłe (nie ES-moduły).
Three.js (r128) ładuje się z cdnjs, więc za pierwszym razem potrzebny jest internet.

## Tryby

- **Tryb deweloperski**: jeden ekran, lewa połowa to bakteria, prawa to lekarz. Do testów.
- **Gra na 2 osoby**: każdy na swoim komputerze widzi tylko swoją połowę.
  1. Host klika „Utwórz grę”, wybiera rolę i wysyła drugiemu graczowi kod zaproszenia (np. przez komunikator).
  2. Drugi gracz klika „Dołącz do gry”, wkleja kod i odsyła kod odpowiedzi.
  3. Host wkleja kod odpowiedzi i klika „Połącz”. Potem wybiera narząd i gra się zaczyna.

Połączenie jest bezpośrednie (WebRTC), bez serwera gry. Publiczne serwery STUN Google pomagają tylko ustalić adresy przez routery; dane gry przez nie nie przechodzą.
W części sieci (firmowe, niektóre mobilne) bezpośrednie połączenie bywa zablokowane — wtedy potrzebny byłby serwer pośredniczący (TURN).
W grze na 2 osoby w prawym dolnym rogu jest wskaźnik połączenia: kolor (dobre, słabe, brak danych), ping i liczba paczek stanu na sekundę.
Klawisz `I` albo kliknięcie otwiera szczegóły: rolę, trasę (sieć lokalna, internet, serwer pośredniczący), ping, zgubione paczki i przesłane dane.
Po 2 s bez danych pojawia się ostrzeżenie z odliczaniem, po 6 s ekran rozłączenia. Gdy drugi gracz zamknie kartę, gra pokazuje „Drugi gracz opuścił grę”.

Tryb sieciowy działa z GitHub Pages i z lokalnego pliku; nie działa w podglądzie artefaktu claude.ai, który blokuje WebRTC.

## Sterowanie

| Kto | Klawisze |
| --- | --- |
| Bakteria (lewa połowa) | `W` `A` `S` `D` ruch, kółko myszy przybliża i oddala, `M` dźwięk |
| Lekarz (prawa połowa) | `B` badanie krwi, `1` przeciwciała, `2` gorączka, `3` antybiotyk (albo przyciski) |

## Zasady v0

- Bakteria startuje w żyle głównej górnej. Prąd krwi zmienia się z rytmem serca (72/min): w rozkurczu krew płynie z przedsionków do komór, w skurczu jest wyrzucana do pnia płucnego i aorty.
- Zastawki otwierają się i zamykają w rytmie serca. Struny ścięgniste są przeszkodami.
- Wypłynięcie pniem płucnym przenosi bakterię przez płuca do lewego przedsionka, a aortą przez krążenie duże do prawego przedsionka.
- Kontakt z tkanką zwiększa kolonizację i tworzy widoczne kolonie (biofilm). 100% kolonizacji to wygrana bakterii.
- Lekarz zleca badanie krwi (12 s). Wynik pokazuje zaawansowanie zakażenia z chwili badania i odblokowuje leczenie:
  - **Przeciwciała**: pojawiają się w krwi, płyną z prądem, a w pobliżu bakterii same do niej płyną. Każde przyczepione zabiera życie i spowalnia.
  - **Gorączka**: temperatura rośnie do 39,6 °C, bakteria traci życie, a kolonizacja zwalnia o połowę.
  - **Antybiotyk**: bakteria porusza się wolniej przez 10 s.
- **Podgląd pacjenta**: lekarz widzi w małym okienku grę bakterii opóźnioną o 5 s.
- **Zdjęcie z badania**: razem z wynikiem badania lekarz dostaje zdjęcie miejsca, w którym była bakteria w chwili pobrania krwi (czyli 12 s wcześniej), z nazwą miejsca.
- **Oporność**: każde kolejne użycie tego samego leczenia działa o 20 punktów procentowych słabiej (100%, 80%, 60%, 40%, minimum 20%). Lekarz widzi skuteczność następnej dawki, a bakteria swoją oporność.
- Spadek życia bakterii do 0 to wygrana lekarza.
- Minimapa w rogu pokazuje bakterię, kadr kamery i kolonie. PP, PK, LP, LK to przedsionki i komory.
- Dźwięk bicia serca jest syntezowany na żywo: „lub” przy zamknięciu zastawek przedsionkowo-komorowych, „dub” przy zamknięciu zastawek półksiężycowatych.

Warunki wygranej są tymczasowe, żeby dało się zagrać pełną rundę. Wszystkie liczby balansu są w `js/config.js`.

## Struktura

```
index.html            układ podzielonego ekranu, nakładki
css/style.css         wygląd obu połówek
js/config.js          balans, tętno, rozdzielczości
js/heart-shape.js     geometria serca jako pole odległości (SDF): komory, naczynia, zastawki
js/flow.js            pole przepływu krwi zależne od fazy cyklu serca + turbulencja (curl noise)
js/state.js           stan gry, komendy, krok symulacji, kolizje
js/input.js           klawiatura -> komendy
js/net.js             WebRTC: kody zaproszenia/odpowiedzi, kanały, wysyłanie i odtwarzanie stanu
js/net-status.js      wskaźnik połączenia, ostrzeżenie, panel szczegółów
js/lobby.js           ekran tworzenia i dołączania do gry
js/minimap.js         minimapa bakterii (sylwetka z SDF)
js/audio.js           bicie serca w Web Audio
js/doctor-cam.js      podgląd lekarza: historia stanu, widok z opóźnieniem, zdjęcie z chwili pobrania krwi
js/doctor-ui.js       panel lekarza (EKG, parametry, badanie, leczenie, dziennik) i HUD bakterii
js/main.js            pętla: komendy -> stały krok 60 Hz -> render
js/render/glsl.js     wspólne shadery: szum, światło mokrej tkanki, pochłanianie we krwi, kaustyki
js/render/tissue.js   tkanka: siatka przemieszczana z SDF, beleczki, przekrój mięśnia, nasierdzie
js/render/cells.js    krwinki (instancing, kształt Evansa–Funga) i drobiny osocza
js/render/actors.js   bakteria z wiciami, przeciwciała, kolonie, płatki zastawek, struny, mięśnie brodawkowate
js/render/post.js     bloom, głębia ostrości, aberracja, falowanie gorąca, ACES, winieta, ziarno
js/render/view.js     kamera śledząca bakterię, światło "endoskopu"
```

## Architektura sieci

Stan zmienia się tylko przez `DD.Game.apply(state, komenda)` i `DD.Game.step(state, dt)`.
Klawiatura i panel lekarza wysyłają komendy przez `DD.send`, które sprawdza, czy rola gracza pozwala na daną komendę.
Host liczy symulację i ~20 razy na sekundę wysyła gościowi stan (kanał bez retransmisji); gość wysyła tylko swoje komendy (kanał niezawodny).
Gość wygładza pozycje między paczkami stanu. Sygnał „żyję” co sekundę wykrywa zerwanie połączenia po 6 s ciszy.
Gdy host schowa kartę, symulację napędza zapasowy zegar, żeby gra nie stanęła.

Krwinki i drobiny osocza są tylko wizualne i nie należą do stanu gry, więc nie trzeba ich przesyłać.
