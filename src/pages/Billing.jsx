import React, { useEffect, useMemo, useState } from 'react';
import { Search, ShoppingCart, Trash2, Plus, Minus } from 'lucide-react';
import '../styles/Billing.css';
import { api } from '../api/client';
import { useNavigate } from 'react-router-dom';

const currencySymbol = (code) => {
    switch (code) {
        case 'INR': return '₹';
        case 'USD': return '$';
        case 'EUR': return '€';
        default: return code || '₹';
    }
};

const Billing = () => {
    const navigate = useNavigate();
    const [categories, setCategories] = useState(['All']);
    const [activeCategory, setActiveCategory] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [products, setProducts] = useState([]);
    const [cart, setCart] = useState([]); // {productId, name, price, qty}
    const [currency, setCurrency] = useState('INR');
    const [taxRatePercent, setTaxRatePercent] = useState(0);
    const [charging, setCharging] = useState(false);

    // Customer linking
    const [customerQuery, setCustomerQuery] = useState('');
    const [customers, setCustomers] = useState([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState('');

    useEffect(() => {
        async function init() {
            try {
                const s = await api('/api/settings');
                setCurrency(s.settings?.currency || 'INR');
                setTaxRatePercent(Number(s.settings?.taxRate || '0'));
            } catch {}
            try {
                const c = await api('/api/categories');
                const names = ['All', ...(c.categories || []).map((x) => x.name)];
                setCategories(names);
            } catch {}
            await loadProducts();
        }
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        const t = setTimeout(() => loadProducts(), 250);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, activeCategory]);

    const loadProducts = async () => {
        try {
            const q = encodeURIComponent(searchQuery || '');
            const category = encodeURIComponent(activeCategory || 'All');
            const data = await api(`/api/products?q=${q}&category=${category}`);
            setProducts(data.products || []);
        } catch (e) {
            console.error(e);
            alert(`Failed to load products: ${e.message}`);
        }
    };

    const loadCustomers = async () => {
        try {
            const q = encodeURIComponent(customerQuery || '');
            const data = await api(`/api/customers?q=${q}`);
            setCustomers(data.customers || []);
        } catch {}
    };

    useEffect(() => {
        const t = setTimeout(() => loadCustomers(), 300);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [customerQuery]);

    const addToCart = (p) => {
        setCart((prev) => {
            const existing = prev.find((it) => it.productId === p.id);
            if (existing) {
                return prev.map((it) => it.productId === p.id ? { ...it, qty: it.qty + 1 } : it);
            }
            return [...prev, { productId: p.id, name: p.name, price: Number(p.price || 0), qty: 1 }];
        });
    };

    const updateQty = (productId, delta) => {
        setCart((prev) => prev
            .map((it) => it.productId === productId ? { ...it, qty: Math.max(1, it.qty + delta) } : it)
        );
    };

    const removeItem = (productId) => {
        setCart((prev) => prev.filter((it) => it.productId !== productId));
    };

    const clearCart = () => setCart([]);

    const subtotal = useMemo(() => cart.reduce((s, it) => s + it.price * it.qty, 0), [cart]);
    const taxAmount = useMemo(() => Math.round((subtotal * Number(taxRatePercent || 0)) / 100), [subtotal, taxRatePercent]);
    const total = useMemo(() => subtotal + taxAmount, [subtotal, taxAmount]);

    const charge = async () => {
        if (cart.length === 0) return alert('Add items to cart first');
        setCharging(true);
        try {
            const items = cart.map((it) => ({ productId: it.productId, name: it.name, qty: it.qty, price: it.price }));
            const taxRateBps = Number(taxRatePercent || 0) * 100;
            const body = { customerId: selectedCustomerId || '', paymentType: 'CASH', taxRateBps, items };
            const res = await api('/api/orders', { method: 'POST', body: JSON.stringify(body) });
            clearCart();
            alert(`Order created: ${res.invoiceNo}`);
            navigate('/orders');
        } catch (e) {
            // Offline queue fallback
            try {
                const items = cart.map((it) => ({ productId: it.productId, name: it.name, qty: it.qty, price: it.price }));
                const taxRateBps = Number(taxRatePercent || 0) * 100;
                const pending = JSON.parse(localStorage.getItem('pendingOrders') || '[]');
                pending.push({ customerId: selectedCustomerId || '', paymentType: 'CASH', taxRateBps, items, createdAt: Date.now() });
                localStorage.setItem('pendingOrders', JSON.stringify(pending));
                alert('No internet or server issue. Order saved locally and will auto-sync.');
                clearCart();
            } catch (err) {
                alert(`Failed to charge: ${e.message}`);
            }
        } finally {
            setCharging(false);
        }
    };

    const syncPendingOrders = async () => {
        try {
            const pending = JSON.parse(localStorage.getItem('pendingOrders') || '[]');
            if (!Array.isArray(pending) || pending.length === 0) return;
            const remaining = [];
            for (const p of pending) {
                try {
                    await api('/api/orders', { method: 'POST', body: JSON.stringify(p) });
                } catch (e) {
                    // Keep in queue if still failing
                    remaining.push(p);
                }
            }
            localStorage.setItem('pendingOrders', JSON.stringify(remaining));
            if (pending.length !== remaining.length) alert('Pending orders synchronized.');
        } catch {}
    };

    useEffect(() => {
        syncPendingOrders();
        const onOnline = () => syncPendingOrders();
        window.addEventListener('online', onOnline);
        return () => window.removeEventListener('online', onOnline);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="billing-container">
            {/* Left: Product Grid */}
            <div className="product-section">
                <div className="search-bar mb-4">
                    <Search size={20} className="text-secondary" />
                    <input
                        type="text"
                        placeholder="Search products or scan barcode..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="categories-tabs mb-4">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            className={`category-tab ${activeCategory === cat ? 'active' : ''}`}
                            onClick={() => setActiveCategory(cat)}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                <div className="products-grid">
                    {products.map(product => (
                        <div key={product.id} className="product-card" onClick={() => addToCart(product)} style={{ cursor: 'pointer' }}>
                            <div className="product-image">IMG</div>
                            <div className="p-3">
                                <h4 className="font-semibold text-sm">{product.name}</h4>
                                <p className="text-primary font-bold mt-1">{currencySymbol(currency)}{product.price}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right: Cart */}
            <div className="cart-section">
                <div className="cart-header">
                    <div className="flex items-center gap-2">
                        <ShoppingCart size={20} className="text-primary" />
                        <h3>Current Order</h3>
                    </div>
                    <button className="icon-btn text-error hover:bg-red-50" style={{ color: 'var(--error)' }} onClick={clearCart}>
                        <Trash2 size={18} />
                    </button>
                </div>

                <div className="mb-3" style={{ display: 'grid', gridTemplateColumns: '1fr 200px', gap: '0.5rem' }}>
                    <input
                        type="text"
                        placeholder="Search customer by name/phone/email"
                        value={customerQuery}
                        onChange={(e) => setCustomerQuery(e.target.value)}
                        className="form-input"
                    />
                    <select className="form-input" value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)}>
                        <option value="">Walk-in Customer</option>
                        {(customers || []).map((c) => (
                            <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>
                        ))}
                    </select>
                </div>

                <div className="cart-items">
                    {cart.map((it) => (
                        <div key={it.productId} className="cart-item">
                            <div className="flex-1">
                                <h4 className="text-sm font-medium">{it.name}</h4>
                                <p className="text-xs text-secondary">{currencySymbol(currency)}{it.price} x {it.qty}</p>
                            </div>
                            <div className="qty-controls">
                                <button className="qty-btn" onClick={() => updateQty(it.productId, -1)}><Minus size={14} /></button>
                                <span className="text-sm font-semibold w-4 text-center">{it.qty}</span>
                                <button className="qty-btn" onClick={() => updateQty(it.productId, 1)}><Plus size={14} /></button>
                            </div>
                            <span className="font-bold text-sm min-w-[60px] text-right">{currencySymbol(currency)}{it.price * it.qty}</span>
                            <button className="icon-btn" onClick={() => removeItem(it.productId)} title="Remove">✕</button>
                        </div>
                    ))}
                </div>

                <div className="cart-footer">
                    <div className="summary-row">
                        <span>Subtotal</span>
                        <span>{currencySymbol(currency)}{subtotal}</span>
                    </div>
                    <div className="summary-row">
                        <span>Tax ({taxRatePercent}%)</span>
                        <span>{currencySymbol(currency)}{taxAmount}</span>
                    </div>
                    <div className="summary-row total">
                        <span>Total</span>
                        <span>{currencySymbol(currency)}{total}</span>
                    </div>

                    <button className="btn btn-primary w-full mt-4 py-3 text-lg justify-center font-bold shadow-lg transition-transform active:scale-95" onClick={charge} disabled={charging}>
                        {charging ? 'Processing...' : `Charge ${currencySymbol(currency)}${total}`}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Billing;
