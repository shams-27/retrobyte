/* ===== Order form: customer details are emailed to the shop through ORDER_ENDPOINT ===== */
const ORDER_SAVE_KEY = "retrobyte_customer_v1";
let ORDER = null;          // { items: [{ id, qty }], fromCart, type: "order" | "restock" | "prebook" }
let orderBusy = false, orderLast = null;

const orderRoot = document.createElement("div");
orderRoot.innerHTML = `
<div class="ord-ov" id="ordov" hidden></div>
<div class="ord-modal" id="ordmodal" role="dialog" aria-modal="true" aria-labelledby="ordtitle" hidden>
  <div class="ord-head"><h2 id="ordtitle">Your details</h2><button type="button" class="cart-x" id="ordx" aria-label="Close">×</button></div>
  <div class="ord-body" id="ordbody"></div>
</div>`;
document.body.append(...orderRoot.children);
const ordOv = document.getElementById("ordov"), ordModal = document.getElementById("ordmodal"),
  ordBody = document.getElementById("ordbody"), ordTitle = document.getElementById("ordtitle");

function orderSaved() { try { return JSON.parse(localStorage.getItem(ORDER_SAVE_KEY) || "{}"); } catch (e) { return {}; } }
function orderRemember(d) { try { localStorage.setItem(ORDER_SAVE_KEY, JSON.stringify(d)); } catch (e) { } }

function orderLines() {
  return ORDER.items.map(it => {
    const p = cartFind(it.id);
    return p ? { id: p.id, name: p.name, qty: it.qty, price: p.price, expected: p.expected || "" } : null;
  }).filter(Boolean);
}

function orderOpen(items, fromCart, type) {
  if (!PRODUCTS.length) return;
  ORDER = { items, fromCart: !!fromCart, type: type === "restock" ? "restock" : type === "prebook" ? "prebook" : "order" };
  if (!orderLines().length) return;
  orderLast = document.activeElement;
  orderForm();
  ordOv.hidden = ordModal.hidden = false;
  document.documentElement.style.overflow = "hidden";
  const f = ordBody.querySelector("input, textarea"); if (f) f.focus();
}
function orderClose() {
  if (ordModal.hidden) return;
  ordOv.hidden = ordModal.hidden = true;
  document.documentElement.style.overflow = "";
  ORDER = null;
  if (orderLast && orderLast.focus) orderLast.focus();
}

const orderBtnLabel = () => ORDER.type === "restock" ? "Send request" : ORDER.type === "prebook" ? "Pre-book now" : "Place order";

function orderForm() {
  const restock = ORDER.type === "restock", pre = ORDER.type === "prebook", lines = orderLines(), s = orderSaved();
  const total = lines.reduce((t, l) => t + l.price * l.qty, 0);
  ordTitle.textContent = restock ? "Restock request" : pre ? "Pre-book" : "Your details";
  ordBody.innerHTML = `
    <ul class="ord-items">${lines.map(l => `<li><span>${l.qty} × ${esc(l.name)}</span>${restock ? "" : `<b>${fmt(l.price * l.qty)}</b>`}</li>`).join("")}</ul>
    ${restock ? "" : `<div class="ord-total"><span>Total</span><b>${fmt(total)}</b></div>
    <p class="cart-note">${pre ? "This item isn't in stock yet" + (lines[0] && lines[0].expected ? " (expected " + esc(lines[0].expected) + ")" : "") + ". We'll call you to confirm your pre-booking and again when it arrives. " : ""}Delivery charge extra. Cash on delivery across Bangladesh.</p>`}
    <form id="ordform" novalidate>
      <label for="of-name">Full name</label>
      <input id="of-name" name="name" type="text" autocomplete="name" maxlength="100" value="${esc(s.name)}" required>
      <label for="of-phone">Phone number</label>
      <input id="of-phone" name="phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="01XXXXXXXXX" maxlength="20" value="${esc(s.phone)}" required>
      <label for="of-email">Email <span>${restock ? "(optional, we reply here)" : "(optional, for a confirmation copy)"}</span></label>
      <input id="of-email" name="email" type="email" autocomplete="email" maxlength="120" value="${esc(s.email)}">
      ${restock ? "" : `
      <label for="of-area">District / area</label>
      <input id="of-area" name="area" type="text" autocomplete="address-level2" maxlength="100" value="${esc(s.area)}" required>
      <label for="of-address">Full delivery address</label>
      <textarea id="of-address" name="address" rows="3" autocomplete="street-address" maxlength="400" required>${esc(s.address)}</textarea>`}
      <label for="of-note">Note <span>(optional)</span></label>
      <textarea id="of-note" name="note" rows="2" maxlength="400"></textarea>
      <input type="text" name="website" class="ord-hp" tabindex="-1" autocomplete="off" aria-hidden="true">
      <p class="ord-err" id="ordmsg" role="alert"></p>
      <button type="submit" class="btn big-btn" id="ordsubmit">${orderBtnLabel()}</button>
    </form>`;
}

