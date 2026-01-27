import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const PORT = process.env.PORT || 4001;
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const MONGO_URL =
  process.env.DATABASE_URL || "mongodb+srv://bhupeegayu24_db_user:bhupesh@pos.puixxoi.mongodb.net/?appName=POS";

// --- Mongoose connection ---
await mongoose.connect(MONGO_URL, { autoIndex: true });

// --- Schemas ---
const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    passwordHash: String,
    role: { type: String, default: "MANAGER" },
  },
  { timestamps: true }
);

const productSchema = new mongoose.Schema(
  {
    name: String,
    category: String,
    price: Number,
    stock: { type: Number, default: 0 },
    sku: { type: String, unique: true, sparse: true },
    barcode: { type: String, unique: true, sparse: true },
    cost: { type: Number, default: 0 },
    gstRateBps: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, unique: true },
  },
  { timestamps: true }
);

const customerSchema = new mongoose.Schema(
  {
    name: String,
    phone: String,
    email: String,
    address: String,
  },
  { timestamps: true }
);

const orderSchema = new mongoose.Schema(
  {
    invoiceNo: String,
    status: { type: String, default: "PAID" }, // PAID | PENDING | CANCELLED
    paymentType: { type: String, default: "CASH" }, // CASH | CARD | ONLINE
    taxRateBps: { type: Number, default: 0 },
    subtotal: Number,
    taxAmount: Number,
    total: Number,
    items: [
      {
        productId: String,
        name: String,
        qty: Number,
        price: Number,
        lineTotal: Number,
      },
    ],
    customerId: String,
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
const Product = mongoose.model("Product", productSchema);
const Customer = mongoose.model("Customer", customerSchema);
const Order = mongoose.model("Order", orderSchema);
const Category = mongoose.model("Category", categorySchema);

// Internal accounting ledger
const ledgerEntrySchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["SALE", "TAX", "COGS", "ADJUSTMENT"], required: true },
    orderId: { type: String, default: "" },
    invoiceNo: { type: String, default: "" },
    amount: { type: Number, default: 0 },
    customerId: { type: String, default: "" },
    paymentType: { type: String, default: "CASH" },
  },
  { timestamps: true }
);
const LedgerEntry = mongoose.model("LedgerEntry", ledgerEntrySchema);

const settingsSchema = new mongoose.Schema(
  {
    companyName: { type: String, default: "My Awesome POS" },
    address: { type: String, default: "" },
    phone: { type: String, default: "" },
    email: { type: String, default: "" },
    taxRateBps: { type: Number, default: 1800 },
    currency: { type: String, default: "INR" },
    terms: { type: String, default: "" },
    // Integration fields removed to keep platform fully unified
  },
  { timestamps: true }
);
const Settings = mongoose.model("Settings", settingsSchema);

// --- App setup ---
const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// --- Auth middleware ---
function auth(req, res, next) {
  const header = req.headers.authorization || "";
  const [, token] = header.split(" ");
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Unauthorized" });
  }
}

// --- Seed minimal admin if missing ---
async function ensureAdmin() {
  const adminEmail = "admin@example.com";
  const exists = await User.findOne({ email: adminEmail });
  if (!exists) {
    const passwordHash = await bcrypt.hash("admin123", 10);
    await User.create({
      name: "Admin User",
      email: adminEmail,
      passwordHash,
      role: "MANAGER",
    });
    console.log("Seeded admin: admin@example.com / admin123");
  }
}
await ensureAdmin();

// --- Routes ---
app.get("/health", (_req, res) => res.json({ ok: true }));

// Auth
app.post("/api/auth/signup", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: "Missing fields" });
  const exists = await User.findOne({ email });
  if (exists) return res.status(409).json({ error: "Email exists" });
  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash });
  const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ error: "Invalid credentials" });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ error: "Invalid credentials" });
  const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
  res.json({ token, user: { id: user.id, name: user.name, email: user.email, role: user.role } });
});

