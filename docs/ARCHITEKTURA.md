# Architektura

Dokument dla programistów. Opisuje budowę kodu i zasady, których trzymamy się przy zmianach.

## Zasady ogólne

- **Bez bundlera i modułów ES.** Zwykłe skrypty ładowane w `index.html`, wspólna przestrzeń nazw `window.DD`. Gra działa z pliku (`file://`) i z GitHub Pages.
- **Język:** interfejs, komentarze i dokumentacja po polsku.
- **Stan + komendy:** stan gry zmienia się wyłącznie przez `DD.Game.apply(state, komenda)` i `DD.Game.step(state, dt)`. UI i render tylko czytają stan.
- **Determinizm:** pole przepływu i szum turbulencji są deterministyczne, a losowość w stanie idzie przez LCG (`state.seed`).
- **Wersja:** `js/version.js`, zmieniana przez `node tools/bump.js X.Y.Z`. Szczegóły w [CHANGELOG.md](../CHANGELOG.md).

## Pliki

```
index.html              układ ekranu, nakładki (ładowanie, start, lobby, koniec gry), metadane SEO, kolejność skryptów
media/                  filmy na koniec rundy (doctor, priest; MP4 i WebM)
img/                    og.jpg (podgląd linku), icon.svg (ikona strony)
robots.txt, sitemap.xml dla wyszukiwarek
css/style.css           wygląd: lewa połowa (ciemny świat patogenu), prawa (aparatura OIOM-u lekarza, sekcja „Panel lekarza jako aparatura”)
js/version.js           DD.VERSION
js/wiki.js              wiki lekarza (baza wiedzy): treść dwujęzyczna T(pl, en), liczby z DD.CONFIG, zdjęcia z img/wiki/
js/lang/en.js           słownik angielski: tekst polski → angielski ({0} wstawka, {#0} wstawka liczbowa)
js/i18n.js              język interfejsu: DD.t, tłumaczenie dokumentu (MutationObserver) i napisów na canvasie przy języku EN
js/config.js            liczby balansu i ustawienia: świat, tętno, patogeny (C.species), pacjenci (C.patients, opis w docs/BALANS.md), leki, badania, pożywienie, kopie, kamera, UI
js/heart-shape.js       geometria serca, wątroby i nerki (SDF, maski narządów, nazwy miejsc, wyjścia z mapy): SDF z elips i naczyń + dokładna transformata odległości
js/flow.js              pole przepływu (3 pola bazowe mieszane wg fazy cyklu) + curl noise
js/tissue-cells.js      kardiomiocyty w ścianie serca (proceduralne, deterministyczne): kolizje i render
js/state.js             stan gry, komendy, krok symulacji, kolizje, szyna komend
js/input.js             klawiatura -> komendy
js/net.js               WebRTC: kody, kanały, synchronizacja stanu, statystyki połączenia
js/match.js             mecz z zamianą ról: wyniki rund, zamiana ról, ekran końcowy
js/net-status.js        wskaźnik połączenia, ostrzeżenie, panel szczegółów
js/lobby.js             ekran tworzenia i dołączania do gry
js/minimap.js           minimapa patogenu (dwa widoki: serce, jama brzuszna; domyślnie ukryta, C.ui.minimap)
js/audio.js             dźwięk (Web Audio, synteza bez plików)
js/doctor-ui.js         panel lekarza (rozwijane menu zleceń, lampki, drukarka, mikroskop, USG) i HUD patogenu
js/doctor-devices.js    pompa infuzyjna (leki we krwi) i sylwetka z obszarami objawów (canvas 2D)
js/patient-room.js      sala z pacjentem (canvas 2D), DD.symptomList (objawy z położenia kolonii), laboratorium, alarm monitora
js/doctor-cam.js        zdjęcie patogenu w chwili pobrania krwi do mikroskopu (niewidoczny widok 3D)
js/main.js              pętla gry, tryby (lokalny / host / gość), wybór trybu
js/render/glsl.js       wspólne shadery: szum, światło mokrej tkanki, pochłanianie we krwi, kaustyki
js/render/tissue.js     tkanka: gęsta siatka przemieszczana z tekstury SDF
js/render/cells.js      krwinki (instancing, kształt Evansa–Funga), drobiny osocza i elementy tła (pęcherzyki, płytki, białe krwinki — C.cells.extras)
js/render/actors.js     patogen (osobna grupa 3D dla każdego rodzaju z C.species) i jego kopie, pożywienie, przeciwciała, kolonie, zastawki, struny, mięśnie brodawkowate
js/render/biome.js      biom mięśnia: kardiomiocyty (prążkowanie, jądra, wstawki), kolagen
js/render/post.js       post-processing: bloom, głębia ostrości, aberracja, ACES, winieta, ziarno
js/render/view.js       widok 3D: kamera, światło, łańcuch renderu
tools/bump.js           zmiana wersji
tools/history-tags.txt  tagi wersji sprzed automatu wydań
.github/workflows/      publikacja na GitHub Pages i automatyczne wydania
```

## Pętla gry (`js/main.js`)

