/* ====== SETTINGS (only touched once, during setup) ====== */
const WHATSAPP = "8801XXXXXXXXX"; // country code + number, no + or spaces
// Google Sheets > File > Share > Publish to web > pick the "Products" tab > CSV > Publish > paste the link here
const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSF5r5Xr32rGRg3pV-nvNdqt3fJ2kwWA2MdeUwpUjLNmvNGkHRosDohx8hKamu8ak4HMxViJLsbNVfb/pub?gid=382459831&single=true&output=csv";
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
    const toPath = v => /^(https?:|data:)/i.test(v) ? v : "images/" + v;
    const mainImg = !img ? "images/" + id + ".png" : toPath(img);
    // gallery column: a number N = images/<id>.png, <id>-2.png ... <id>-N.png; or one file name / link per line
    const gal = g("gallery");
    let extras = [];
    if (/^\d+$/.test(gal)) { for (let i = 2; i <= Math.min(parseInt(gal, 10), 10); i++) extras.push("images/" + id + "-" + i + ".png"); }
    else extras = lines(gal).map(toPath);
    out.push({
      id, name, price, old,
      cat: g("category") || "Other",
      badge: g("badge"),
      stock: !isNo(g("in_stock")),
      // image column blank -> images/<id>.png (e.g. CBS01 -> images/cbs01.png); otherwise a file name or full link
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
const thumbSrc = p => optimized(p.img, 600, 450);
// if the CDN image fails, try the original file; if that is missing too, show the "No image" placeholder
const FALLBACK = 'onerror="if(!this.dataset.f){this.dataset.f=1;this.src=this.dataset.src}else{this.onerror=null;this.src=PLACEHOLDER}"';

const fmt = n => "৳" + n.toLocaleString("en-IN");
function waLink(text) { return "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(text); }
function cardHTML(p) {
  return `<article class="card">${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ""}
    <div class="thumb"><img src="${esc(thumbSrc(p))}" data-src="${esc(p.img)}" ${FALLBACK} alt="${esc(p.name)}" width="600" height="450" loading="lazy" decoding="async"></div>
    <h3><a class="stretch" href="product.html?id=${encodeURIComponent(p.id)}">${esc(p.name)}</a></h3>
    <p>${esc(p.desc)}</p>
    <div class="price"><b>${fmt(p.price)}</b>${p.old ? `<s>${fmt(p.old)}</s>` : ""}</div>
    <a class="btn" href="${esc(waLink("Hi! I want to order: " + p.name + " (" + fmt(p.price) + ")"))}" target="_blank" rel="noopener">Order on WhatsApp</a>
  </article>`;
}