app.get("/api/auth/me", auth, async (req, res) => {
  const user = await User.findById(req.user.sub).lean();
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  res.json({ user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

app.get("/api/users", auth, async (req, res) => {
  if (req.user.role !== "MANAGER") return res.status(403).json({ error: "Forbidden" });
  const users = await User.find().select("-passwordHash").lean();
  res.json({ users });
});

// Categories
app.get("/api/categories", auth, async (_req, res) => {
  const categories = await Category.find().sort({ name: 1 }).lean();
  res.json({ categories });
});

app.post("/api/categories", auth, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Missing name" });
  try {
    const c = await Category.create({ name });
    res.status(201).json({ category: c });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: "Category exists" });
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/categories/:id", auth, async (req, res) => {
  await Category.findByIdAndDelete(req.params.id);
  res.status(204).end();
});

// Products
app.get("/api/products", auth, async (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  const category = req.query.category || "All";
  const products = await Product.find({ active: true }).lean();
  const filtered = products
    .filter((p) => {
      const qLower = q.toLowerCase();
      const matchQ =
        p.name.toLowerCase().includes(qLower) ||
        (p.sku && p.sku.toLowerCase().includes(qLower)) ||
        (p.barcode && p.barcode.includes(qLower));
      const matchCat = category === "All" || p.category === category;
      return matchQ && matchCat;
    })
    .map((p) => ({
      id: p._id,
      name: p.name,
      category: p.category || "Uncategorized",
      price: p.price,
      stock: p.stock,
      sku: p.sku || "",
      barcode: p.barcode || "",
      cost: p.cost || 0,
      gstRateBps: p.gstRateBps || 0,
      status: p.stock <= 0 ? "Out of Stock" : p.stock <= 10 ? "Low Stock" : "In Stock",
    }));
  res.json({ products: filtered });
});

app.post("/api/products", auth, async (req, res) => {
  const { name, category, price, stock = 0, sku, barcode, cost = 0, gstRateBps = 0 } = req.body;
  if (!name || price == null) return res.status(400).json({ error: "Missing fields" });
  try {
    const p = await Product.create({ name, category, price, stock, sku, barcode, cost, gstRateBps });
    res.status(201).json({
      product: {
        id: p._id,
        name: p.name,
        category: p.category,
        price: p.price,
        stock: p.stock,
        sku: p.sku,
        barcode: p.barcode,
        cost: p.cost,
        gstRateBps: p.gstRateBps,
        status: p.stock <= 0 ? "Out of Stock" : p.stock <= 10 ? "Low Stock" : "In Stock",
      },
    });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: "SKU or Barcode exists" });
    res.status(500).json({ error: "Server error" });
  }
});

app.put("/api/products/:id", auth, async (req, res) => {
  const { id } = req.params;
  const { name, category, price, stock, active, cost, gstRateBps, sku, barcode } = req.body;
  try {
    const updateFields = {};
    if (name != null) updateFields.name = name;
    if (category != null) updateFields.category = category;
    if (price != null) updateFields.price = price;
    if (stock != null) updateFields.stock = stock;
    if (active != null) updateFields.active = active;
    if (cost != null) updateFields.cost = cost;
    if (gstRateBps != null) updateFields.gstRateBps = gstRateBps;
    if (sku != null) updateFields.sku = sku;
    if (barcode != null) updateFields.barcode = barcode;
    
    const updated = await Product.findByIdAndUpdate(
      id,
      updateFields,
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ error: "Not found" });
    res.json({ product: updated });
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ error: "SKU or Barcode already exists" });
    res.status(500).json({ error: "Server error" });
  }
});

app.delete("/api/products/:id", auth, async (req, res) => {
  const { id } = req.params;
  await Product.findByIdAndUpdate(id, { active: false });
  res.status(204).end();
});

// Inventory: low stock list
app.get("/api/inventory/low-stock", auth, async (req, res) => {
  const threshold = Number(req.query.threshold || 5);
  const products = await Product.find({ stock: { $lte: threshold }, active: true })
    .select("name sku stock price cost category")
    .lean();
  res.json({ threshold, products });
});

// Inventory: manual adjustment
app.post("/api/inventory/adjust", auth, async (req, res) => {
  const { productId, delta, reason } = req.body;
  if (!productId || !Number.isFinite(Number(delta))) return res.status(400).json({ error: "productId and numeric delta required" });
  const p = await Product.findById(productId);
  if (!p) return res.status(404).json({ error: "Product not found" });
  p.stock = (p.stock || 0) + Number(delta);
  await p.save();
  await LedgerEntry.create({ type: "ADJUSTMENT", amount: 0, meta: { productId, name: p.name, delta: Number(delta), reason: reason || "manual" } });
  res.json({ success: true, product: { id: p._id, name: p.name, stock: p.stock } });
});