```
klatka (requestAnimationFrame)
├─ tryb lokalny / host:
│    stały krok 60 Hz: Input.poll -> CommandBus.drain -> Game.apply -> Game.step
│    host: hostTick wysyła stan ~20 Hz
├─ gość: Input.poll (komendy idą do hosta), guestFrame (odtwarza stan z paczek)
├─ render 3D (pomijany u lekarza w grze sieciowej)
└─ minimapa, dźwięk, wskaźnik połączenia, zdjęcie do mikroskopu, UI
```

Gdy karta hosta jest ukryta, przeglądarka wstrzymuje `requestAnimationFrame`, więc symulację pcha zapasowy `setInterval`.

## Geometria i przepływ

- **SDF** (`heart-shape.js`): elipsy komór i przedsionków + naczynia jako łamane z promieniem, łączone gładkim minimum, plus strefa zrazików wątroby (elipsa minus płytki hepatocytów). Naczynia nerki (łuk, międzypłatowe, kłębuszki) są generowane z `KIDNEY`, płytki wątroby z `LIVER`. Maska jest liczona analitycznie, a potem dokładną transformatą odległości (Felzenszwalb). `d < 0` to krew, `d > 0` tkanka. Siatka `NX × NY` (komórka `config.sdfCell`) służy do kolizji i renderu (tekstura half-float).
- **Świat:** serce na górze (`HEART_BOX`), jama brzuszna pod nim (`ABDOMEN_BOX`). `H.organAt(x, y)` zwraca `heart` / `liver` / `kidney` / `abdomen`.
- **Maski narządów:** tekstura RGBA (`H.organ`): R wątroba, G nerka (0,5 kora, 1 rdzeń), B pęcherzyk żółciowy, A miedniczka i moczowód. Shader tkanki nie opuszcza w narządzie powierzchni w ciemność i barwi miąższ.
- **Zastawki:** punkt na kanale i kierunek prądu. Szerokość pierścienia mierzona po SDF przy starcie. Płatki to odcinki obracane wg otwarcia (`flow.valveOpen`).
- **Przepływ** (`flow.js`): trzy pola bazowe (żylne stałe, rozkurcz, skurcz) budowane z torów prądu, dyfundowane w świetle naczyń i mieszane wg fazy cyklu. Do tego curl noise dla zawirowań. W zrazikach wątroby i w nerce (`POTENTIAL`) pole żylne to przepływ potencjalny: ciśnienie z równania Laplace'a (SOR) między wlotami a wylotami, prędkość = −grad p.
- **Drogi poza mapą:** `EXITS` (płuca, głowa i ręce, nogi, jelita) → `INLETS`; nazwy w `ROUTES`.

## Patogeny

- **Rodzaje** są w `C.species`: `kind` (`bacteria` / `virus`), nazwa, wrażliwość na leki (`natural` — klasa antybiotyku, na którą bakteria jest oporna; `antiviral` — skuteczność leku przeciwwirusowego), mnożniki `speed`, `growth`, `biofilm` oraz opisy do mikroskopu (`micro`, `treat`).
- `state.kind` to `bacteria` / `virus`, `state.species` to rodzaj. `Game.speciesOf()` mapuje dawne wartości `bacteria` / `virus` na rodzaj domyślny (`C.defaultSpecies`).
- **Wygląd 3D:** `actors.js` ma osobną grupę dla każdego rodzaju (`LOOKS`); kopie patogenu to klony tej grupy. Każdy stan, który rysuje patogen (także duch w `doctor-cam.js`), musi mieć `species`.

## Grzyb

Kolonia grzyba ma pola `hy` (długość strzępki), `hs` (kierunek wzdłuż ściany ±1), `hd` (strzępka skończona) i `store` (magazyn zarodników). `Heart.wallWalk(x, y, sign, len, seed)` wyznacza drogę strzępki po ścianie (kroki 0,35 j. po stycznej do SDF, z meandrami zależnymi od `seed`), z niej `state.js` bierze koniec strzępki (nowa kolonia), a `render/actors.js` rysuje odcinki strzępki (instanced cylinders) i zarodniki magazynów. Mutacje grzyba mapuje `Game.mutKey`.

## Panel lekarza

- **Układ** (`index.html`, `.ward`): siatka 6 kolumn z urządzeniami `.dev` (ciemne `.dev-dark`, jasne `.dev-light`); poniżej 640 px szerokości panelu wszystko w jednej kolumnie (container query).
- **Konsola zleceń:** przyciski badań, leków i operacji (`doctor-ui.js`) siedzą w rozwijanych listach `.menu-list`; wybór pozycji wysyła komendę i zamyka menu. Lampki (`#lamps`) i podsumowania na przyciskach menu odświeża `update()`.
- **Objawy:** `DD.symptomList(s)` zwraca `[nazwa, poziom, obszar]`; korzysta z niej lista objawów w sali i sylwetka (`doctor-devices.js`).
- **Wyniki:** `renderResults()` działa tylko przy nowym wyniku (`resultSeq`). Nowy wydruk trafia na górę `.slips` z animacją `printing`; mikroskop i USG mają własne rysowanie (`showMicro`, `makeUS`).
- **Mikroskop:** preparat 3 × 3 pola rysowany raz na wynik (`buildSlide`), widok przesuwany myszą albo strzałkami (`microPan`), znalezienie i pusty preparat sprawdza `microCheck`; zdjęcie robi `doctor-cam.js`, a pokazuje je mikroskop dopiero po znalezieniu (`dataset.ready` = czas pobrania).

