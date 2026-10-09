# Balans gry

Notatki o liczbach w `js/config.js`: co od czego zależy i dlaczego. Uzupełniane przy każdej zmianie balansu,
żeby łatwo wrócić do kontekstu. Wszystkie wartości można zmieniać — to propozycje do testów Michała.

## Pacjenci (`config.patients`, od v0.34.0)

Na początku rundy host losuje pacjenta (równe szanse). Pacjent mnoży wybrane wartości obu stron.
1 = bez zmian, większa liczba = mocniej / dłużej.

| Mnożnik | Na co działa | Dziecko | Senior | Sportowiec | Diabetyk | Po przeszczepie |
| --- | --- | --- | --- | --- | --- | --- |
| `growth` | wzrost kolonii | **1,25** | 1,1 | **0,75** | **1,3** | **1,35** |
| `colonyCost` | koszt założenia kolonii (25 życia) | 1 | **0,7** | 1,2 | 1 | **0,5** |
| `symptom` | masa kolonii widziana w objawach (wcześniejsze / późniejsze objawy, kaszel) | **1,6** | **0,75** | 1 | 1 | 1 |
| `drug` | skuteczność leków i gorączki leczniczej | 1 | **0,75** | 1 | 1 | 1 |
| `ab` | siła przeciwciał (liczba na dawkę) | 1 | 0,85 | **1,3** | 0,9 | **0,55** |
| `regen` | samoistna poprawa stanu pacjenta | 1,2 | **0,6** | **1,8** | **0,4** | 0,8 |
| `drain` | spadek stanu od zakażenia | 1 | 1 | 0,8 | 1,15 | 1,1 |
| `testCd` | odnowienie badań | 1 | 1 | 1 | 1 | **0,6** |
| `food` | ilość pożywienia we krwi (170) | 1 | **0,6** | 1 | **1,4** | 1 |
| `glucose` | udział glukozy w pożywieniu (reszta po równo aminokwasy / lipidy) | ⅓ | ⅓ | ⅓ | **0,7** | ⅓ |

Uzasadnienie (opisy Michała):
- **Dziecko** — patogen szybciej się rozprzestrzenia, ale objawy pojawiają się wcześniej, więc lekarz szybciej go wykrywa; dobra regeneracja.
- **Senior** — łatwiejsza kolonizacja i wolniejsze leczenie, objawy słabsze (trudniej rozpoznać). Mniej pożywienia we krwi (prośba o „małą ilość pożywienia u któregoś pacjenta”) — hamuje rozmnażanie, żeby senior nie był zbyt łatwy dla patogenu.
- **Sportowiec** — wolniejsza kolonizacja, silna odporność (przeciwciała, regeneracja). Najtrudniejszy dla patogenu.
- **Diabetyk** — szybki rozwój infekcji, dużo glukozy we krwi (szybsze rozmnażanie), wolne gojenie.
- **Po przeszczepie** — bardzo łatwa kolonizacja i słabe przeciwciała; w zamian lekarz częściej robi badania kontrolne.

Szacunkowa trudność dla lekarza (do sprawdzenia w testach): sportowiec < dziecko < senior ≈ diabetyk < po przeszczepie.

Do obserwacji w testach: czy „po przeszczepie” nie jest zbyt trudny dla lekarza (słabe przeciwciała i tanie kolonie naraz)
i czy dziecko z wczesnymi objawami nie kończy się zbyt szybko.

## Inne liczby

Pozostałe wartości (kolonie, leki, badania, pożywienie, rodzaje patogenów) opisuje sekcja „Decyzje projektowe” w `CLAUDE.md`.

## Ukrywanie informacji (od v0.36.0)

