# Jackpot als web-app op GitHub Pages

Instructies voor Claude op de laptop (gekoppeld aan GitHub). Alles staat klaar in deze map; er hoeft niets meer gebouwd te worden.

## Wat er in de map zit
- `index.html`: de complete app (zelfde als jackpot.html, plus manifest-link en registratie van de service worker)
- `manifest.webmanifest`: naam, icoon, kleuren, standalone-weergave
- `sw.js`: service worker, maakt de app offline beschikbaar en haalt updates op de achtergrond op
- `icon-192.png`, `icon-512.png`, `apple-touch-icon.png`, `icon.svg`: app-iconen

## Stappen
1. Maak een nieuwe publieke repository op GitHub, bijvoorbeeld `jackpot`.
2. Zet alle bestanden uit deze map in de root van de repo (niet in een submap) en push naar `main`.
3. Repo-instellingen: Settings, Pages, Source "Deploy from a branch", branch `main`, folder `/ (root)`, Save.
4. Na een minuut of twee staat de app op `https://<gebruikersnaam>.github.io/jackpot/`.

## Controle
- Open de link in Chrome op een telefoon. Via het menu (drie puntjes) staat nu "App installeren" of "Toevoegen aan startscherm".
- Zet de telefoon in vliegtuigmodus en open de app opnieuw: hij moet gewoon werken.
- De QR-scanner (Stand bewerken, Stand overnemen) werkt op dit https-adres wel, in tegenstelling tot een los HTML-bestand.

## Updaten
- Nieuwe versie van de app: overschrijf `index.html` en push. Verhoog in `sw.js` de regel `const CACHE = "jackpot-v2";` naar `v3`, `v4`, enzovoort, zodat telefoons de nieuwe versie zeker ophalen.
- Scores en de totaalstand staan in de browseropslag per telefoon en blijven bij een update behouden.

## Taal
- De app is tweetalig (NL/EN); de knop `EN`/`NL` linksboven in de kopregel wisselt. Alle teksten staan in het `I18N`-object bovenin het app-script in `index.html` (`nl` en `en` hebben dezelfde sleutels); een nieuwe tekst komt dus in beide talen.
- Eerste keer openen: Nederlands als de browser Nederlands is, anders Engels. De keuze wordt onthouden.

## Installeren (voor vrienden)
- Link: `https://srutgers96-star.github.io/jackpot/`
- Android, Chrome: menu (⋮) rechtsboven, "App installeren" of "Toevoegen aan startscherm".
- iPhone, Safari: Delen (vierkant met pijl omhoog), naar beneden scrollen, "Zet op beginscherm".
- De app laat dit zelf ook zien, bovenaan tot je op "Later" tikt, en altijd onder Meer, "Installeren als app".

## Logo
- `icon-512.png`, `icon-192.png` en `apple-touch-icon.png` zijn met een klein Python-script (Pillow) getekend: een ivoren tegel met een gouden J en twee dobbelstenen (1 en 6). `icon.svg` is dezelfde tekening in vectorvorm.

## Later: apk
Dezelfde `index.html` kan ongewijzigd in de `www`-map van een Capacitor-project:
`npm init @capacitor/app`, `npx cap add android`, `npx cap open android`, Build APK in Android Studio.
