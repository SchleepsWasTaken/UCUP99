# Games collected

Same launch chain + protocol as `jewels-of-ra/README.md` (read that first).
Each folder: `page.html`, `html5Game.html` (loader), `bootstrap.js`, `build.js` (client, formatted), `sample_doInit.txt`, `sample_doSpin.txt`, `play.html` (open in browser).

| Folder | Symbol | Grid | Bet in sample | Notes from sample spin |
|---|---|---|---|---|
| `jewels-of-ra` | `vswaysjwofra` | 5×4 | 0.08 × 25 | "ways" game |
| `chronos-sands-of-eternity` | `vs20clock` | 5×4 | 0.10 × 20 | 20 lines, `W` wild in `s` |
| `super-golden-spins` | `vs10gwheelst` | 3×3 | 0.20 × 10 | classic 3-reel; won 1.00: `l0=0~1.00~3~1~5` = line 0, win, positions; `na=c` = must collect |
| `sweet-loot` | `vs20stopbnnza` | 6×5 (+top row) | 0.10 × 20 | multi-area result `g={main:{...},top:{...}}` |
| `gates-of-olympus-2500` | `vs20olympmmd` | 6×5 | 0.10 × 20 | tumble/scatter-pay; `st=rect`, `sw=6`, `sh=5` |

Symbol prefix: `vs` = video slot, `vswaysXXX` = ways-to-win, `vs20` / `vs10` = 20 / 10 paylines.

Add more games:
```
.\fetch-game.ps1 <slug> [<slug> ...]
```
`<slug>` = the part after `/en/games/` in the URL (e.g. `sweet-loot`).