// Customers
app.get("/api/customers", auth, async (req, res) => {
  const q = (req.query.q || "").toLowerCase();
  const customers = await Customer.find().lean();
  const filtered = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(q) ||
      (c.phone || "").includes(q) ||
      (c.email || "").toLowerCase().includes(q)
  );
  
  // Calculate stats for each customer from orders
  const customerIds = filtered.map(c => String(c._id));
  const orders = await Order.find({ customerId: { $in: customerIds } }).lean();
  
  const customerStats = {};
  for (const order of orders) {
    const cid = String(order.customerId);
    if (!customerStats[cid]) {
      customerStats[cid] = { totalVisits: 0, totalSpent: 0, lastVisit: null };
    }
    customerStats[cid].totalVisits += 1;
    customerStats[cid].totalSpent += (order.total || 0);
    const orderDate = new Date(order.createdAt);
    if (!customerStats[cid].lastVisit || orderDate > customerStats[cid].lastVisit) {
      customerStats[cid].lastVisit = orderDate;
    }
  }
  
  res.json({
    customers: filtered.map((c) => {
      const cid = String(c._id);
      const stats = customerStats[cid] || { totalVisits: 0, totalSpent: 0, lastVisit: null };
      return {
        id: c._id,
        name: c.name,
        phone: c.phone || "",
        email: c.email || "",
        address: c.address || "",
        totalVisits: stats.totalVisits,
        totalSpent: stats.totalSpent,
        lastVisit: stats.lastVisit ? stats.lastVisit.toISOString() : "",
      };
    }),
  });
});

app.post("/api/customers", auth, async (req, res) => {
  const { name, phone, email, address } = req.body;
  if (!name) return res.status(400).json({ error: "Missing name" });
  const c = await Customer.create({ name, phone, email, address });
  res.status(201).json({ customer: { id: c._id } });
});

app.put("/api/customers/:id", auth, async (req, res) => {
  const { id } = req.params;
  const { name, phone, email, address } = req.body;
  const updated = await Customer.findByIdAndUpdate(
    id,
    { ...(name != null ? { name } : {}), ...(phone != null ? { phone } : {}), ...(email != null ? { email } : {}), ...(address != null ? { address } : {}) },
    { new: true }
  ).lean();
  if (!updated) return res.status(404).json({ error: "Not found" });
  res.json({ customer: updated });
});

// Customer: order history
app.get("/api/customers/:id/history", auth, async (req, res) => {
  const { id } = req.params;
  const orders = await Order.find({ customerId: id }).sort({ createdAt: -1 }).lean();
  res.json({
    orders: orders.map((o) => ({
      invoiceNo: o.invoiceNo,
      date: o.createdAt,
      subtotal: o.subtotal || 0,
      taxAmount: o.taxAmount || 0,
      total: o.total || 0,
      status: o.status,
      itemsCount: (o.items || []).reduce((n, i) => n + Number(i.qty || 0), 0),
    })),
  });
});

// Orders
app.get("/api/orders", auth, async (_req, res) => {
  const orders = await Order.find().sort({ createdAt: -1 }).lean();
  res.json({
    orders: orders.map((o) => ({
      id: o.invoiceNo,
      date: o.createdAt.toISOString().slice(0, 10),
      customer: o.customerId || "Walk-in Customer",
      total: o.total,
      subtotal: o.subtotal || 0,
      taxAmount: o.taxAmount || 0,
      status: o.status === "PENDING" ? "Pending" : "Paid",
      items: o.items.map((i) => ({ name: i.name, qty: i.qty, price: i.price })),
    })),
  });
});

// Get single order by invoice number
app.get("/api/orders/:invoiceNo", auth, async (req, res) => {
  const { invoiceNo } = req.params;
  const o = await Order.findOne({ invoiceNo }).lean();
  if (!o) return res.status(404).json({ error: "Not found" });
  res.json({
    id: o.invoiceNo,
    date: o.createdAt,
    customer: o.customerId || "Walk-in Customer",
    status: o.status,
    paymentType: o.paymentType,
    taxRateBps: o.taxRateBps,
    subtotal: o.subtotal || 0,
    taxAmount: o.taxAmount || 0,
    total: o.total || 0,
    items: (o.items || []).map((i) => ({
      productId: i.productId,
      name: i.name,
      qty: i.qty,
      price: i.price,
      lineTotal: i.lineTotal,
    })),
  });
});