| Wartość | Gdzie | Liczba | Uzasadnienie |
| --- | --- | --- | --- |
| czułość posiewu, mikroskopu, echa, USG | `doctor.tests.*.sens` | 0,85 | co szósty–siódmy wynik fałszywie ujemny: opłaca się powtórzyć badanie, ale wynik nadal coś znaczy |
| maskowanie (mutacja 6) | `mutations.mask` | 2 poziomy: objawy −30%, czułość −0,15, CRP −20% na poziom; czułość nie spada poniżej 0,3 | kosztuje punkty mutacji (1, potem 2), więc konkuruje z otoczką i szybkością |
| sygnały chemiczne (B) | `signals` | 5 życia, odnowienie 30 s, objaw 20 s, masa 0,5 | masa 0,5 wystarcza na objaw „ostrzegawczy” (np. kaszel i duszność w prawym sercu), ale nie na „nasilony” |

## Nowe badania (od v0.37.0)

| Badanie | Czas / odnowienie | Czułość | Uzasadnienie |
| --- | --- | --- | --- |
| Morfologia | 5 / 15 s | rozmaz widoczny od 8% zakażenia | szybkie odróżnienie bakterii od wirusa, bez rodzaju |
| PCR | 25 / 45 s | 0,95 | pewniejszy od mikroskopu i bez szukania, ale wolny — mikroskop zostaje szybszą drogą |
| Badanie moczu | 4 / 15 s | 0,85, od masy kolonii w nerce 0,1 | tanie potwierdzenie objawu „krew w moczu” (także fałszywego od sygnałów) |
| Tomografia | 15 / 60 s | 0,95 na ognisko | jedyne badanie z dokładnym położeniem kolonii w mięśniu; długie odnowienie, żeby nie zastąpiło echa i USG |

## Grzyb (od v0.38.0, `config.fungus`, `species.candida`)

| Wartość | Liczba | Uzasadnienie |
| --- | --- | --- |
| przyrost strzępki | 0,16 j./s przy kolonii pełnej wielkości | pierwsza kolonia ze strzępki po ~1 min od założenia — grzyb rośnie wolno, ale sam |
| długość do nowej kolonii | 7 j. | kolonie rozchodzą się wzdłuż ścian, a nie skupiają w jednym miejscu |
| limit kolonii | 16 | żeby grzybnia nie zarosła całego krwiobiegu |
| magazyn | 10 życia, zarodnik co 20 s, leki ×0,3, odrodzenie kosztuje magazyn połowę | „bezpieczna baza” — lekarz musi go wykryć (tomografia, echo, USG) |
| ruch | ×0,8 | grzyb nie ma wici |
| lek przeciwgrzybiczy | 22 s odnowienia, 10 s działania, 2,0 obrażeń/s, kurczy kolonie 0,022/s | jak β-laktam dla bakterii |

## Nowotwór (od v0.41.0, `config.cancer`, `species.cancer`)

| Wartość | Liczba | Uzasadnienie |
| --- | --- | --- |
| guz bez naczyń | do 0,6 | guz bez angiogenezy nie rośnie powyżej ~1–2 mm — gracz musi „kupić” własne naczynia |
| guz z naczyniami | do 2,0 | duże guzy są groźne, ale widoczne w obrazowaniu |
| etapy (mały / średni / duży) | < 0,5 / 0,5–1,2 / ≥ 1,2 | wynikają z wielkości, nie z czasu (zasada: bez skryptowanych faz) |
| zaawansowanie (wskaźnik kolonizacji) | masa guzów × połowa mnożnika kolonii | guzy są większe od kolonii, inaczej rak kończyłby grę za szybko |
| niewydolność narządu | masa ≥ 1,5 w narządzie, −0,25 stanu/s na narząd | „wyłączanie narządów” z opisu Michała |
| przerzuty | guz ≥ 1, co 25 s, osiada po 3 s | jak zarodniki grzyba |
| ruch / przeciwciała | ×0,7 / ×0,5 | komórka nowotworowa nie ma wici; organizm słabo rozpoznaje własne komórki |
| chemioterapia | 12 s, odnowienie 40 s, −9 stanu, 1,6 obrażeń/s, kurczy 0,035/s | najmocniejsze leczenie, najdroższe dla pacjenta |
| radioterapia | 8 s na narząd, odnowienie 35 s, −5 stanu, kurczy 0,11/s, 4 obrażeń/s w obszarze | celowana: lekarz musi wiedzieć, gdzie są guzy (TK, USG, echo) |
