import React, { useEffect, useMemo, useState } from 'react';
import { Calendar, Download, TrendingUp, DollarSign, Package, Users } from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import '../styles/Dashboard.css';
import { api, notify } from '../api/client';

const fmtCurrency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const Reports = () => {
    const [dateRange, setDateRange] = useState('This Month');
    const [from, setFrom] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10));
    const [to, setTo] = useState(() => new Date().toISOString().slice(0,10));

    const [salesSummary, setSalesSummary] = useState({ totalRevenue: 0, taxCollected: 0, cogs: 0, profit: 0, count: 0 });
    const [salesSeries, setSalesSeries] = useState([]);
    const [topSelling, setTopSelling] = useState([]);
    const [taxSummary, setTaxSummary] = useState({ totalTax: 0, byRate: {}, series: [], count: 0 });
    const [profitSummary, setProfitSummary] = useState({ revenue: 0, cogs: 0, profit: 0, products: [], categories: [], series: [], count: 0 });
    const [inventorySnapshot, setInventorySnapshot] = useState({ totals: { stockUnits: 0, stockValueCost: 0, stockValueRetail: 0, lowStock: 0 }, rows: [], threshold: 5 });

    useEffect(() => {
        let cancelled = false;
        async function load() {
            try {
                const qs = `?from=${from}&to=${to}`;
                const sales = await api(`/api/reports/sales${qs}`);
                const tax = await api(`/api/reports/tax${qs}`);
                const profit = await api(`/api/reports/profit${qs}`);
                const inventory = await api(`/api/reports/inventory`);
                if (cancelled) return;
                setSalesSummary({ totalRevenue: sales.totalRevenue, taxCollected: sales.taxCollected, cogs: sales.cogs, profit: sales.profit, count: sales.count });
                setSalesSeries((sales.series || []).map((d) => ({ name: d.date, sales: d.total })));
                // top products: use profit products for accurate revenue/profit ranking
                setTopSelling((profit.products || []).sort((a,b) => Number(b.revenue||0) - Number(a.revenue||0)).slice(0,5));
                setTaxSummary({ totalTax: tax.totalTax, byRate: tax.byRate, series: tax.series || [], count: tax.count || 0 });
                setProfitSummary({ revenue: profit.revenue, cogs: profit.cogs, profit: profit.profit, products: profit.products || [], categories: profit.categories || [], series: profit.series || [], count: profit.count || 0 });
                setInventorySnapshot(inventory);
            } catch (e) {
                notify(`Failed to load reports: ${e.message}`, 'error');
            }
        }
        load();
        return () => { cancelled = true; };
    }, [from, to]);

    const handleExport = () => {
        try {
            const rows = [
                ['Metric','Value'],
                ['Total Revenue', salesSummary.totalRevenue],
                ['Tax Collected', salesSummary.taxCollected],
                ['COGS', salesSummary.cogs],
                ['Profit', salesSummary.profit],
                ['Orders', salesSummary.count],
                ['', ''],
                ['Sales Series'],
                ['Date','Total'],
                ...((salesSeries||[]).map(s => [s.name, s.sales])),
                ['', ''],
                ['Top Products'],
                ['Product','Revenue','Profit'],
                ...((topSelling||[]).map(t => [t.name, t.revenue, (t.profit != null ? t.profit : (Number(t.revenue||0) - Number(t.cost||0)))])),
            ];
            const csv = rows.map(r => r.join(',')).join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `reports_${from}_to_${to}.csv`;
            a.click();
            URL.revokeObjectURL(url);
            notify('Report exported as CSV', 'success');
        } catch (e) {
            notify(`Export failed: ${e.message}`, 'error');
        }
    };

    return (
        <div className="dashboard-container">
            {/* Header Actions */}
            <div className="flex justify-between items-center" style={{
                backgroundColor: 'white',
                padding: '1rem',
                borderRadius: '1rem',
                border: '1px solid var(--border)',
                marginBottom: '1rem'
            }}>
                <div className="flex items-center gap-4">
                    <span className="text-secondary font-medium">Filter by:</span>
                    <div className="flex items-center gap-2" style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: 'var(--surface-variant)',
                        border: '1px solid var(--border)',
                        borderRadius: '0.5rem',
                        cursor: 'pointer'
                    }}>
                        <Calendar size={16} className="text-primary" />
                        <span style={{ fontSize: '0.875rem', fontWeight: '500' }}>{dateRange}</span>
                    </div>
                </div>
                <button className="btn btn-primary" onClick={handleExport}>
                    <Download size={18} />
                    Export Report
                </button>
            </div>

            {/* Stats Row */}
            <div className="stats-grid">
                <div className="stat-card">
                    <div className="icon-box bg-blue-light text-blue">
                        <DollarSign size={24} />
                    </div>
                    <div>
                        <p className="stat-title">Total Revenue</p>
                        <h2 className="stat-value">{fmtCurrency(salesSummary.totalRevenue)}</h2>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="icon-box bg-indigo-light text-indigo">
                        <TrendingUp size={24} />
                    </div>
                    <div>
                        <p className="stat-title">Orders</p>
                        <h2 className="stat-value">{String(salesSummary.count || 0)}</h2>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="icon-box bg-green-light text-green">
                        <Package size={24} />
                    </div>
                    <div>
                        <p className="stat-title">Tax Collected</p>
                        <h2 className="stat-value">{fmtCurrency(salesSummary.taxCollected)}</h2>
                    </div>
                </div>
                <div className="stat-card">
                    <div className="icon-box bg-orange-light text-orange">
                        <Users size={24} />
                    </div>
                    <div>
                        <p className="stat-title">Profit</p>
                        <h2 className="stat-value">{fmtCurrency(salesSummary.profit)}</h2>
                    </div>
                </div>
            </div>

            {/* Charts Row */}
            <div className="dashboard-content-row">
                {/* Main Chart */}
                <div className="card" style={{ height: '400px' }}>
                    <div className="flex justify-between items-center mb-6">
                        <h3>Sales Trends</h3>
                        <div className="flex gap-2" style={{ backgroundColor: 'var(--surface-variant)', padding: '4px', borderRadius: '8px' }}>
                            <button className="px-3 py-1 bg-white shadow-sm rounded-md text-primary" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Revenue</button>
                            <button className="px-3 py-1 text-secondary" style={{ fontSize: '0.75rem', fontWeight: '600' }}>Orders</button>
                        </div>
                    </div>
                    <div style={{ flex: 1, minHeight: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={salesSeries}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} tickFormatter={(value) => fmtCurrency(value)} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Line type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Top Products */}
                <div className="card" style={{ height: '400px' }}>
                    <h3>Top Products</h3>
                    <div className="flex flex-col gap-4 overflow-y-auto">
                        {(topSelling || []).map((p, idx) => (
                            <div key={idx} className="flex items-center justify-between py-3" style={{ borderBottom: '1px solid var(--border)' }}>
                                <div className="flex items-center gap-4">
                                    <div style={{
                                        width: '3rem', height: '3rem',
                                        backgroundColor: 'var(--surface-variant)',
                                        borderRadius: '0.75rem',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: '0.75rem', fontWeight: 'bold', color: 'var(--text-tertiary)'
                                    }}>
                                        IMG
                                    </div>
                                    <div>
                                        <p style={{ fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{p.name}</p>
                                        <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Revenue: {fmtCurrency(p.revenue)}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p style={{ fontWeight: 'bold', fontSize: '0.9rem', color: 'var(--text-primary)' }}>{fmtCurrency((p.profit != null ? p.profit : (Number(p.revenue||0) - Number(p.cost||0))))}</p>
                                    <span style={{
                                        fontSize: '0.7rem', color: 'var(--success)',
                                        backgroundColor: 'var(--success-light)',
                                        padding: '0.2rem 0.5rem',
                                        borderRadius: '99px',
                                        fontWeight: '600'
                                    }}>Profit</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Reports;
