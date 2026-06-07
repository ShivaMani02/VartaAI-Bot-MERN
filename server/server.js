const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const Groq = require('groq-sdk');
const path = require('path');
require('dotenv').config();

const config = require('./config');
const Visitor = require('./models/Visitor');
const Conversation = require('./models/Conversation');
const Message = require('./models/Message');

const app = express();
const PORT = process.env.PORT || 5000;

// ==========================================
// SECURITY & MIDDLEWARE
// ==========================================

// Helmet sets secure HTTP headers.
// Since we are loading this chatbot as an iframe, we need to allow frame embedding.
app.use(helmet({
  contentSecurityPolicy: false, // Disabling strict CSP to allow flexible development and resource loading
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: false,
  frameguard: false // Essential: allows embedding the chat page in an iframe on user sites
}));

// Enable Cross-Origin Resource Sharing (CORS) so external sites can load widget resources and make API calls
app.use(cors());

// Parse incoming JSON payloads
app.use(express.json());

// Set up API rate limiting to protect backend resources
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again later.' }
});
app.use('/api/', apiLimiter);

// Serve static assets from the public directory (for hosting widget.js)
app.use(express.static(path.join(__dirname, 'public')));

// Initialize Groq API Client if key is available
const groqApiKey = process.env.GROQ_API_KEY;
if (!groqApiKey) {
  console.warn('WARNING: GROQ_API_KEY is not defined in the environment. Chatbot requests will fail.');
}
const groq = new Groq({ apiKey: groqApiKey || 'placeholder_key' });

// Connect to MongoDB Database
const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/varta_assistant';
mongoose.connect(mongoUri)
  .then(() => console.log('Successfully connected to MongoDB.'))
  .catch(err => console.error('MongoDB connection failure:', err));

// ==========================================
// WIDGET ENDPOINTS (VISITOR ACTIONS)
// ==========================================

/**
 * @route   POST /api/widget/onboard
 * @desc    Onboard a first-time visitor, saving their name, profession, and goal.
 *          Creates a new visitor profile and an active conversation.
 */
app.post('/api/widget/onboard', async (req, res) => {
  const { name, profession, goal } = req.body;
  console.log(`[WIDGET] [ONBOARD] Request received to onboard visitor: "${name}" (${profession}) | Goal: "${goal}"`);

  try {
    if (!name || !profession || !goal) {
      console.warn(`[WIDGET] [ONBOARD] [BAD REQUEST] Missing onboarding fields.`);
      return res.status(400).json({ error: 'Name, profession, and goal are all required.' });
    }

    // Save the new visitor profile
    const newVisitor = new Visitor({ name, profession, goal });
    const savedVisitor = await newVisitor.save();

    // Create a new conversation associated with this visitor
    const newConversation = new Conversation({ visitorId: savedVisitor._id });
    const savedConversation = await newConversation.save();

    console.log(`[WIDGET] [ONBOARD] [SUCCESS] Onboarded "${savedVisitor.name}". Created Conversation ID: ${savedConversation._id}`);

    return res.status(201).json({
      message: 'Onboarding completed successfully.',
      visitorId: savedVisitor._id,
      conversationId: savedConversation._id,
      visitorName: savedVisitor.name
    });
  } catch (error) {
    console.error('[WIDGET] [ONBOARD] [ERROR] Failed to complete onboarding:', error);
    return res.status(500).json({ error: 'Failed to complete visitor onboarding.' });
  }
});

/**
 * @route   GET /api/widget/history/:visitorId
 * @desc    Fetch previous message history and active conversation details for a returning visitor.
 */
app.get('/api/widget/history/:visitorId', async (req, res) => {
  const { visitorId } = req.params;
  console.log(`[WIDGET] [HISTORY] Fetching history logs for visitor ID: ${visitorId}`);

  try {
    if (!mongoose.Types.ObjectId.isValid(visitorId)) {
      console.warn(`[WIDGET] [HISTORY] [BAD REQUEST] Invalid visitor ID: ${visitorId}`);
      return res.status(400).json({ error: 'Invalid visitor ID.' });
    }

    // Check if the visitor profile exists
    const visitor = await Visitor.findById(visitorId);
    if (!visitor) {
      console.warn(`[WIDGET] [HISTORY] [NOT FOUND] Visitor not found: ${visitorId}`);
      return res.status(404).json({ error: 'Visitor not found.' });
    }

    // Find the latest conversation for this visitor
    const conversation = await Conversation.findOne({ visitorId }).sort({ createdAt: -1 });
    if (!conversation) {
      console.log(`[WIDGET] [HISTORY] No active conversation session found for visitor "${visitor.name}".`);
      return res.status(200).json({ visitorName: visitor.name, conversationId: null, messages: [] });
    }

    // Retrieve all message history for this conversation
    const messages = await Message.find({ conversationId: conversation._id }).sort({ createdAt: 1 });
    console.log(`[WIDGET] [HISTORY] [SUCCESS] Retrieved ${messages.length} messages for visitor "${visitor.name}".`);

    return res.status(200).json({
      visitorName: visitor.name,
      conversationId: conversation._id,
      messages: messages.map(msg => ({
        sender: msg.sender,
        text: msg.text,
        createdAt: msg.createdAt
      }))
    });
  } catch (error) {
    console.error('[WIDGET] [HISTORY] [ERROR] Failed to fetch chat history:', error);
    return res.status(500).json({ error: 'Failed to retrieve conversation history.' });
  }
});

