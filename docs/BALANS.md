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
