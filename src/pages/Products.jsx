import React, { useEffect, useState } from 'react';
import { Plus, Filter, MoreVertical, Search, X } from 'lucide-react';
import '../styles/Tables.css';
import { api, notify } from '../api/client';

const AddProductModal = ({ isOpen, onClose, onSave, categories = [], onCreateCategory }) => {
    if (!isOpen) return null;
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '1rem',
                padding: '2rem',
                width: '500px',
                boxShadow: 'var(--shadow-lg)',
                animation: 'fadeIn 0.2s ease-out'
            }}>
                <div className="flex justify-between items-center mb-6">
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>Add New Product</h2>
                    <button onClick={onClose} className="icon-btn">
                        <X size={20} className="text-secondary" />
                    </button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); onSave(new FormData(e.currentTarget)); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label className="text-sm font-medium text-secondary mb-1 block">Product Name</label>
                        <input name="name" className="form-input" placeholder="e.g. Wireless Mouse" required />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label className="text-sm font-medium text-secondary mb-1 block">Category</label>
                            <div className="flex items-center gap-2">
                                <select name="category" className="form-input" style={{ flex: 1 }}>
                                    <option value="">Uncategorized</option>
                                    {(categories || []).map((c) => (
                                        <option key={c._id || c.name} value={c.name}>{c.name}</option>
                                    ))}
                                </select>
                                {onCreateCategory && (
                                    <button type="button" className="btn btn-outline" onClick={async () => {
                                        const name = prompt('New category name');
                                        if (!name) return;
                                        try {
                                            await onCreateCategory(name);
                                        } catch (e) {
                                            // handled by notify in caller
                                        }
                                    }}>Add</button>
                                )}
                            </div>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-secondary mb-1 block">Price</label>
                            <input name="price" className="form-input" type="number" placeholder="0.00" required />
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label className="text-sm font-medium text-secondary mb-1 block">Stock</label>
                            <input name="stock" className="form-input" type="number" placeholder="0" />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-secondary mb-1 block">Status</label>
                            <select className="form-input">
                                <option>In Stock</option>
                                <option>Low Stock</option>
                                <option>Out of Stock</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-4">
                        <button type="button" onClick={onClose} className="btn btn-outline">Cancel</button>
                        <button type="submit" className="btn btn-primary">Add Product</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Products = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState([]);

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState('All');
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const getStatusBadge = (status) => {
        switch (status) {
            case 'In Stock': return 'badge-success';
            case 'Low Stock': return 'badge-warning';
            case 'Out of Stock': return 'badge-error';
            default: return 'badge-secondary';
        }
    }

    const filteredProducts = products;

    const load = async () => {
        setLoading(true);
        try {
            const data = await api(`/api/products?q=${encodeURIComponent(searchQuery)}&category=${encodeURIComponent(activeFilter)}`);
            setProducts(data.products);
        } catch (e) {
            notify(`Failed to load products: ${e.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load().catch((e) => notify(e.message, 'error'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeFilter, searchQuery]);

    useEffect(() => {
        async function loadCategories() {
            try {
                const data = await api('/api/categories');
                setCategories(data.categories || []);
            } catch (e) {
                notify(`Failed to load categories: ${e.message}`, 'error');
            }
        }
        loadCategories();
    }, []);

    const handleAddProduct = async (formData) => {
        try {
            const name = String(formData.get('name') || '');
            const category = String(formData.get('category') || '');
            const price = Number(formData.get('price') || 0);
            const stock = Number(formData.get('stock') || 0);
            await api('/api/products', {
                method: 'POST',
                body: JSON.stringify({ name, category, price, stock })
            });
            setIsAddModalOpen(false);
            await load();
        } catch (e) {
            notify(`Add product failed: ${e.message}`, 'error');
        }
    };

    const handleCreateCategory = async (name) => {
        try {
            const res = await api('/api/categories', {
                method: 'POST',
                body: JSON.stringify({ name })
            });
            // Refresh categories list
            const data = await api('/api/categories');
            setCategories(data.categories || []);
            notify(`Category '${name}' created`, 'success');
            return res;
        } catch (e) {
            notify(`Create category failed: ${e.message}`, 'error');
            throw e;
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <AddProductModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSave={handleAddProduct}
                categories={categories}
                onCreateCategory={handleCreateCategory}
            />

            <div className="table-container">
                <div className="table-header">
                    <div className="flex items-center gap-2" style={{ position: 'relative' }}>
                        <Search size={18} className="text-secondary" style={{ position: 'absolute', left: '10px' }} />
                        <input
                            type="text"
                            placeholder="Search products..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                padding: '0.5rem 0.5rem 0.5rem 2.2rem',
                                border: '1px solid var(--border)',
                                borderRadius: '0.5rem',
                                width: '300px'
                            }}
                        />
                    </div>

                    <div className="table-actions" style={{ position: 'relative' }}>
                        <button
                            className={`btn ${activeFilter !== 'All' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                        >
                            <Filter size={18} />
                            {activeFilter === 'All' ? 'Filter' : activeFilter}
                        </button>

                        {showFilterDropdown && (
                            <div style={{
                                position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
                                backgroundColor: 'white', border: '1px solid var(--border)',
                                borderRadius: '0.5rem', boxShadow: 'var(--shadow)', padding: '0.5rem',
                                zIndex: 10, minWidth: '160px'
                            }}>
                                {['All', ...categories.map(c => c.name)].map(cat => (
                                    <div
                                        key={cat} onClick={() => { setActiveFilter(cat); setShowFilterDropdown(false); }}
                                        style={{
                                            padding: '0.5rem',
                                            cursor: 'pointer',
                                            borderRadius: '0.25rem',
                                            backgroundColor: activeFilter === cat ? 'var(--primary-soft)' : 'transparent',
                                            color: activeFilter === cat ? 'var(--primary)' : 'var(--text-primary)',
                                            fontWeight: activeFilter === cat ? '600' : '400',
                                            transition: 'background-color 0.2s'
                                        }}
                                        className="hover:bg-slate-50"
                                        onMouseEnter={(e) => {
                                            if (activeFilter !== cat) e.target.style.backgroundColor = 'var(--surface-variant)';
                                        }}
                                        onMouseLeave={(e) => {
                                            if (activeFilter !== cat) e.target.style.backgroundColor = 'transparent';
                                        }}
                                    >
                                        {cat}
                                    </div>
                                ))}
                            </div>
                        )}

                        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
                            <Plus size={18} />
                            Add Product
                        </button>
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th>Product Name</th>
                            <th>Category</th>
                            <th>Price</th>
                            <th>Stock Level</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {!loading && filteredProducts.map(product => (
                            <tr key={product.id}>
                                <td className="font-semibold">{product.name}</td>
                                <td>{product.category}</td>
                                <td className="font-bold">₹{product.price}</td>
                                <td>{product.stock} units</td>
                                <td>
                                    <span className={`badge ${getStatusBadge(product.status)}`}>
                                        {product.status}
                                    </span>
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                    <button className="icon-btn" style={{ marginLeft: 'auto' }}>
                                        <MoreVertical size={18} className="text-secondary" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {loading && (
                            <tr><td colSpan="6" style={{ padding: '1rem' }}>Loading...</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default Products;
