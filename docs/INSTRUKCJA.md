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

**Mecz:** w grze na 2 osoby rozgrywacie mecz z 2 rund. Po pierwszej rundzie każdy z graczy może nacisnąć „Rewanż z zamianą ról” — gracze zamieniają się rolami i host wybiera narząd do drugiej rundy (nowy patogen wybiera bakterię albo wirusa). Ekran końcowy pokazuje wynik meczu; przy remisie 1:1 wygrywa ten, kto wygrał swoją rundę szybciej.

## Patogen

### Sterowanie
| Klawisz | Działanie |
| --- | --- |
| `W` `A` `S` `D` | ruch |
| `E` | załóż kolonię (przy ścianie albo w mięśniu, kosztuje 25 życia) |
| `Q` | wnikanie w ścianę serca (przy ścianie; drugie `Q` przerywa) |
| `F` | ukrycie w kolonii / wyjście z ukrycia |
| `R` | rozmnożenie: kopia patogenu (przy pełnym pasku pożywienia) |
| `7` `8` `9` `0` | mutacje: szybkość, odporność na gorączkę, otoczka, toksyny |
| `T` | toksyny (po mutacji) |
| kółko myszy | przybliżenie i oddalenie kamery |
| `M` | dźwięk włącz/wyłącz |

### Wybór patogenu
Przed startem gracz patogenu wybiera jedną z trzech bakterii albo jeden z trzech wirusów (na ekranie wyboru narządu, a w grze na 2 osoby także na ekranie oczekiwania). Lekarz nie wie, co wybrałeś, ale może to rozpoznać pod mikroskopem.

| | Bakterie | Wirusy |
| --- | --- | --- |
| Życie | 100 | 70 |
| Ruch | szybszy | wolniejszy |
| Kolonie | biofilm, wzrost normalny | zakażone komórki, wzrost o 30% szybszy |
| Działają na nie | przeciwciała, gorączka, antybiotyki | przeciwciała, gorączka, lek przeciwwirusowy |

| Rodzaj | Wygląd | Leczenie |
| --- | --- | --- |
| Gronkowiec złocisty (MRSA) | złociste ziarenkowce w gronach | oporny na β-laktamy (20%), makrolid działa |
| Paciorkowiec | ziarenkowce w łańcuszku | wrażliwy na β-laktamy i makrolidy |
| Pałeczka okrężnicy (E. coli) | pałeczka z witkami | oporna na makrolidy (20%), β-laktam działa |
| Wirus grypy | kulisty, gęste kolce | lek przeciwwirusowy 100% |
| Wirus Coxsackie B | mały, gładki dwudziestościan | lek przeciwwirusowy tylko 20% |
| Adenowirus | dwudziestościan z włóknami | lek przeciwwirusowy 60% |

Rodzaje w obrębie bakterii albo wirusów różnią się tylko wyglądem i wrażliwością na leki.

### Jak grać
- **Prąd krwi** zmienia się z rytmem serca (72/min). W rozkurczu krew płynie z przedsionków do komór, w skurczu jest wyrzucana do pnia płucnego i aorty. Pod prąd płynie się trudno, więc warto wyczuć rytm.
- **Zastawki** otwierają się i zamykają w rytmie serca: trójdzielna i mitralna w rozkurczu, pnia płucnego i aorty w skurczu.
- **Struny ścięgniste** w komorach są przeszkodami.
- **Krwiobieg:** wypłynięcie pniem płucnym przenosi patogen przez płuca do lewego przedsionka, a górą aorty (głowa i ręce) do żyły głównej górnej.
- **Jama brzuszna:** od łuku aorty odchodzi aorta zstępująca, która okrąża serce i schodzi pod przeponę. Stamtąd:
  - **tętnica wątrobowa** prowadzi do **wątroby**: zraziki z płytkami hepatocytów ułożonymi promieniście wokół żyły centralnej, dalej żyły wątrobowe do żyły głównej dolnej,
  - **tętnica krezkowa górna** prowadzi przez jelita do **żyły wrotnej**, która też wpływa do wątroby,
  - **tętnica nerkowa** prowadzi do **nerki**: tętnice międzypłatowe między piramidami, tętnica łukowata na granicy kory i rdzenia, kłębuszki w korze, dalej żyły międzypłatowe i żyła nerkowa do żyły głównej dolnej,
  - dół aorty brzusznej prowadzi przez nogi do żyły głównej dolnej, która płynie w górę przez wątrobę do prawego przedsionka.
  - W jamie brzusznej można zakładać kolonie i żerować, ale nie można wnikać w ścianę (`Q` działa tylko w sercu). Echo serca nie widzi kolonii w jamie brzusznej.
