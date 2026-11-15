# Jewels of Ra — how Pragmatic games run in the browser

## Launch chain
1. `page.html` (pragmaticplay.com game page) has a "Play demo" button with
   `data-game-src="https://demogamesfree.pragmaticplay.net/gs2c/openGame.do?gameSymbol=vswaysjwofra&...&lang=en&cur=USD"`
   which is loaded into an `<iframe>`.
2. `openGame.do` → **302 redirect** to `html5Game.do?symbol=vswaysjwofra&mgckey=stylename@generic~SESSION@<uuid>`
   Server creates a demo session (`mgckey`) with 100,000 fake USD.
3. `html5Game.html` (= html5Game.do) is the **loader** ("UHT" = their engine):
   - `gameConfig` JSON: `datapath` (asset folder), `gameService` (server API), `mgckey`, currency, lang.
   - `Loader.LoadGame()` picks `desktop/` / `mobile/` / `mini/` and loads `<datapath>/<platform>/bootstrap.js`.
4. `bootstrap.js` → loads `build.js` (~4 MB). `build.js` = whole game client:
   rendering engine (WebGL canvas), reels, animations, sound, UI, network.

Asset base: `https://demogamesfree.pragmaticplay.net/gs2c/common/v3/games-html5/games/vs/vswaysjwofra/`

## Server protocol (the important part)
Client is **dumb display**. All outcomes (RNG) decided server-side.
`POST https://demogamesfree.pragmaticplay.net/gs2c/ge/v5/gameService`
Body + response = URL-encoded `key=value&...` (not JSON).

Request: `action=<doInit|doSpin|doCollect|doBonus|doFSOption...>&symbol=vswaysjwofra&c=<coin>&l=<lines>&index=N&counter=N&repeat=0&mgckey=...`

| key | meaning |
|---|---|
| `balance` | balance after action |
| `c`, `l` | coin value, lines (bet = c × l; 0.08×25 = 2.00) |
| `sc` | allowed coin values, `defc` default |
| `sw`, `sh` | grid width 5 × height 4 |
| `s` | **spin result**: symbols, 20 digits = 5×4 grid |
| `tw`, `w` | total win / win this step |
| `na` | next action: `s`=spin, `c`=collect, `b`=bonus, `fso`=free-spin option ... |
| `reel_set0..` | reel strips (symbol sequence per reel) |
| `paytable` | `symbol~count:payout;...` |
| `gameInfo` | RTP (96.53%), max win 5000× |
| `index`, `counter` | request sequence (anti-replay) |

Samples: `sample_doInit.txt`, `sample_doSpin.txt` (real responses).
Full key/action dictionary: `build.js` ~line 44000–44300 (`Actions`, `NextActions`, ...).
Response parsing: `build.js` ~line 44530 (`serverGameResponse`).

## Files
- `page.html` – pragmaticplay.com game page
- `html5Game.html` – game loader
- `bootstrap.js`, `build.js` – game client (formatted, still minified names)
- `play.html` – runs demo locally in an iframe (open in browser)

## Not possible
Server-side game logic/RNG is not public — only client + protocol visible.
