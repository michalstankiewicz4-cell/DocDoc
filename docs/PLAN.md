# Plan rozwoju Patient Zero

Wszystkie pomysły Michała zebrane w jednym miejscu i ułożone od najszybszych do najtrudniejszych.
Każdy punkt to osobna aktualizacja wysyłana na GitHub (commit, wersja, wpis w CHANGELOG).
Status: ✅ zrobione, 🔧 w trakcie, ⬜ do zrobienia.

## Etap 1. Poprawki i drobne rzeczy (szybkie)

| | Zadanie | Opis |
| --- | --- | --- |
| ✅ | Powrót z mięśnia | Po wejściu w ścianę czasem nie da się wrócić do krwi — błąd do naprawy. |
| ✅ | Mecz z zamianą ról | „Rewanż z zamianą ról” nie działa poprawnie — błąd do naprawy. |
| ✅ | Pasek przewijania | W stylu gry (ciemny, jak aparatura). |
| ✅ | Ekran startowy | Usunąć kafelki z opisem patogenu i lekarza oraz zdanie „Asymetryczna gra…”. |
| ✅ | Nazwa „Patient Zero” | Ze spacją w tytule, na ekranie startowym i w dokumentacji. |
| ✅ | Wyszukiwarki (SEO) | Opis strony, słowa kluczowe (m.in. biology, doctor, game, hospitality, medicine, vibecoding, webrtc), podgląd przy udostępnianiu linku. |
| ✅ | Ekran ładowania | Loader zanim pojawi się ekran startowy (żeby kliknięcie nie trafiało w „martwą” stronę). |
| ✅ | Statystyki zwinięte | Na ekranie końcowym widoczne dopiero po rozwinięciu. |

## Etap 2. Klimat i oprawa

| | Zadanie | Opis |
| --- | --- | --- |
| ✅ | Zakończenie gry (~5 s) | U lekarza piszczenie monitora powoli cichnie, u patogenu serce zwalnia i prąd krwi ustaje; dopiero potem podsumowanie. |
| ✅ | Filmy na koniec | Wygrał lekarz → obaj gracze widzą `doctor.mp4`, wygrał patogen → `priest.mp4`. |
| ✅ | Tło we krwi | Trochę pęcherzyków tlenu i drobnych elementów, które nie wchodzą w interakcję z graczem. |

## Etap 3. Losowanie pacjenta (środowisko gry) ✅ v0.34.0

Na początku rundy gra losuje pacjenta; obaj gracze go widzą. Pacjent zmienia szanse obu stron.

| Pacjent | Patogen | Lekarz |
| --- | --- | --- |
| Dziecko | szybciej się rozprzestrzenia | objawy pojawiają się wcześniej (łatwiej wykryć) |
| Senior | łatwiejsza kolonizacja, mniej pożywienia we krwi | leczenie działa wolniej, objawy słabsze |
| Sportowiec | wolniejsza kolonizacja | silniejsza odporność organizmu (lepsza regeneracja) |
| Diabetyk | szybszy rozwój infekcji, więcej glukozy we krwi | wolniejsze gojenie |
| Po przeszczepie | bardzo łatwa kolonizacja | osłabiony układ odpornościowy, częstsze badania kontrolne (krótsze odnowienie badań) |

Liczby i uzasadnienie: [BALANS.md](BALANS.md).

Kolejni pacjenci (później): alergie, palacz, alkoholizm, astma, otyłość, ciąża.
Nie wszystko musi dziać się w układzie krwionośnym — np. astma i palacz w płucach.

## Etap 4. Język

| | Zadanie | Opis |
| --- | --- | --- |
| ✅ | Wybór języka (v0.35.0) | Przełącznik polski / angielski na ekranie startowym, zapamiętany w przeglądarce; cały interfejs po angielsku. |

## Etap 5. Lekarz widzi mniej, patogen więcej ukrywa ✅ v0.36.0

- Lekarz nigdy nie widzi wprost typu patogenu — tylko objawy, wyniki badań i stan pacjenta (to już tak działa; trzeba pilnować w nowych funkcjach).
- Każde badanie: kosztuje czas i ma określoną skuteczność (czułość) — wynik może być fałszywie ujemny.
- Patogen emituje sygnały chemiczne (zakłócają badania i objawy).
- Patogen może: maskować objawy, generować fałszywe objawy, opóźniać wykrycie (nowe zdolności / mutacje).

## Etap 6. Nowe badania i leczenie

Badania: morfologia, PCR, badanie moczu, RTG, tomografia, rezonans, biopsja, markery nowotworowe (posiew już jest).
Leczenie: chemioterapia, radioterapia, amputacja, przeszczep narządu.
Część z nich ma sens dopiero przy nowych patogenach (etap 7–8).

## Etap 7. Nowy patogen: grzyb

Rośnie jak korzenie: strzępki rozrastają się po ścianach i tkankach (realistycznie, na wzór grzybni Candida / Aspergillus).
- budujesz grzybnię, zajmujesz kolejne tkanki, tworzysz „magazyny zarodników”,
- mutacje: strzępki przebijające tkanki, odporność na leki (przeciwgrzybicze), ukrywanie przed układem odpornościowym, zarodniki transportowane krwią,
- lekarz: posiew i mikroskop (strzępki), leki przeciwgrzybicze.

## Etap 8. Nowy patogen: rak

Nowotwór rośnie z komórek pacjenta:
1. mały guz → 2. średni guz → 3. własne naczynia krwionośne (angiogeneza) → 4. przerzuty.
- zdolności: zwiększ podziały komórek, wyłącz apoptozę, przejmij naczynia krwionośne, wyłączanie narządów,
- lekarz: USG, RTG, rezonans, tomografia, biopsja, markery nowotworowe; leczenie: chemioterapia, radioterapia, operacja / amputacja, przeszczep.

## Etap 9. Poza krwiobiegiem

Nowe obszary (np. płuca, tkanki), w których dzieje się część gry, potrzebne m.in. dla astmy, palacza i grzyba.