- **Żerowanie:** gdy patogen dotyka ściany serca, odzyskuje życie.
- **Kolonie:** przy ścianie `E` zakłada kolonię za 25 punktów życia. Kolonia rośnie sama, a suma rozmiarów kolonii to kolonizacja, która obciąża pacjenta.
  - Antybiotyk wstrzymuje wzrost kolonii, a gorączka go spowalnia.
  - Przeciwciała, które nie mają w pobliżu patogenu, atakują kolonie.
- **Mięsień sercowy:** przy ścianie `Q` rozpoczyna wnikanie (bakteria 2,5 s, wirus 1 s; trzeba zostać przy ścianie). W mięśniu:
  - nie ma prądu krwi, ruch jest wolniejszy, a kardiomiocyty są przeszkodami,
  - przeciwciała cię nie dosięgną, a antybiotyki i lek przeciwwirusowy działają o połowę słabiej,
  - patogen stale żeruje, a `E` zakłada **ukrytą kolonię** — echo pokazuje ją tylko jako niewyraźne zgrubienie ściany,
  - do krwi wracasz, podpływając do ściany naczynia.
- **Pożywienie:** we krwi płyną z prądem drobiny pożywienia: glukoza (białe kryształki, +10), aminokwasy (bursztynowe kuleczki, +15) i lipidy (żółte kropelki, +25). Patogen zjada je, wpływając w nie (we krwi, nie w mięśniu ani w ukryciu). Pasek „Pożywienie” ma 100 punktów. Lipidy dodatkowo leczą (+4 życia), a aminokwasy dają punkty mutacji (+0,15).
- **Rozmnożenie** (`R`, przy pełnym pasku): powstaje kopia patogenu, która wygląda tak samo jak on i dryfuje z prądem krwi. Najwyżej 6 kopii naraz. Kopie nie zakładają kolonii i nie są sterowane. Kopia żyje 40 s; w ostatnich sekundach maleje i obumiera.
  - Przeciwciało w pobliżu wybiera cel losowo spośród patogenu i jego kopii, więc kopie odciągają część przeciwciał. Trafiona kopia ginie razem z przeciwciałem.
- **Ukrycie** (`F`, przy własnej kolonii): patogen chowa się w kolonii. Przeciwciała go nie widzą, ale nie może się ruszać. Gorączka i leki nadal działają. Gdy kolonia zostanie zniszczona, patogen wypada z ukrycia.
- **Mutacje:** rosnące kolonie dają punkty mutacji (widać je w panelu w prawym dolnym rogu). Za punkty (1, 2, 3 za kolejne poziomy) kupujesz:
  - `7` szybkość (+15% na poziom, 3 poziomy),
  - `8` odporność na gorączkę (−30% obrażeń na poziom, 2 poziomy),
  - `9` otoczkę (−30% obrażeń od przeciwciał na poziom, 2 poziomy),
  - `0` toksyny (odblokowuje `T`).
- **Toksyny** (`T`): kosztują 10 życia, obniżają stan pacjenta o 6 i przez 15 s zakłócają badania, które lekarz wtedy zleci.
- **Odrodzenie:** gdy patogen zginie, po 3 s odradza się w swojej największej kolonii, która traci przy tym część masy. Bez kolonii śmierć patogenu kończy grę.

### Ekran
- **Lewy dolny róg:** życie, kolonizacja, stan pacjenta, pożywienie, liczba kolonii i kopii oraz aktywne efekty (gorączka, antybiotyk, przyczepione przeciwciała, oporność).
- **Prawy górny róg:** minimapa serca albo jamy brzusznej (przełącza się sama, gdy patogen przepłynie pod przeponę). PP to prawy przedsionek, PK prawa komora, LP lewy przedsionek, LK lewa komora. Ramka oznacza kadr kamery, zielone kropki to kolonie, przyciemnione kropki to kopie patogenu.

## Lekarz

### Sterowanie
| Klawisz | Działanie |
| --- | --- |
| `Z` | CRP |
| `X` (albo `B`) | posiew krwi |
| `C` | echo serca |
| `V` | antybiogram |
| `N` | mikroskop |
| `1` | przeciwciała |
| `2` | gorączka |
| `3` | antybiotyk β-laktamowy |
| `4` | antybiotyk makrolidowy |
| `5` | lek przeciwwirusowy |
| `H` `J` `K` `L` | operacja zastawki: trójdzielnej, mitralnej, pnia płucnego, aorty |

Każdą akcję można też kliknąć w panelu.