/**
 * @route   POST /api/widget/chat
 * @desc    Handle chat messages. Merges visitor context and system specs,
 *          saves conversation history, and returns the response from the Groq model.
 */
app.post('/api/widget/chat', async (req, res) => {
  const { visitorId, conversationId, text } = req.body;
  
  console.log(`\n================== [CHAT PIPELINE START] ==================`);
  console.log(`[WIDGET] [CHAT] New message received from visitor ID: ${visitorId}`);
  console.log(`[WIDGET] [CHAT] Message Text: "${text}"`);

  try {
    if (!visitorId || !conversationId || !text) {
      console.warn(`[WIDGET] [CHAT] [BAD REQUEST] Missing required body fields.`);
      console.log(`================== [CHAT PIPELINE END] ==================\n`);
      return res.status(400).json({ error: 'visitorId, conversationId, and text are required.' });
    }

    if (!mongoose.Types.ObjectId.isValid(visitorId) || !mongoose.Types.ObjectId.isValid(conversationId)) {
      console.warn(`[WIDGET] [CHAT] [BAD REQUEST] Invalid ID formats.`);
      console.log(`================== [CHAT PIPELINE END] ==================\n`);
      return res.status(400).json({ error: 'Invalid visitor or conversation ID.' });
    }

    // 1. Fetch visitor details to compile smart personalized context
    const visitor = await Visitor.findById(visitorId);
    if (!visitor) {
      console.warn(`[WIDGET] [CHAT] [NOT FOUND] Visitor profile not found for ID: ${visitorId}`);
      console.log(`================== [CHAT PIPELINE END] ==================\n`);
      return res.status(404).json({ error: 'Visitor profile not found.' });
    }

    console.log(`[WIDGET] [CHAT] Loaded Context -> Name: "${visitor.name}" | Profession: "${visitor.profession}" | Goal: "${visitor.goal}"`);

    // 2. Save the incoming visitor message in the DB
    const visitorMessage = new Message({
      conversationId,
      sender: 'visitor',
      text
    });
    await visitorMessage.save();
    console.log(`[WIDGET] [CHAT] User message saved to database.`);

    // 3. Fetch past messages in the conversation (limit to last 20 for prompt token safety)
    const pastMessages = await Message.find({ conversationId })
      .sort({ createdAt: 1 })
      .limit(20);

    // Format past messages for the Groq API completion structure
    const formattedChatHistory = pastMessages.map(msg => ({
      role: msg.sender === 'visitor' ? 'user' : 'assistant',
      content: msg.text
    }));

    // 4. Inject system instructions combined with visitor context (Name, Profession, Goal)
    const visitorContext = `
[VISITOR PROFILE FOR PERSONALIZATION]:
- Visitor Name: ${visitor.name}
- Profession: ${visitor.profession}
- Primary Goal: ${visitor.goal}

Please customize all your responses to fit this profile context. Direct your advice, examples, and greetings appropriately based on these values. Do not break character.
`;

    const fullSystemInstructions = `${config.SYSTEM_PROMPT}\n${visitorContext}`;
    console.log(`[WIDGET] [CHAT] Compiled system instruction instructions for AI.`);

    // Construct final prompt payloads
    const promptMessages = [
      { role: 'system', content: fullSystemInstructions },
      ...formattedChatHistory
    ];

    // 5. Query Groq API
    let aiReplyText = "I'm having trouble connecting to my brain right now. Please try again soon!";
    
    if (groqApiKey) {
      try {
        console.log(`[WIDGET] [CHAT] Dispatching prompt to Groq model: "${config.GROQ_MODEL}"...`);
        const completion = await groq.chat.completions.create({
          messages: promptMessages,
          model: config.GROQ_MODEL,
          temperature: 0.7,
          max_tokens: 1024
        });
        aiReplyText = completion.choices[0].message.content;
        console.log(`[WIDGET] [CHAT] Groq response received successfully.`);
      } catch (groqErr) {
        console.error('[WIDGET] [CHAT] [ERROR] Groq API call failed:', groqErr);
        aiReplyText = "I encountered an API configuration error. Please ensure the Groq API key is valid.";
      }
    } else {
      console.log(`[WIDGET] [CHAT] [DEMO MODE] No GROQ_API_KEY. Using mock placeholder.`);
      aiReplyText = `[Demo Mode] Hi ${visitor.name}! I received your message: "${text}". Please configure GROQ_API_KEY in the backend .env to enable true AI responses.`;
    }

    // 6. Save AI's response in the DB
    const aiMessage = new Message({
      conversationId,
      sender: 'ai',
      text: aiReplyText
    });
    await aiMessage.save();
    console.log(`[WIDGET] [CHAT] AI response saved to database.`);
    console.log(`================== [CHAT PIPELINE END] ==================\n`);

    return res.status(200).json({ reply: aiReplyText });
  } catch (error) {
    console.error('[WIDGET] [CHAT] [ERROR] General exception in chat handler:', error);
    console.log(`================== [CHAT PIPELINE END] ==================\n`);
    return res.status(500).json({ error: 'Failed to process chat message.' });
  }
});

