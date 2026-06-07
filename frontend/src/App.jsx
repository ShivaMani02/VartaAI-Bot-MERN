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
            <h1 className="display-4 fw-bold text-dark mb-3">💬 Varta Assistant Dev Hub</h1>
            <p className="lead text-muted mb-4">
              Welcome to the MERN development dashboard for Varta Assistant.
              Below are the links to test the components directly.
            </p>
            <div className="d-flex justify-content-center gap-3">
              <a href="/admin" className="btn btn-dark btn-lg px-4 py-2 shadow-sm">
                <i className="bi bi-shield-lock-fill me-2"></i> Admin Panel
              </a>
              <a href="/widget-frame" className="btn btn-outline-secondary btn-lg px-4 py-2">
                <i className="bi bi-chat-dots-fill me-2"></i> Widget Chat Screen
              </a>
            </div>
            <hr className="my-5" />
            <div className="text-start">
              <h5 className="fw-semibold text-dark">Quick Setup Checklist:</h5>
              <ul className="text-muted">
                <li>Create <code>.env</code> inside the <code>server/</code> folder using <code>.env.example</code>.</li>
                <li>Run <code>npm run dev</code> at the root to spin up Vite and the Express API server.</li>
                <li>Open the main root homepage <code>index.html</code> (by opening it in your browser or double clicking the file) to see the floating widget working live!</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
