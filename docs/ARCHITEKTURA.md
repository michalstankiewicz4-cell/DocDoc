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
index.html              układ ekranu, nakładki (start, lobby, koniec gry), kolejność skryptów
css/style.css           wygląd: lewa połowa (ciemny świat patogenu), prawa (jasna karta lekarza)
js/version.js           DD.VERSION
js/config.js            wszystkie liczby balansu i ustawienia (tętno, leki, kamera, podgląd)
js/heart-shape.js       geometria serca: SDF z elips i naczyń + dokładna transformata odległości
js/flow.js              pole przepływu (3 pola bazowe mieszane wg fazy cyklu) + curl noise
js/tissue-cells.js      kardiomiocyty w ścianie serca (proceduralne, deterministyczne): kolizje i render
js/state.js             stan gry, komendy, krok symulacji, kolizje, szyna komend
js/input.js             klawiatura -> komendy
js/net.js               WebRTC: kody, kanały, synchronizacja stanu, statystyki połączenia
js/match.js             mecz z zamianą ról: wyniki rund, zamiana ról, ekran końcowy
js/net-status.js        wskaźnik połączenia, ostrzeżenie, panel szczegółów
js/lobby.js             ekran tworzenia i dołączania do gry
js/minimap.js           minimapa patogenu
js/audio.js             dźwięk (Web Audio, synteza bez plików)
js/doctor-ui.js         panel lekarza i HUD patogenu
js/patient-room.js      sala z pacjentem (canvas 2D), objawy z położenia kolonii, laboratorium, alarm monitora
js/doctor-cam.js        podgląd lekarza z opóźnieniem i zdjęcie z badania
js/main.js              pętla gry, tryby (lokalny / host / gość), wybór trybu
js/render/glsl.js       wspólne shadery: szum, światło mokrej tkanki, pochłanianie we krwi, kaustyki
js/render/tissue.js     tkanka: gęsta siatka przemieszczana z tekstury SDF
js/render/cells.js      krwinki (instancing, kształt Evansa–Funga) i drobiny osocza
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
└─ minimapa, dźwięk, wskaźnik połączenia, podgląd lekarza, UI
```

Gdy karta hosta jest ukryta, przeglądarka wstrzymuje `requestAnimationFrame`, więc symulację pcha zapasowy `setInterval`.

## Geometria i przepływ

- **SDF serca** (`heart-shape.js`): elipsy komór i przedsionków + naczynia jako łamane z promieniem, łączone gładkim minimum. Maska jest liczona analitycznie, a potem dokładną transformatą odległości (Felzenszwalb). `d < 0` to krew, `d > 0` tkanka. Ta sama siatka 512×512 służy do kolizji i renderu (tekstura half-float).
- **Zastawki:** punkt na kanale i kierunek prądu. Szerokość pierścienia mierzona po SDF przy starcie. Płatki to odcinki obracane wg otwarcia (`flow.valveOpen`).
- **Przepływ** (`flow.js`): trzy pola bazowe (żylne stałe, rozkurcz, skurcz) budowane z torów prądu, dyfundowane w świetle naczyń i mieszane wg fazy cyklu. Do tego curl noise dla zawirowań.

## Sieć (`js/net.js`)

- **Połączenie:** WebRTC bez serwera sygnalizacji. Oferta i odpowiedź są kompresowane (`deflate-raw` + base64url) do kodów ~600 znaków. STUN Google tylko do przejścia przez NAT.
- **Kanały:** `cmd` (niezawodny, uporządkowany) dla komend, dziennika, ping/pong i pożegnania; `st` (bez retransmisji) dla paczek stanu z numerem sekwencyjnym.
- **Role:** `DD.send` sprawdza `N.allowed(cmd, rola)` przed wysłaniem, a host sprawdza ponownie po odebraniu.
- **Gość** wygładza pozycje między paczkami i odrzuca paczki starsze od ostatniej.

Pożywienie (`fo`) i kopie (`cp`) idą płaskimi tablicami `[x, y, rodzaj, id]` i `[x, y, kierunek, id, narodziny]`; gość wygładza element tylko wtedy, gdy pod tym samym indeksem jest ten sam `id`.

Dodając pole do stanu, które gość ma widzieć, dopisz je w `encode()` i `guestFrame()`.

## Render

- **Tkanka:** płaszczyzna 480×464 segmentów, wysokość z SDF w vertex shaderze. Normalne, beleczki, włókna i tłuszcz liczone w fragment shaderze. Kolory i światło są liniowe (HDR), a mapowanie tonów robi post-process.
- **Światło „endoskopu”** przy kamerze: wrap diffuse, rozpraszanie podpowierzchniowe, dwa płaty odblasku, pochłanianie we krwi.
- **Komórki** żyją w oknie wokół kamery i są niesione tym samym polem przepływu.
- **Uniformy wspólne** (`DD.SHARED`) ustawia każdy widok tuż przed własnym renderem, więc dwa widoki (gra i podgląd lekarza) mogą działać naraz.

## Jak dodać funkcję

1. Liczby balansu dopisz do `js/config.js`.
2. Logikę dodaj w `js/state.js` jako nową komendę albo element `step()`. Nie zmieniaj stanu z UI.
3. Jeśli gość ma to widzieć, uzupełnij `encode()` i `guestFrame()` w `js/net.js`. Jeśli to komenda, dodaj ją do uprawnień ról.
4. UI dopisz w `js/doctor-ui.js` albo osobnym pliku i dołącz skrypt w `index.html` przed `main.js`.
5. Zaktualizuj `docs/INSTRUKCJA.md`, dodaj wpis w `CHANGELOG.md` i podbij wersję (`node tools/bump.js`).
