// Local dev server: serves local index.html/main.js/main.css, proxies everything else to the live site.
// ponytail: GET-only proxy, no caching; POSTs refused except local /login + /register.
const http = require("http");
const fs = require("fs");
const path = require("path");

const ORIGIN = "https://www.pragmaticplay.com";
const PORT = process.env.PORT || 3000;
const THEME = ORIGIN + "/wp-content/themes/gp-theme-basic/libs/dist";

const local = (f) => fs.readFileSync(path.join(__dirname, f), "utf8");
const types = { ".js": "application/javascript", ".css": "text/css", ".html": "text/html" };

// Local accounts: username + scrypt password hash in users.json, sessions in memory.
// ponytail: JSON file + in-memory sessions (lost on restart); move to a DB when multi-process/many users.
const crypto = require("crypto");
const USERS = path.join(__dirname, "users.json");
const users = fs.existsSync(USERS) ? JSON.parse(fs.readFileSync(USERS, "utf8")) : {};
const sessions = new Map(); // token -> username
const hash = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString("hex");
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const loginPage = (msg = "", user = "") => local("login.html").replace("<!--MSG-->", esc(msg)).replace("<!--USER-->", esc(user));
const readBody = (req) => new Promise((ok, fail) => {
  let b = "";
  req.on("data", (c) => { b += c; if (b.length > 4096) req.destroy(); });
  req.on("end", () => ok(new URLSearchParams(b))).on("error", fail);
});

