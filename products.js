/* ====== SETTINGS (only touched once, during setup) ====== */
// Orders are emailed to the shop by a small Google Apps Script (see apps-script.gs for the 2-minute setup).
// Paste the Web app URL here (it ends in /exec).
const ORDER_ENDPOINT = "https://script.google.com/macros/s/AKfycbzCiiw1mmeATy4s9yFlQy-HLclINaXrhDSf3Yj13bub84vEgqNZGjS32CJ934zztG1rSw/exec";
// Google Sheets > File > Share > Publish to web > pick the "Products" tab > CSV > Publish > paste the link here
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSF5r5Xr32rGRg3pV-nvNdqt3fJ2kwWA2MdeUwpUjLNmvNGkHRosDohx8hKamu8ak4HMxViJLsbNVfb/pub?gid=382459831&single=true&output=csv";
// Where product images are hosted (must end with "/"). Leave "" to use the local images/ folder instead.
const IMAGE_BASE = "https://shams.retrobyte-2026.workers.dev/";
// File type of your images. Used when the sheet's image cell is blank (image = <product id> + this) and
// when a file name in the sheet is written without an ending (e.g. "cbs01" -> "cbs01.jpg").
const IMAGE_EXT = ".jpg";
/* ======================================================== */

let PRODUCTS = [];
const CACHE_KEY = "retrobyte_sheet_csv_v1";

/* ---------- helpers ---------- */
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const PLACEHOLDER = "data:image/svg+xml," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450"><rect width="100%" height="100%" fill="#1c1811"/><text x="50%" y="50%" fill="#a39878" font-family="monospace" font-size="24" text-anchor="middle">No image</text></svg>');

/* ---------- CSV parsing (handles quotes, commas and line breaks inside cells) ---------- */
function parseCSV(text) {
  text = text.replace(/^\uFEFF/, "");
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell); cell = ""; rows.push(row); row = [];
    } else cell += c;
  }
  if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

/* ---------- sheet rows -> PRODUCTS ---------- */
const isYes = v => /^(true|yes|y|1|upcoming|coming soon)$/i.test(String(v).trim());
const isNo = v => /^(false|no|n|0|out|out of stock)$/i.test(String(v).trim());
const lines = v => String(v || "").split(/\r?\n|\|/).map(s => s.trim()).filter(Boolean);
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "product";

function csvToProducts(text) {
  const rows = parseCSV(text).filter(r => r.some(c => c.trim() !== ""));
  if (rows.length < 2) return [];
  const head = rows[0].map(h => h.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, ""));
  const used = new Set();
  const out = [];
  for (const r of rows.slice(1)) {
    const g = k => (r[head.indexOf(k)] ?? "").trim();
    const name = g("name");
    const price = parseFloat(g("price").replace(/[^\d.]/g, ""));
    if (!name || isNaN(price)) continue;       // skip incomplete rows
    if (isNo(g("show"))) continue;             // "show" unticked = hidden
    let old = parseFloat(g("old_price").replace(/[^\d.]/g, ""));
    if (isNaN(old) || old <= price) old = null;
    let id = slug(g("id") || name), n = 2;
    while (used.has(id)) id = slug(g("id") || name) + "-" + n++;
    used.add(id);
    const img = g("image");
    const dir = IMAGE_BASE || "images/";
    const toPath = v => /^(https?:|data:)/i.test(v) ? v : dir + (/\.[a-z0-9]{2,5}$/i.test(v) ? v : v + IMAGE_EXT);
    const mainImg = !img ? dir + id + IMAGE_EXT : toPath(img);
    // gallery column: a number N = <id>.jpg, <id>-2.jpg ... <id>-N.jpg (in IMAGE_BASE); or one file name / link per line
    const gal = g("gallery");
    let extras = [];
    if (/^\d+$/.test(gal)) { for (let i = 2; i <= Math.min(parseInt(gal, 10), 10); i++) extras.push(dir + id + "-" + i + IMAGE_EXT); }
    else extras = lines(gal).map(toPath);
    const upcoming = isYes(g("upcoming"));   // "upcoming" ticked = not on sale yet, customers can pre-book
    out.push({
      id, name, price, old,
      cat: g("category") || "Other",
      badge: g("badge"),
      upcoming,
      expected: g("expected") || g("release_date"),   // free text, e.g. "Dec 2026" or "15 January"
      stock: !upcoming && !isNo(g("in_stock")),
      // image column blank -> <IMAGE_BASE><id><IMAGE_EXT> (e.g. CBS01 -> .../cbs01.jpg); otherwise a file name or full link
      img: mainImg,
      imgs: [...new Set([mainImg, ...extras])].slice(0, 10),
      desc: g("short_description"),
      long: g("description"),
      features: lines(g("features")),
      specs: lines(g("specs")).map(l => { const i = l.indexOf(":"); return i < 0 ? ["", l] : [l.slice(0, i).trim(), l.slice(i + 1).trim()]; })
    });
  }
  return out;
}

