let active = "All", query = "", sort = "default";
const $ = id => document.getElementById(id);

/* Load more: only PAGE cards are in the page at a time; the button reveals the next batch.
   Each card element is created once (the first time it is needed) and then reused, so switching
   categories or searching never re-creates cards or re-downloads images that were already shown. */
const PAGE = matchMedia("(max-width:600px)").matches ? 12 : 24;
let items = [];      // [{ p, el, cat, text }], one per product, rebuilt per data load
let shown = PAGE;    // how many matching products are currently on screen

const noneEl = document.createElement("div");
noneEl.className = "empty";
noneEl.textContent = "No products found.";
const moreEl = document.createElement("div");
moreEl.className = "more";
moreEl.innerHTML = `<button type="button" class="btn alt" id="more"></button>`;
const moreBtn = moreEl.firstChild;

function cardEl(it) {
  if (!it.el) {
    const t = document.createElement("template");
    t.innerHTML = cardHTML(it.p).trim();
    it.el = t.content.firstElementChild;
  }
  return it.el;
}
function build() {
  items = PRODUCTS.map(p => ({ p, el: null, cat: p.cat, text: (p.name + " " + p.desc).toLowerCase() }));
}
// from = index of the first card that is new on screen (they get a short fade-in); omit for no animation
function render(from) {
  const matches = items.filter(it => (active === "All" || it.cat === active) && it.text.includes(query));
  if (sort !== "default") matches.sort(SORT_FN[sort]);
  const nodes = matches.slice(0, shown).map(cardEl);
  // first row on wide screens is visible right away: load those images immediately and with priority
  if (PAGE > 12) nodes.slice(0, 4).forEach(el => { const im = el.querySelector("img"); if (im) { im.loading = "eager"; im.fetchPriority = "high"; } });
  if (from != null) nodes.slice(from).forEach((el, k) => {
    el.style.animationDelay = Math.min(k * 40, 320) + "ms";
    el.classList.add("pop");
    el.addEventListener("animationend", function done(e) {
      if (e.target !== el) return;
      el.classList.remove("pop"); el.style.animationDelay = ""; el.removeEventListener("animationend", done);
    });
  });
  if (!matches.length) nodes.push(noneEl);
  else if (matches.length > shown) {
    const left = matches.length - shown;
    moreBtn.textContent = "Load more (" + left + " more)";
    nodes.push(moreEl);
  }
  $("grid").replaceChildren(...nodes);
}
function chips() {
  const cats = ["All", ...new Set(PRODUCTS.map(p => p.cat))];
  if (!cats.includes(active)) active = "All";
  $("chips").innerHTML = cats.map(c => `<button class="chip" aria-pressed="${c === active}" data-c="${esc(c)}">${esc(c)}</button>`).join("");
}
$("chips").onclick = e => {
  const b = e.target.closest(".chip"); if (!b) return;
  active = b.dataset.c;
  applyFilters();
};
$("q").oninput = e => { query = e.target.value.toLowerCase().trim(); shown = PAGE; render(); };
$("grid").addEventListener("click", e => {
  if (!e.target.closest("#more")) return;
  const prev = shown;
  shown += PAGE;
  render(prev);
});

/* ===== Filters menu (phones) =====
   On small screens the category row is replaced by a "Filters" button that opens a bottom sheet
   with the categories (with counts) and a sort option. On wider screens the category chips are used. */
const SORTS = [["default", "Featured"], ["price-asc", "Price: low to high"], ["price-desc", "Price: high to low"], ["name", "Name: A to Z"]];
const SORT_FN = {
  "price-asc": (a, b) => a.p.price - b.p.price,
  "price-desc": (a, b) => b.p.price - a.p.price,
  "name": (a, b) => a.p.name.localeCompare(b.p.name)
};
const flRoot = document.createElement("div");
flRoot.innerHTML = `
<div class="fl-ov" id="flov" hidden></div>
<div class="fl-sheet" id="flsheet" role="dialog" aria-modal="true" aria-labelledby="fltitle" hidden>
  <div class="fl-grip" aria-hidden="true"></div>
  <div class="fl-head"><h2 id="fltitle">Filters</h2><button type="button" class="cart-x" id="flx" aria-label="Close filters">×</button></div>
  <div class="fl-body" id="flbody"></div>
  <div class="fl-foot"><button type="button" class="cart-clear" id="flreset">Reset</button><button type="button" class="btn big-btn" id="fldone"></button></div>
</div>`;
document.body.append(...flRoot.children);
const flOv = $("flov"), flSheet = $("flsheet"), flBody = $("flbody"), flDone = $("fldone"),
  flBtn = $("filterbtn"), flCount = $("fcount"), flActive = $("factive");
