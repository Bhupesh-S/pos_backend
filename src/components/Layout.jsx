import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  FileText,
  Settings,
  LogOut,
  Calendar,
  Bell,
  Search,
  ChevronDown,
  Store,
  BarChart3
} from 'lucide-react';
import '../styles/Layout.css';
import { api, setToken } from '../api/client';
import Toast from './Toast';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    let cancelled = false;
    api('/api/auth/me')
      .then((data) => {
        if (!cancelled) setUser(data.user);
      })
      .catch(() => {
        setToken(null);
        navigate('/login');
      });
    return () => { cancelled = true; };
  }, [navigate]);

  const navItems = [
    { path: '/', label: 'Overview', icon: LayoutDashboard },
    { path: '/billing', label: 'Billing', icon: ShoppingCart },
    { path: '/orders', label: 'Orders', icon: FileText },
    { path: '/products', label: 'Products', icon: Package },
    { path: '/customers', label: 'Customers', icon: Users },
    { path: '/reports', label: 'Reports', icon: BarChart3 },
    { path: '/settings', label: 'Settings', icon: Settings },
  ];

  const handleLogout = () => {
    setToken(null);
    navigate('/login');
  };

  const getPageTitle = (path) => {
    const item = navItems.find(i => i.path === path);
    return item ? item.label : 'Dashboard';
  };

  const [globalQuery, setGlobalQuery] = React.useState('');

  const handleGlobalSearchKey = (e) => {
    if (e.key === 'Enter') {
      const q = encodeURIComponent(globalQuery.trim());
      if (q) navigate(`/orders?q=${q}`);
    }
  };

  return (
    <div className="layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo-container">
          <div className="logo-box">
            <Store color="white" size={26} />
          </div>
        </div>

        <nav className="nav-list">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <div
                key={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                onClick={() => navigate(item.path)}
              >
                <Icon size={22} className={isActive ? 'text-white' : 'text-secondary'} />
                <span className={isActive ? 'text-white' : 'text-secondary'}>{item.label}</span>
              </div>
            );
          })}
        </nav>

        <div className="nav-item logout" onClick={handleLogout}>
          <LogOut size={22} color="var(--error)" />
          <span style={{ color: 'var(--error)', marginTop: '4px', fontSize: '10px', fontWeight: '500' }}>Logout</span>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="topbar">
          <div className="page-title">
            <h1>{getPageTitle(location.pathname)}</h1>
          </div>

          <div className="header-center">
            <div className="search-box">
              <Search className="search-icon" size={18} />
              <input
                type="text"
                placeholder="Search anything..."
                value={globalQuery}
                onChange={(e) => setGlobalQuery(e.target.value)}
                onKeyDown={handleGlobalSearchKey}
              />
              <div className="search-shortcut">
                ⌘K
              </div>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="date-badge">
              <Calendar size={14} />
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </div>
            <div className="icon-btn">
              <Bell size={20} />
              <span className="notification-dot"></span>
            </div>
            <div className="user-profile">
              <div className="avatar">A</div>
              <div className="user-info">
                <span className="user-name">{user?.name || 'User'}</span>
                <span className="user-role">{user?.role || ''}</span>
              </div>
              <ChevronDown size={14} className="profile-arrow" />
            </div>
          </div>
        </header>

        <div className="content-area">
          <Toast />
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