app.post("/api/orders", auth, async (req, res) => {
  const { customerId, paymentType = "CASH", taxRateBps = 0, items } = req.body;
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Items required" });
  }

  // Verify stock
  for (const item of items) {
    if (item.productId) {
      const p = await Product.findById(item.productId);
      if (!p) return res.status(400).json({ error: `Product not found: ${item.name}` });
      if (p.stock < item.qty) return res.status(400).json({ error: `Insufficient stock for ${p.name}` });
    }
  }

  const invoiceNo = `INV-${Date.now()}`;
  const subtotal = items.reduce((s, i) => s + Number(i.price || 0) * Number(i.qty || 0), 0);
  const taxAmount = Math.round((subtotal * taxRateBps) / 10000);
  const total = subtotal + taxAmount;

  const order = await Order.create({
    invoiceNo,
    status: "PAID",
    paymentType,
    taxRateBps,
    subtotal,
    taxAmount,
    total,
    items: items.map((i) => ({
      productId: i.productId || "",
      name: i.name,
      qty: i.qty,
      price: i.price,
      lineTotal: (Number(i.price || 0) * Number(i.qty || 0)),
    })),
    customerId: customerId || "",
  });

  // Decrement Stock
  for (const item of items) {
    if (item.productId) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: -item.qty } });
    }
  }

  // Create ledger entries: SALE, TAX, COGS
  try {
    const productIds = items.map((i) => i.productId).filter(Boolean).map(String);
    const prodCosts = await Product.find({ _id: { $in: productIds } }).select("_id cost").lean();
    const costMap = new Map(prodCosts.map((p) => [String(p._id), Number(p.cost || 0)]));
    const cogs = items.reduce((s, i) => s + Number(i.qty || 0) * (costMap.get(String(i.productId)) || 0), 0);
    await LedgerEntry.create([
      { type: "SALE", orderId: String(order._id), invoiceNo, amount: total, customerId: customerId || "", paymentType },
      { type: "TAX", orderId: String(order._id), invoiceNo, amount: taxAmount, customerId: customerId || "", paymentType },
      { type: "COGS", orderId: String(order._id), invoiceNo, amount: cogs, customerId: customerId || "", paymentType },
    ]);
  } catch (e) {
    console.warn("Ledger creation failed", e);
  }

  res.status(201).json({ orderId: order._id, invoiceNo });
});

// Delete Order by invoice number
app.delete("/api/orders/:invoiceNo", auth, async (req, res) => {
  const { invoiceNo } = req.params;
  const deleted = await Order.findOneAndDelete({ invoiceNo });
  if (!deleted) return res.status(404).json({ error: "Not found" });
  res.status(204).end();
});

// Cancel order: restore stock and write reversing ledger entries
app.post("/api/orders/:invoiceNo/cancel", auth, async (req, res) => {
  const { invoiceNo } = req.params;
  const order = await Order.findOne({ invoiceNo });
  if (!order) return res.status(404).json({ error: "Not found" });
  if (order.status === "CANCELLED") return res.status(409).json({ error: "Already cancelled" });

  // restore stock for items
  for (const item of order.items || []) {
    if (item.productId) {
      await Product.findByIdAndUpdate(item.productId, { $inc: { stock: Number(item.qty || 0) } });
    }
  }

  order.status = "CANCELLED";
  await order.save();

  // recompute COGS from current product costs
  const productIds = (order.items || []).map((i) => i.productId).filter(Boolean).map(String);
  const prodCosts = await Product.find({ _id: { $in: productIds } }).select("_id cost").lean();
  const costMap = new Map(prodCosts.map((p) => [String(p._id), Number(p.cost || 0)]));
  const cogs = (order.items || []).reduce((s, i) => s + Number(i.qty || 0) * (costMap.get(String(i.productId)) || 0), 0);

  await LedgerEntry.create([
    { type: "SALE", orderId: String(order._id), invoiceNo, amount: -Math.abs(order.total || 0), customerId: order.customerId || "", paymentType: order.paymentType },
    { type: "TAX", orderId: String(order._id), invoiceNo, amount: -Math.abs(order.taxAmount || 0), customerId: order.customerId || "", paymentType: order.paymentType },
    { type: "COGS", orderId: String(order._id), invoiceNo, amount: -Math.abs(cogs), customerId: order.customerId || "", paymentType: order.paymentType },
  ]);

  res.json({ success: true, status: order.status });
});

