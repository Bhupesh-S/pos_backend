import React from 'react';

const Toast = () => {
  const [toasts, setToasts] = React.useState([]);

  React.useEffect(() => {
    function onNotify(e) {
      const { message, type } = e.detail || {};
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, message, type }]);
      // Auto-dismiss
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3500);
    }
    window.addEventListener('pos:notify', onNotify);
    return () => window.removeEventListener('pos:notify', onNotify);
  }, []);

  return (
    <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: '8px' }}>
      {toasts.map((t) => (
        <div key={t.id} style={{
          background: '#fff',
          border: '1px solid var(--border)',
          borderLeft: `4px solid ${t.type === 'error' ? 'var(--error)' : t.type === 'success' ? 'var(--success)' : 'var(--primary)'}`,
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
          padding: '10px 12px',
          borderRadius: '6px',
          minWidth: '280px',
          color: t.type === 'error' ? 'var(--error)' : 'var(--text-primary)'
        }}>
          {t.message}
        </div>
      ))}
    </div>
  );
};

export default Toast;