/* ====== EDIT HERE: your products, prices and contact ====== */
const WHATSAPP = "8801XXXXXXXXX"; // country code + number, no + or spaces
const PRODUCTS = [
  {id:"cassette-speaker", name:"Cassette Bluetooth Speaker", cat:"Audio", price:2490, old:2990, icon:"📼", badge:"Bestseller", stock:true,
   desc:"Tape-deck looks, Bluetooth 5.3, 8-hour battery.",
   long:"A pocket-sized speaker styled like a classic cassette player. Loud, clear sound with a warm retro finish that looks great on any desk or shelf.",
   features:["Bluetooth 5.3 with a stable 10 m range","8-hour playtime, USB-C charging","Built-in mic for hands-free calls","MicroSD card slot and AUX input"],
   specs:[["Battery","1200 mAh"],["Output","5 W"],["Connectivity","Bluetooth 5.3, AUX, microSD"],["Charging","USB-C, about 2 hours"],["Warranty","6 months"]]},
  {id:"retro-keyboard", name:"Retro Mechanical Keyboard", cat:"Desk setup", price:4590, old:null, icon:"⌨️", badge:"", stock:true,
   desc:"Hot-swappable switches, cream and pastel keycaps.",
   long:"A compact mechanical keyboard with round retro keycaps and a satisfying typing feel. Swap switches without soldering to make it yours.",
   features:["Hot-swappable switches","Wired USB-C and Bluetooth modes","Cream and pastel keycaps","RGB backlight with 10 effects"],
   specs:[["Layout","75%, 84 keys"],["Switches","Linear (swappable)"],["Connectivity","USB-C, Bluetooth 5.0"],["Battery","2000 mAh"],["Warranty","6 months"]]},
  {id:"pixel-clock", name:"Pixel LED Desk Clock", cat:"Desk setup", price:1650, old:1950, icon:"🕹️", badge:"New", stock:true,
   desc:"8-bit pixel display with alarm and temperature.",
   long:"A tiny desk clock with a glowing pixel-art display. Shows time, date and temperature, and wakes you up with a retro alarm tune.",
   features:["8-bit style LED display","Alarm, date and temperature","Adjustable brightness","USB powered, no battery needed"],
   specs:[["Display","Pixel LED matrix"],["Power","5 V USB"],["Size","About 12 x 5 cm"],["Warranty","3 months"]]},
  {id:"retro-gamepad", name:"Retro Gamepad (USB/BT)", cat:"Gaming", price:1890, old:null, icon:"🎮", badge:"", stock:true,
   desc:"Classic console layout for PC, Android and TV box.",
   long:"A wireless gamepad with the classic console layout. Works with PC, Android phones and TV boxes, so you can play your favorite old-school games anywhere.",
   features:["USB and Bluetooth connection","Works with PC, Android and TV box","Comfortable classic D-pad","Rechargeable battery"],
   specs:[["Connectivity","USB, Bluetooth 4.0"],["Battery","600 mAh"],["Compatibility","Windows, Android, TV box"],["Warranty","3 months"]]},
  {id:"braided-usbc", name:"Braided USB-C Cable 1.2m", cat:"Accessories", price:490, old:650, icon:"🔌", badge:"", stock:true,
   desc:"Fast charge, cloth braid, color-matched tips.",
   long:"A tough cloth-braided USB-C cable that resists tangles and fraying, with color-matched connector tips for a retro look.",
   features:["Up to 60 W fast charging","Tangle-free cloth braid","Data transfer up to 480 Mbps","Reinforced connector ends"],
   specs:[["Length","1.2 m"],["Power","Up to 60 W"],["Connector","USB-C to USB-C"],["Warranty","3 months"]]},
  {id:"magnetic-stand", name:"Magnetic Phone Stand", cat:"Accessories", price:790, old:null, icon:"📱", badge:"", stock:true,
   desc:"Foldable aluminum stand with a retro finish.",
   long:"A foldable aluminum stand that holds your phone at a comfortable angle on any desk. Folds flat to slip into a bag.",
   features:["Strong magnetic hold","Foldable and portable","Non-slip silicone base","Adjustable viewing angle"],
   specs:[["Material","Aluminum alloy"],["Fits","Phones up to 7 inches"],["Weight","About 150 g"],["Warranty","3 months"]]},
  {id:"neon-strip", name:"Neon Light Strip 2m", cat:"Desk setup", price:1190, old:1490, icon:"💡", badge:"Sale", stock:true,
   desc:"USB powered, synthwave color modes and remote.",
   long:"A 2-meter LED strip with vivid neon colors and preset scenes. Stick it behind your monitor or along a shelf to light up your room.",
   features:["16 colors and 4 modes","Remote control included","USB powered, plug into any adapter","Adhesive back, easy to cut and stick"],
   specs:[["Length","2 m"],["Power","5 V USB"],["Control","IR remote"],["Warranty","3 months"]]},
  {id:"retro-handset", name:"Retro Handset for Phone", cat:"Audio", price:990, old:null, icon:"☎️", badge:"New", stock:false,
   desc:"Old-school telephone handset for 3.5mm / USB-C.",
   long:"A classic telephone handset that plugs into your phone. Enjoy calls the old-school way with clear sound and a fun vintage look.",
   features:["3.5 mm and USB-C adapter","Clear speaker and mic","Coiled cord","Great as a gift"],
   specs:[["Connector","3.5 mm (USB-C adapter included)"],["Cord","Coiled, about 1 m"],["Warranty","3 months"]]}
];
/* ========================================================= */

const fmt = n => "৳" + n.toLocaleString("en-IN");
function waLink(text){ return "https://wa.me/" + WHATSAPP + "?text=" + encodeURIComponent(text); }
function cardHTML(p){
  return `<article class="card">${p.badge ? `<span class="badge">${p.badge}</span>` : ""}
    <div class="ico" aria-hidden="true">${p.icon}</div>
    <h3><a class="stretch" href="product.html?id=${p.id}">${p.name}</a></h3>
    <p>${p.desc}</p>
    <div class="price"><b>${fmt(p.price)}</b>${p.old ? `<s>${fmt(p.old)}</s>` : ""}</div>
    <a class="btn" href="${waLink("Hi! I want to order: " + p.name + " (" + fmt(p.price) + ")")}" target="_blank" rel="noopener">Order on WhatsApp</a>
  </article>`;
}