// Settings
app.get("/api/settings", auth, async (_req, res) => {
  let s = await Settings.findOne().lean();
  if (!s) s = await Settings.create({}).then((x) => x.toObject());
  res.json({
    settings: {
      companyName: s.companyName,
      address: s.address,
      phone: s.phone,
      email: s.email,
      taxRate: String(Math.round((s.taxRateBps || 0) / 100)),
      currency: s.currency,
      terms: s.terms,
    },
  });
});

app.put("/api/settings", auth, async (req, res) => {
  const { companyName, address, phone, email, taxRate, currency, terms } = req.body;
  const taxRateBps = Number(taxRate || 0) * 100;
  const existing = await Settings.findOne();
  const saved = existing
    ? await Settings.findByIdAndUpdate(existing._id, { companyName, address, phone, email, taxRateBps, currency, terms }, { new: true }).lean()
    : await Settings.create({ companyName, address, phone, email, taxRateBps, currency, terms }).then((x) => x.toObject());
  res.json({
    settings: {
      companyName: saved.companyName,
      address: saved.address,
      phone: saved.phone,
      email: saved.email,
      taxRate: String(Math.round((saved.taxRateBps || 0) / 100)),
      currency: saved.currency,
      terms: saved.terms,
    },
  });
});

// Analytics (simple)
app.get("/api/analytics/dashboard", auth, async (req, res) => {
  const period = req.query.period || '7d'; // today, 7d, 30d, custom
  
  // Calculate date range based on period
  const now = new Date();
  let startDate;
  
  switch (period) {
    case 'today':
      startDate = new Date(now);
      startDate.setHours(0, 0, 0, 0);
      break;
    case '30d':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '7d':
    default:
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
  }
  
  // Fetch orders within the period
  const [allOrders, products, lowStock] = await Promise.all([
    Order.find({ createdAt: { $gte: startDate } }).lean(),
    Product.find({ active: true }).lean(),
    Product.countDocuments({ active: true, stock: { $lte: 10 } }),
  ]);
  
  // Calculate current period stats
  const totalRevenue = allOrders.reduce((s, o) => s + (o.total || 0), 0);
  const totalTax = allOrders.reduce((s, o) => s + (o.taxAmount || 0), 0);
  const productCostMap = new Map(products.map((p) => [String(p._id), Number(p.cost || 0)]));
  let profit = 0;
  for (const o of allOrders) {
    for (const i of o.items) {
      const cost = productCostMap.get(String(i.productId)) || 0;
      profit += Number(i.qty || 0) * (Number(i.price || 0) - Number(cost));
    }
  }
  
  // Calculate comparison period for percentage changes
  let comparisonStartDate;
  let comparisonEndDate = startDate;
  
  switch (period) {
    case 'today':
      // Compare with yesterday
      comparisonStartDate = new Date(startDate);
      comparisonStartDate.setDate(startDate.getDate() - 1);
      comparisonEndDate = new Date(startDate);
      break;
    case '30d':
      // Compare with previous 30 days
      comparisonStartDate = new Date(startDate.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case '7d':
    default:
      // Compare with previous 7 days
      comparisonStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
  }
  
  const previousOrders = await Order.find({
    createdAt: { $gte: comparisonStartDate, $lt: comparisonEndDate }
  }).lean();
  
  const previousRevenue = previousOrders.reduce((s, o) => s + (o.total || 0), 0);
  
  // Calculate percentage changes
  const revenueChange = previousRevenue > 0 
    ? ((totalRevenue - previousRevenue) / previousRevenue * 100).toFixed(1)
    : 0;
  const ordersChange = previousOrders.length > 0
    ? ((allOrders.length - previousOrders.length) / previousOrders.length * 100).toFixed(1)
    : 0;
  
  // Build sales data for chart based on period
  const byDay = {};
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeklySales = [];
  
  let daysToShow = 7;
  if (period === 'today') daysToShow = 1;
  if (period === '30d') daysToShow = 30;
  
  for (let d = daysToShow - 1; d >= 0; d--) {
    const day = new Date(now);
    day.setDate(now.getDate() - d);
    const key = day.toISOString().slice(0, 10);
    byDay[key] = 0;
  }
  
  for (const o of allOrders) {
    const key = new Date(o.createdAt).toISOString().slice(0, 10);
    if (byDay[key] != null) byDay[key] += (o.total || 0);
  }
  
  // Format for chart
  if (period === 'today' || period === '7d') {
    // Show day names for today and 7d
    Object.entries(byDay).forEach(([date, sales]) => {
      const dayDate = new Date(date);
      const dayName = period === 'today' ? 'Today' : dayNames[dayDate.getDay()];
      weeklySales.push({ day: dayName, sales: Math.round(sales) });
    });
  } else {
    // Show dates for 30d
    Object.entries(byDay).forEach(([date, sales]) => {
      const dayDate = new Date(date);
      const dayLabel = `${dayDate.getDate()}/${dayDate.getMonth() + 1}`;
      weeklySales.push({ day: dayLabel, sales: Math.round(sales) });
    });
  }
  
  const salesOverview = Object.entries(byDay).map(([name, sales]) => ({ name, sales }));
  
  res.json({
    stats: {
      totalRevenue,
      totalOrders: allOrders.length,
      totalProducts: products.length,
      lowStock,
      taxCollected: totalTax,
      profit,
      revenueChange: parseFloat(revenueChange),
      ordersChange: parseFloat(ordersChange),
      productsChange: 0,
      lowStockChange: 0,
    },
    salesOverview,
    weeklySales,
    recentTransactions: allOrders
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map((o) => ({ invoiceNo: o.invoiceNo, date: o.createdAt, total: o.total })),
    topSelling: await getTopSellingProducts(allOrders),
  });
});

// Internal ledger overview
app.get("/api/ledger", auth, async (req, res) => {
  const fromStr = req.query.from;
  const toStr = req.query.to;
  const filter = {};
  if (fromStr || toStr) {
    filter.createdAt = {};
    if (fromStr) filter.createdAt.$gte = new Date(fromStr);
    if (toStr) {
      const to = new Date(toStr);
      to.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = to;
    }
  }
  const entries = await LedgerEntry.find(filter).sort({ createdAt: 1 }).lean();
  const totals = entries.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + Number(e.amount || 0);
    return acc;
  }, {});
  res.json({ entries, totals });
});

