require('dotenv').config();
const dns = require('dns');
if (!process.env.VERCEL) dns.setServers(['8.8.8.8', '1.1.1.1']);
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const FREE_SHIPPING_AT = 5000, SHIPPING_FEE = 250;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

/* ---------- Models ---------- */
const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true }
}, { timestamps: true }));

const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({
  name: String, category: String, price: Number, oldPrice: Number,
  stock: Number, rating: Number, hue: Number, description: String,
  features: [String], image: String
}, { timestamps: true }));

const Order = mongoose.models.Order || mongoose.model('Order', new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [{ product: mongoose.Schema.Types.ObjectId, name: String, category: String, hue: Number, price: Number, qty: Number }],
  subtotal: Number, shipping: Number, total: Number,
  address: { fullName: String, phone: String, line: String, city: String },
  status: { type: String, default: 'Placed' }
}, { timestamps: true }));

/* ---------- Seed data ---------- */
const photo = id => `https://unsplash.com/photos/${id}/download?w=900`;
const seed = [
  ['Aria Gold Wireless Headphones', 'Audio', 12999, 15999, 14, 4.7, 40, 'Over-ear Bluetooth headphones in a warm gold finish, with soft cushions and a battery that lasts a full work week.', ['40-hour battery', 'Active noise reduction', 'USB-C fast charge'], '6zqd6092B1c'],
  ['Studio Pro Headphones', 'Audio', 14500, 16900, 9, 4.6, 220, 'Deep bass and a clear mid-range in a sturdy folding design. Made for long listening sessions.', ['Folding headband', 'Built-in microphone', '30-hour battery'], '5lJhMXg_zHk'],
  ['Pocket Buds Mini', 'Audio', 5499, 0, 30, 4.4, 210, 'Compact true-wireless earbuds with a pocket-sized charging case.', ['8-hour playback', 'IPX4 splash proof', 'Pairs with two devices'], '5ba6j8d_oXY'],
  ['Meridian Steel Chronograph', 'Watches', 18500, 21000, 7, 4.8, 215, 'Brushed steel case and a clean dial that works with a suit or a t-shirt.', ['Water resistant to 50m', 'Japanese quartz movement', '2-year warranty'], 'z6lNa2jYaVw'],
  ['Auric Two-Tone Watch', 'Watches', 24900, 0, 5, 4.9, 38, 'A gold and silver dress watch with a sunburst dial. Quietly formal.', ['Sapphire-coated glass', 'Two-tone steel strap', 'Date window'], 'pNKr3rUqM6U'],
  ['Courier Leather Bag', 'Bags', 15200, 17500, 6, 4.9, 25, 'Brown leather bag with room for a laptop, a notebook and lunch.', ['Full-grain leather', 'Fits 14" laptop', 'Brass hardware'], 'FWLs1ZoPiAE'],
  ['Explorer Leather Backpack', 'Bags', 13800, 0, 12, 4.7, 30, 'Leather and canvas backpack that looks better the more you use it.', ['Leather and canvas', 'Padded laptop sleeve', 'Roll-top closure'], 'BmH09wAkJa8'],
  ['Mini Sling Bag', 'Bags', 4900, 5800, 28, 4.3, 22, 'Small leather sling for your phone, cards and keys. Nothing more.', ['Real leather', 'Adjustable strap', 'Zip closure'], 'e76DU9wQaCI'],
  ['Everyday Handbag', 'Bags', 9600, 0, 15, 4.5, 28, 'Two-tone leather handbag with a roomy inside and a firm base.', ['Structured shape', 'Inner zip pocket', 'Detachable strap'], 'R_u0B2HY4Qs'],
  ['Stride Everyday Sneakers', 'Footwear', 8900, 10500, 20, 4.6, 150, 'Lightweight grey sneakers with a cushioned sole made for long walking days.', ['Breathable upper', 'Cushioned insole', 'Sizes 39 to 45'], 'jKZ8qO6juik'],
  ['Court White Low-Tops', 'Footwear', 9800, 0, 18, 4.7, 200, 'Clean white low-tops that go with almost everything you own.', ['Leather upper', 'Rubber cupsole', 'Sizes 39 to 45'], 'bySPt2lySzg'],
  ['Street Canvas Sneakers', 'Footwear', 6400, 7500, 26, 4.4, 170, 'Classic canvas sneakers, easy to wear and easy to wash.', ['Canvas upper', 'Vulcanised sole', 'Sizes 38 to 44'], 'QrgRNPSku4c'],
  ['Sprint Run Trainers', 'Footwear', 11900, 0, 10, 4.6, 18, 'White and orange running trainers with a springy midsole and light mesh upper.', ['Breathable mesh', 'Responsive midsole', 'Reflective detail'], 'dwKiHoqqxk8']
].map(([name, category, price, oldPrice, stock, rating, hue, description, features, id]) => ({ name, category, price, oldPrice, stock, rating, hue, description, features, image: photo(id) }));