let flLast = null;

const inCat = (it, c) => c === "All" || it.cat === c;
const hitQuery = it => it.text.includes(query);

// run after any change of category / sort: refresh the chips, the product list and the filter button
function applyFilters() {
  shown = PAGE;
  $("chips").querySelectorAll(".chip").forEach(x => x.setAttribute("aria-pressed", x.dataset.c === active));
  render();
  updateFilterUI();
}
function updateFilterUI() {
  const n = (active !== "All") + (sort !== "default");
  flCount.hidden = !n; flCount.textContent = n;
  const parts = [];
  if (active !== "All") parts.push(active);
  if (sort !== "default") parts.push(SORTS.find(s => s[0] === sort)[1]);
  flActive.hidden = !parts.length;
  flActive.innerHTML = parts.length ? `<span>${parts.map(esc).join(" · ")}</span><button type="button" id="flclear">Clear</button>` : "";
  if (!flSheet.hidden) flRender();
}
function flRender() {
  const cats = ["All", ...new Set(items.map(it => it.cat))];
  const a = document.activeElement, fk = a && flBody.contains(a) ? a.dataset.k : null;
  flBody.innerHTML = `
    <h3 class="fl-h">Category</h3>
    <div class="fl-opts">${cats.map(c => `<button type="button" class="fl-opt" aria-pressed="${c === active}" data-cat="${esc(c)}" data-k="c|${esc(c)}">${esc(c)} <span>${items.filter(it => inCat(it, c) && hitQuery(it)).length}</span></button>`).join("")}</div>
    <h3 class="fl-h">Sort by</h3>
    <div class="fl-opts">${SORTS.map(([k, l]) => `<button type="button" class="fl-opt" aria-pressed="${k === sort}" data-sort="${k}" data-k="s|${k}">${l}</button>`).join("")}</div>`;
  const n = items.filter(it => inCat(it, active) && hitQuery(it)).length;
  flDone.textContent = n ? "Show " + n + " product" + (n === 1 ? "" : "s") : "No products match";
  if (fk) { const b = flBody.querySelector(`[data-k="${CSS.escape(fk)}"]`); if (b) b.focus(); }
}
function flOpen() {
  flLast = document.activeElement;
  flRender();
  flSheet.hidden = flOv.hidden = false;
  document.documentElement.style.overflow = "hidden";
  $("flx").focus();
}
function flClose() {
  if (flSheet.hidden) return;
  flSheet.hidden = flOv.hidden = true;
  document.documentElement.style.overflow = "";
  if (flLast && flLast.focus) flLast.focus();
}
function flReset() { active = "All"; sort = "default"; applyFilters(); }

flBtn.onclick = flOpen;
flOv.onclick = flClose;
$("flx").onclick = flClose;
flDone.onclick = flClose;
$("flreset").onclick = flReset;
document.addEventListener("keydown", e => { if (e.key === "Escape") flClose(); });
flBody.onclick = e => {
  const b = e.target.closest(".fl-opt"); if (!b) return;
  if (b.dataset.cat != null) active = b.dataset.cat; else sort = b.dataset.sort;
  applyFilters();
};
flActive.onclick = e => { if (e.target.closest("#flclear")) flReset(); };

$("grid").innerHTML = `<div class="empty">Loading products…</div>`;
loadProducts(status => {
  if (status === "error") { $("grid").innerHTML = `<div class="empty">Couldn’t load products. Please refresh the page.</div>`; return; }
  chips(); build(); render(); updateFilterUI();
});

/* Shop intro: reveal the search/chips and the product grid when they scroll into view,
   but never before the tagline intro has finished (INTRO_MS after page load).
   If the page is opened at #shop, or the browser can't observe, reveal immediately. */
(function () {
  const INTRO_MS = 1300;
  const els = [document.querySelector("#shop .tools"), $("grid")].filter(Boolean);
  const go = el => el.classList.add("go");
  if (location.hash === "#shop" || !("IntersectionObserver" in window)) { els.forEach(go); return; }
  const io = new IntersectionObserver(entries => {
    for (const en of entries) {
      if (!en.isIntersecting) continue;
      io.unobserve(en.target);
      setTimeout(() => go(en.target), Math.max(0, INTRO_MS - performance.now()));
    }
  }, { rootMargin: "0px 0px -8% 0px", threshold: 0.01 });
  els.forEach(el => io.observe(el));
  setTimeout(() => els.forEach(go), 8000); // safety net: never leave the shop hidden
})();