# DocDoc

Asymetryczna gra na dwie osoby: **bakteria** próbuje zainfekować ciało, **lekarz** diagnozuje i leczy.
To wersja v0: podzielony ekran, oboma graczami steruje jedna osoba, jedna arena (serce), bez sieci.

## Uruchomienie

Otwórz `index.html` w przeglądarce (Chrome, Edge, Firefox). Serwer nie jest potrzebny, bo skrypty są zwykłe (nie ES-moduły).
Three.js (r128) ładuje się z cdnjs, więc za pierwszym razem potrzebny jest internet.

## Sterowanie

| Kto | Klawisze |
| --- | --- |
| Bakteria (lewa połowa) | `W` `A` `S` `D` ruch, kółko myszy przybliża i oddala |
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
- Spadek życia bakterii do 0 to wygrana lekarza.

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
js/doctor-ui.js       panel lekarza (EKG, parametry, badanie, leczenie, dziennik) i HUD bakterii
js/main.js            pętla: komendy -> stały krok 60 Hz -> render
js/render/glsl.js     wspólne shadery: szum, światło mokrej tkanki, pochłanianie we krwi, kaustyki
js/render/tissue.js   tkanka: siatka przemieszczana z SDF, beleczki, przekrój mięśnia, nasierdzie
js/render/cells.js    krwinki (instancing, kształt Evansa–Funga) i drobiny osocza
js/render/actors.js   bakteria z wiciami, przeciwciała, kolonie, płatki zastawek, struny, mięśnie brodawkowate
js/render/post.js     bloom, głębia ostrości, aberracja, falowanie gorąca, ACES, winieta, ziarno
js/render/view.js     kamera śledząca bakterię, światło "endoskopu"
```

## Architektura pod sieć

Stan zmienia się tylko przez `DD.Game.apply(state, komenda)` i `DD.Game.step(state, dt)`.
Klawiatura i panel lekarza wrzucają komendy do `DD.CommandBus`. Grę sieciową da się zrobić, podmieniając źródło komend:
host liczy symulację, a drugi gracz wysyła swoje komendy i dostaje stan.
Pole przepływu i szum turbulencji są deterministyczne, więc obie strony mogą liczyć ten sam prąd lokalnie.

Krwinki i drobiny osocza są tylko wizualne i nie należą do stanu gry, więc nie trzeba ich przesyłać.