function orderValidate(f) {
  const v = n => (f.elements[n] ? f.elements[n].value.trim() : "");
  const fail = (n, msg) => { f.elements[n].focus(); return msg; };
  if (v("name").length < 2) return fail("name", "Please enter your name.");
  if (!/^(?:\+?88)?01[3-9]\d{8}$/.test(v("phone").replace(/[\s-]/g, ""))) return fail("phone", "Please enter a valid Bangladesh mobile number (01XXXXXXXXX).");
  if (v("email") && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v("email"))) return fail("email", "That email address doesn't look right.");
  if (ORDER.type !== "restock") {
    if (v("area").length < 2) return fail("area", "Please enter your district or area.");
    if (v("address").length < 8) return fail("address", "Please enter your full delivery address.");
  }
  return "";
}

async function orderSubmit(f) {
  if (orderBusy) return;
  const msg = document.getElementById("ordmsg"), btn = document.getElementById("ordsubmit");
  const err = orderValidate(f);
  if (err) { msg.textContent = err; return; }
  if (!/^https?:/.test(ORDER_ENDPOINT)) { msg.textContent = "Ordering isn't set up yet. Please try again later."; return; }

  const v = n => (f.elements[n] ? f.elements[n].value.trim() : "");
  const lines = orderLines();
  const pre = ORDER.type === "prebook", exp = lines[0] && lines[0].expected;
  // A pre-book is sent as a normal "order" (so the existing Apps Script handles it unchanged) but is clearly
  // marked three ways: reference starts with PB-, the note starts with [PRE-BOOK], and item names end with "(Pre-book)".
  const data = {
    type: pre ? "order" : ORDER.type,
    prebook: pre,
    ref: (pre ? "PB-" : "RB-") + Date.now().toString(36).toUpperCase(),
    name: v("name"), phone: v("phone").replace(/[\s-]/g, ""), email: v("email"),
    area: v("area"), address: v("address"),
    note: (pre ? "[PRE-BOOK" + (exp ? " - expected " + exp : "") + "] " : "") + v("note"), website: v("website"),
    items: pre ? lines.map(l => ({ ...l, name: l.name + " (Pre-book)" })) : lines,
    total: lines.reduce((t, l) => t + l.price * l.qty, 0),
    page: location.href, sent: new Date().toISOString()
  };

  orderBusy = true; btn.disabled = true; btn.textContent = "Sending…"; msg.textContent = "";
  try {
    // text/plain keeps this a "simple" request, so the browser doesn't need a CORS preflight
    const res = await fetch(ORDER_ENDPOINT, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(data) });
    const out = await res.json();
    if (!out.ok) throw new Error(out.error || "Server error");
    orderRemember({ name: data.name, phone: data.phone, email: data.email, area: data.area, address: data.address });
    if (ORDER.fromCart) { CART = {}; cartSave(); cartRender(); }
    orderDone(data);
  } catch (e) {
    console.error("Order failed:", e);
    msg.textContent = "Sorry, we couldn't send your " + (ORDER.type === "restock" ? "request" : pre ? "pre-booking" : "order") + ". Please check your connection and try again.";
    btn.disabled = false; btn.textContent = orderBtnLabel();
  }
  orderBusy = false;
}

function orderDone(d) {
  const restock = d.type === "restock", pre = !!d.prebook;
  ordTitle.textContent = restock ? "Request sent" : pre ? "Pre-booking received" : "Order received";
  ordBody.innerHTML = `
    <div class="ord-done">
      <p class="ord-ok">✓</p>
      <p>${restock ? "Thanks! We'll contact you when it's back in stock." : pre ? "Thank you! We'll call you on <b>" + esc(d.phone) + "</b> to confirm your pre-booking, and again when it arrives." : "Thank you! We'll call you on <b>" + esc(d.phone) + "</b> to confirm your order."}</p>
      <p class="cart-note">Reference: <b>${esc(d.ref)}</b></p>
      <button type="button" class="btn big-btn" id="orddone">Close</button>
    </div>`;
  document.getElementById("orddone").focus();
}

/* ---------- events ---------- */
ordOv.onclick = orderClose;
document.getElementById("ordx").onclick = orderClose;
document.addEventListener("keydown", e => { if (e.key === "Escape") orderClose(); });
ordBody.addEventListener("submit", e => { e.preventDefault(); orderSubmit(e.target); });
ordBody.addEventListener("click", e => { if (e.target.closest("#orddone")) orderClose(); });

document.addEventListener("click", e => {
  const o = e.target.closest("[data-order]");
  if (o) {
    e.preventDefault();
    orderOpen([{ id: o.dataset.order, qty: Math.max(1, +o.dataset.qty || 1) }], false, o.dataset.type);
    return;
  }
  if (e.target.closest("[data-checkout]")) {
    const items = Object.keys(CART).filter(id => { const p = cartFind(id); return p && p.stock; }).map(id => ({ id, qty: CART[id] }));
    if (!items.length) return;
    cartClose();
    orderOpen(items, true, "order");
  }
});
