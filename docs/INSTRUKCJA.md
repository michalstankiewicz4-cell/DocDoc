# Instrukcja obsługi

Ta instrukcja opisuje grę w aktualnej wersji (numer wersji widać na ekranie startowym).
Zmiany między wersjami: [CHANGELOG.md](../CHANGELOG.md).

## O co chodzi

Gra toczy się wewnątrz serca pacjenta, pokazanego w przekroju.

- **Patogen** (bakteria) płynie z prądem krwi, przeciska się przez zastawki i przyczepia do ścian, tworząc kolonie.
- **Lekarz** nie widzi patogenu wprost. Zleca badania krwi, ogląda opóźniony podgląd i leczy.

| Kto | Wygrywa, gdy |
| --- | --- |
| Patogen | kolonizacja dojdzie do 100% |
| Lekarz | życie patogenu spadnie do 0 |

## Tryby gry

### Tryb deweloperski
Jeden ekran, jeden gracz. Lewa połowa to patogen, prawa to lekarz. Służy do testów i nauki zasad.

### Gra na 2 osoby
Każdy gracz na swoim komputerze widzi tylko swoją połowę. Połączenie jest bezpośrednie (WebRTC), bez serwera gry.

1. **Host** klika „Utwórz grę”, wybiera swoją rolę i kopiuje **kod zaproszenia**.
2. Wysyła kod drugiemu graczowi dowolnym komunikatorem.
3. **Drugi gracz** klika „Dołącz do gry”, wkleja kod zaproszenia i kopiuje **kod odpowiedzi**. Dostaje rolę, której host nie wybrał.
4. Odsyła kod odpowiedzi hostowi.
5. Host wkleja kod odpowiedzi i klika „Połącz”, a potem wybiera narząd startowy.

Host liczy całą grę, więc gość może odczuwać niewielkie opóźnienie sterowania.

## Patogen

### Sterowanie
| Klawisz | Działanie |
| --- | --- |
| `W` `A` `S` `D` | ruch |
| kółko myszy | przybliżenie i oddalenie kamery |
| `M` | dźwięk włącz/wyłącz |

### Jak grać
- **Prąd krwi** zmienia się z rytmem serca (72/min). W rozkurczu krew płynie z przedsionków do komór, w skurczu jest wyrzucana do pnia płucnego i aorty. Pod prąd płynie się trudno, więc warto wyczuć rytm.
- **Zastawki** otwierają się i zamykają w rytmie serca: trójdzielna i mitralna w rozkurczu, pnia płucnego i aorty w skurczu.
- **Struny ścięgniste** w komorach są przeszkodami.
- **Krwiobieg:** wypłynięcie pniem płucnym przenosi patogen przez płuca do lewego przedsionka, a aortą przez krążenie duże z powrotem do prawego przedsionka.
- **Kolonizacja:** kontakt ze ścianą serca zwiększa kolonizację i co kilka procent tworzy widoczną kolonię (biofilm).

### Ekran
- **Lewy dolny róg:** życie, kolonizacja i aktywne efekty (gorączka, antybiotyk, przyczepione przeciwciała, oporność).
- **Prawy górny róg:** minimapa. PP to prawy przedsionek, PK prawa komora, LP lewy przedsionek, LK lewa komora. Ramka oznacza kadr kamery, zielone kropki to kolonie.

## Lekarz

### Sterowanie
| Klawisz | Działanie |
| --- | --- |
| `B` | badanie krwi |
| `1` | przeciwciała |
| `2` | gorączka |
| `3` | antybiotyk |

Każdą akcję można też kliknąć w panelu.

### Jak grać
1. **Badanie krwi** trwa 12 s. Wynik pokazuje kolonizację z chwili pobrania krwi i zdjęcie miejsca, w którym wtedy był patogen. Pierwszy wynik odblokowuje leczenie.
2. **Leczenie:**
   - **Przeciwciała** pojawiają się w całej krwi i płyną z prądem, a w pobliżu patogenu same do niego płyną. Każde przyczepione zabiera życie i spowalnia.
   - **Gorączka** podnosi temperaturę do 39,6 °C. Patogen traci życie, a kolonizacja zwalnia o połowę.
   - **Antybiotyk** spowalnia patogen przez 10 s.
3. **Oporność:** każde kolejne użycie tego samego leczenia działa słabiej (100%, 80%, 60%, 40%, potem stale 20%). Skuteczność następnej dawki widać na przycisku.
4. **Podgląd pacjenta** pokazuje grę patogenu z 5-sekundowym opóźnieniem.
5. **Dziennik** zapisuje badania, wyniki i podane leki.

## Koniec rundy

Po wygranej jednej ze stron ekran końcowy pokazuje statystyki obu graczy: drogę bakterii, najwyższą kolonizację, przejścia przez zastawki, odwiedzone jamy serca, a dla lekarza liczbę badań, czas pierwszego badania i leczenia, użyte leki i zadane obrażenia. „Zagraj jeszcze raz” zaczyna nową rundę.

## Dźwięk

- **Patogen** słyszy wszystko jak pod wodą: przytłumione „lub-dub” serca i szum krwi, który narasta w skurczu i w silnym prądzie.
- **Kaszel pacjenta** słyszą obaj gracze, tym częściej, im większa kolonizacja. Patogen słyszy go głucho od środka, lekarz wyraźnie w sali. To wskazówka dla lekarza, że zakażenie postępuje.
- **Lekarz** słyszy salę szpitalną: „beep” pulsoksymetru przy każdym uderzeniu serca, alarm monitora (trzy tony co 6 s) przy gorączce od 39 °C i dzwonek, gdy przychodzi wynik badania.
- W trybie deweloperskim słychać obie warstwy, lekarza ciszej.

Dźwięk włącza się po pierwszym kliknięciu albo klawiszu, bo przeglądarki wcześniej go blokują. `M` wycisza, a wybór zostaje zapamiętany.

## Połączenie (gra na 2 osoby)

- **Wskaźnik w prawym dolnym rogu:** kolor (zielony dobre, żółty słabe, czerwony brak danych), ping i liczba paczek stanu na sekundę.
- **Klawisz `I`** albo kliknięcie wskaźnika: szczegóły (rola, trasa połączenia, ping, zgubione paczki, przesłane dane).
- **Ostrzeżenie** pojawia się po 2 s bez danych z odliczaniem. Po 6 s gra pokazuje rozłączenie.
- **Wyjście gracza:** gdy drugi gracz zamknie kartę, zobaczysz „Drugi gracz opuścił grę”.

## Rozwiązywanie problemów

| Problem | Co zrobić |
| --- | --- |
| Czarny ekran po lewej, komunikat o WebGL | Użyj aktualnego Chrome, Edge albo Firefoksa i włącz akcelerację sprzętową w ustawieniach przeglądarki. |
| Kody się nie łączą | Skopiujcie kody w całości. W sieciach firmowych i części mobilnych bezpośrednie połączenie bywa zablokowane — spróbujcie innej sieci, np. domowego Wi-Fi. |
| Gra sieciowa nie działa w podglądzie na claude.ai | Podgląd blokuje WebRTC. Grajcie z adresu GitHub Pages. |
| Po aktualizacji widać starą wersję | Odśwież stronę z pominięciem pamięci podręcznej (`Ctrl+F5`). |
| Brak dźwięku | Kliknij w grę albo naciśnij klawisz, sprawdź przełącznik `M`. |
