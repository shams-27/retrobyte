/* ===== Cart (saved in localStorage, checkout = one WhatsApp message) ===== */
const CART_KEY = "retrobyte_cart_v1", CART_MAX = 20;
let CART = {}; // { productId: qty }

function cartLoad() {
  CART = {};
  try {
    const o = JSON.parse(localStorage.getItem(CART_KEY) || "{}");
    for (const [k, v] of Object.entries(o)) { const n = Math.floor(+v); if (n > 0) CART[k] = Math.min(n, CART_MAX); }
  } catch (e) { }
}
function cartSave() { try { localStorage.setItem(CART_KEY, JSON.stringify(CART)); } catch (e) { } }
const cartFind = id => PRODUCTS.find(p => p.id === id);

function cartAdd(id, n = 1) {
  const p = cartFind(id);
  if (!p || !p.stock) return;
  CART[id] = Math.min(CART_MAX, (CART[id] || 0) + n);
  cartSave(); cartRender(); cartToast("Added: " + p.name);
  cartFab.classList.remove("bump"); void cartFab.offsetWidth; cartFab.classList.add("bump");
}
function cartSet(id, n) {
  if (n <= 0) delete CART[id]; else CART[id] = Math.min(CART_MAX, n);
  cartSave(); cartRender();
}

/* ---------- UI ---------- */
const cartRoot = document.createElement("div");
cartRoot.innerHTML = `
<button type="button" class="cart-fab" id="cartfab" aria-label="Open cart">Cart <span class="cart-n" id="cartn">0</span></button>
<div class="cart-ov" id="cartov" hidden></div>
<aside class="cart-panel" id="cartpanel" role="dialog" aria-modal="true" aria-label="Shopping cart" hidden>
  <div class="cart-head"><h2>Your cart</h2><button type="button" class="cart-x" id="cartx" aria-label="Close cart">×</button></div>
  <div class="cart-body" id="cartbody"></div>
  <div class="cart-foot" id="cartfoot"></div>
</aside>
<div class="cart-toast" id="carttoast" role="status" aria-live="polite"></div>`;
document.body.append(...cartRoot.children);
const cartFab = document.getElementById("cartfab"), cartPanel = document.getElementById("cartpanel"),
  cartOv = document.getElementById("cartov"), cartBody = document.getElementById("cartbody"),
  cartFoot = document.getElementById("cartfoot"), cartN = document.getElementById("cartn"),
  cartTo = document.getElementById("carttoast");
let cartLast = null, cartTimer = 0;

function cartToast(msg) {
  cartTo.textContent = msg; cartTo.classList.add("show");
  clearTimeout(cartTimer); cartTimer = setTimeout(() => cartTo.classList.remove("show"), 1800);
}
function cartOpen() {
  cartLast = document.activeElement;
  cartRender();
  cartPanel.hidden = cartOv.hidden = false;
  document.documentElement.style.overflow = "hidden";
  document.getElementById("cartx").focus();
}
function cartClose() {
  if (cartPanel.hidden) return;
  cartPanel.hidden = cartOv.hidden = true;
  document.documentElement.style.overflow = "";
  if (cartLast && cartLast.focus) cartLast.focus();
}

function cartRender() {
  const ids = Object.keys(CART);
  cartN.textContent = ids.reduce((s, id) => s + CART[id], 0);

  // keep keyboard focus on the same +/- button after the list is rebuilt
  const a = document.activeElement, fk = a && a.closest && a.closest("#cartbody") ? a.dataset.k : null;

  if (!ids.length) {
    cartBody.innerHTML = `<div class="cart-empty">Your cart is empty.</div>`;
    cartFoot.innerHTML = "";
    return;
  }
  if (!PRODUCTS.length) { cartBody.innerHTML = `<div class="cart-empty">Loading…</div>`; cartFoot.innerHTML = ""; return; }

  let total = 0, count = 0;
  cartBody.innerHTML = ids.map(id => {
    const p = cartFind(id), q = CART[id];
    if (!p) return "";
    const ok = p.stock;
    if (ok) { total += p.price * q; count += q; }
    return `<div class="cart-row${ok ? "" : " off"}">
      <img src="${esc(optimized(p.img, 160, 120))}" data-src="${esc(p.img)}" ${FALLBACK} alt="" width="80" height="60" decoding="async">
      <div class="ci">
        <a href="product.html?id=${encodeURIComponent(p.id)}">${esc(p.name)}</a>
        <div class="cp">${fmt(p.price)}${ok ? "" : " · Out of stock (not included)"}</div>
        <div class="cq">
          ${ok ? `<button type="button" data-id="${esc(id)}" data-d="-1" data-k="${esc(id)}|-1" aria-label="Decrease quantity">−</button><span>${q}</span><button type="button" data-id="${esc(id)}" data-d="1" data-k="${esc(id)}|1" aria-label="Increase quantity">+</button>` : ""}
          <button type="button" class="rm" data-id="${esc(id)}" data-rm="1" data-k="${esc(id)}|rm">Remove</button>
        </div>
      </div>
      <div class="ct">${ok ? fmt(p.price * q) : ""}</div>
    </div>`;
  }).join("");

  cartFoot.innerHTML = `
    <div class="cart-total"><span>Total (${count} item${count === 1 ? "" : "s"})</span><b>${fmt(total)}</b></div>
    <p class="cart-note">Delivery charge extra. Cash on delivery across Bangladesh.</p>
    ${count ? `<button type="button" class="btn big-btn" data-checkout="1">Checkout</button>` : ""}
    <button type="button" class="cart-clear" id="cartclear">Clear cart</button>`;

  if (fk) { const b = cartBody.querySelector(`[data-k="${CSS.escape(fk)}"]`); if (b) b.focus(); }
}

/* drop cart items that no longer exist in the sheet (only once products are loaded) */
function cartSync() {
  if (PRODUCTS.length) {
    let changed = false;
    for (const id of Object.keys(CART)) if (!cartFind(id)) { delete CART[id]; changed = true; }
    if (changed) cartSave();
  }
  cartRender();
}

/* ---------- events ---------- */
cartFab.onclick = cartOpen;
cartOv.onclick = cartClose;
document.getElementById("cartx").onclick = cartClose;
document.addEventListener("keydown", e => { if (e.key === "Escape") cartClose(); });
cartBody.onclick = e => {
  const b = e.target.closest("button[data-id]"); if (!b) return;
  const id = b.dataset.id;
  if (b.dataset.rm) cartSet(id, 0); else cartSet(id, (CART[id] || 0) + +b.dataset.d);
};
cartFoot.onclick = e => { if (e.target.closest("#cartclear")) { CART = {}; cartSave(); cartRender(); } };
// "Add to cart" buttons on product cards
document.addEventListener("click", e => {
  const b = e.target.closest("[data-add]");
  if (b) cartAdd(b.dataset.add);
});
// keep several open tabs in sync
window.addEventListener("storage", e => { if (e.key === CART_KEY) { cartLoad(); cartRender(); } });

/* wrap loadProducts so the cart refreshes whenever product data arrives */
const _loadProducts = loadProducts;
loadProducts = function (cb) { return _loadProducts(s => { cb(s); cartSync(); }); };

cartLoad();
cartRender();