const cats = ["All", ...new Set(PRODUCTS.map(p => p.cat))];
let active = "All", query = "";
const $ = id => document.getElementById(id);

function render(){
  const list = PRODUCTS.filter(p => (active === "All" || p.cat === active) && (p.name + " " + p.desc).toLowerCase().includes(query));
  $("grid").innerHTML = list.length ? list.map(cardHTML).join("") : `<div class="empty">No products found.</div>`;
}
function chips(){
  $("chips").innerHTML = cats.map(c => `<button class="chip" aria-pressed="${c === active}" data-c="${c}">${c}</button>`).join("");
  $("chips").onclick = e => { const c = e.target.dataset.c; if(!c) return; active = c; chips(); render(); };
}
$("q").oninput = e => { query = e.target.value.toLowerCase().trim(); render(); };
chips(); render();
