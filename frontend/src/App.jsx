import React, { useState, useEffect } from 'react';
import WidgetChat from './components/WidgetChat';
import AdminDashboard from './components/AdminDashboard';

function App() {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  // Monitor location shifts (in case of manual history pushes)
  useEffect(() => {
    const handleLocationChange = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handleLocationChange);
    return () => window.removeEventListener('popstate', handleLocationChange);
  }, []);

  // Simple path router mapping path to respective view component
  if (currentPath === '/widget-frame') {
    return <WidgetChat />;
  }

  if (currentPath === '/admin') {
    return <AdminDashboard />;
  }

  // Fallback / Helper page for development
  return (
    <div className="container py-5 mt-5">
      <div className="row justify-content-center">
        <div className="col-md-8 text-center">
          <div className="card shadow-sm border-0 p-5 bg-white">
            <h1 className="display-5 fw-bold text-dark mb-3">💬 VaartaAI Hub</h1>
            <p className="lead text-muted mb-4" style={{ fontSize: '1.05rem' }}>
              Welcome to the MERN development dashboard for the <strong>VaartaAI</strong> chatbot widget.
              Below are the routes to test the chat widget frame and admin dashboard directly.
            </p>
            <div className="d-flex justify-content-center gap-3">
              <a href="/admin" className="btn btn-dark btn-lg px-4 py-2 shadow-sm" style={{ fontSize: '0.95rem' }}>
                <i className="bi bi-shield-lock-fill me-2"></i> Admin Panel
              </a>
              <a href="/widget-frame" className="btn btn-outline-secondary btn-lg px-4 py-2" style={{ fontSize: '0.95rem' }}>
                <i className="bi bi-chat-dots-fill me-2"></i> Chat Widget Screen
              </a>
            </div>
            <hr className="my-5" />
            <div className="text-start">
              <h5 className="fw-semibold text-dark mb-3">Quick Setup Checklist:</h5>
              <ul className="text-muted small">
                <li className="mb-2">Create <code>.env</code> inside the <code>server/</code> folder using <code>.env.example</code>.</li>
                <li className="mb-2">Run <code>npm run dev</code> at the root to spin up Vite and the Express API server.</li>
                <li className="mb-2">Open the main root homepage <code>index.html</code> (pointing to <a href="https://theshivanshvasu.com/" target="_blank" rel="noreferrer">https://theshivanshvasu.com/</a> for empty links) to see the floating chatbot widget working live!</li>
              </ul>
            </div>
            <div className="text-center pt-3 border-top mt-4 text-muted small" style={{ fontSize: '0.8rem' }}>
              Powered by <span className="fw-semibold">VaartaAI</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