/* ---------- DB connection (lazy: works locally and on Vercel) ---------- */
let ready = null;
function connectDB() {
  if (!ready) {
    ready = (async () => {
      await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/kora_store', { serverSelectionTimeoutMS: 8000 });
      const needsSeed = process.env.RESEED === 'true' || !(await Product.exists({ image: { $exists: true, $ne: '' } }));
      if (needsSeed) { await Product.deleteMany({}); await Product.insertMany(seed); console.log('Seeded', seed.length, 'products'); }
      console.log('MongoDB connected');
    })().catch(e => { ready = null; throw e; });
  }
  return ready;
}
app.use('/api', (req, res, next) => connectDB().then(() => next()).catch(next));

/* ---------- Helpers ---------- */
const wrap = fn => (req, res, next) => fn(req, res, next).catch(next);
const sign = u => jwt.sign({ id: u._id }, SECRET, { expiresIn: '7d' });
const publicUser = u => ({ id: u._id, name: u.name, email: u.email });

function auth(req, res, next) {
  const h = req.headers.authorization || '';
  try {
    req.userId = jwt.verify(h.replace('Bearer ', ''), SECRET).id;
    next();
  } catch { res.status(401).json({ error: 'Please log in to continue' }); }
}

/* ---------- Auth ---------- */
app.post('/api/auth/register', wrap(async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password are required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (await User.findOne({ email: email.toLowerCase() })) return res.status(409).json({ error: 'This email is already registered' });
  const user = await User.create({ name, email, password: await bcrypt.hash(password, 10) });
  res.status(201).json({ token: sign(user), user: publicUser(user) });
}));

app.post('/api/auth/login', wrap(async (req, res) => {
  const user = await User.findOne({ email: (req.body.email || '').toLowerCase() });
  if (!user || !(await bcrypt.compare(req.body.password || '', user.password)))
    return res.status(401).json({ error: 'Email or password is incorrect' });
  res.json({ token: sign(user), user: publicUser(user) });
}));

/* ---------- Products ---------- */
app.get('/api/products', wrap(async (req, res) => {
  const { search, category, sort } = req.query;
  const filter = {};
  if (category && category !== 'All') filter.category = category;
  if (search) filter.name = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const sorts = { low: { price: 1 }, high: { price: -1 }, rating: { rating: -1 }, new: { createdAt: -1 } };
  res.json(await Product.find(filter).sort(sorts[sort] || sorts.new));
}));

app.get('/api/products/:id', wrap(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(404).json({ error: 'Product not found' });
  const p = await Product.findById(req.params.id);
  p ? res.json(p) : res.status(404).json({ error: 'Product not found' });
}));

/* ---------- Orders ---------- */
app.post('/api/orders', auth, wrap(async (req, res) => {
  const { items, address } = req.body;
  if (!Array.isArray(items) || !items.length) return res.status(400).json({ error: 'Your cart is empty' });
  if (!address || !address.fullName || !address.phone || !address.line || !address.city)
    return res.status(400).json({ error: 'Please fill in all delivery details' });

  const reserved = [], lines = [];
  try {
    for (const it of items) {
      const qty = Math.max(1, parseInt(it.qty, 10) || 1);
      // atomic: only decrement when enough stock remains
      const p = await Product.findOneAndUpdate({ _id: it.id, stock: { $gte: qty } }, { $inc: { stock: -qty } });
      if (!p) {
        const cur = mongoose.isValidObjectId(it.id) ? await Product.findById(it.id) : null;
        throw new Error(cur ? `Only ${cur.stock} left of ${cur.name}` : 'A product in your cart no longer exists');
      }
      reserved.push({ id: p._id, qty });
      lines.push({ product: p._id, name: p.name, category: p.category, hue: p.hue, price: p.price, qty });
    }
  } catch (e) {
    for (const r of reserved) await Product.updateOne({ _id: r.id }, { $inc: { stock: r.qty } });
    return res.status(400).json({ error: e.message });
  }
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const shipping = subtotal >= FREE_SHIPPING_AT ? 0 : SHIPPING_FEE;
  const order = await Order.create({ user: req.userId, items: lines, subtotal, shipping, total: subtotal + shipping, address });
  res.status(201).json(order);
}));

app.get('/api/orders', auth, wrap(async (req, res) => {
  res.json(await Order.find({ user: req.userId }).sort({ createdAt: -1 }));
}));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Server error, please try again' }); });

/* ---------- Start (local) / export (Vercel) ---------- */
if (require.main === module) {
  const port = process.env.PORT || 3000;
  connectDB()
    .then(() => app.listen(port, () => console.log(`Kora store running at http://localhost:${port}`)))
    .catch(e => { console.error('Could not start server:', e.message); process.exit(1); });
}
module.exports = app;
