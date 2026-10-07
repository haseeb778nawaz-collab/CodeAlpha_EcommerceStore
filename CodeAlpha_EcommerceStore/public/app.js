/* Kora storefront - vanilla JS single page app (hash routing) */
const $ = s => document.querySelector(s);
const view = $('#view');
const CATS = ['All', 'Audio', 'Watches', 'Bags', 'Footwear'];
const U = id => `https://unsplash.com/photos/${id}/download?w=900`;
const FREE_AT = 5000, FEE = 250;
const pkr = n => 'Rs ' + Number(n).toLocaleString('en-PK');
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let token = localStorage.getItem('token');
let user = JSON.parse(localStorage.getItem('user') || 'null');
let cart = JSON.parse(localStorage.getItem('cart') || '[]');
const state = { q: '', cat: 'All', sort: 'new' };
let cache = {};

/* ---------- api ---------- */
async function api(url, { method = 'GET', body } = {}) {
  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401 && token) logout(true);
    throw new Error(data.error || 'Something went wrong');
  }
  return data;
}

/* ---------- product visuals ---------- */
const ICONS = {
  Audio: '<path d="M22 58V48a26 26 0 0152 0v10"/><rect x="17" y="54" width="14" height="22" rx="6"/><rect x="65" y="54" width="14" height="22" rx="6"/>',
  Watches: '<circle cx="48" cy="48" r="19"/><path d="M48 37v11l8 5M40 12h16l2 17H38zM40 84h16l2-17H38z"/>',
  Bags: '<path d="M24 36h48l5 44H19z"/><path d="M36 36v-6a12 12 0 0124 0v6M36 50a12 12 0 0024 0"/>',
  Footwear: '<path d="M12 64c0-10 6-14 12-16l9-19 10 8c6 6 14 8 26 10 6 1 11 4 11 10v7H12z"/><path d="M12 70h72M40 38l5 6M48 42l5 6"/>',
  Home: '<path d="M24 36h38v24a14 14 0 01-14 14h-10a14 14 0 01-14-14z"/><path d="M62 42h6a8 8 0 010 18h-6M34 20c0 5 5 5 5 10M46 20c0 5 5 5 5 10"/>'
};
const art = (p, big) => `<div class="art ${big ? 'big' : ''}" style="--h:${p.hue ?? 150}">${p.image ? `<img src="${esc(p.image)}" alt="${esc(p.name || '')}" loading="lazy" onerror="this.remove()">` : ''}<svg viewBox="0 0 96 96" aria-hidden="true">${ICONS[p.category] || ICONS.Home}</svg></div>`;

/* ---------- ui helpers ---------- */
function toast(msg) {
  const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
  $('#toasts').append(t); setTimeout(() => t.remove(), 2600);
}
const saveCart = () => localStorage.setItem('cart', JSON.stringify(cart));