// ==========================================
// ADMIN DASHBOARD ENDPOINTS
// ==========================================

/**
 * @route   GET /api/analytics
 * @desc    Return high-level summary metrics (counts, professions) for admin overview.
 */
app.get('/api/analytics', async (req, res) => {
  console.log(`[ADMIN] [ANALYTICS] Request to fetch dashboard analytics overview.`);
  try {
    const totalVisitors = await Visitor.countDocuments();
    const totalConversations = await Conversation.countDocuments();
    const totalMessages = await Message.countDocuments();

    // Aggregate visitor professions to see what audience uses the widget
    const professionBreakdown = await Visitor.aggregate([
      { $group: { _id: '$profession', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    console.log(`[ADMIN] [ANALYTICS] [SUCCESS] Computed stats: Visitors=${totalVisitors}, Conversations=${totalConversations}, Messages=${totalMessages}`);

    return res.status(200).json({
      totalVisitors,
      totalConversations,
      totalMessages,
      professionBreakdown
    });
  } catch (error) {
    console.error('[ADMIN] [ANALYTICS] [ERROR] Failed to fetch analytics:', error);
    return res.status(500).json({ error: 'Failed to fetch dashboard metrics.' });
  }
});

/**
 * @route   GET /api/conversations
 * @desc    Fetch a list of all conversations, including associated visitor profile data.
 */
app.get('/api/conversations', async (req, res) => {
  console.log(`[ADMIN] [CONVERSATIONS] Request to list all conversations...`);
  try {
    const conversations = await Conversation.find()
      .populate('visitorId')
      .sort({ createdAt: -1 });

    console.log(`[ADMIN] [CONVERSATIONS] [SUCCESS] Retrieved ${conversations.length} total conversation headers.`);
    return res.status(200).json(conversations);
  } catch (error) {
    console.error('[ADMIN] [CONVERSATIONS] [ERROR] Failed to list conversations:', error);
    return res.status(500).json({ error: 'Failed to fetch conversations.' });
  }
});

/**
 * @route   GET /api/conversations/:id
 * @desc    Retrieve the complete detailed chat logs and visitor details for a single conversation.
 */
app.get('/api/conversations/:id', async (req, res) => {
  const { id } = req.params;
  console.log(`[ADMIN] [CONVERSATIONS] Request to load detailed log for conversation ID: ${id}`);

  try {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.warn(`[ADMIN] [CONVERSATIONS] [BAD REQUEST] Invalid conversation ID format.`);
      return res.status(400).json({ error: 'Invalid conversation ID.' });
    }

    const conversation = await Conversation.findById(id).populate('visitorId');
    if (!conversation) {
      console.warn(`[ADMIN] [CONVERSATIONS] [NOT FOUND] Conversation logs not found for ID: ${id}`);
      return res.status(404).json({ error: 'Conversation not found.' });
    }

    const messages = await Message.find({ conversationId: id }).sort({ createdAt: 1 });
    console.log(`[ADMIN] [CONVERSATIONS] [SUCCESS] Loaded ${messages.length} messages for transcript with "${conversation.visitorId?.name || 'Anonymous'}".`);

    return res.status(200).json({
      conversation,
      messages
    });
  } catch (error) {
    console.error('[ADMIN] [CONVERSATIONS] [ERROR] Failed to fetch conversation logs:', error);
    return res.status(500).json({ error: 'Failed to retrieve conversation logs.' });
  }
});

// ==========================================
// SPA FRONTEND DEPLOYMENT MIDDLEWARE
// ==========================================

// If the frontend is built, serve index.html for non-API routes so SPA routing works.
// This supports single-port hosting in production/staging.
const frontendBuildPath = path.join(__dirname, '..', 'frontend', 'dist');
app.use(express.static(frontendBuildPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }
  res.sendFile(path.join(frontendBuildPath, 'index.html'), err => {
    if (err) {
      // In case frontend isn't compiled, output developer notice
      res.status(200).send('Vaarta Backend running. Frontend dist not detected. Use npm run dev for dev environments.');
    }
  });
});

// Start listening for connections
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(` VAARTA IS LIVE ON PORT ${PORT}`);
  console.log(` Running API server and loading static assets...`);
  console.log(` Default Admin Portal Password configured: "${config.ADMIN_PASSWORD}"`);
  console.log(`=======================================================`);
});
