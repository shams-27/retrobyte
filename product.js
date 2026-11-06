const $ = id => document.getElementById(id);
const root = $("detail");
const pid = new URLSearchParams(location.search).get("id");
let first = true;

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
      <div class="dmedia">${p.badge ? `<span class="badge">${esc(p.badge)}</span>` : ""}<div class="thumb big"><img src="${esc(fullSrc(p))}" data-src="${esc(p.img)}" ${FALLBACK} alt="${esc(p.name)}" width="1200" height="900" fetchpriority="high" decoding="async"></div></div>
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

  const others = PRODUCTS.filter(x => x.id !== p.id);
  const rel = [...others.filter(x => x.cat === p.cat), ...others.filter(x => x.cat !== p.cat)].slice(0, 4);
  $("related").innerHTML = rel.map(cardHTML).join("");
}

root.innerHTML = `<div class="empty">Loading…</div>`;
loadProducts(show);