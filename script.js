let active = "All", query = "";
const $ = id => document.getElementById(id);
let cards = []; // [{ el, cat, text }], built once per data load

/* Cards are built once; filtering only shows/hides them. Rebuilding every card (and re-loading
   every image) on each tab switch was what made switching back to "All" feel laggy. */
function build() {
  $("grid").innerHTML = PRODUCTS.map(cardHTML).join("") + `<div class="empty" id="none" hidden>No products found.</div>`;
  const els = $("grid").querySelectorAll(".card");
  cards = PRODUCTS.map((p, i) => ({ el: els[i], cat: p.cat, text: (p.name + " " + p.desc).toLowerCase() }));
}
function render() {
  let shown = 0;
  for (const c of cards) {
    const show = (active === "All" || c.cat === active) && c.text.includes(query);
    c.el.hidden = !show;
    if (show) shown++;
  }
  $("none").hidden = shown > 0;
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
  render();
};
$("q").oninput = e => { query = e.target.value.toLowerCase().trim(); render(); };

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