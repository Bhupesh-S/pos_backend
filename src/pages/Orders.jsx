import React, { useEffect, useState } from 'react';
import { Search, Filter, Printer, Eye, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import '../styles/Tables.css';
import { api } from '../api/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useLocation } from 'react-router-dom';

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [customersMap, setCustomersMap] = useState({});
    const [currency, setCurrency] = useState('INR');

    const [expandedRow, setExpandedRow] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);

    const load = async () => {
        const data = await api('/api/orders');
        setOrders(data.orders || []);
    };

    useEffect(() => {
        load().catch((e) => alert(e.message));
        api('/api/customers')
            .then((data) => {
                const map = {};
                for (const c of data.customers || []) map[c.id] = c.name || c.phone || c.email || c.id;
                setCustomersMap(map);
            })
            .catch(() => {});
        api('/api/settings')
            .then((s) => setCurrency(s.settings?.currency || 'INR'))
            .catch(() => {});
    }, []);

    // Apply global search from query param `q`
    const location = useLocation();
    useEffect(() => {
        try {
            const params = new URLSearchParams(location.search || '');
            const q = params.get('q');
            if (q && q !== searchQuery) setSearchQuery(decodeURIComponent(q));
        } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [location.search]);

    const toggleRow = (id) => {
        if (expandedRow === id) {
            setExpandedRow(null);
        } else {
            setExpandedRow(id);
        }
    };

    const getStatusBadge = (status) => {
        return status === 'Paid' ? 'badge-success' : 'badge-warning';
    };

    const withNames = orders.map((o) => ({
        ...o,
        displayCustomer: o.customer && customersMap[o.customer] ? customersMap[o.customer] : (o.customer || 'Walk-in Customer'),
    }));

    const filteredOrders = withNames.filter(order => {
        const matchesSearch = order.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
            order.displayCustomer.toLowerCase().includes(searchQuery.toLowerCase());

        const matchesStatus = statusFilter === 'All' || order.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const currencySymbol = (code) => {
        switch (code) {
            case 'INR': return '₹';
            case 'USD': return '$';
            case 'EUR': return '€';
            default: return code || '₹';
        }
    };

    const handleDelete = async (invoiceNo) => {
        if (!window.confirm('Delete this order?')) return;
        try {
            await api(`/api/orders/${invoiceNo}`, { method: 'DELETE' });
            await load();
        } catch (e) {
            alert(`Failed to delete order ${invoiceNo}: ${e.message}`);
        }
    };

    const handlePrint = (order) => {
        try {
            const doc = new jsPDF();
            doc.setFontSize(14);
            doc.text(`Invoice #${order.id}`, 14, 20);
            doc.setFontSize(10);
            doc.text(`Date: ${order.date}`, 14, 26);
            doc.text(`Customer: ${order.displayCustomer}`, 14, 32);

            const items = Array.isArray(order.items) ? order.items : [];
            const rows = items.map((i) => [
                String(i.name ?? ''),
                String(i.qty ?? 0),
                `${currencySymbol(currency)}${Number(i.price ?? 0).toFixed(2)}`,
                `${currencySymbol(currency)}${Number((i.price ?? 0) * (i.qty ?? 0)).toFixed(2)}`,
            ]);

            autoTable(doc, {
                head: [['Item', 'Qty', 'Price', 'Total']],
                body: rows,
                startY: 38,
                styles: { fontSize: 10 },
            });

            const tableY = (doc.lastAutoTable && doc.lastAutoTable.finalY) ? doc.lastAutoTable.finalY : 38;
            const subtotal = order.subtotal ?? items.reduce((s, i) => s + (Number(i.price ?? 0) * Number(i.qty ?? 0)), 0);
            const taxAmount = order.taxAmount ?? 0;
            const grandTotal = order.total ?? (subtotal + taxAmount);

            doc.text(`Subtotal: ${currencySymbol(currency)}${Number(subtotal).toFixed(2)}`, 14, tableY + 10);
            doc.text(`Tax: ${currencySymbol(currency)}${Number(taxAmount).toFixed(2)}`, 14, tableY + 16);
            doc.setFontSize(12);
            doc.text(`Grand Total: ${currencySymbol(currency)}${Number(grandTotal).toFixed(2)}`, 14, tableY + 24);
            doc.save(`invoice_${order.id}.pdf`);
        } catch (e) {
            alert(`Failed to generate PDF: ${e.message}`);
        }
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div className="table-container">
                <div className="table-header">
                    <div className="flex items-center gap-2" style={{ position: 'relative' }}>
                        <Search size={18} className="text-secondary" style={{ position: 'absolute', left: '10px' }} />
                        <input
                            type="text"
                            placeholder="Search orders..."
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
                            className={`btn ${statusFilter !== 'All' ? 'btn-primary' : 'btn-outline'}`}
                            onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                        >
                            <Filter size={18} />
                            {statusFilter === 'All' ? 'Filter' : statusFilter}
                        </button>

                        {showFilterDropdown && (
                            <div style={{
                                position: 'absolute',
                                right: 0,
                                top: '100%',
                                marginTop: '0.5rem',
                                backgroundColor: 'white',
                                border: '1px solid var(--border)',
                                borderRadius: '0.5rem',
                                boxShadow: 'var(--shadow)',
                                padding: '0.5rem',
                                zIndex: 10,
                                minWidth: '150px'
                            }}>
                                {['All', 'Paid', 'Pending'].map(option => (
                                    <div
                                        key={option}
                                        onClick={() => {
                                            setStatusFilter(option);
                                            setShowFilterDropdown(false);
                                        }}
                                        className="dropdown-item"
                                        style={{
                                            backgroundColor: statusFilter === option ? 'var(--primary-soft)' : 'transparent',
                                            color: statusFilter === option ? 'var(--primary)' : 'var(--text-primary)',
                                            fontWeight: statusFilter === option ? '600' : '400'
                                        }}
                                    >
                                        {option}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <table>
                    <thead>
                        <tr>
                            <th style={{ width: '40px' }}></th>
                            <th>Invoice ID</th>
                            <th>Date</th>
                            <th>Customer</th>
                            <th>Status</th>
                            <th style={{ textAlign: 'right' }}>Total</th>
                            <th style={{ textAlign: 'right' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredOrders.map(order => (
                            <React.Fragment key={order.id}>
                                <tr onClick={() => toggleRow(order.id)} style={{ cursor: 'pointer' }}>
                                    <td style={{ textAlign: 'center', color: 'var(--text-secondary)' }}>
                                        {expandedRow === order.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </td>
                                    <td className="font-semibold text-primary">{order.id}</td>
                                    <td>{order.date}</td>
                                    <td>{order.displayCustomer}</td>
                                    <td>
                                        <span className={`badge ${getStatusBadge(order.status)}`}>
                                            {order.status}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right', fontWeight: 'bold' }}>{currencySymbol(currency)}{order.total}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <div className="flex justify-end gap-2">
                                            <button className="icon-btn text-secondary hover:text-primary" onClick={(e) => { e.stopPropagation(); handlePrint(order); }} title="Print">
                                                <Printer size={18} />
                                            </button>
                                            <button className="icon-btn text-secondary hover:text-error" onClick={(e) => { e.stopPropagation(); handleDelete(order.id); }} title="Delete">
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                                {expandedRow === order.id && (
                                    <tr style={{ backgroundColor: 'var(--surface-variant)' }}>
                                        <td colSpan="7" style={{ padding: '0' }}>
                                            <div style={{ padding: '1rem 2rem', borderTop: '1px solid var(--border)' }}>
                                                <h4 style={{ fontSize: '0.875rem', fontWeight: 'bold', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                                    Order Items
                                                </h4>
                                                <table style={{ width: '100%', fontSize: '0.875rem' }}>
                                                    <thead>
                                                        <tr>
                                                            <th style={{ padding: '0.5rem', background: 'transparent', fontSize: '0.75rem' }}>Item</th>
                                                            <th style={{ padding: '0.5rem', background: 'transparent', fontSize: '0.75rem' }}>Qty</th>
                                                            <th style={{ padding: '0.5rem', background: 'transparent', fontSize: '0.75rem', textAlign: 'right' }}>Price</th>
                                                            <th style={{ padding: '0.5rem', background: 'transparent', fontSize: '0.75rem', textAlign: 'right' }}>Total</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {order.items.map((item, idx) => (
                                                            <tr key={idx} style={{ borderBottom: '1px dashed var(--border)' }}>
                                                                <td style={{ padding: '0.5rem', background: 'transparent' }}>{item.name}</td>
                                                                <td style={{ padding: '0.5rem', background: 'transparent' }}>{item.qty}</td>
                                                                <td style={{ padding: '0.5rem', background: 'transparent', textAlign: 'right' }}>₹{item.price}</td>
                                                                <td style={{ padding: '0.5rem', background: 'transparent', textAlign: 'right' }}>₹{item.price * item.qty}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                                <div style={{ textAlign: 'right', marginTop: '1rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', fontSize: '0.875rem' }}>
                                                    <span style={{ color: 'var(--text-secondary)' }}>Total Items: {order.items.length}</span>
                                                    <span style={{ fontWeight: 'bold' }}>Grand Total: ₹{order.total}</span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

export default Orders;