/* ---------- cart ---------- */
function addToCart(p, qty = 1) {
  const line = cart.find(i => i.id === p._id);
  const next = (line ? line.qty : 0) + qty;
  if (next > p.stock) return toast(`Only ${p.stock} in stock`);
  if (line) { line.qty = next; line.stock = p.stock; }
  else cart.push({ id: p._id, name: p.name, price: p.price, category: p.category, hue: p.hue, stock: p.stock, qty });
  saveCart(); renderCart();
  $('#cartBtn').classList.remove('bump'); void $('#cartBtn').offsetWidth; $('#cartBtn').classList.add('bump');
  toast('Added to cart');
}
const totals = () => {
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const shipping = !cart.length || subtotal >= FREE_AT ? 0 : FEE;
  return { subtotal, shipping, total: subtotal + shipping };
};
function renderCart() {
  $('#cartCount').textContent = cart.reduce((s, i) => s + i.qty, 0);
  const body = $('#cartItems'), foot = $('#cartFoot');
  if (!cart.length) {
    body.innerHTML = `<div class="empty"><h3>Your cart is empty</h3><p>Add something you like and it will show up here.</p><a class="btn" href="#/" data-close>Browse products</a></div>`;
    foot.innerHTML = ''; return;
  }
  const t = totals(), left = FREE_AT - t.subtotal;
  body.innerHTML = cart.map(i => `
    <div class="line">${art(i)}
      <div><h4>${esc(i.name)}</h4><small>${pkr(i.price)}</small>
        <div class="qty"><button data-act="dec" data-id="${i.id}" aria-label="Decrease">−</button><span>${i.qty}</span><button data-act="inc" data-id="${i.id}" aria-label="Increase">+</button></div></div>
      <div style="text-align:right"><b>${pkr(i.price * i.qty)}</b><br><button class="rm" data-act="rm" data-id="${i.id}">Remove</button></div>
    </div>`).join('');
  foot.innerHTML = `
    ${left > 0 ? `<div class="note">Add ${pkr(left)} more for free delivery</div>` : `<div class="note">You get free delivery</div>`}
    <div class="row"><span>Subtotal</span><span>${pkr(t.subtotal)}</span></div>
    <div class="row"><span>Delivery</span><span>${t.shipping ? pkr(t.shipping) : 'Free'}</span></div>
    <div class="row total"><span>Total</span><span>${pkr(t.total)}</span></div>
    <button class="primary" style="width:100%" id="goCheckout">Checkout</button>`;
}
function openCart(on) { $('#drawer').classList.toggle('on', on); $('#scrim').classList.toggle('on', on); }
$('#cartBtn').onclick = () => openCart(true);
$('#closeCart').onclick = $('#scrim').onclick = () => openCart(false);
$('#drawer').addEventListener('click', e => {
  if (e.target.closest('[data-close]')) return openCart(false);
  if (e.target.id === 'goCheckout') { openCart(false); location.hash = '#/checkout'; return; }
  const b = e.target.closest('[data-act]'); if (!b) return;
  const i = cart.find(x => x.id === b.dataset.id); if (!i) return;
  if (b.dataset.act === 'rm') cart = cart.filter(x => x !== i);
  if (b.dataset.act === 'dec') i.qty = Math.max(0, i.qty - 1);
  if (b.dataset.act === 'inc') { if (i.qty + 1 > i.stock) return toast(`Only ${i.stock} in stock`); i.qty++; }
  cart = cart.filter(x => x.qty > 0); saveCart(); renderCart();
});

/* ---------- auth ---------- */
let mode = 'login';
const dlg = $('#authDialog');
function setMode(m) {
  mode = m;
  const reg = m === 'register';
  $('#authTitle').textContent = reg ? 'Create account' : 'Log in';
  $('#authSubmit').textContent = reg ? 'Create account' : 'Log in';
  $('#nameRow').style.display = reg ? '' : 'none';
  $('#authForm').name.required = reg;
  $('#authSwitchText').textContent = reg ? 'Already have an account?' : 'New here?';
  $('#authSwitch').textContent = reg ? 'Log in' : 'Create an account';
  $('#authError').textContent = '';
}
function openAuth(m = 'login', after) { setMode(m); dlg._after = after; dlg.showModal(); }
$('#authSwitch').onclick = e => { e.preventDefault(); setMode(mode === 'login' ? 'register' : 'login'); };
$('#authClose').onclick = () => dlg.close();
$('#authForm').onsubmit = async e => {
  e.preventDefault();
  const f = e.target, btn = $('#authSubmit'); btn.disabled = true;
  try {
    const body = { email: f.email.value, password: f.password.value };
    if (mode === 'register') body.name = f.name.value;
    const data = await api('/api/auth/' + mode, { method: 'POST', body });
    token = data.token; user = data.user;
    localStorage.setItem('token', token); localStorage.setItem('user', JSON.stringify(user));
    dlg.close(); f.reset(); renderNav();
    toast(`Welcome, ${user.name.split(' ')[0]}`);
    dlg._after ? dlg._after() : route();
  } catch (err) { $('#authError').textContent = err.message; }
  btn.disabled = false;
};
function logout(silent) {
  token = null; user = null; localStorage.removeItem('token'); localStorage.removeItem('user');
  renderNav(); if (!silent) toast('Logged out');
  if (location.hash === '#/orders') location.hash = '#/'; else route();
}
function renderNav() {
  const b = $('#accountBtn');
  b.textContent = user ? `${user.name.split(' ')[0]} (Log out)` : 'Log in';
  b.onclick = () => user ? logout() : openAuth('login');
}