// Sales report (internal)
app.get("/api/reports/sales", auth, async (req, res) => {
  const fromStr = req.query.from;
  const toStr = req.query.to;
  const orderFilter = {};
  if (fromStr || toStr) {
    orderFilter.createdAt = {};
    if (fromStr) orderFilter.createdAt.$gte = new Date(fromStr);
    if (toStr) {
      const to = new Date(toStr);
      to.setHours(23, 59, 59, 999);
      orderFilter.createdAt.$lte = to;
    }
  }
  const [orders, products] = await Promise.all([
    Order.find(orderFilter).sort({ createdAt: 1 }).lean(),
    Product.find({ active: true }).lean(),
  ]);
  const totalRevenue = orders.reduce((s, o) => s + (o.total || 0), 0);
  const taxCollected = orders.reduce((s, o) => s + (o.taxAmount || 0), 0);
  const productCostMap = new Map(products.map((p) => [String(p._id), Number(p.cost || 0)]));
  let cogs = 0;
  for (const o of orders) {
    for (const i of o.items) {
      const cost = productCostMap.get(String(i.productId)) || 0;
      cogs += Number(i.qty || 0) * Number(cost);
    }
  }
  const profit = totalRevenue - cogs;
  const byDay = {};
  for (const o of orders) {
    const key = new Date(o.createdAt).toISOString().slice(0, 10);
    byDay[key] = (byDay[key] || 0) + (o.total || 0);
  }
  const series = Object.entries(byDay).map(([date, total]) => ({ date, total }));
  res.json({ totalRevenue, taxCollected, cogs, profit, series, count: orders.length });
});

