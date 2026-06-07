(function() {
  // Prevent duplicate script loads
  if (window.VartaWidgetInitialized) return;
  window.VartaWidgetInitialized = true;

  // 1. Proactively determine the backend host server based on this script's loaded location
  // This allows the widget to be embedded anywhere (production or local) without hardcoding domains.
  const scriptTag = document.currentScript || (() => {
    const scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();
  
  const scriptSrc = scriptTag ? scriptTag.src : 'http://localhost:5000/widget.js';
  const backendUrl = new URL(scriptSrc).origin;
  const iframeUrl = `${backendUrl}/widget-frame`;

  // 2. Inject CSS Styles directly into host head
  const css = `
    /* Floating Launcher Button */
    #varta-launcher {
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 999999;
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }
    #varta-launcher:hover {
      transform: scale(1.08) rotate(5deg);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.25);
    }
    #varta-launcher:active {
      transform: scale(0.95);
    }
    
    /* Launcher SVGs */
    #varta-launcher svg {
      width: 28px;
      height: 28px;
      fill: none;
      stroke: #ffffff;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
      transition: transform 0.3s ease;
    }
    #varta-launcher .varta-icon-close {
      display: none;
    }

    /* Floating Chat Container (Holds Iframe) */
    #varta-container {
      position: fixed;
      bottom: 95px;
      right: 20px;
      width: 400px;
      height: 600px;
      max-width: calc(100vw - 40px);
      max-height: calc(100vh - 120px);
      border-radius: 16px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.16);
      background: #ffffff;
      z-index: 999998;
      overflow: hidden;
      display: none;
      opacity: 0;
      transform: translateY(20px) scale(0.95);
      transition: opacity 0.3s cubic-bezier(0.16, 1, 0.3, 1), transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
    }

    #varta-container.varta-visible {
      display: block;
      opacity: 1;
      transform: translateY(0) scale(1);
    }

    /* Responsive adjustments for mobile views */
    @media (max-width: 480px) {
      #varta-container {
        width: 100vw;
        height: 100vh;
        max-width: 100%;
        max-height: 100%;
        bottom: 0;
        right: 0;
        border-radius: 0;
      }
      #varta-container.varta-visible {
        bottom: 0;
        right: 0;
      }
      #varta-launcher.varta-chat-open {
        bottom: 15px;
        right: 15px;
        background: #ef4444; /* Give a noticeable red exit color on mobile top layers if floating */
      }
    }

    #varta-iframe {
      width: 100%;
      height: 100%;
      border: none;
      display: block;
    }
  `;

  const styleTag = document.createElement('style');
  styleTag.innerHTML = css;
  document.head.appendChild(styleTag);

  // 3. Create Launcher DOM element
  const launcher = document.createElement('div');
  launcher.id = 'varta-launcher';
  launcher.setAttribute('title', 'Chat with Varta Assistant');
  launcher.innerHTML = `
    <!-- Bubble Chat Icon -->
    <svg class="varta-icon-chat" viewBox="0 0 24 24">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
    <!-- Close Cross Icon -->
    <svg class="varta-icon-close" viewBox="0 0 24 24">
      <line x1="18" y1="6" x2="6" y2="18"></line>
      <line x1="6" y1="6" x2="18" y2="18"></line>
    </svg>
  `;
  document.body.appendChild(launcher);

  // 4. Create Chat Widget Iframe Container DOM element
  const container = document.createElement('div');
  container.id = 'varta-container';
  
  const iframe = document.createElement('iframe');
  iframe.id = 'varta-iframe';
  iframe.src = iframeUrl;
  iframe.setAttribute('allow', 'clipboard-write'); // Allows message copying in iframe
  
  container.appendChild(iframe);
  document.body.appendChild(container);

  // 5. Toggle behavior
  let isChatOpen = false;

  function toggleChat() {
    isChatOpen = !isChatOpen;
    const chatIcon = launcher.querySelector('.varta-icon-chat');
    const closeIcon = launcher.querySelector('.varta-icon-close');

    if (isChatOpen) {
      container.style.display = 'block';
      // Reflow browser render to allow transition
      container.offsetHeight;
      container.classList.add('varta-visible');
      launcher.classList.add('varta-chat-open');
      chatIcon.style.display = 'none';
      closeIcon.style.display = 'block';
      
      // Focus on the iframe if input onboarding is loaded
      iframe.focus();
    } else {
      container.classList.remove('varta-visible');
      launcher.classList.remove('varta-chat-open');
      chatIcon.style.display = 'block';
      closeIcon.style.display = 'none';
      
      // Hide layout after smooth transition is done
      setTimeout(() => {
        if (!container.classList.contains('varta-visible')) {
          container.style.display = 'none';
        }
      }, 300);
    }
  }

  launcher.addEventListener('click', toggleChat);

  // Listen to messages from inside the iframe (e.g. if we add a close button inside the React widget)
  window.addEventListener('message', function(event) {
    if (event.data === 'varta-close-chat') {
      if (isChatOpen) toggleChat();
    }
  });

})();