/* ---------- views ---------- */
const stars = r => `<span title="${r} out of 5" style="color:#9a6a00;font-weight:500">★ ${r}</span>`;

function card(p) {
  const sale = p.oldPrice > p.price, out = p.stock < 1;
  return `<article class="card">
    <a class="cover" href="#/product/${p._id}" style="position:relative;display:block">
      ${art(p)}${out ? '<span class="tag out">Sold out</span>' : sale ? `<span class="tag">Save ${Math.round((1 - p.price / p.oldPrice) * 100)}%</span>` : ''}
    </a>
    <div class="info">
      <span class="cat">${esc(p.category)} &nbsp;${stars(p.rating)}</span>
      <h3><a href="#/product/${p._id}" style="text-decoration:none">${esc(p.name)}</a></h3>
      <div class="price"><b>${pkr(p.price)}</b>${sale ? `<s>${pkr(p.oldPrice)}</s>` : ''}</div>
    </div>
    <button class="add" data-add="${p._id}" ${out ? 'disabled' : ''}>${out ? 'Sold out' : 'Add to cart'}</button>
  </article>`;
}

async function home() {
  view.innerHTML = `
    <section class="hero">
      <div>
        <h1>Things worth keeping.</h1>
        <p>Watches, bags, headphones and home pieces chosen for how long they last, not how loud they look.</p>
        <a class="btn" href="#shop" id="shopNow">Shop the collection</a>
      </div>
      <div class="hero-art">${art({ category: 'Bags', hue: 25, image: U('FWLs1ZoPiAE') })}${art({ category: 'Watches', hue: 38, image: U('pNKr3rUqM6U') })}${art({ category: 'Audio', hue: 40, image: U('6zqd6092B1c') })}</div>
    </section>
    <section id="shop">
      <div class="toolbar">
        <div class="chips">${CATS.map(c => `<button class="chip ${c === state.cat ? 'on' : ''}" data-cat="${c}">${c}</button>`).join('')}</div>
        <select id="sort" aria-label="Sort products">
          ${[['new', 'Newest'], ['low', 'Price: low to high'], ['high', 'Price: high to low'], ['rating', 'Top rated']].map(([v, l]) => `<option value="${v}" ${state.sort === v ? 'selected' : ''}>${l}</option>`).join('')}
        </select>
      </div>
      <p class="count" id="count"></p>
      <div class="grid" id="grid">${'<div class="skel"></div>'.repeat(8)}</div>
    </section>`;
  $('#shopNow').onclick = e => { e.preventDefault(); $('#shop').scrollIntoView({ behavior: 'smooth' }); };
  await loadGrid();
}
async function loadGrid() {
  const qs = new URLSearchParams({ search: state.q, category: state.cat, sort: state.sort });
  try {
    const list = await api('/api/products?' + qs);
    list.forEach(p => cache[p._id] = p);
    $('#count').textContent = state.q ? `${list.length} result${list.length === 1 ? '' : 's'} for "${state.q}"` : `${list.length} product${list.length === 1 ? '' : 's'}`;
    $('#grid').innerHTML = list.length ? list.map(card).join('')
      : `<div class="empty" style="grid-column:1/-1"><h3>Nothing matches that</h3><p>Try a different word or clear the category filter.</p></div>`;
  } catch (e) { $('#grid').innerHTML = `<div class="empty" style="grid-column:1/-1"><h3>Could not load products</h3><p>${esc(e.message)}</p></div>`; }
}