// Tax report: totals and breakdown by order GST rate
app.get("/api/reports/tax", auth, async (req, res) => {
  const fromStr = req.query.from;
  const toStr = req.query.to;
  const filter = {};
  if (fromStr || toStr) {
    filter.createdAt = {};
    if (fromStr) filter.createdAt.$gte = new Date(fromStr);
    if (toStr) {
      const to = new Date(toStr);
      to.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = to;
    }
  }
  const orders = await Order.find(filter).lean();
  let totalTax = 0;
  const byRate = {};
  const byDay = {};
  for (const o of orders) {
    const rate = Number(o.taxRateBps || 0);
    const tax = Number(o.taxAmount || 0);
    totalTax += tax;
    byRate[rate] = (byRate[rate] || 0) + tax;
    const key = new Date(o.createdAt).toISOString().slice(0, 10);
    byDay[key] = (byDay[key] || 0) + tax;
  }
  const series = Object.entries(byDay).map(([date, tax]) => ({ date, tax }));
  res.json({ totalTax, byRate, series, count: orders.length });
});

// Profit report: totals and breakdowns by product and category
app.get("/api/reports/profit", auth, async (req, res) => {
  const fromStr = req.query.from;
  const toStr = req.query.to;
  const filter = {};
  if (fromStr || toStr) {
    filter.createdAt = {};
    if (fromStr) filter.createdAt.$gte = new Date(fromStr);
    if (toStr) {
      const to = new Date(toStr);
      to.setHours(23, 59, 59, 999);
      filter.createdAt.$lte = to;
    }
  }
  const [orders, products] = await Promise.all([
    Order.find(filter).lean(),
    Product.find({ active: true }).select("_id name category cost price").lean(),
  ]);
  const costMap = new Map(products.map((p) => [String(p._id), Number(p.cost || 0)]));
  const catMap = new Map(products.map((p) => [String(p._id), p.category || "Uncategorized"]));
  let revenue = 0;
  let cogs = 0;
  const productAgg = new Map();
  const categoryAgg = new Map();
  const byDay = {};
  for (const o of orders) {
    let orderRevenue = 0;
    let orderCost = 0;
    for (const i of o.items || []) {
      const lineRevenue = Number(i.price || 0) * Number(i.qty || 0);
      const lineCost = (costMap.get(String(i.productId)) || 0) * Number(i.qty || 0);
      orderRevenue += lineRevenue;
      orderCost += lineCost;
      const pKey = String(i.productId || i.name);
      const prevP = productAgg.get(pKey) || { name: i.name, revenue: 0, cost: 0 };
      prevP.revenue += lineRevenue;
      prevP.cost += lineCost;
      productAgg.set(pKey, prevP);
      const cKey = catMap.get(String(i.productId)) || "Uncategorized";
      const prevC = categoryAgg.get(cKey) || { category: cKey, revenue: 0, cost: 0 };
      prevC.revenue += lineRevenue;
      prevC.cost += lineCost;
      categoryAgg.set(cKey, prevC);
    }
    revenue += orderRevenue;
    cogs += orderCost;
    const key = new Date(o.createdAt).toISOString().slice(0, 10);
    byDay[key] = (byDay[key] || 0) + (orderRevenue - orderCost);
  }
  const profit = revenue - cogs;
  const productRows = Array.from(productAgg.values()).map((r) => ({ ...r, profit: r.revenue - r.cost }));
  const categoryRows = Array.from(categoryAgg.values()).map((r) => ({ ...r, profit: r.revenue - r.cost }));
  const series = Object.entries(byDay).map(([date, profit]) => ({ date, profit }));
  res.json({ revenue, cogs, profit, count: orders.length, products: productRows, categories: categoryRows, series });
});

// Inventory snapshot report
app.get("/api/reports/inventory", auth, async (req, res) => {
  const threshold = Number(req.query.threshold || 5);
  const products = await Product.find({ active: true }).select("name sku stock price cost category").lean();
  const rows = products.map((p) => ({
    name: p.name,
    sku: p.sku || "",
    stock: Number(p.stock || 0),
    category: p.category || "Uncategorized",
    cost: Number(p.cost || 0),
    price: Number(p.price || 0),
    stockValueCost: Number(p.cost || 0) * Number(p.stock || 0),
    stockValueRetail: Number(p.price || 0) * Number(p.stock || 0),
    lowStock: Number(p.stock || 0) <= threshold,
  }));
  const totals = rows.reduce((acc, r) => {
    acc.stockUnits += r.stock;
    acc.stockValueCost += r.stockValueCost;
    acc.stockValueRetail += r.stockValueRetail;
    acc.lowStock += r.lowStock ? 1 : 0;
    return acc;
  }, { stockUnits: 0, stockValueCost: 0, stockValueRetail: 0, lowStock: 0 });
  res.json({ totals, rows, threshold });
});

