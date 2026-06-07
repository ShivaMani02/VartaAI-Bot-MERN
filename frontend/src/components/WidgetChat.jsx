import React, { useState, useEffect, useRef } from 'react';

// Proactively resolve the API host dynamically based on the current page's origin.
// In development, the React app runs on port 5173, so it communicates with port 5000.
// In production, they are hosted on the same origin (port 5000), so we use relative paths.
const API_BASE = window.location.port === '5173' 
  ? 'http://localhost:5000/api' 
  : '/api';

export default function WidgetChat() {
  const [visitorId, setVisitorId] = useState(localStorage.getItem('varta_visitor_id') || '');
  const [visitorName, setVisitorName] = useState(localStorage.getItem('varta_visitor_name') || '');
  const [conversationId, setConversationId] = useState('');
  
  // Onboarding state
  const [nameInput, setNameInput] = useState('');
  const [professionInput, setProfessionInput] = useState('Student');
  const [goalInput, setGoalInput] = useState('');
  const [onboardLoading, setOnboardLoading] = useState(false);

  // Chat conversation state
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [copiedMessageIndex, setCopiedMessageIndex] = useState(null);

  const messagesEndRef = useRef(null);

  // Load chat history if returning visitor
  useEffect(() => {
    if (visitorId) {
      loadHistory();
    }
  }, [visitorId]);

  // Scroll to bottom whenever messages list is updated
  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await fetch(`${API_BASE}/widget/history/${visitorId}`);
      const data = await res.json();
      if (res.ok) {
        setVisitorName(data.visitorName || '');
        if (data.conversationId) {
          setConversationId(data.conversationId);
          setMessages(data.messages || []);
        }
      }
    } catch (err) {
      console.error('Error loading returning visitor history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleOnboardSubmit = async (e) => {
    e.preventDefault();
    if (!nameInput.trim() || !goalInput.trim()) return;

    setOnboardLoading(true);
    try {
      const res = await fetch(`${API_BASE}/widget/onboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameInput.trim(),
          profession: professionInput,
          goal: goalInput.trim()
        })
      });

      const data = await res.json();
      if (res.ok) {
        // Save to state and localStorage
        localStorage.setItem('varta_visitor_id', data.visitorId);
        localStorage.setItem('varta_visitor_name', data.visitorName);
        setVisitorId(data.visitorId);
        setVisitorName(data.visitorName);
        setConversationId(data.conversationId);
        
        // Push initial friendly greeting from AI tailored to shivanshvasu platform
        setMessages([
          {
            sender: 'ai',
            text: `Hi **${data.visitorName}**! I'm the AI Guide for **theshivanshvasu** platform. I see you are a **${professionInput}** aiming to: *"${goalInput.trim()}"*. How can I help you navigate our core tracks (DSA 360, Elevate Full Stack, System Design), notes vault, or handbooks today?`,
            createdAt: new Date()
          }
        ]);
      } else {
        alert(data.error || 'Failed to complete onboarding');
      }
    } catch (err) {
      console.error('Onboarding request failed:', err);
      alert('Network error during onboarding. Please try again.');
    } finally {
      setOnboardLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputText.trim() || isTyping) return;

    const userMessageText = inputText.trim();
    setInputText('');

    // Append user message locally
    const localUserMsg = { sender: 'visitor', text: userMessageText, createdAt: new Date() };
    setMessages(prev => [...prev, localUserMsg]);
    setIsTyping(true);

    try {
      const res = await fetch(`${API_BASE}/widget/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          visitorId,
          conversationId,
          text: userMessageText
        })
      });

      const data = await res.json();
      if (res.ok) {
        setMessages(prev => [...prev, { sender: 'ai', text: data.reply, createdAt: new Date() }]);
      } else {
        setMessages(prev => [...prev, { sender: 'ai', text: `Error: ${data.error || 'Request failed.'}`, createdAt: new Date() }]);
      }
    } catch (err) {
      console.error('Chat endpoint error:', err);
      setMessages(prev => [...prev, { sender: 'ai', text: 'Connection lost. Please check your internet connection.', createdAt: new Date() }]);
    } finally {
      setIsTyping(false);
    }
  };

  // Safe and clean parser for rendering basic Markdown strings (bold, code blocks, lists)
  const formatMarkdown = (text) => {
    if (!text) return '';
    
    // Escape standard HTML tags for raw security
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

    // Bullet points (convert lines starting with "-" or "*" to bullets)
    escapedText = escapedText.replace(/^\s*[-*]\s+(.+)/gm, '• $1');

    // Line breaks
    escapedText = escapedText.replace(/\n/g, '<br />');

    return <span dangerouslySetInnerHTML={{ __html: escapedText }} />;
  };

  // Copy message utility
  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedMessageIndex(index);
        setTimeout(() => setCopiedMessageIndex(null), 2000);
      })
      .catch(err => console.error('Failed to copy text:', err));
  };

  // Send window postMessage to host browser site to close this iframe
  const closeChatWidget = () => {
    window.parent.postMessage('varta-close-chat', '*');
  };

  // Clear session / Reset onboarding for developer testing
  const resetOnboarding = () => {
    if (window.confirm('Reset onboarding and clear chat?')) {
      localStorage.removeItem('varta_visitor_id');
      localStorage.removeItem('varta_visitor_name');
      setVisitorId('');
      setVisitorName('');
      setConversationId('');
      setMessages([]);
    }
  };

  // ==========================================
  // VIEW RENDER
  // ==========================================

  // 1. ONBOARDING VIEW
  if (!visitorId) {
    return (
      <div className="chat-container d-flex flex-column h-100 justify-content-between p-4 border rounded-3 bg-white">
        <div>
          <div className="d-flex justify-content-between align-items-center pb-3 border-bottom mb-4">
            <div className="d-flex align-items-center gap-2">
              <span className="fs-4">💬</span>
              <h5 className="mb-0 fw-bold text-dark">VaartaAI Chat bot</h5>
            </div>
            <button className="btn btn-sm btn-light border-0" onClick={closeChatWidget} title="Close Widget">
              <i className="bi bi-x-lg text-secondary"></i>
            </button>
          </div>
          <div className="text-center mb-4">
            <h6 className="fw-semibold text-dark mb-1">Consistency Tracker Setup</h6>
            <p className="small text-muted mb-0">Help us guide you to the right course track, sheet, or roadmap.</p>
          </div>
          <form onSubmit={handleOnboardSubmit}>
            <div className="mb-3">
              <label htmlFor="onboard-name" className="form-label small fw-medium text-secondary">Your Name</label>
              <input
                id="onboard-name"
                type="text"
                className="form-control"
                placeholder="e.g. Alice Smith"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="onboard-profession" className="form-label small fw-medium text-secondary">What best describes you?</label>
              <select
                id="onboard-profession"
                className="form-select"
                value={professionInput}
                onChange={(e) => setProfessionInput(e.target.value)}
              >
                <option value="Student">Student</option>
                <option value="Developer">Developer</option>
                <option value="Founder">Founder</option>
                <option value="Job Seeker">Job Seeker</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="mb-4">
              <label htmlFor="onboard-goal" className="form-label small fw-medium text-secondary">What is your learning goal today?</label>
              <textarea
                id="onboard-goal"
                className="form-control"
                rows="3"
                placeholder="e.g. Master DSA, learn React/Node full-stack, download OS Notes..."
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                required
              ></textarea>
            </div>
            <button type="submit" className="btn btn-dark w-100 py-2 shadow-sm" disabled={onboardLoading}>
              {onboardLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Preparing Guide...
                </>
              ) : 'Start Chatting'}
            </button>
          </form>
        </div>
        <div className="text-center pt-3 border-top mt-4">
          <small className="text-muted">Consistent learning & structured roadmaps</small>
        </div>
      </div>
    );
  }

  // 2. CHAT MESSAGES VIEW
  return (
    <div className="chat-container">
      {/* Chat Frame Header */}
      <div className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom shadow-sm bg-white">
        <div className="d-flex align-items-center gap-2">
          <span className="fs-4">💬</span>
          <div>
            <h6 className="mb-0 fw-bold text-dark">VaartaAI Chat bot</h6>
            <span className="badge bg-success-subtle text-success border border-success-subtle py-1" style={{ fontSize: '0.7rem' }}>
              Speaking to {visitorName}
            </span>
          </div>
        </div>
        <div className="d-flex align-items-center gap-1">
          <button className="btn btn-sm btn-link text-decoration-none text-muted p-1" onClick={resetOnboarding} title="Reset Chat / New Persona">
            <i className="bi bi-arrow-clockwise fs-6"></i>
          </button>
          <button className="btn btn-sm btn-link text-decoration-none text-muted p-1" onClick={closeChatWidget} title="Close Chat">
            <i className="bi bi-x-lg fs-6"></i>
          </button>
        </div>
      </div>

      {/* Message Log */}
      <div className="chat-messages custom-scrollbar d-flex flex-column bg-light-subtle">
        {historyLoading ? (
          <div className="my-auto text-center">
            <div className="spinner-border spinner-border-sm text-secondary" role="status"></div>
            <p className="small text-muted mt-2">Syncing conversation history...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="my-auto text-center px-3">
            <p className="text-muted small">No messages yet. Send a message to start conversing with the AI!</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div 
              key={i} 
              className={`message-bubble ${msg.sender === 'visitor' ? 'visitor' : 'ai align-self-start'}`}
            >
              {formatMarkdown(msg.text)}

              {/* Hover Copy Button (Only for AI responses) */}
              {msg.sender === 'ai' && (
                <div className="copy-btn-wrapper">
                  <button 
                    onClick={() => copyToClipboard(msg.text, i)}
                    className="btn btn-sm btn-light border p-1 rounded shadow-sm bg-white"
                    style={{ fontSize: '0.75rem', padding: '1px 5px' }}
                    title="Copy response"
                  >
                    {copiedMessageIndex === i ? (
                      <i className="bi bi-check text-success"></i>
                    ) : (
                      <i className="bi bi-clipboard text-secondary"></i>
                    )}
                  </button>
                </div>
              )}
            </div>
          ))
        )}

        {/* Dynamic Typing Indicator bubble */}
        {isTyping && (
          <div className="typing-indicator my-1">
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Message Form */}
      <form onSubmit={handleSendMessage} className="p-3 border-top bg-white">
        <div className="input-group">
          <input
            type="text"
            className="form-control border-end-0 py-2 custom-scrollbar"
            placeholder="Type a message..."
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            disabled={isTyping || historyLoading}
            required
          />
          <button 
            type="submit" 
            className="btn btn-dark border-start-0 px-3"
            disabled={isTyping || historyLoading || !inputText.trim()}
          >
            <i className="bi bi-send-fill"></i>
          </button>
        </div>
      </form>
    </div>
  );
}