async function productPage(id) {
  view.innerHTML = '<div class="skel" style="height:420px"></div>';
  try {
    const p = await api('/api/products/' + id); cache[p._id] = p;
    const sale = p.oldPrice > p.price; let qty = 1;
    view.innerHTML = `
      <p class="crumbs"><a href="#/">Shop</a> / <a href="#/" data-cat-link="${p.category}">${esc(p.category)}</a> / ${esc(p.name)}</p>
      <div class="detail">
        ${art(p, true)}
        <div>
          <span class="cat">${esc(p.category)} &nbsp;${stars(p.rating)}</span>
          <h1>${esc(p.name)}</h1>
          <div class="price"><b>${pkr(p.price)}</b>${sale ? `<s>${pkr(p.oldPrice)}</s>` : ''}</div>
          <p class="lead" style="margin-top:14px">${esc(p.description)}</p>
          <ul>${(p.features || []).map(f => `<li>${esc(f)}</li>`).join('')}</ul>
          <div class="buyrow">
            <div class="qty"><button id="dq" aria-label="Decrease">−</button><span id="q">1</span><button id="iq" aria-label="Increase">+</button></div>
            <button class="primary" id="addBtn" ${p.stock < 1 ? 'disabled' : ''}>${p.stock < 1 ? 'Sold out' : 'Add to cart'}</button>
          </div>
          <p class="stock ${p.stock <= 10 ? 'low' : ''}">${p.stock < 1 ? 'Currently unavailable' : p.stock <= 10 ? `Only ${p.stock} left` : 'In stock, ships in 1 to 2 days'}</p>
        </div>
      </div>`;
    $('#dq').onclick = () => { qty = Math.max(1, qty - 1); $('#q').textContent = qty; };
    $('#iq').onclick = () => { qty = Math.min(p.stock, qty + 1); $('#q').textContent = qty; };
    $('#addBtn').onclick = () => addToCart(p, qty);
    document.querySelector('[data-cat-link]').onclick = () => { state.cat = p.category; };
  } catch (e) { view.innerHTML = `<div class="empty"><h3>Product not found</h3><p>${esc(e.message)}</p><a class="btn" href="#/">Back to shop</a></div>`; }
}

function checkout() {
  if (!cart.length) { view.innerHTML = `<div class="empty"><h3>Your cart is empty</h3><p>Add something before checking out.</p><a class="btn" href="#/">Browse products</a></div>`; return; }
  if (!user) { view.innerHTML = `<div class="empty"><h3>Log in to place your order</h3><p>Your cart is saved. It only takes a moment to sign in.</p><button class="btn" id="loginNow" style="border:0;cursor:pointer">Log in or sign up</button></div>`;
    $('#loginNow').onclick = () => openAuth('login', route); return; }
  const t = totals();
  view.innerHTML = `
    <h1 class="page-title">Checkout</h1>
    <div class="checkout">
      <form class="panel" id="orderForm">
        <h2>Delivery details</h2>
        <div class="two">
          <label class="field">Full name<input name="fullName" required value="${esc(user.name)}"></label>
          <label class="field">Phone<input name="phone" required placeholder="03XX XXXXXXX" inputmode="tel"></label>
        </div>
        <label class="field">Address<input name="line" required placeholder="House, street, area"></label>
        <label class="field">City<input name="city" required placeholder="Islamabad"></label>
        <div class="cod"><span>Payment: Cash on delivery</span></div>
        <p class="error" id="orderError" role="alert"></p>
        <button class="primary" style="width:100%" id="placeBtn">Place order, ${pkr(t.total)}</button>
      </form>
      <aside class="panel">
        <h2>Order summary</h2>
        ${cart.map(i => `<div class="sumline"><span>${esc(i.name)} × ${i.qty}</span><span>${pkr(i.price * i.qty)}</span></div>`).join('')}
        <hr style="border:0;border-top:1px solid var(--line);margin:10px 0">
        <div class="sumline"><span>Subtotal</span><span>${pkr(t.subtotal)}</span></div>
        <div class="sumline"><span>Delivery</span><span>${t.shipping ? pkr(t.shipping) : 'Free'}</span></div>
        <div class="row total" style="margin-top:12px"><span>Total</span><span>${pkr(t.total)}</span></div>
      </aside>
    </div>`;
  $('#orderForm').onsubmit = async e => {
    e.preventDefault(); const f = e.target, btn = $('#placeBtn'); btn.disabled = true; btn.textContent = 'Placing order...';
    try {
      const order = await api('/api/orders', { method: 'POST', body: {
        items: cart.map(i => ({ id: i.id, qty: i.qty })),
        address: { fullName: f.fullName.value, phone: f.phone.value, line: f.line.value, city: f.city.value } } });
      cart = []; saveCart(); renderCart(); success(order);
    } catch (err) { $('#orderError').textContent = err.message; btn.disabled = false; btn.textContent = `Place order, ${pkr(t.total)}`; }
  };
}
function success(o) {
  window.scrollTo(0, 0);
  view.innerHTML = `<div class="success"><div class="tick">✓</div><h1>Order placed</h1>
    <p style="color:var(--muted)">Thanks, ${esc(o.address.fullName)}. Your order <b>#${o._id.slice(-6).toUpperCase()}</b> is confirmed and will reach ${esc(o.address.city)} in 3 to 5 days. Keep ${pkr(o.total)} ready for the rider.</p>
    <div style="display:flex;gap:12px;justify-content:center;margin-top:26px;flex-wrap:wrap"><a class="btn" href="#/orders">View my orders</a><a class="secondary" style="text-decoration:none" href="#/">Keep shopping</a></div></div>`;
}

