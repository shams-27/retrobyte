const $ = id => document.getElementById(id);
const root = $("detail");
const pid = new URLSearchParams(location.search).get("id");
let first = true;

/* ---------- image gallery ---------- */
// image failed: first fall back from the CDN copy to the original file, then report it as dead
function imgFail(el) {
  if (!el.dataset.f) { el.dataset.f = 1; el.src = el.dataset.src; }
  else { el.onerror = null; el.dispatchEvent(new CustomEvent("imgdead", { bubbles: true })); }
}
const FAIL = 'onerror="imgFail(this)"';
let GAL = null; // current gallery controls, used by the keyboard handler

function initGallery(p) {
  const root = $("gstage").parentNode;
  const main = $("gmain"), thumbs = $("gthumbs"), count = $("gcount"), prev = $("gprev"), next = $("gnext");
  let imgs = p.imgs.slice(), i = 0;
  const multi = () => imgs.length > 1;

  const thumbsHTML = () => !multi() ? "" : imgs.map((u, k) =>
    `<button type="button" class="gt" data-k="${k}" aria-label="Show image ${k + 1}" aria-current="${k === i}"><img src="${esc(optimized(u, 160, 120))}" data-src="${esc(u)}" ${FAIL} alt="" width="160" height="120" loading="lazy" decoding="async"></button>`).join("");

  function paint(fade) {
    const u = imgs[i];
    delete main.dataset.f;
    main.dataset.src = u;
    main.onerror = function () { imgFail(this); };
    main.src = optimized(u, 1200, 900);
    main.alt = p.name + (multi() ? " – image " + (i + 1) + " of " + imgs.length : "");
    prev.hidden = next.hidden = count.hidden = !multi();
    count.textContent = (i + 1) + " / " + imgs.length;
    thumbs.querySelectorAll(".gt").forEach((b, k) => b.setAttribute("aria-current", k === i));
    if (fade) { main.classList.remove("fade"); void main.offsetWidth; main.classList.add("fade"); }
    if (multi()) { const n = new Image(); n.src = optimized(imgs[(i + 1) % imgs.length], 1200, 900); } // preload next
  }
  function rebuild() { thumbs.innerHTML = thumbsHTML(); paint(false); }
  function go(d) { if (!multi()) return; i = (i + d + imgs.length) % imgs.length; paint(true); }
  function set(k) { if (k === i || !imgs[k]) return; i = k; paint(true); }

  // a broken extra image just disappears from the gallery; a broken main image shows the placeholder
  root.addEventListener("imgdead", e => {
    const el = e.target, th = el.closest(".gt");
    const k = th ? +th.dataset.k : i;
    if (k === 0) { el.src = PLACEHOLDER; return; }
    imgs.splice(k, 1);
    if (k < i) i--; else if (k === i) i = Math.min(i, imgs.length - 1);
    rebuild();
  });
  prev.onclick = () => go(-1);
  next.onclick = () => go(1);
  thumbs.onclick = e => { const b = e.target.closest(".gt"); if (b) set(+b.dataset.k); };

  // swipe on touch screens
  let x0 = null, y0 = 0;
  const stage = $("gstage");
  stage.addEventListener("touchstart", e => { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
  stage.addEventListener("touchend", e => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5) go(dx < 0 ? 1 : -1);
  }, { passive: true });

  GAL = { go };
  rebuild();
}
// left / right arrow keys switch images (registered once)
document.addEventListener("keydown", e => {
  if (!GAL || e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  if (e.key === "ArrowLeft") GAL.go(-1); else if (e.key === "ArrowRight") GAL.go(1);
});

function show(status) {
  if (status === "error") { root.innerHTML = `<div class="empty">Couldn’t load products. Please refresh the page.</div>`; return; }
  const p = PRODUCTS.find(x => x.id === pid);
  if (!p) {
    root.innerHTML = `<div class="empty">Product not found. <a href="index.html#shop">Back to shop</a></div>`;
    return;
  }
  document.title = p.name + " · RetroByte";
  const off = p.old ? Math.round((1 - p.price / p.old) * 100) : 0;
  root.innerHTML = `
    <nav class="crumb"><a href="index.html#shop">Shop</a> / ${esc(p.cat)} / ${esc(p.name)}</nav>
    <div class="detail">
      <div class="dmedia">${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ""}
        <div class="gal">
          <div class="thumb big gstage" id="gstage">
            <img id="gmain" width="1200" height="900" fetchpriority="high" decoding="async" alt="${esc(p.name)}">
            <button type="button" class="gnav prev" id="gprev" aria-label="Previous image" hidden>‹</button>
            <button type="button" class="gnav next" id="gnext" aria-label="Next image" hidden>›</button>
            <span class="gcount" id="gcount" hidden></span>
          </div>
          <div class="gthumbs" id="gthumbs"></div>
        </div>
      </div>
      <div class="dinfo">
        <span class="cat">${esc(p.cat)}</span>
        <h1>${esc(p.name)}</h1>
        <div class="price big"><b>${fmt(p.price)}</b>${p.old ? `<s>${fmt(p.old)}</s><span class="save">Save ${off}%</span>` : ""}</div>
        <p class="long">${esc(p.long).replace(/\r?\n/g, "<br>")}</p>
        <div class="stock ${p.stock ? "ok" : "out"}">● ${p.stock ? "In stock" : "Out of stock"}</div>
        ${p.stock ? `<div class="qty"><button type="button" id="minus" aria-label="Decrease quantity">−</button><span id="n">1</span><button type="button" id="plus" aria-label="Increase quantity">+</button><span class="total" id="total"></span></div>` : ""}
        <a id="order" class="btn big-btn" target="_blank" rel="noopener">${p.stock ? "Order on WhatsApp" : "Ask about restock"}</a>
        ${p.features.length ? `<h2 class="sec">Features</h2><ul class="feat">${p.features.map(f => `<li>${esc(f)}</li>`).join("")}</ul>` : ""}
        ${p.specs.length ? `<h2 class="sec">Specifications</h2><table class="specs">${p.specs.map(s => `<tr><th>${esc(s[0])}</th><td>${esc(s[1])}</td></tr>`).join("")}</table>` : ""}
        <p class="note">Cash on delivery across Bangladesh. Delivery charge extra.</p>
      </div>
    </div>
    <h2 class="sec rel">You may also like</h2>
    <div class="grid" id="related"></div>`;

  let qty = 1;
  const upd = () => {
    if (p.stock) { $("n").textContent = qty; $("total").textContent = "Total: " + fmt(p.price * qty); }
    $("order").href = waLink(p.stock
      ? `Hi! I want to order ${qty} x ${p.name} (${fmt(p.price * qty)})`
      : `Hi! When will ${p.name} be back in stock?`);
  };
  if (p.stock) {
    $("minus").onclick = () => { qty = Math.max(1, qty - 1); upd(); };
    $("plus").onclick = () => { qty = Math.min(20, qty + 1); upd(); };
  }
  upd();
  initGallery(p);

  const others = PRODUCTS.filter(x => x.id !== p.id);
  const rel = [...others.filter(x => x.cat === p.cat), ...others.filter(x => x.cat !== p.cat)].slice(0, 4);
  $("related").innerHTML = rel.map(cardHTML).join("");
}

root.innerHTML = `<div class="empty">Loading…</div>`;
loadProducts(show);