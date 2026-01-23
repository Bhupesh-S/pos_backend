import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Store, Lock, Mail, ArrowRight, UserPlus } from 'lucide-react';
import { api, setToken } from '../api/client';

const Login = () => {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);
    const [mode, setMode] = useState('login'); // 'login' | 'signup'

    const handleLogin = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const form = new FormData(e.currentTarget);
            const email = String(form.get('email') || '');
            const password = String(form.get('password') || '');
            const data = await api('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ email, password })
            });
            setToken(data.token);
            navigate('/');
        } catch (err) {
            alert(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        try {
            const form = new FormData(e.currentTarget);
            const name = String(form.get('name') || '');
            const email = String(form.get('email') || '');
            const password = String(form.get('password') || '');
            const data = await api('/api/auth/signup', {
                method: 'POST',
                body: JSON.stringify({ name, email, password })
            });
            setToken(data.token);
            navigate('/');
        } catch (err) {
            alert(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{
            height: '100vh',
            width: '100vw',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'linear-gradient(135deg, #3B82F6, #2563EB)',
            padding: '1rem'
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '1.5rem',
                boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
                width: '100%',
                maxWidth: '400px',
                padding: '2.5rem',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
            }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    backgroundColor: '#EFF6FF',
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '1.5rem',
                    color: '#3B82F6'
                }}>
                    <Store size={32} />
                </div>

                <h1 style={{ fontSize: '1.75rem', fontWeight: '800', color: '#1E293B', marginBottom: '0.5rem' }}>
                    {mode === 'login' ? 'Welcome Back' : 'Create Account'}
                </h1>
                <p style={{ color: '#64748B', marginBottom: '2rem', textAlign: 'center' }}>
                    {mode === 'login' ? 'Sign in to access your POS dashboard' : 'Sign up to start using your POS'}
                </p>

                <form onSubmit={mode === 'login' ? handleLogin : handleSignup} style={{ width: '100%' }}>
                    {mode === 'signup' && (
                        <div style={{ marginBottom: '1rem' }}>
                            <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Full Name</label>
                            <input
                                type="text"
                                name="name"
                                required
                                placeholder="Jane Doe"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem',
                                    borderRadius: '0.75rem',
                                    border: '1px solid #E2E8F0',
                                    fontSize: '0.875rem',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                    backgroundColor: '#F8FAFC'
                                }}
                            />
                        </div>
                    )}
                    <div style={{ marginBottom: '1rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Email Address</label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>
                                <Mail size={18} />
                            </div>
                            <input
                                type="email"
                                name="email"
                                required
                                placeholder="admin@example.com"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem 0.75rem 36px',
                                    borderRadius: '0.75rem',
                                    border: '1px solid #E2E8F0',
                                    fontSize: '0.875rem',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                    backgroundColor: '#F8FAFC'
                                }}
                            />
                        </div>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: '600', color: '#475569', marginBottom: '0.5rem' }}>Password</label>
                        <div style={{ position: 'relative' }}>
                            <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94A3B8' }}>
                                <Lock size={18} />
                            </div>
                            <input
                                type="password"
                                name="password"
                                required
                                placeholder="••••••••"
                                style={{
                                    width: '100%',
                                    padding: '0.75rem 1rem 0.75rem 36px',
                                    borderRadius: '0.75rem',
                                    border: '1px solid #E2E8F0',
                                    fontSize: '0.875rem',
                                    outline: 'none',
                                    transition: 'all 0.2s',
                                    backgroundColor: '#F8FAFC'
                                }}
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            width: '100%',
                            padding: '0.875rem',
                            backgroundColor: '#3B82F6',
                            color: 'white',
                            borderRadius: '0.75rem',
                            fontWeight: '600',
                            fontSize: '0.875rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            opacity: isLoading ? 0.7 : 1,
                            border: 'none',
                            boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.4)'
                        }}
                    >
                        {isLoading ? (
                            mode === 'login' ? 'Signing in...' : 'Creating account...'
                        ) : (
                            <>
                                {mode === 'login' ? 'Sign In' : 'Sign Up'}
                                {mode === 'login' ? <ArrowRight size={18} /> : <UserPlus size={18} />}
                            </>
                        )}
                    </button>
                </form>

                <div style={{ marginTop: '1.5rem', fontSize: '0.75rem', color: '#94A3B8' }}>
                    <button onClick={() => setMode(mode === 'login' ? 'signup' : 'login')} style={{ background: 'none', border: 'none', color: '#64748B', cursor: 'pointer' }}>
                        {mode === 'login' ? 'Create an account' : 'Already have an account? Sign in'}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default Login;