### Jak grać
1. **Badania** mogą biec równolegle, a każdy wynik opisuje chwilę pobrania próbki. Pierwszy wynik dowolnego badania odblokowuje leczenie.

   | Badanie | Czas | Co pokazuje |
   | --- | --- | --- |
   | CRP | 4 s | poziom stanu zapalnego (przybliżony, z szumem pomiaru); monitor pokazuje z niego szacunek zakażenia „≈” |
   | Posiew krwi | 12 s | dokładną kolonizację, liczbę komórek bakterii we krwi (patogen i jego kopie) |
   | Echo serca | 8 s | obraz samego serca w stylu USG (bez jamy brzusznej): kolonie na ścianach jako jasne ogniska, kolonie w mięśniu jako niewyraźne zgrubienia w przybliżonym miejscu |
   | Antybiogram | 18 s | wrażliwość patogenu na każde leczenie; wymaga dodatniego posiewu |
   | Mikroskop | 6 s | preparat krwi do przeszukania (bakterie w barwieniu Grama, wirusy w mikroskopie elektronowym) i zdjęcie patogenu w chwili pobrania; rodzaj z podpowiedzią leczenia pojawia się, gdy znajdziesz drobnoustrój |

2. **Leczenie:**
   - **Przeciwciała** pojawiają się w całej krwi i płyną z prądem, a w pobliżu patogenu albo kolonii same do nich płyną. Działają na bakterie i wirusy. Gdy patogen ma kopie, część przeciwciał atakuje kopie zamiast niego.
   - **Gorączka** podnosi temperaturę do 39,6 °C. Patogen traci życie, a kolonie rosną wolniej. Działa na oba patogeny, ale obciąża pacjenta.
   - **β-laktam** (bakteriobójczy) niszczy bakterię i kurczy kolonie.
   - **Makrolid** (bakteriostatyczny) spowalnia bakterię i wstrzymuje wzrost kolonii.
   - **Lek przeciwwirusowy** osłabia wirusa, spowalnia go i wstrzymuje wzrost jego kolonii.
   - Antybiotyki nie działają na wirusa, a lek przeciwwirusowy na bakterię. Skuteczność zależy od rodzaju patogenu (tabela w „Wybór patogenu”); rodzaj pokazuje mikroskop, a antybiogram wrażliwość z uwzględnieniem oporności nabytej.
   - **Jak rozpoznać patogen:** posiew przy bakterii jest dodatni, a przy wirusie ujemny, choć CRP rośnie.
   - **Operacja zastawki** trwa 10 s i obciąża pacjenta (stan −15). Po zakończeniu usuwa wszystkie ogniska w promieniu kilku milimetrów od wybranej zastawki, także w ścianie, a patogen w pobliżu traci 40 życia. Kolejna operacja jest możliwa po 60 s. Dobrze ją połączyć z echem serca, które pokazuje, gdzie są ogniska.
3. **Oporność nabyta:** każde kolejne użycie tego samego leczenia działa słabiej (100%, 80%, 60%, 40%, potem stale 20%). Na przycisku widać siłę następnej dawki i jej koszt dla pacjenta. Rzeczywiste działanie zależy jeszcze od rodzaju patogenu i jego naturalnej oporności.
4. **Sala z pacjentem i objawy:** na górze panelu widać pacjenta na łóżku. Objawy wynikają z tego, gdzie są kolonie:

   | Objaw | Co znaczy |
   | --- | --- |
   | kaszel, duszność | kolonie w prawym sercu (krążenie płucne) albo zły stan pacjenta |
   | zaburzenia rytmu (dodatkowe, szerokie pobudzenia na EKG) | kolonie w lewym sercu |
   | obrzęk nóg | kolonie przy żyle głównej dolnej |
   | gorączka i poty | temperatura od 37,8 °C |
   | bladość, sinica | stan pacjenta poniżej 55% / 25% |

   W czasie badań na stole w sali widać laboratorium (wirówka, szalka z posiewem, antybiogram, USG). Kroplówka kapie, gdy lek jest we krwi. Przy stanie poniżej 30% albo gorączce od 39 °C monitor pulsuje na czerwono i gra alarm.
5. **Mikroskop:** przeciągaj preparat myszą (albo kliknij obraz i używaj strzałek), aż drobnoustrój znajdzie się w środku okularu. Wtedy wokół niego pojawia się zielony pierścień, a pod obrazem nazwa rodzaju i podpowiedź leczenia. Jeśli w chwili pobrania patogenu nie było we krwi (był w mięśniu albo ukryty, bez kopii i kolonii na ścianach naczyń), preparat jest pusty — po przeszukaniu większości preparatu wynik to „Brak drobnoustrojów”.
6. **Dziennik** zapisuje badania, wyniki i podane leki.

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
