import React, { useEffect, useState } from 'react';
import { Search, Plus, User, Phone, MapPin, ShoppingBag, Edit, Mail, X } from 'lucide-react';
import '../styles/Tables.css';
import { api, notify } from '../api/client';

const CustomerFormModal = ({ isOpen, onClose, onSave, initialData }) => {
    if (!isOpen) return null;
    const isEdit = !!initialData;
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
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'var(--text-primary)' }}>{isEdit ? 'Edit Customer' : 'Add New Customer'}</h2>
                    <button onClick={onClose} className="icon-btn">
                        <X size={20} className="text-secondary" />
                    </button>
                </div>
                <form onSubmit={(e) => { e.preventDefault(); onSave(new FormData(e.currentTarget)); }} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div>
                        <label className="text-sm font-medium text-secondary mb-1 block">Full Name</label>
                        <input
                            className="form-input"
                            name="name"
                            defaultValue={initialData?.name}
                            required
                            placeholder="e.g. John Doe"
                        />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label className="text-sm font-medium text-secondary mb-1 block">Phone</label>
                            <input
                                className="form-input"
                                name="phone"
                                defaultValue={initialData?.phone}
                                required
                                type="tel"
                                placeholder="+91 99999 99999"
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-secondary mb-1 block">Email</label>
                            <input
                                className="form-input"
                                name="email"
                                defaultValue={initialData?.email}
                                type="email"
                                placeholder="john@example.com"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-sm font-medium text-secondary mb-1 block">Address</label>
                        <textarea
                            className="form-input"
                            style={{ height: '100px', resize: 'none' }}
                            name="address"
                            defaultValue={initialData?.address}
                            placeholder="Full address..."
                        />
                    </div>
                    <div className="flex justify-end gap-3 mt-4">
                        <button type="button" onClick={onClose} className="btn btn-outline">Cancel</button>
                        <button type="submit" className="btn btn-primary">
                            {isEdit ? 'Save Changes' : 'Add Customer'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const Customers = () => {
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [history, setHistory] = useState([]);
    const [stats, setStats] = useState({ totalVisits: 0, totalSpent: 0, lastVisit: '' });
    const [searchTerm, setSearchTerm] = useState('');
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editData, setEditData] = useState(null);

    const load = async () => {
        try {
            const data = await api(`/api/customers?q=${encodeURIComponent(searchTerm)}`);
            const list = data.customers || [];
            setCustomers(list);
            if (!selectedCustomer && list.length > 0) setSelectedCustomer(list[0]);
        } catch (e) {
            notify(`Failed to load customers: ${e.message}`, 'error');
        }
    };

    useEffect(() => {
        load().catch((e) => notify(e.message, 'error'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm]);

    useEffect(() => {
        async function loadHistory() {
            if (!selectedCustomer?.id) {
                setHistory([]);
                setStats({ totalVisits: 0, totalSpent: 0, lastVisit: '' });
                return;
            }
            try {
                const data = await api(`/api/customers/${selectedCustomer.id}/history`);
                const orders = data.orders || [];
                setHistory(orders);
                const totalSpent = orders.reduce((s, o) => s + Number(o.total || 0), 0);
                const totalVisits = orders.length;
                const lastVisit = orders[0]?.date ? new Date(orders[0].date).toLocaleDateString() : '';
                setStats({ totalVisits, totalSpent, lastVisit });
            } catch (e) {
                notify(`Failed to load purchase history: ${e.message}`, 'error');
                setHistory([]);
                setStats({ totalVisits: 0, totalSpent: 0, lastVisit: '' });
            }
        }
        loadHistory();
    }, [selectedCustomer]);

    const filteredCustomers = customers.filter(c =>
        c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone || '').includes(searchTerm)
    );

    const handleSave = async (formData) => {
        try {
            const payload = {
                name: String(formData.get('name') || ''),
                phone: String(formData.get('phone') || ''),
                email: String(formData.get('email') || ''),
                address: String(formData.get('address') || ''),
            };
            if (editData?.id) {
                await api(`/api/customers/${editData.id}`, { method: 'PUT', body: JSON.stringify(payload) });
            } else {
                await api('/api/customers', { method: 'POST', body: JSON.stringify(payload) });
            }
            setIsFormOpen(false);
            setEditData(null);
            await load();
        } catch (e) {
            alert(e.message);
        }
    };

    const openAdd = () => {
        setEditData(null);
        setIsFormOpen(true);
    };

    const openEdit = () => {
        if (!selectedCustomer) return;
        setEditData(selectedCustomer);
        setIsFormOpen(true);
    };

    return (
        <div style={{ display: 'flex', gap: '1.5rem', height: 'calc(100vh - 64px - 3rem)' }}>
            <CustomerFormModal
                isOpen={isFormOpen}
                onClose={() => setIsFormOpen(false)}
                onSave={handleSave}
                initialData={editData}
            />

            {/* Left: Customer List */}
            <div className="card" style={{ width: '350px', display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}>
                <div style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>
                    <div className="flex items-center gap-2 mb-3">
                        <Search size={18} className="text-secondary" />
                        <input
                            type="text"
                            placeholder="Search customers..."
                            style={{ border: 'none', width: '100%', fontSize: '0.875rem' }}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button className="btn btn-primary w-full justify-center" onClick={openAdd}>
                        <Plus size={18} />
                        Add Customer
                    </button>
                </div>

                <div style={{ flex: 1, overflowY: 'auto' }}>
                    {filteredCustomers.map(customer => (
                        <div
                            key={customer.id}
                            style={{
                                padding: '1rem',
                                borderBottom: '1px solid var(--border)',
                                cursor: 'pointer',
                                backgroundColor: selectedCustomer?.id === customer.id ? 'var(--primary-soft)' : 'transparent',
                                borderLeft: selectedCustomer?.id === customer.id ? '4px solid var(--primary)' : '4px solid transparent'
                            }}
                            onClick={() => setSelectedCustomer(customer)}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-primary font-bold">
                                    {customer.name[0]}
                                </div>
                                <div>
                                    <h4 className="font-semibold text-sm">{customer.name}</h4>
                                    <p className="text-xs text-secondary">{customer.phone}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right: Customer Details */}
            <div className="card" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: '0' }}>
                {selectedCustomer ? (
                    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                        {/* Header Profile */}
                        <div style={{ padding: '2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div className="flex gap-4">
                                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-primary font-bold text-2xl">
                                    {selectedCustomer.name[0]}
                                </div>
                                <div>
                                    <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{selectedCustomer.name}</h2>
                                    <div className="flex flex-col gap-1 mt-1 text-secondary text-sm">
                                        <span className="flex items-center gap-2"><Phone size={14} /> {selectedCustomer.phone}</span>
                                        <span className="flex items-center gap-2"><Mail size={14} /> {selectedCustomer.email}</span>
                                        <span className="flex items-center gap-2"><MapPin size={14} /> {selectedCustomer.address}</span>
                                    </div>
                                </div>
                            </div>
                            <button className="btn btn-outline gap-2" onClick={openEdit}>
                                <Edit size={16} /> Edit Profile
                            </button>
                        </div>

                        {/* Stats Row */}
                        <div style={{ padding: '1.5rem', display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', backgroundColor: 'var(--surface-variant)' }}>
                            <div className="stat-box">
                                <span className="text-secondary text-xs font-bold uppercase">Total Visits</span>
                                <p className="text-xl font-bold mt-1">{stats.totalVisits}</p>
                            </div>
                            <div className="stat-box">
                                <span className="text-secondary text-xs font-bold uppercase">Total Spent</span>
                                <p className="text-xl font-bold mt-1 text-primary">₹{stats.totalSpent}</p>
                            </div>
                            <div className="stat-box">
                                <span className="text-secondary text-xs font-bold uppercase">Last Visit</span>
                                <p className="text-xl font-bold mt-1">{stats.lastVisit}</p>
                            </div>
                        </div>

                        {/* Purchase History */}
                        <div style={{ flex: 1, padding: '1.5rem', overflowY: 'auto' }}>
                            <h3 className="mb-4 flex items-center gap-2">
                                <ShoppingBag size={20} className="text-primary" />
                                Purchase History
                            </h3>

                            {history.length > 0 ? (
                                <table style={{ width: '100%' }}>
                                    <thead>
                                        <tr style={{ textAlign: 'left', borderBottom: '2px solid var(--border)', color: 'var(--text-secondary)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                                            <th style={{ paddingBottom: '0.5rem' }}>Invoice</th>
                                            <th style={{ paddingBottom: '0.5rem' }}>Date</th>
                                            <th style={{ paddingBottom: '0.5rem', textAlign: 'right' }}>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {history.map((order, i) => (
                                            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                                <td style={{ padding: '1rem 0', fontWeight: '500', color: 'var(--text-primary)' }}>{order.invoiceNo}</td>
                                                <td style={{ padding: '1rem 0', color: 'var(--text-secondary)' }}>{new Date(order.date).toLocaleString()}</td>
                                                <td style={{ padding: '1rem 0', textAlign: 'right', fontWeight: 'bold' }}>₹{order.total}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="flex flex-col items-center justify-center h-48 text-secondary">
                                    <ShoppingBag size={48} style={{ opacity: 0.2 }} />
                                    <p className="mt-2">No purchase history found</p>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-full text-secondary">
                        Select a customer to view details
                    </div>
                )}
            </div>
        </div>
    )
}

export default Customers;