## Zakończenie rundy

Warunek wygranej ustawia `s.ending = { win, t }` (a nie od razu `s.over`). Przez `C.ending.duration` sekund rozgrywka stoi, a przy sepsie spadają `s.hr` (tętno) i `s.flowMul` (prąd; `Flow.scale`). Faza serca jest sumowana (`s.phase += dt · bpm · hr`), więc gość dostaje ją w paczce (`ph`, `hr`, `fm`, `en`). Po czasie `s.over = win`; UI pokazuje film (`endFilm` w `doctor-ui.js`), potem ekran końcowy.

## Sieć (`js/net.js`)

- **Połączenie:** WebRTC bez serwera sygnalizacji. Oferta i odpowiedź są kompresowane (`deflate-raw` + base64url) do kodów ~600 znaków. STUN Google tylko do przejścia przez NAT.
- **Kanały:** `cmd` (niezawodny, uporządkowany) dla komend, dziennika, ping/pong i pożegnania; `st` (bez retransmisji) dla paczek stanu z numerem sekwencyjnym.
- **Role:** `DD.send` sprawdza `N.allowed(cmd, rola)` przed wysłaniem, a host sprawdza ponownie po odebraniu.
- **Gość** wygładza pozycje między paczkami i odrzuca paczki starsze od ostatniej.

Pożywienie (`fo`) i kopie (`cp`) idą płaskimi tablicami `[x, y, rodzaj, id]` i `[x, y, kierunek, id, narodziny]`; gość wygładza element tylko wtedy, gdy pod tym samym indeksem jest ten sam `id`.

Dodając pole do stanu, które gość ma widzieć, dopisz je w `encode()` i `guestFrame()`.

## Render

- **Tkanka:** 4 pasy płaszczyzny (segment 0,25 j., poza kadrem pomijane), wysokość z SDF w vertex shaderze. Normalne, beleczki, włókna i tłuszcz liczone w fragment shaderze. Kolory i światło są liniowe (HDR), a mapowanie tonów robi post-process.
- **Światło „endoskopu”** przy kamerze: wrap diffuse, rozpraszanie podpowierzchniowe, dwa płaty odblasku, pochłanianie we krwi.
- **Komórki** żyją w oknie wokół kamery i są niesione tym samym polem przepływu.
- **Uniformy wspólne** (`DD.SHARED`) ustawia każdy widok tuż przed własnym renderem, więc dwa widoki (gra i zdjęcie do mikroskopu) mogą działać naraz.

## Język (`js/i18n.js`)

Kod gry i HTML są po polsku. Przy języku angielskim `i18n.js` tłumaczy w chwili wyświetlenia: węzły tekstowe i atrybuty (`title`, `aria-label`, `placeholder`, `alt`) przez `MutationObserver` oraz napisy z `fillText` / `strokeText` / `measureText`. Wstawki szablonów tłumaczy rekurencyjnie (też listy „a, b” i „nazwa liczba”); nazwy pisane małą literą znajduje po wersji z wielkiej. Dzięki temu stan gry i sieć się nie zmieniają, a każdy gracz ma swój język. Elementy z `data-no-i18n` są pomijane. Zmiana języka zapisuje `pz-lang` w `localStorage` i przeładowuje stronę.

## Testy

- **Logika w Node:** `global.window = global`, potem `require` plików `config`, `heart-shape`, `flow`, `state`, `tissue-cells`; `DD.Heart.init()`, `DD.Flow.init()`, a dalej `DD.Game.create()`, `apply()` i `step()`.
- **Przeglądarka:** Playwright + Chromium; bez GPU render jest programowy i bardzo wolny, więc czas gry płynie wolniej niż w rzeczywistości. Test sieci wymaga dwóch osobnych przeglądarek (karta w tle ma wstrzymane `requestAnimationFrame`).

## Jak dodać funkcję

1. Liczby balansu dopisz do `js/config.js`.
2. Logikę dodaj w `js/state.js` jako nową komendę albo element `step()`. Nie zmieniaj stanu z UI.
3. Jeśli gość ma to widzieć, uzupełnij `encode()` i `guestFrame()` w `js/net.js`. Jeśli to komenda, dodaj ją do uprawnień ról.
4. UI dopisz w `js/doctor-ui.js` albo osobnym pliku i dołącz skrypt w `index.html` przed `main.js`.
5. Każdy nowy tekst widoczny dla gracza dopisz do `js/lang/en.js` (szablon z `{0}` / `{#0}`, gdy tekst ma wstawki). Sprawdzenie: język EN, `DD.i18nDebug = true` przed startem, potem `DD.i18nMiss` w konsoli.
6. Zaktualizuj `docs/INSTRUKCJA.md`, dodaj wpis w `CHANGELOG.md` i podbij wersję (`node tools/bump.js`).
