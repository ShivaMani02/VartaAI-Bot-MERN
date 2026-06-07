import React, { useState, useEffect } from 'react';

// Resolve backend API address dynamically
const API_BASE = window.location.port === '5173' 
  ? 'http://localhost:5000/api' 
  : '/api';

const HARDCODED_PASSWORD = "varta123";

export default function AdminDashboard() {
  const [authorized, setAuthorized] = useState(false);
  const [checked, setChecked] = useState(false);
  
  // Dashboard states
  const [conversations, setConversations] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  
  // Active selected conversation
  const [selectedChat, setSelectedChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);

  // Trigger password window prompt immediately on mount
  useEffect(() => {
    runPasswordPrompt();
  }, []);

  const runPasswordPrompt = () => {
    const passwordInput = window.prompt("Enter Admin Password:");
    if (passwordInput === HARDCODED_PASSWORD) {
      setAuthorized(true);
      fetchDashboardData();
    } else {
      setAuthorized(false);
      if (passwordInput !== null) {
        alert("Incorrect password! Access Denied.");
      }
    }
    setChecked(true);
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Fetch both conversations list and analytics concurrently
      const [convRes, anaRes] = await Promise.all([
        fetch(`${API_BASE}/conversations`),
        fetch(`${API_BASE}/analytics`)
      ]);

      if (convRes.ok && anaRes.ok) {
        const convData = await convRes.json();
        const anaData = await anaRes.json();
        setConversations(convData);
        setAnalytics(anaData);
      }
    } catch (err) {
      console.error("Error fetching admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conversation) => {
    setSelectedChat(conversation);
    setChatLoading(true);
    try {
      const res = await fetch(`${API_BASE}/conversations/${conversation._id}`);
      if (res.ok) {
        const data = await res.json();
        setChatMessages(data.messages || []);
      }
    } catch (err) {
      console.error("Failed to load message log:", err);
    } finally {
      setChatLoading(false);
    }
  };

  // Safe and clean parser for rendering basic Markdown strings (bold, code blocks, lists)
  const formatMarkdown = (text) => {
    if (!text) return '';
    
    let escapedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Fenced Code Blocks (```code```)
    escapedText = escapedText.replace(/```([\s\S]*?)```/g, (match, p1) => {
      return `<pre class="my-2"><code class="text-light">${p1.trim()}</code></pre>`;
    });

    // Inline Code (`code`)
    escapedText = escapedText.replace(/`([^`\n]+)`/g, '<code>$1</code>');

    // Bold text (**bold**)
    escapedText = escapedText.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Bullet points
    escapedText = escapedText.replace(/^\s*[-*]\s+(.+)/gm, '• $1');

    // Line breaks
    escapedText = escapedText.replace(/\n/g, '<br />');

    return <span dangerouslySetInnerHTML={{ __html: escapedText }} />;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // ==========================================
  // VIEW RENDER
  // ==========================================

  // Unauthorised fallback display
  if (!authorized) {
    return (
      <div className="container py-5 mt-5">
        <div className="row justify-content-center">
          <div className="col-md-6 text-center">
            <div className="card border-0 shadow-sm p-5 bg-white">
              <div className="mb-4">
                <span className="fs-1 text-danger">⚠️</span>
              </div>
              <h3 className="fw-bold text-dark">Access Denied</h3>
              <p className="text-muted mb-4">You must enter the correct password to view the admin dashboard portal.</p>
              <div className="d-flex justify-content-center gap-2">
                <button onClick={runPasswordPrompt} className="btn btn-dark px-4">
                  Retry Password
                </button>
                <a href="/" className="btn btn-outline-secondary px-4">
                  Go to Hub
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Top Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark shadow-sm">
        <div className="container-fluid px-4">
          <a className="navbar-brand d-flex align-items-center gap-2" href="#">
            <span>💬</span> <strong>Vaarta Admin Portal</strong>
          </a>
          <div className="d-flex gap-2">
            <button onClick={fetchDashboardData} className="btn btn-sm btn-outline-light" disabled={loading} title="Refresh Dashboard">
              <i className="bi bi-arrow-clockwise me-1"></i> Refresh
            </button>
            <button onClick={() => { setAuthorized(false); }} className="btn btn-sm btn-danger">
              Lock Portal
            </button>
          </div>
        </div>
      </nav>

      {/* Main Two-Column Layout */}
      <div className="row g-0 flex-grow-1">
        {/* Left Side: Recent Conversations List */}
        <div className="col-md-4 admin-sidebar bg-white">
          <div className="p-3 border-bottom bg-light">
            <h6 className="mb-0 fw-bold text-secondary text-uppercase" style={{ fontSize: '0.8rem', letterSpacing: '0.5px' }}>
              Recent Conversations ({conversations.length})
            </h6>
          </div>
          
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border spinner-border-sm text-secondary" role="status"></div>
              <p className="small text-muted mt-2">Loading logs...</p>
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-5 text-muted small px-3">
              No conversations logged in database. Open the widget to create a conversation.
            </div>
          ) : (
            <div className="list-group list-group-flush">
              {conversations.map((conv) => {
                const visitor = conv.visitorId || { name: 'Anonymous', profession: 'Unknown', goal: 'Not specified' };
                const isSelected = selectedChat && selectedChat._id === conv._id;

                return (
                  <button
                    key={conv._id}
                    onClick={() => selectConversation(conv)}
                    className={`list-group-item list-group-item-action text-start p-3 border-bottom ${isSelected ? 'bg-light-subtle active border-start border-4 border-dark' : ''}`}
                    style={{ borderLeftColor: isSelected ? '#212529' : 'transparent' }}
                  >
                    <div className="d-flex justify-content-between align-items-start mb-1">
                      <h6 className={`mb-0 fw-bold ${isSelected ? 'text-dark' : 'text-dark'}`}>
                        {visitor.name}
                      </h6>
                      <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                        {formatDate(conv.createdAt)}
                      </small>
                    </div>
                    <div className="mb-1 text-muted" style={{ fontSize: '0.85rem' }}>
                      <strong>Profession:</strong> {visitor.profession}
                    </div>
                    <div className="text-truncate text-secondary" style={{ fontSize: '0.8rem' }} title={visitor.goal}>
                      <strong>Goal:</strong> {visitor.goal}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Conversation Viewer OR Dashboard Analytics */}
        <div className="col-md-8 admin-chat-viewer">
          {selectedChat ? (
            // Render active conversation viewer
            <div className="d-flex flex-column h-100">
              {/* Active Header */}
              <div className="p-3 bg-white border-bottom shadow-sm d-flex justify-content-between align-items-center">
                <div>
                  <h6 className="mb-0 fw-bold text-dark">
                    Transcript with {selectedChat.visitorId?.name || 'Anonymous'}
                  </h6>
                  <span className="small text-muted">
                    Profession: <strong>{selectedChat.visitorId?.profession || 'Unknown'}</strong> | Goal: <em>"{selectedChat.visitorId?.goal || 'None'}"</em>
                  </span>
                </div>
                <button onClick={() => setSelectedChat(null)} className="btn btn-sm btn-outline-secondary">
                  Close Transcript
                </button>
              </div>

              {/* Chat Message Scroll */}
              <div className="admin-transcript custom-scrollbar flex-grow-1">
                {chatLoading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border spinner-border-sm text-secondary" role="status"></div>
                    <p className="small text-muted mt-2">Retrieving logs...</p>
                  </div>
                ) : chatMessages.length === 0 ? (
                  <div className="text-center py-5 text-muted small">
                    This conversation has no logged messages.
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {chatMessages.map((msg, idx) => {
                      const isVisitor = msg.sender === 'visitor';
                      return (
                        <div key={idx} className={`d-flex flex-column ${isVisitor ? 'align-items-end' : 'align-items-start'}`}>
                          <div className={`p-3 rounded shadow-sm border`} style={{
                            maxWidth: '75%',
                            backgroundColor: isVisitor ? '#f8f9fa' : '#ffffff',
                            color: '#1e293b',
                            borderColor: '#dee2e6',
                            borderBottomRightRadius: isVisitor ? '0px' : '8px',
                            borderBottomLeftRadius: isVisitor ? '8px' : '0px',
                          }}>
                            <div className="small fw-bold text-secondary mb-1">
                              {isVisitor ? (selectedChat.visitorId?.name || 'Visitor') : 'Vaarta AI Guide'}
                            </div>
                            <div style={{ fontSize: '0.95rem', wordBreak: 'break-word', lineHeight: '1.5' }}>
                              {formatMarkdown(msg.text)}
                            </div>
                          </div>
                          <small className="text-muted mt-1 px-1" style={{ fontSize: '0.7rem' }}>
                            {formatDate(msg.createdAt)}
                          </small>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            // Render Analytics overview (Default view)
            <div className="p-4 flex-grow-1 overflow-auto bg-light">
              <div className="card shadow-sm border-0 bg-white p-4 mb-4">
                <h4 className="fw-bold text-dark mb-1">Dashboard Analytics</h4>
                <p className="text-muted">Real-time usage and onboarding stats for your Vaarta chatbot.</p>
                <hr />
                
                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border spinner-border-sm text-secondary" role="status"></div>
                    <p className="small text-muted mt-2">Crunching numbers...</p>
                  </div>
                ) : analytics ? (
                  <div className="row g-3 my-2">
                    <div className="col-md-4">
                      <div className="card border-0 bg-light p-3 hover-card text-center shadow-sm">
                        <span className="fs-3">👤</span>
                        <h3 className="fw-bold text-dark mt-2 mb-0">{analytics.totalVisitors}</h3>
                        <span className="text-muted small">Total Visitors Onboarded</span>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="card border-0 bg-light p-3 hover-card text-center shadow-sm">
                        <span className="fs-3">💬</span>
                        <h3 className="fw-bold text-dark mt-2 mb-0">{analytics.totalConversations}</h3>
                        <span className="text-muted small">Active Conversations</span>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="card border-0 bg-light p-3 hover-card text-center shadow-sm">
                        <span className="fs-3">✉️</span>
                        <h3 className="fw-bold text-dark mt-2 mb-0">{analytics.totalMessages}</h3>
                        <span className="text-muted small">Messages Exchanged</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-muted text-center py-4">Failed to fetch metrics summary.</div>
                )}
              </div>

              {analytics && analytics.professionBreakdown && (
                <div className="card shadow-sm border-0 bg-white p-4">
                  <h6 className="fw-bold text-dark mb-3">Visitor Audience Demographics</h6>
                  <div className="row">
                    <div className="col-md-6">
                      {analytics.professionBreakdown.length === 0 ? (
                        <div className="small text-muted">No demographics recorded yet.</div>
                      ) : (
                        <ul className="list-group list-group-flush">
                          {analytics.professionBreakdown.map((item, idx) => (
                            <li key={idx} className="list-group-item d-flex justify-content-between align-items-center px-0">
                              <span>
                                <span className="badge bg-secondary me-2">{idx + 1}</span>
                                {item._id}
                              </span>
                              <span className="badge bg-dark rounded-pill">{item.count}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="col-md-6 d-flex align-items-center justify-content-center">
                      <div className="text-center p-3 text-secondary">
                        <i className="bi bi-people-fill display-4 text-muted"></i>
                        <p className="small mt-2 mb-0">Select any visitor on the left list panel to browse their specific conversation logs and goal context.</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