// --- WooCommerce webhook: import orders into POS ---
app.post("/api/integrations/woocommerce/webhook", async (req, res) => {
  // Unified platform: disable external webhooks
  return res.status(404).json({ error: "External integration disabled" });
  // Expect WooCommerce order payload
  const payload = req.body || {};
  try {
    const orderId = payload.id || payload.order_id || `WC-${Date.now()}`;
    const invoiceNo = `WC-${orderId}`;
    const status = (payload.status || "completed").toUpperCase();
    const mappedStatus = status.includes("PENDING") ? "PENDING" : "PAID";
    const taxRateBps = Number((payload.total_tax_rate_bps || 0));

    const lineItems = Array.isArray(payload.line_items) ? payload.line_items : [];
    const items = [];
    for (const li of lineItems) {
      let productId = "";
      if (li.sku) {
        const prod = await Product.findOne({ sku: li.sku }).lean();
        if (prod) productId = String(prod._id);
      }
      const price = Number(li.price || li.total / li.quantity || 0);
      items.push({ productId, name: li.name, qty: Number(li.quantity || 1), price, lineTotal: Number(li.total || price * (li.quantity || 1)) });
      // Decrement stock
      if (productId) await Product.findByIdAndUpdate(productId, { $inc: { stock: -Number(li.quantity || 1) } });
    }
    const subtotal = items.reduce((s, i) => s + Number(i.lineTotal || i.price * i.qty || 0), 0);
    const taxAmount = Number(payload.total_tax || 0);
    const total = Number(payload.total || subtotal + taxAmount);
    const customerId = payload.customer_id ? String(payload.customer_id) : "";

    await Order.create({ invoiceNo, status: mappedStatus, paymentType: "ONLINE", taxRateBps, subtotal, taxAmount, total, items, customerId });
    res.status(201).json({ ok: true });
  } catch (e) {
    console.error("Woo webhook error", e);
    res.status(400).json({ error: "Invalid webhook payload" });
  }
});

// --- Accounting exports ---
function toCsv(rows) {
  return rows.map((r) => r.map((v) => String(v).replace(/\n/g, " ")).join(",")).join("\n");
}

app.get("/api/accounting/export/tally", auth, async (_req, res) => {
  // Unified platform: disable external accounting exports
  return res.status(404).json({ error: "External integration disabled" });
  const orders = await Order.find().sort({ createdAt: 1 }).lean();
  const header = ["InvoiceNo", "Date", "Subtotal", "Tax", "Total", "CustomerId", "PaymentType", "Items"];
  const rows = [header];
  for (const o of orders) {
    const items = (o.items || []).map((i) => `${i.name}x${i.qty}@${i.price}`).join("; ");
    rows.push([o.invoiceNo, o.createdAt.toISOString().slice(0, 10), o.subtotal || 0, o.taxAmount || 0, o.total || 0, o.customerId || "", o.paymentType || "", items]);
  }
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=export_tally.csv");
  res.send(toCsv(rows));
});

app.get("/api/accounting/export/vyapar", auth, async (_req, res) => {
  // Unified platform: disable external accounting exports
  return res.status(404).json({ error: "External integration disabled" });
  const orders = await Order.find().sort({ createdAt: 1 }).lean();
  const header = ["InvoiceNo", "Date", "Subtotal", "Tax", "Total", "CustomerId", "PaymentMode", "Items"];
  const rows = [header];
  for (const o of orders) {
    const items = (o.items || []).map((i) => `${i.name}x${i.qty}@${i.price}`).join("; ");
    rows.push([o.invoiceNo, o.createdAt.toISOString().slice(0, 10), o.subtotal || 0, o.taxAmount || 0, o.total || 0, o.customerId || "", o.paymentType || "", items]);
  }
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", "attachment; filename=export_vyapar.csv");
  res.send(toCsv(rows));
});

async function getTopSellingProducts(orders) {
  const map = {};
  for (const o of orders) {
    for (const i of o.items) {
      if (!map[i.name]) map[i.name] = 0;
      map[i.name] += i.qty;
    }
  }
  return Object.entries(map)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([name, qty]) => ({ name, qty }));
}

// --- Start server ---
app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