async function orders() {
  if (!user) { view.innerHTML = `<div class="empty"><h3>Log in to see your orders</h3><button class="btn" id="loginNow" style="border:0;cursor:pointer">Log in</button></div>`; $('#loginNow').onclick = () => openAuth('login', route); return; }
  view.innerHTML = `<h1 class="page-title">My orders</h1><div id="ol"><div class="skel" style="height:140px"></div></div>`;
  try {
    const list = await api('/api/orders');
    $('#ol').innerHTML = list.length ? list.map(o => `
      <div class="order">
        <div class="order-head"><div><b>Order #${o._id.slice(-6).toUpperCase()}</b><br><small style="color:var(--muted)">${new Date(o.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</small></div><span class="status">${esc(o.status)}</span></div>
        ${o.items.map(i => `<div class="sumline"><span>${esc(i.name)} × ${i.qty}</span><span>${pkr(i.price * i.qty)}</span></div>`).join('')}
        <div class="sumline" style="border-top:1px solid var(--line);margin-top:8px;padding-top:12px"><b>Total</b><b>${pkr(o.total)}</b></div>
        <small style="color:var(--muted)">Delivering to ${esc(o.address.line)}, ${esc(o.address.city)}</small>
      </div>`).join('')
      : `<div class="empty"><h3>No orders yet</h3><p>When you place an order it will appear here.</p><a class="btn" href="#/">Start shopping</a></div>`;
  } catch (e) { $('#ol').innerHTML = `<div class="empty"><h3>Could not load orders</h3><p>${esc(e.message)}</p></div>`; }
}

/* ---------- events + router ---------- */
view.addEventListener('click', e => {
  const add = e.target.closest('[data-add]');
  if (add) { const p = cache[add.dataset.add]; if (p) addToCart(p); return; }
  const chip = e.target.closest('[data-cat]');
  if (chip) { state.cat = chip.dataset.cat; document.querySelectorAll('.chip').forEach(c => c.classList.toggle('on', c === chip)); loadGrid(); }
});
view.addEventListener('change', e => { if (e.target.id === 'sort') { state.sort = e.target.value; loadGrid(); } });

let timer;
$('#search').addEventListener('input', e => {
  clearTimeout(timer);
  timer = setTimeout(() => {
    state.q = e.target.value.trim();
    if (location.hash && location.hash !== '#/' ) location.hash = '#/'; else home();
  }, 300);
});

function route() {
  const h = location.hash || '#/';
  window.scrollTo(0, 0);
  if (h.startsWith('#/product/')) return productPage(h.split('/')[2]);
  if (h === '#/checkout') return checkout();
  if (h === '#/orders') return orders();
  home();
}
window.addEventListener('hashchange', route);
renderNav(); renderCart(); route();
