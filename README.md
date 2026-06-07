# Varta Assistant 💬

Varta Assistant is a production-ready, beginner-friendly MERN stack application featuring an **embeddable AI chatbot widget** for websites, interactive **visitor onboarding**, a **smart context system** (powered by the Groq API), and a clean public **admin portal** for analytics and conversation logs.

This project is built with **simplicity** and **readability** as the first priority. It uses pure JavaScript, avoids overengineering, integrates Bootstrap for sleek responsive UI layouts, and utilizes a simple password gate for admin protection.

---

## 🚀 Core Features

- 🔌 **Floating Chatbot Widget**: A floating chat widget that sits at the bottom-right of any webpage, loaded via a single script tag.
- 🧑‍💻 **Visitor Onboarding**: On first chat, visitors provide their Name, Profession, and Goal to customize the AI's perspective.
- 🧠 **Smart Context System**: Prefixes user inputs with visitor onboarding details to create highly personalized, context-aware AI interactions.
- 📊 **Simple Admin Dashboard**: Read-only portal displaying metrics (messages, visitor count) and a searchable list of chat transcripts.
- 🔒 **Browser Password Protection**: Access to `/admin` triggers a standard browser `window.prompt` password gate, checking against a hardcoded credential (`varta123`) without needing complex session databases.
- 🎨 **Bootstrap & Minimal Styling**: Built using Bootstrap 5 via CDN, yielding a clean, fast, and responsive user experience.

---

## 📁 Project Directory Structure

```text
varta-assistant/
├── frontend/             # React SPA (Vite, Bootstrap, Custom Router)
│   ├── src/
│   │   ├── components/
│   │   │   ├── AdminDashboard.jsx  # Admin stats & chat viewer
│   │   │   └── WidgetChat.jsx      # Onboarding form & Chat UI
│   │   ├── App.jsx                 # Custom routing layer
│   │   ├── index.css               # Custom CSS overrides
│   │   └── main.jsx
│   └── index.html
├── server/               # Express API Backend & MongoDB Schemas
│   ├── models/           # Mongoose schemas
│   │   ├── Visitor.js
│   │   ├── Conversation.js
│   │   └── Message.js
│   ├── public/           # Hosts static assets
│   │   └── widget.js     # Loader script embedded on client sites
│   ├── config.js         # Hardcoded password and prompt configuration
│   └── server.js         # Main server router & database connector
├── index.html            # Local client website embedding the widget
└── package.json          # Root orchestration runner
```

---

## 🛠️ Quick Start Guide

### 1. Prerequisites
- **Node.js** (v16+) installed.
- **MongoDB** running locally (`mongodb://127.0.0.1:27017/varta_assistant`) or a MongoDB Atlas URI.
- A **Groq API Key** (generate one for free at the [Groq Console](https://console.groq.com/)).

### 2. Configure Environment Variables
Navigate to the `server/` directory, copy `.env.example` to `.env`, and fill in your details:
```bash
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/varta_assistant
GROQ_API_KEY=your_actual_groq_api_key_here
ADMIN_PASSWORD=varta123
```

### 3. Install Dependencies
Run the installation command in the root folder of the project. This will automatically install dependencies in the root, frontend, and server directories:
```bash
npm run install-all
```

### 4. Start Development Servers
Start both the Express API and the Vite React server concurrently:
```bash
npm run dev
```
- Frontend Dev Hub: [http://localhost:5173](http://localhost:5173)
- Admin Portal: [http://localhost:5173/admin](http://localhost:5173/admin)
- Express API Server: [http://localhost:5000](http://localhost:5000)

### 5. Open the Demo Website
Open the root `index.html` file in any browser (or double-click it in your file explorer). You will see the floating chat button appear at the bottom-right corner!

---

## 🔌 Widget Embed Guide

### How to embed on any website:
Insert this tag anywhere inside the `<body>` container of your HTML files:

```html
<script src="http://localhost:5000/widget.js"></script>
```

*(Note: Replace `http://localhost:5000` with your production backend server domain once deployed).*

### Sizing and Responsiveness:
- **Desktop**: Renders as a popup window (400px wide, 600px tall) with rounded corners and soft drop shadow.
- **Mobile (width < 480px)**: Seamlessly scales to take up 100% of the screen width and height.

---

## 📊 API Endpoint Reference

All JSON payloads are sent using the `Content-Type: application/json` header.

### 1. Onboard Visitor (`POST /api/widget/onboard`)
Creates a new visitor profile and initializes an active conversation session.
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "profession": "Founder",
    "goal": "Pricing check"
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "visitorId": "65f3a09e...",
    "conversationId": "65f3a09f...",
    "visitorName": "Jane Doe"
  }
  ```

### 2. Fetch History (`GET /api/widget/history/:visitorId`)
Retrieves previous conversations and message logs to resume a session.
- **Response (200 OK)**:
  ```json
  {
    "visitorName": "Jane Doe",
    "conversationId": "65f3a09f...",
    "messages": [
      { "sender": "ai", "text": "Hi Jane! How can I help you?", "createdAt": "2026-06-07T10:00:00Z" }
    ]
  }
  ```

### 3. Send Message (`POST /api/widget/chat`)
Submits a message to the assistant. The backend automatically prefixes the system instructions with the visitor's profile details.
- **Request Body**:
  ```json
  {
    "visitorId": "65f3a09e...",
    "conversationId": "65f3a09f...",
    "text": "Tell me about your pricing."
  }
  ```

### 4. Admin Analytics (`GET /api/analytics`)
Aggregates statistical totals for display on the Admin dashboard.
- **Response (200 OK)**:
  ```json
  {
    "totalVisitors": 12,
    "totalConversations": 14,
    "totalMessages": 82,
    "professionBreakdown": [
      { "_id": "Founder", "count": 6 }
    ]
  }
  ```

---

## ☁️ Production Deployment Guide

Since the project compiles the React client into the Express backend's static directory, the entire application can run on a **single server port** in production.

### Step 1: Build the React Frontend
Navigate to the `frontend/` directory and compile the bundle:
```bash
cd frontend
npm install
npm run build
```
This generates a static bundle inside `frontend/dist/`. The Express backend serves this folder automatically on the main port.

### Step 2: Deploy to Render (Web Service)
1. Push your repository to GitHub.
2. Log into [Render](https://render.com/) and create a new Web Service.
3. Link your GitHub repository and set the following parameters:
   - **Build Command**: `npm run install-all && npm run build --prefix frontend`
   - **Start Command**: `npm start --prefix server`
4. Add the following Environment Variables in the Render dashboard:
   - `MONGO_URI` = your MongoDB connection string
   - `GROQ_API_KEY` = your Groq API key
   - `ADMIN_PASSWORD` = your custom password (defaults to `varta123`)
