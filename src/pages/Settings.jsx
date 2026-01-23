import React, { useEffect, useState } from 'react';
import { Save, User, Building, Phone, Mail, FileText, Percent } from 'lucide-react';
import '../styles/Tables.css';
import { api } from '../api/client';

const Settings = () => {
    const [settings, setSettings] = useState({
        companyName: '',
        address: '',
        phone: '',
        email: '',
        taxRate: '0',
        currency: 'INR',
        terms: ''
    });

    useEffect(() => {
        async function load() {
            try {
                const data = await api('/api/settings');
                setSettings(data.settings);
            } catch (e) {
                console.error(e);
                alert(`Failed to load settings: ${e.message}`);
            }
        }
        load();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        try {
            const payload = {
                companyName: settings.companyName,
                address: settings.address,
                phone: settings.phone,
                email: settings.email,
                taxRate: String(settings.taxRate || '0'),
                currency: settings.currency,
                terms: settings.terms,
            };
            const res = await api('/api/settings', { method: 'PUT', body: JSON.stringify(payload) });
            setSettings(res.settings);
            alert('Settings saved successfully');
        } catch (e) {
            alert(`Failed to save settings: ${e.message}`);
        }
    };

    const inputStyle = {
        borderColor: 'var(--border)',
        backgroundColor: '#F8FAFC',
        transition: 'all 0.2s ease',
    };

    return (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="card">
                <div className="flex justify-between items-center mb-6 pb-4" style={{ borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: '700' }}>System Settings</h2>
                    <button className="btn btn-primary" onClick={handleSave}>
                        <Save size={18} />
                        Save Changes
                    </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Company Info Section */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-primary">
                            <Building size={20} />
                            Company Information
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="text-sm font-medium text-secondary mb-1 block">Company Name</label>
                                <input
                                    className="form-input"
                                    name="companyName" value={settings.companyName} onChange={handleChange}
                                />
                            </div>
                            <div className="form-group">
                                <label className="text-sm font-medium text-secondary mb-1 block">Phone Number</label>
                                <input
                                    className="form-input"
                                    name="phone" value={settings.phone} onChange={handleChange}
                                />
                            </div>
                            <div className="form-group" style={{ gridColumn: 'span 2' }}>
                                <label className="text-sm font-medium text-secondary mb-1 block">Address</label>
                                <input
                                    className="form-input"
                                    name="address" value={settings.address} onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    <hr style={{ borderTop: '1px solid var(--border)', margin: '1.5rem 0' }} />

                    {/* Finance Section */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-primary">
                            <DollarSignIcon size={20} />
                            Financial & Tax
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div className="form-group">
                                <label className="text-sm font-medium text-secondary mb-1 block">Currency</label>
                                <select
                                    className="form-input"
                                    name="currency" value={settings.currency} onChange={handleChange}
                                >
                                    <option value="INR">INR (₹)</option>
                                    <option value="USD">USD ($)</option>
                                    <option value="EUR">EUR (€)</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="text-sm font-medium text-secondary mb-1 block">Default Tax Rate (%)</label>
                                <input
                                    className="form-input"
                                    type="number"
                                    name="taxRate" value={settings.taxRate} onChange={handleChange}
                                />
                            </div>
                        </div>
                    </div>

                    <hr style={{ borderTop: '1px solid var(--border)', margin: '1.5rem 0' }} />

                    {/* Invoice Terms */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-primary">
                            <FileText size={20} />
                            Invoice Terms
                        </h3>
                        <div className="form-group">
                            <label className="text-sm font-medium text-secondary mb-1 block">Footer Text</label>
                            <textarea
                                className="form-input"
                                style={{ height: '100px', resize: 'none' }}
                                name="terms" value={settings.terms} onChange={handleChange}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

const DollarSignIcon = ({ size }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
);

export default Settings;
