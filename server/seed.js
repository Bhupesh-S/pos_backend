import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

// MongoDB connection
const MONGODB_URI = process.env.DATABASE_URL || 'mongodb://localhost:27017/react_pos_system';

const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ MongoDB Connected');
  } catch (err) {
    console.error('❌ MongoDB Connection Error:', err.message);
    process.exit(1);
  }
};

// Define schemas inline (same as server.js)
const userSchema = new mongoose.Schema(
  {
    name: String,
    email: { type: String, unique: true },
    passwordHash: String,
    role: { type: String, default: 'MANAGER' },
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
    status: { type: String, default: 'PAID' },
    paymentType: { type: String, default: 'CASH' },
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

// Create models
const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Category = mongoose.model('Category', categorySchema);
const Customer = mongoose.model('Customer', customerSchema);
const Order = mongoose.model('Order', orderSchema);

// Sample data
const categories = [
  { name: 'Electronics' },
  { name: 'Clothing' },
  { name: 'Grocery' },
  { name: 'Books' },
  { name: 'Home & Kitchen' },
];

const products = [
  // Electronics
  { name: 'Wireless Mouse', category: 'Electronics', price: 599, stock: 50, sku: 'ELEC-001' },
  { name: 'USB-C Cable', category: 'Electronics', price: 299, stock: 100, sku: 'ELEC-002' },
  { name: 'Bluetooth Speaker', category: 'Electronics', price: 1499, stock: 30, sku: 'ELEC-003' },
  { name: 'Mobile Phone Holder', category: 'Electronics', price: 249, stock: 60, sku: 'ELEC-004' },
  { name: 'Earphones', category: 'Electronics', price: 399, stock: 80, sku: 'ELEC-005' },
  { name: 'Power Bank 10000mAh', category: 'Electronics', price: 899, stock: 40, sku: 'ELEC-006' },
  { name: 'Phone Charger', category: 'Electronics', price: 349, stock: 75, sku: 'ELEC-007' },
  { name: 'LED Bulb 9W', category: 'Electronics', price: 149, stock: 120, sku: 'ELEC-008' },
  
  // Clothing
  { name: 'Cotton T-Shirt', category: 'Clothing', price: 399, stock: 60, sku: 'CLO-001' },
  { name: 'Denim Jeans', category: 'Clothing', price: 1299, stock: 40, sku: 'CLO-002' },
  { name: 'Kurta', category: 'Clothing', price: 799, stock: 50, sku: 'CLO-003' },
  { name: 'Saree', category: 'Clothing', price: 1999, stock: 25, sku: 'CLO-004' },
  { name: 'Sports Shoes', category: 'Clothing', price: 1799, stock: 30, sku: 'CLO-005' },
  { name: 'Cotton Socks (3 Pair)', category: 'Clothing', price: 199, stock: 100, sku: 'CLO-006' },
  
  // Grocery
  { name: 'Basmati Rice 5kg', category: 'Grocery', price: 450, stock: 45, sku: 'GROC-001' },
  { name: 'Tata Tea 1kg', category: 'Grocery', price: 380, stock: 60, sku: 'GROC-002' },
  { name: 'Amul Butter 500g', category: 'Grocery', price: 250, stock: 80, sku: 'GROC-003' },
  { name: 'Maggi Noodles (12 Pack)', category: 'Grocery', price: 144, stock: 100, sku: 'GROC-004' },
  { name: 'Fortune Oil 1L', category: 'Grocery', price: 180, stock: 70, sku: 'GROC-005' },
  { name: 'Parle-G Biscuits', category: 'Grocery', price: 20, stock: 200, sku: 'GROC-006' },
  { name: 'Britannia Bread', category: 'Grocery', price: 35, stock: 150, sku: 'GROC-007' },
  { name: 'Amul Milk 1L', category: 'Grocery', price: 62, stock: 100, sku: 'GROC-008' },
  
  // Books
  { name: 'NCERT Mathematics', category: 'Books', price: 250, stock: 30, sku: 'BOOK-001' },
  { name: 'English Grammar Book', category: 'Books', price: 180, stock: 40, sku: 'BOOK-002' },
  { name: 'Notebook (200 Pages)', category: 'Books', price: 60, stock: 150, sku: 'BOOK-003' },
  { name: 'Pen Set (10 Pcs)', category: 'Books', price: 80, stock: 100, sku: 'BOOK-004' },
  
  // Home & Kitchen
  { name: 'Pressure Cooker 5L', category: 'Home & Kitchen', price: 1499, stock: 25, sku: 'HOME-001' },
  { name: 'Non-Stick Tawa', category: 'Home & Kitchen', price: 599, stock: 35, sku: 'HOME-002' },
  { name: 'Steel Plates Set', category: 'Home & Kitchen', price: 899, stock: 40, sku: 'HOME-003' },
  { name: 'Water Bottle 1L', category: 'Home & Kitchen', price: 249, stock: 80, sku: 'HOME-004' },
  { name: 'Mixer Grinder', category: 'Home & Kitchen', price: 2999, stock: 15, sku: 'HOME-005' },
];

const customers = [
  {
    name: 'Bhupesh',
    email: 'bhupesh@example.com',
    phone: '+91 98765 43210',
    address: 'A-123, Sector 15, Noida, Uttar Pradesh 201301',
  },
  {
    name: 'Arun',
    email: 'arun@example.com',
    phone: '+91 98765 12345',
    address: 'B-456, Koramangala, Bangalore, Karnataka 560034',
  },
];

// Helper function to generate random date within last 30 days
const randomDate = (daysAgo) => {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  return date;
};

// Seed function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seed...\n');

    // Clear existing data
    console.log('🗑️  Clearing existing data...');
    await User.deleteMany({});
    await Product.deleteMany({});
    await Category.deleteMany({});
    await Customer.deleteMany({});
    await Order.deleteMany({});
    console.log('✅ Existing data cleared\n');

    // Create admin user
    console.log('👤 Creating admin user...');
    const hashedPassword = await bcrypt.hash('admin123', 10);
    const adminUser = await User.create({
      name: 'Admin User',
      email: 'admin@pos.com',
      passwordHash: hashedPassword,
      role: 'ADMIN',
    });
    console.log('✅ Admin user created (email: admin@pos.com, password: admin123)\n');

    // Create categories
    console.log('📁 Creating categories...');
    const createdCategories = await Category.insertMany(categories);
    console.log(`✅ ${createdCategories.length} categories created\n`);

    // Create products
    console.log('📦 Creating products...');
    const createdProducts = await Product.insertMany(products);
    console.log(`✅ ${createdProducts.length} products created\n`);

    // Create customers
    console.log('👥 Creating customers...');
    const createdCustomers = await Customer.insertMany(customers);
    console.log(`✅ ${createdCustomers.length} customers created\n`);

    // Create sample orders
    console.log('🛒 Creating sample orders...');
    const orders = [];
    
    // Generate 20 random orders
    for (let i = 0; i < 20; i++) {
      const customer = createdCustomers[Math.floor(Math.random() * createdCustomers.length)];
      const numItems = Math.floor(Math.random() * 3) + 1; // 1-3 items per order
      const items = [];
      let subtotal = 0;

      for (let j = 0; j < numItems; j++) {
        const product = createdProducts[Math.floor(Math.random() * createdProducts.length)];
        const qty = Math.floor(Math.random() * 3) + 1; // 1-3 quantity
        const lineTotal = product.price * qty;
        
        items.push({
          productId: product._id.toString(),
          name: product.name,
          qty: qty,
          price: product.price,
          lineTotal: lineTotal,
        });
        
        subtotal += lineTotal;
      }

      const taxRateBps = 1800; // 18% GST in basis points
      const taxAmount = (subtotal * taxRateBps) / 10000;
      const total = subtotal + taxAmount;
      const statuses = ['PAID', 'PENDING'];
      const status = statuses[Math.floor(Math.random() * statuses.length)];

      orders.push({
        invoiceNo: `INV-${String(1000 + i).padStart(4, '0')}`,
        status: status,
        paymentType: 'CASH',
        taxRateBps: taxRateBps,
        subtotal: parseFloat(subtotal.toFixed(2)),
        taxAmount: parseFloat(taxAmount.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        items: items,
        customerId: customer._id.toString(),
        createdAt: randomDate(30),
      });
    }

    const createdOrders = await Order.insertMany(orders);
    console.log(`✅ ${createdOrders.length} orders created\n`);

    // Summary
    console.log('📊 Seed Summary:');
    console.log('================');
    console.log(`👤 Users: 1`);
    console.log(`📁 Categories: ${createdCategories.length}`);
    console.log(`📦 Products: ${createdProducts.length}`);
    console.log(`👥 Customers: ${createdCustomers.length}`);
    console.log(`🛒 Orders: ${createdOrders.length}`);
    console.log('\n✅ Database seeded successfully!');
    console.log('\n🔐 Login credentials:');
    console.log('   Email: admin@pos.com');
    console.log('   Password: admin123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
    process.exit(0);
  }
};

// Run seed
connectDB().then(() => {
  seedDatabase();
});