/* Loads products from the sheet. Shows the last saved copy instantly (if any),
   then refreshes in the background. cb("ok") runs when there is new data to show,
   cb("error") only if nothing could be loaded at all. */
async function loadProducts(cb) {
  let cached = null;
  try { cached = localStorage.getItem(CACHE_KEY); } catch (e) { }
  if (cached) { PRODUCTS = csvToProducts(cached); cb("ok"); }
  try {
    if (!/^https?:/.test(SHEET_CSV_URL)) throw new Error("Sheet link not set");
    const res = await fetch(SHEET_CSV_URL);
    if (!res.ok) throw new Error("HTTP " + res.status);
    const text = await res.text();
    if (text === cached) return;
    PRODUCTS = csvToProducts(text);
    try { localStorage.setItem(CACHE_KEY, text); } catch (e) { }
    cb("ok");
  } catch (err) {
    console.error("Could not load products:", err);
    if (!cached) cb("error");
  }
}

/* ---------- images ---------- */
/* Auto-optimized images: resized and converted to WebP on the fly by the free wsrv.nl image CDN.
   Works on your live site. On localhost or file:// it uses the original files instead. */
const IMG_CDN = location.protocol.startsWith("http") && !/^(localhost|127\.|0\.0\.0\.0)/.test(location.hostname);
const optimized = (path, w, h) => (IMG_CDN && !path.startsWith("data:"))
  ? "https://wsrv.nl/?url=" + encodeURIComponent(new URL(path, location.href).href) + "&w=" + w + "&h=" + h + "&fit=cover&output=webp&q=78&we=1"
  : path;
const fullSrc = p => optimized(p.img, 1200, 900);
// several sizes (4:3) so phones download small images and sharp/large screens get bigger ones
const srcset = (path, widths) => IMG_CDN && !path.startsWith("data:")
  ? widths.map(w => optimized(path, w, Math.round(w * 3 / 4)) + " " + w + "w").join(", ") : "";
const thumbSrc = p => optimized(p.img, 600, 450);
// if the CDN image fails, try the original file; if that is missing too, show the "No image" placeholder
const FALLBACK = 'onerror="if(!this.dataset.f){this.dataset.f=1;this.removeAttribute(\'srcset\');this.removeAttribute(\'sizes\');this.src=this.dataset.src}else{this.onerror=null;this.src=PLACEHOLDER}"';

const fmt = n => "৳" + n.toLocaleString("en-IN");
function cardHTML(p) {
  const badge = p.badge || (p.upcoming ? "Coming soon" : "");
  return `<article class="card">${badge ? `<span class="badge">${esc(badge)}</span>` : ""}
    <div class="thumb"><img src="${esc(thumbSrc(p))}"${srcset(p.img, [320, 480, 640]) ? ` srcset="${esc(srcset(p.img, [320, 480, 640]))}" sizes="(max-width:600px) 50vw, 300px"` : ""} data-src="${esc(p.img)}" ${FALLBACK} alt="${esc(p.name)}" width="600" height="450" loading="lazy" decoding="async"></div>
    <h3><a class="stretch" href="product.html?id=${encodeURIComponent(p.id)}">${esc(p.name)}</a></h3>
    <p>${esc(p.desc)}</p>
    ${p.upcoming ? `<div class="stock soon">● Upcoming${p.expected ? " · " + esc(p.expected) : ""}</div>` : p.stock ? "" : `<div class="stock out">● Out of stock</div>`}
    <div class="price"><b>${fmt(p.price)}</b>${p.old ? `<s>${fmt(p.old)}</s>` : ""}</div>
    <div class="card-actions">${p.stock ? `<button type="button" class="btn alt" data-add="${esc(p.id)}">Add to cart</button>` : ""}
    <button type="button" class="btn" data-order="${esc(p.id)}"${p.stock ? "" : p.upcoming ? ' data-type="prebook"' : ' data-type="restock"'}>${p.stock ? "Order now" : p.upcoming ? "Pre-book" : "Ask about restock"}</button></div>
  </article>`;
}