let active = "All", query = "";
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
  // update in place (instead of rebuilding) so the chip colors can animate
  $("chips").querySelectorAll(".chip").forEach(x => x.setAttribute("aria-pressed", x === b));
  // on phones the category row scrolls sideways: bring the tapped chip to the middle
  const row = $("chips");
  if (row.scrollWidth > row.clientWidth) row.scrollTo({ left: b.offsetLeft - (row.clientWidth - b.offsetWidth) / 2, behavior: "smooth" });
  shown = PAGE; render();
};
$("q").oninput = e => { query = e.target.value.toLowerCase().trim(); shown = PAGE; render(); };
$("grid").addEventListener("click", e => {
  if (!e.target.closest("#more")) return;
  const prev = shown;
  shown += PAGE;
  render(prev);
});

$("grid").innerHTML = `<div class="empty">Loading products…</div>`;
loadProducts(status => {
  if (status === "error") { $("grid").innerHTML = `<div class="empty">Couldn’t load products. Please refresh the page.</div>`; return; }
  chips(); build(); render();
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