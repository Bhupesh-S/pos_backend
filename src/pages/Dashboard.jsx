import React, { useEffect, useState } from 'react';
import { DollarSign, ShoppingCart, Package, AlertCircle, TrendingUp } from 'lucide-react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import '../styles/Dashboard.css';
import { api, notify } from '../api/client';

const fmtCurrency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const Dashboard = () => {
    const [stats, setStats] = useState({ totalRevenue: 0, totalOrders: 0, totalProducts: 0, lowStock: 0, taxCollected: 0, profit: 0 });
    const [salesOverview, setSalesOverview] = useState([]);
    const [recentTransactions, setRecentTransactions] = useState([]);

    useEffect(() => {
        async function load() {
            try {
                const data = await api('/api/analytics/dashboard');
                setStats(data.stats || { totalRevenue: 0, totalOrders: 0, totalProducts: 0, lowStock: 0 });
                setSalesOverview(data.salesOverview || []);
                setRecentTransactions(data.recentTransactions || []);
            } catch (e) {
                console.error(e);
                notify(`Failed to load dashboard: ${e.message}`, 'error');
            }
        }
        load();
    }, []);

    return (
        <div className="dashboard-container">
            <div className="stats-grid">
                <StatCard title="Total Sales" value={fmtCurrency(stats.totalRevenue)} icon={DollarSign} color="blue" trend="" />
                <StatCard title="Total Orders" value={String(stats.totalOrders)} icon={ShoppingCart} color="indigo" trend="" />
                <StatCard title="Total Products" value={String(stats.totalProducts)} icon={Package} color="green" trend="" />
                <StatCard title="Low Stock" value={String(stats.lowStock)} icon={AlertCircle} color="orange" trend="" />
                <StatCard title="Tax Collected" value={fmtCurrency(stats.taxCollected)} icon={DollarSign} color="purple" trend="" />
                <StatCard title="Profit" value={fmtCurrency(stats.profit)} icon={DollarSign} color="teal" trend="" />
            </div>

            <div className="dashboard-content-row">
                <div className="chart-container card" style={{ height: '400px' }}>
                    <div className="flex justify-between items-center mb-4">
                        <h3 style={{ marginBottom: 0 }}>Sales Overview</h3>
                        <div className="flex gap-2">
                            <select className="text-sm border rounded p-1" style={{ borderColor: 'var(--border)' }}>
                                <option>This Week</option>
                                <option>Last Week</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ flex: 1, minHeight: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={salesOverview}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} dy={10} />
                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748B', fontSize: 12 }} tickFormatter={(value) => fmtCurrency(value)} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                />
                                <Line type="monotone" dataKey="sales" stroke="#3B82F6" strokeWidth={3} dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 6 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="recent-transactions card">
                    <h3>
                        Recent Transactions
                        <button className="text-secondary hover:text-primary text-sm font-medium">View All</button>
                    </h3>
                    <div className="flex flex-col">
                        {(recentTransactions || []).map((t) => (
                            <div key={t.invoiceNo} className="transaction-item">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xs">
                                        INV
                                    </div>
                                    <div>
                                        <p className="text-sm font-semibold text-primary">Invoice #{t.invoiceNo}</p>
                                        <p className="text-xs text-secondary">{new Date(t.date).toLocaleString()}</p>
                                    </div>
                                </div>
                                <span className="text-sm font-bold text-primary">{fmtCurrency(t.total)}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

const StatCard = ({ title, value, icon: Icon, color, trend }) => {
    return (
        <div className="stat-card">
            <div className={`icon-box bg-${color}-light`}>
                <Icon size={24} className={`text-${color}`} />
            </div>
            <div style={{ flex: 1 }}>
                <p className="stat-title">{title}</p>
                <div className="flex items-end justify-between">
                    <h2 className="stat-value">{value}</h2>
                    <span className="text-xs font-semibold text-green px-2 py-1 rounded-full flex items-center gap-1 bg-green-light">
                        {trend} <TrendingUp size={10} />
                    </span>
                </div>
            </div>
        </div>
    )
}

export default Dashboard;