const handler = async (req, res) => {
  const url = new URL(req.url, "http://x");
  try {
    if (url.pathname === "/login" && req.method === "GET")
      return res.writeHead(200, { "Content-Type": types[".html"] }).end(loginPage());
    if ((url.pathname === "/login" || url.pathname === "/register") && req.method === "POST") {
      const f = await readBody(req);
      const u = (f.get("username") || "").trim(), p = f.get("password") || "";
      const fail = (m) => res.writeHead(400, { "Content-Type": types[".html"] }).end(loginPage(m, u));
      if (!/^[A-Za-z0-9_]{3,32}$/.test(u)) return fail("Username: 3-32 letters, numbers or _");
      if (p.length < 6 || p.length > 128) return fail("Password: 6-128 characters");
      const key = u.toLowerCase();
      if (url.pathname === "/register") {
        if (users[key]) return fail("Username already taken");
        const salt = crypto.randomBytes(16).toString("hex");
        users[key] = { username: u, salt, hash: hash(p, salt) };
        fs.writeFileSync(USERS, JSON.stringify(users, null, 2));
      } else {
        const r = users[key];
        if (!r || !crypto.timingSafeEqual(Buffer.from(hash(p, r.salt), "hex"), Buffer.from(r.hash, "hex")))
          return fail("Wrong username or password");
      }
      const token = crypto.randomBytes(32).toString("hex");
      sessions.set(token, users[key].username);
      return res.writeHead(303, { Location: "/en/games/", "Set-Cookie": `sid=${token}; HttpOnly; SameSite=Lax; Path=/` }).end();
    }
    if (url.pathname === "/logout") {
      sessions.delete(req.headers.cookie?.match(/sid=(\w+)/)?.[1]);
      return res.writeHead(303, { Location: "/login", "Set-Cookie": "sid=; Max-Age=0; Path=/" }).end();
    }
    // Demo only: never forward form posts (contact forms, admin-ajax) to the live site
    if (req.method !== "GET" && req.method !== "HEAD") return res.writeHead(403).end("Disabled in demo");
    if (url.pathname === "/") return res.writeHead(302, { Location: "/en/games/" }).end();

    // Local pages: /en/games/[<slug>/] -> ./, /id/permainan/[<slug>/] -> ./id/ (index.html or <slug>/page.html)
    const m = url.pathname.match(/^\/(en\/games|id\/permainan)\/(?:([a-z0-9-]+)\/?)?$/);
    const dir = m && (m[1] === "id/permainan" ? "id" : "");
    const file = !m ? null
      : !m[2] ? (url.searchParams.has("ajax") ? null : path.join(dir, "index.html"))
      : fs.existsSync(path.join(__dirname, dir, m[2], "page.html")) ? path.join(dir, m[2], "page.html") : null;
    const notice = dir ? "HANYA DEMO - kredit main gratis, tanpa uang asli, tanpa pembayaran atau deposit."
      : "DEMO ONLY - free-play credits, no real money, no payments or deposits.";
    // Keep only game cards whose page is saved locally (<dir>/<slug>/page.html); used for pages + filter AJAX
    const onlyLocalGames = (html) => html
      .replace(/<div class="game uk-[\s\S]*?<p class="game__title">[^<]*<\/p>\s*(?:<!--.*?-->\s*)?<\/div>/g, (card) => {
        const s = card.match(/\/(?:en\/games|id\/permainan)\/([a-z0-9-]+)\//)?.[1];
        return s && fs.existsSync(path.join(__dirname, dir, s, "page.html")) ? card : "";
      })
      .replace(/<button[^>]*js-load-more-games-btn[\s\S]*?<\/button>/g, "");
    if (m && !m[2] && url.searchParams.has("ajax")) {
      const r = await fetch(ORIGIN + req.url, { headers: { "User-Agent": "Mozilla/5.0" } });
      const html = onlyLocalGames((await r.text()).replace(/https?:\/\/www\.pragmaticplay\.com/g, ""));
      return res.writeHead(r.status, { "Content-Type": types[".html"] }).end(html);
    }
    if (file) {
      const html = onlyLocalGames(local(file))
        .replace(/[^"']*gp-theme-basic\/libs\/dist\/css\/main\.min\.css[^"']*/g, "/main.css")
        .replace(/[^"']*gp-theme-basic\/libs\/dist\/scripts\/main\.min\.js[^"']*/g, "/main.js")
        // keep navigation on localhost (other pages proxied)
        .replace(/https?:(\\?\/){2}www\.pragmaticplay\.com/g, "")
        .replace(/alt="(Pragmatic Play|AJN99)"/g, 'alt="UCUP99"')
        // Client Hub (header + footer menu) -> local login page, same tab
        .replace(/(?:target="_blank" rel="noopener" )?href="https:\/\/client(?:hub)?\.pragmaticplay\.com\/(?:en\/)?"/g, 'href="/login"')
        // Logo + Home/Beranda go back to the game list; game lobby button too
        .replace(/href="\/(en|id)\/"/g, (_, l) => `href="/${l}/${l === "id" ? "permainan" : "games"}/"`)
        .replace(/lobby_url=[^&"]*/g, `lobby_url=${encodeURIComponent(`http://${req.headers.host}/${dir ? "id/permainan" : "en/games"}/`)}`)
        // Menu: drop News/Berita, Verify/Verifikasi Game, Contact/Perusahaan
        .replace(/<li id="menu-item-\d+"[^>]*><a[^>]*href="[^"]*(?:\/news\/|\/berita\/|\/verify\/|contact|hubungi-kami)[^"]*"[^>]*>[^<]*<\/a><\/li>/g, "")
        // Languages: keep English + Indonesian only (hreflang links, menu items, header switcher, game-language filter)
        .replace(/<link rel="alternate" href="[^"]*" hreflang="(?!en"|id"|x-default")[^"]*" \/>/g, "")
        .replace(/<li id="menu-item-\d+-(?!en"|id")[a-z]+"[^>]*>.*?<\/li>/g, "")
        .replace(/<a href="[^"]*"><img[^>]*><noscript><img[^>]*><\/noscript>\s*<span>(?!English<|Bahasa Indonesia<)[^<]*<\/span><\/a>/g, "")
        .replace(/<li class="select__item[^"]*" data-id="(?!en"|id")[a-z]{2}"\s*data-slug="[^"]*">[^<]*<\/li>/g, "")
        // Drop "Licensed and Certified Games" block + whole Pragmatic footer (awards, links, socials, copyright, legal logos)
        .replace(/<div class="games-certificates[\s\S]*?(?=\s*<\/div>\s*<footer)/g, "")
        .replace(/<footer class="gp__footer">[\s\S]*?<\/footer>/g, "")
        // Demo only: drop contact-form + reCAPTCHA scripts/styles
        .replace(/<script[^>]*(contact-form-7|wpcf7|cf7|recaptcha|swv-js)[^>]*>[\s\S]*?<\/script>/g, "")
        .replace(/<link[^>]*cf7[^>]*>/g, "")
        .replace("</body>", `<div role="note" style="position:fixed;left:0;right:0;bottom:0;z-index:99999;background:#c8102e;color:#fff;text-align:center;font:600 14px/1.4 sans-serif;padding:8px">${notice}</div></body>`);
      return res.writeHead(200, { "Content-Type": types[".html"] }).end(html);
    }

    if (url.pathname === "/main.js" || url.pathname === "/main.css")
      return res.writeHead(200, { "Content-Type": types[path.extname(url.pathname)] }).end(local(url.pathname.slice(1)));

    // Brand logo: own Logo.png replaces every PP header logo (white/black variants swapped by main.js)
    if (url.pathname === "/Logo.png" || /\/(PP-(white|black)-logo\.svg|favicon[^/]*|apple-touch-icon[^/]*|cropped-222-[^/]*)$/.test(url.pathname))
      return res.writeHead(200, { "Content-Type": "image/png" }).end(fs.readFileSync(path.join(__dirname, "Logo.png")));

    // Theme assets (fonts/images referenced relatively by main.css) -> live theme folder
    const target = url.pathname.startsWith("/fonts/") || url.pathname.startsWith("/images/")
      ? THEME + url.pathname
      : ORIGIN + req.url;

    const r = await fetch(target, { headers: { "User-Agent": "Mozilla/5.0" } });
    res.writeHead(r.status, { "Content-Type": r.headers.get("content-type") || "application/octet-stream" });
    res.end(Buffer.from(await r.arrayBuffer()));
  } catch (e) {
    res.writeHead(502).end(String(e));
  }
};
module.exports = handler; // Vercel entry (api/index.js)
if (require.main === module) http.createServer(handler).listen(PORT, () => console.log(`http://localhost:${PORT}/en/games/`));
