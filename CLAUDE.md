# Kontekst projektu PatientZero (dla Claude)

Ten plik pozwala wznowić pracę w nowej rozmowie bez utraty kontekstu. **Przeczytaj go w całości przed zmianami**
i aktualizuj sekcje „Stan” i „Lista zadań” po każdym wydaniu.

## Projekt

- **Gra:** PatientZero (wcześniej DocDoc). Asymetryczna gra przeglądarkowa na 2 osoby: patogen w ciele pacjenta kontra lekarz.
- **Autor:** Michał (Warszawa). Rozmawiamy po polsku.
- **Repo:** https://github.com/michalstankiewicz4-cell/PatientZero (dawniej `DocDoc`, GitHub przekierowuje stary adres).
- **Gra online:** https://michalstankiewicz4-cell.github.io/PatientZero/ (GitHub Pages, wdrożenie automatyczne po pushu na `main`).
- **Dokumentacja:** `README.md`, `docs/INSTRUKCJA.md` (gracze), `docs/ARCHITEKTURA.md` (kod), `CHANGELOG.md` (wersje).

## Zasady pracy (od Michała)

1. **Nie dodawaj własnych pomysłów do gry — tylko je proponuj.** Implementuj to, o co prosi Michał. Gdy potrzebna jest decyzja projektowa,
   wybierz najprostsze rozwiązanie zgodne z prośbą, opisz je w odpowiedzi jako decyzję do zmiany, a dodatkowe pomysły podaj jako propozycje.
2. **Po zakończeniu każdego punktu wysyłaj zmiany na GitHub** (commit + push na `main`).
3. **Wersjonowanie pilnowane przy każdym wydaniu:**
   - `node tools/bump.js X.Y.Z` (aktualizuje `js/version.js` i `?v=` w `index.html`),
   - wpis w `CHANGELOG.md` (nowa sekcja wersji + link porównania na dole),
   - 0.X.0 = nowa funkcja / zmiana zasad, 0.X.Y = poprawki, dokumentacja,
   - tag i Release tworzy GitHub Actions (`.github/workflows/release.yml`) po zmianie `js/version.js`.
4. **Dokumentacja na bieżąco:** każda zmiana zasad gry trafia do `docs/INSTRUKCJA.md`, zmiana budowy kodu do `docs/ARCHITEKTURA.md`.
5. **Przebieg gry ma wynikać z działań graczy.** Żadnych sztucznych etapów ani skryptowanych faz (decyzja Michała).
6. Interfejs i komentarze po polsku. Bogata, spójna grafika jest ważna.

## Środowisko (uwagi techniczne dla Claude)

- Push przez git działa tylko dla gałęzi. **Tagów nie da się wypchnąć** z sesji Claude (proxy zwraca 403), dlatego tagi robi workflow `release.yml`.
  Wersje sprzed automatu są w `tools/history-tags.txt`.
- Testy w kontenerze: Playwright + Chromium (`--use-angle=swiftshader`). cdnjs jest niedostępny, więc Three.js r128 pobieramy przez
  `npm pack three@0.128.0` i podstawiamy przez `page.route('**/three.min.js', ...)`. Render programowy jest bardzo wolny,
  więc czas symulacji w testach płynie wolniej niż w rzeczywistości. Do testu sieci używaj **dwóch osobnych przeglądarek**,
  bo karta w tle ma wstrzymane `requestAnimationFrame`.
- Logikę (stan, przepływ) da się testować w Node: ustaw `global.window = global` i wczytaj `config`, `heart-shape`, `flow`, `state`.
- WebRTC nie działa w podglądzie artefaktu claude.ai — gra sieciowa tylko z GitHub Pages albo z pliku.

## Stan (aktualizuj po każdym wydaniu)

Aktualna wersja: zobacz `js/version.js` i `CHANGELOG.md`.

Gotowe:
- Serce w przekroju (SDF), prąd krwi zależny od cyklu serca, zastawki, struny ścięgniste, krążenie płucne i duże.
- Patogen: bakteria, ruch WASD, kolonizacja przez kontakt ze ścianą, kolonie (biofilm).
- Lekarz: EKG, badanie krwi (odblokowuje leczenie), przeciwciała, gorączka, antybiotyk, oporność na powtarzane leczenie,
  podgląd z opóźnieniem 5 s, zdjęcie miejsca z chwili pobrania krwi.
- Grafika: tkanka z beleczkami, krwinki (instancing), bloom, głębia ostrości, aberracja, falowanie gorąca, ACES.
- Minimapa, dźwięk bicia serca, tryb deweloperski i gra na 2 osoby (WebRTC + kody), statystyki połączenia.
- Wersjonowanie, CHANGELOG, automatyczne wydania, dokumentacja.

Warunki wygranej (tymczasowe): patogen — kolonizacja 100%, lekarz — życie patogenu 0.

## Lista zadań (zlecone przez Michała, kolejność od najłatwiejszego)

Status: [x] zrobione, [ ] do zrobienia.

- [x] Wersjonowanie + CHANGELOG
- [x] Dokumentacja: README, instrukcja, architektura
- [x] Plik kontekstu (ten plik)
- [x] Statystyki na ekranie końcowym
- [x] Dźwięk lekarza: szpitalne „beep”
- [ ] Dźwięk patogenu: przytłumiony jak pod wodą, bicie serca, czasem kaszel
- [ ] Stan pacjenta jako trzeci wskaźnik (patogen wygrywa przez sepsę), skutki uboczne leków
- [ ] Kolonie jako „życia” patogenu + zakładanie kolonii kosztem % zdrowia, dodatkowe wskaźniki
- [ ] Nowe badania: CRP (szybkie), posiew (dokładny), echo serca (pokazuje kolonie), antybiogram
- [ ] Wybór patogenu: bakteria albo wirus; klasy antybiotyków
- [ ] Przejście przez ścianę naczyń do tkanki (nowy, ładny biom), ukryte kolonie, z których odradza się patogen; lekarz musi je wykryć
- [ ] Biofilm, mutacje, toksyny
- [ ] Operacja zastawki
- [ ] Pacjent na łóżku (grafika dla lekarza), objawy jako wskazówki, animacja laboratorium, alarmy monitora
- [ ] Mecz z zamianą ról

Odrzucone przez Michała: sztuczne etapy zakażenia (przebieg ma wynikać z działań graczy).

## Decyzje projektowe do potwierdzenia przez Michała

Tu zapisuj decyzje, które Claude podjął sam przy realizacji zadań (zgodnie z zasadą 1), żeby Michał mógł je zmienić.

- Kod zaproszenia nie sprawdza zgodności wersji gry między graczami.
