# Instrukcja obsługi

Ta instrukcja opisuje grę w aktualnej wersji (numer wersji widać na ekranie startowym).
Zmiany między wersjami: [CHANGELOG.md](../CHANGELOG.md).

## O co chodzi

Gra toczy się wewnątrz serca pacjenta, pokazanego w przekroju.

- **Patogen** (bakteria albo wirus — wybiera gracz patogenu, lekarz tego nie wie) płynie z prądem krwi, przeciska się przez zastawki i zakłada kolonie na ścianach.
- **Lekarz** nie widzi patogenu wprost. Zleca badania krwi, ogląda opóźniony podgląd i leczy.

| Kto | Wygrywa, gdy |
| --- | --- |
| Patogen | stan pacjenta spadnie do 0% (sepsa) |
| Lekarz | nie zostanie ani patogen, ani żadna kolonia |

## Stan pacjenta

Wspólny wskaźnik obu graczy (0–100%). Widać go na monitorze lekarza i w HUD patogenu.

- **Spada** od zakażenia (im wyższa kolonizacja, tym szybciej), od gorączki i od każdej dawki leczenia (skutki uboczne; koszt widać na przycisku).
- **Rośnie** powoli sam, dopóki kolonizacja jest mniejsza niż 40%.

Lekarz musi więc leczyć oszczędnie: zbyt dużo leków też szkodzi pacjentowi.

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
| `E` | załóż kolonię (przy ścianie albo w mięśniu, kosztuje 25 życia) |
| `Q` | wnikanie w ścianę serca (przy ścianie; drugie `Q` przerywa) |
| kółko myszy | przybliżenie i oddalenie kamery |
| `M` | dźwięk włącz/wyłącz |

### Wybór patogenu
Przed startem gracz patogenu wybiera **bakterię** albo **wirusa** (na ekranie wyboru narządu, a w grze na 2 osoby także na ekranie oczekiwania). Lekarz nie wie, co wybrałeś.

| | Bakteria | Wirus |
| --- | --- | --- |
| Życie | 100 | 70 |
| Ruch | szybszy (wici) | wolniejszy |
| Kolonie | biofilm, wzrost normalny | zakażone komórki, wzrost o 30% szybszy |
| Działają na niego | przeciwciała, gorączka, antybiotyki (jedna klasa słabo) | przeciwciała, gorączka, lek przeciwwirusowy |

### Jak grać
- **Prąd krwi** zmienia się z rytmem serca (72/min). W rozkurczu krew płynie z przedsionków do komór, w skurczu jest wyrzucana do pnia płucnego i aorty. Pod prąd płynie się trudno, więc warto wyczuć rytm.
- **Zastawki** otwierają się i zamykają w rytmie serca: trójdzielna i mitralna w rozkurczu, pnia płucnego i aorty w skurczu.
- **Struny ścięgniste** w komorach są przeszkodami.
- **Krwiobieg:** wypłynięcie pniem płucnym przenosi patogen przez płuca do lewego przedsionka, a aortą przez krążenie duże z powrotem do prawego przedsionka.
- **Żerowanie:** gdy patogen dotyka ściany serca, odzyskuje życie.
- **Kolonie:** przy ścianie `E` zakłada kolonię za 25 punktów życia. Kolonia rośnie sama, a suma rozmiarów kolonii to kolonizacja, która obciąża pacjenta.
  - Antybiotyk wstrzymuje wzrost kolonii, a gorączka go spowalnia.
  - Przeciwciała, które nie mają w pobliżu patogenu, atakują kolonie.
- **Mięsień sercowy:** przy ścianie `Q` rozpoczyna wnikanie (bakteria 2,5 s, wirus 1 s; trzeba zostać przy ścianie). W mięśniu:
  - nie ma prądu krwi, ruch jest wolniejszy, a kardiomiocyty są przeszkodami,
  - przeciwciała cię nie dosięgną, a antybiotyki i lek przeciwwirusowy działają o połowę słabiej,
  - patogen stale żeruje, a `E` zakłada **ukrytą kolonię** — echo pokazuje ją tylko jako niewyraźne zgrubienie ściany,
  - do krwi wracasz, podpływając do ściany naczynia.
- **Odrodzenie:** gdy patogen zginie, po 3 s odradza się w swojej największej kolonii, która traci przy tym część masy. Bez kolonii śmierć patogenu kończy grę.

### Ekran
- **Lewy dolny róg:** życie, kolonizacja i aktywne efekty (gorączka, antybiotyk, przyczepione przeciwciała, oporność).
- **Prawy górny róg:** minimapa. PP to prawy przedsionek, PK prawa komora, LP lewy przedsionek, LK lewa komora. Ramka oznacza kadr kamery, zielone kropki to kolonie.

## Lekarz

### Sterowanie
| Klawisz | Działanie |
| --- | --- |
| `Z` | CRP |
| `X` (albo `B`) | posiew krwi |
| `C` | echo serca |
| `V` | antybiogram |
| `1` | przeciwciała |
| `2` | gorączka |
| `3` | antybiotyk β-laktamowy |
| `4` | antybiotyk makrolidowy |
| `5` | lek przeciwwirusowy |

Każdą akcję można też kliknąć w panelu.

### Jak grać
1. **Badania** mogą biec równolegle, a każdy wynik opisuje chwilę pobrania próbki. Pierwszy wynik dowolnego badania odblokowuje leczenie.

   | Badanie | Czas | Co pokazuje |
   | --- | --- | --- |
   | CRP | 4 s | poziom stanu zapalnego (przybliżony, z szumem pomiaru); monitor pokazuje z niego szacunek zakażenia „≈” |
   | Posiew krwi | 12 s | dokładną kolonizację i zdjęcie miejsca, w którym był patogen |
   | Echo serca | 8 s | obraz serca w stylu USG: kolonie na ścianach jako jasne ogniska, kolonie w mięśniu jako niewyraźne zgrubienia w przybliżonym miejscu |
   | Antybiogram | 18 s | wrażliwość patogenu na każde leczenie; wymaga dodatniego posiewu |

2. **Leczenie:**
   - **Przeciwciała** pojawiają się w całej krwi i płyną z prądem, a w pobliżu patogenu albo kolonii same do nich płyną. Działają na bakterie i wirusy.
   - **Gorączka** podnosi temperaturę do 39,6 °C. Patogen traci życie, a kolonie rosną wolniej. Działa na oba patogeny, ale obciąża pacjenta.
   - **β-laktam** (bakteriobójczy) niszczy bakterię i kurczy kolonie.
   - **Makrolid** (bakteriostatyczny) spowalnia bakterię i wstrzymuje wzrost kolonii.
   - **Lek przeciwwirusowy** osłabia wirusa, spowalnia go i wstrzymuje wzrost jego kolonii.
   - Antybiotyki nie działają na wirusa, a lek przeciwwirusowy na bakterię. Bakteria jest dodatkowo naturalnie odporna na jedną z dwóch klas antybiotyków; którą — pokazuje antybiogram.
   - **Jak rozpoznać patogen:** posiew przy bakterii jest dodatni, a przy wirusie ujemny, choć CRP rośnie.
3. **Oporność nabyta:** każde kolejne użycie tego samego leczenia działa słabiej (100%, 80%, 60%, 40%, potem stale 20%). Na przycisku widać siłę następnej dawki i jej koszt dla pacjenta. Rzeczywiste działanie zależy jeszcze od rodzaju patogenu i jego naturalnej oporności.
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
