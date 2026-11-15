# pragmaticplay.com/en/games — how it works

## Stack
- WordPress, custom theme `gp-theme-basic` (v1.3.180)
- jQuery 3.7 + UIkit 2 (grid, `uk-width-*` classes)
- WP Rocket (caching + lazyload: `data-lazy-src`), EWWW lazysizes
- Contact Form 7 + reCAPTCHA v3, CookieYes consent

## Files
- `index.html` — server-rendered page (formatted)
- `main.css` — whole theme CSS (formatted from main.min.css)
- `main.js` — whole theme JS (formatted from main.min.js)

## Page structure (index.html)
- `body.post-type-archive-games` — WP archive of custom post type `games`
- `.section--all-games` (~line 395) — main block
  - `.language-currency-filters` — language / currency / studio dropdowns (`.js-select`, `.select__item[data-id]`)
  - `.game-type-filter__item` — category tabs (`data-id` = WP term ID)
  - `.device-filter__item` — desktop/mobile
  - `.js-game-search` — search box
  - `#js-games-list.games-list` — grid of `.game` cards (`.game__thumbnail`, `.game__image`)
  - `.js-load-more-games-btn` — pagination

## Filtering / load-more logic (main.js ~line 12620)
Every filter click sets a var, resets page=1, calls `T()`:
```
GET /en/games/?ajax=1&cats=<id>&lang=<id>&cur=<id>&studio=<id>&device=<ids>&search=<q>&page=<n>
```
Server returns HTML fragment of `.game` cards.
- `T()` replaces `#js-games-list` contents (new filter)
- `S()` appends next page (Load More); hides button when fewer than `items-per-page` returned
- Cookie `moreGamesFilterHP` (set on homepage) preselects Scratchcards (cats=75) or Table Games (cats=24)

Other AJAX: `settings.ajax_url` = `wp-admin/admin-ajax.php` (forms, misc).

## Run locally
`node server.js` then open http://localhost:3000/en/games/
Edits to `index.html` / `main.js` / `main.css` show on refresh. Filter AJAX + images proxied to live site.

## Not included
PHP templates (server-side, not public). Images/fonts load from live CDN.
