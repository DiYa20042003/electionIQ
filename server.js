/**
 * ElectIQ — Secure Backend Server
 * Powered by Google Gemini API with Search Grounding
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { GoogleGenerativeAI } = require('@google/generative-ai');

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_CHAT_MESSAGES = 20;
const MAX_MESSAGE_LENGTH = 4000;
const ALLOWED_ROLES = new Set(['user', 'assistant', 'model']);

app.disable('x-powered-by');

// ===== SECURITY HEADERS =====
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'"],
      connectSrc: ["'self'", "https://generativelanguage.googleapis.com"],
      imgSrc: ["'self'", "data:"],
      frameSrc: ["'none'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: false,
}));

// ===== CORS =====
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:3000', 'http://127.0.0.1:3000'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('CORS policy violation'));
  },
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
  credentials: false,
}));

app.use(express.json({ limit: '32kb' }));
app.use(express.static(path.join(__dirname, 'public')));

function getMessageText(message) {
  if (!message || typeof message !== 'object') return '';
  if (typeof message.content === 'string') return message.content;
  if (Array.isArray(message.parts)) {
    return message.parts
      .map(part => (part && typeof part.text === 'string' ? part.text : ''))
      .join('');
  }
  return '';
}

function validateChatMessages(messages) {
  if (!Array.isArray(messages)) return 'The request body must include a messages array.';
  if (messages.length === 0) return 'At least one message is required.';
  if (messages.length > MAX_CHAT_MESSAGES) return `Chat history cannot exceed ${MAX_CHAT_MESSAGES} messages.`;

  for (let i = 0; i < messages.length; i += 1) {
    const msg = messages[i];
    if (!msg || typeof msg !== 'object') return `Message ${i + 1} must be an object.`;
    if (typeof msg.role !== 'string' || !ALLOWED_ROLES.has(msg.role)) {
      return 'Each message role must be user, assistant, or model.';
    }
    const text = getMessageText(msg).trim();
    if (!text) return `Message ${i + 1} must include text content.`;
    if (text.length > MAX_MESSAGE_LENGTH) {
      return `Message ${i + 1} is too long. Each message must be ${MAX_MESSAGE_LENGTH} characters or less.`;
    }
  }

  const last = messages[messages.length - 1];
  if (last.role !== 'user') return 'The final message must come from the user.';
  return null;
}

// ===== RATE LIMITING =====
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again in 15 minutes.' },
});

const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Slow down! Max 15 messages per minute.' },
  keyGenerator: (req) => req.ip,
});

app.use(globalLimiter);

// ===== SYSTEM PROMPT =====
const SYSTEM_PROMPT = `You are ElectIQ, an expert nonpartisan election education assistant. Your mission is to help users understand democratic processes, election systems, voting rights, and civic participation — clearly, accurately, and without political bias.

## Your Expertise Covers:
- Election processes and timelines (US federal, state, and international)
- Voter registration, eligibility, and requirements
- Types of elections: primaries, general, midterm, runoff, special
- Voting methods: in-person, early voting, absentee/mail-in, overseas
- Electoral systems: first-past-the-post, proportional representation, ranked-choice, mixed systems
- The Electoral College (US) — how it works, criticism, proposals
- Vote counting, certification, and results
- Ballot initiatives, referendums, and direct democracy
- Global election comparisons across 190+ countries
- Historical election milestones and voting rights movements
- Current and upcoming elections worldwide (use Google Search to verify current dates)

## Global Commitment:
Students from ANY country can ask about their specific election process. You must provide detailed, accurate, and nonpartisan information whether it is for the US, UK, India, Brazil, Nigeria, or any other nation. Always explain the specific nuances of that country's system (e.g., compulsory voting, different legislative bodies, unique registration steps).

## Response Formatting:
Use rich structured HTML components for maximum clarity:

For timelines use <div class="timeline"><div class="timeline-item"><div class="timeline-dot">N</div><div class="timeline-body"><div class="timeline-date">DATE</div><div class="timeline-title">TITLE</div><div class="timeline-desc">DESC</div></div></div></div>

For steps use <div class="step-cards"><div class="step-card"><div class="step-card-num">01</div><div class="step-card-title">TITLE</div><div class="step-card-desc">DESC</div></div></div>

For info boxes use <div class="info-box"><div class="info-box-label">📌 Important</div>TEXT</div>
For warnings use <div class="info-box warning"><div class="info-box-label">⚠️ Note</div>TEXT</div>
For success use <div class="info-box success"><div class="info-box-label">✅ Good to Know</div>TEXT</div>

For comparisons use <table class="compare-table"><thead><tr><th>...</th></tr></thead><tbody><tr><td>...</td></tr></tbody></table>

For fact chips use <div class="fact-chips"><span class="fact-chip">FACT</span></div>

Always end with 2-4 follow-up suggestions:
<div class="follow-ups"><button class="follow-up-btn" onclick="sendFollowUp('Q?')">Q?</button></div>

## Interactive Widgets (CRITICAL):
When appropriate, generate an interactive widget by using these specific markdown JSON code blocks. These blocks will be intercepted by the UI and rendered as dynamic applications.

**1. Interactive Voter Plan Checklist:**
When a user asks for a voting guide, checklist, or steps to vote:
\`\`\`voter-plan
{
  "title": "Your [State/Country] Voter Plan",
  "description": "Personalized checklist for election day.",
  "tasks": [
    { "id": "t1", "label": "Check registration", "detail": "..." },
    { "id": "t2", "label": "Find polling place", "detail": "..." }
  ]
}
\`\`\`

**2. Interactive Visual Timeline:**
When a user asks for deadlines or an election schedule:
\`\`\`interactive-timeline
{
  "events": [
    { "date": "Date", "title": "Event", "description": "...", "status": "upcoming|critical" }
  ]
}
\`\`\`

## Rules:
- NEVER recommend any party, candidate, or political position
- NEVER editorialize about political outcomes
- Always note that voting rules vary by state/country
- Recommend vote.gov for US official voting information
- Be warm, clear, and educationally empowering`;

// ===== CHAT ENDPOINT =====
app.post('/api/chat', chatLimiter, async (req, res) => {
  const { messages } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('GEMINI_API_KEY missing');
    return res.status(503).json({ error: 'Service configuration error' });
  }

  const validationError = validateChatMessages(messages);
  if (validationError) {
    return res.status(400).json({ error: validationError });
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    // Robust message mapping
    const contents = messages.map(msg => {
      const role = msg.role === 'assistant' || msg.role === 'model' ? 'model' : 'user';
      if (Array.isArray(msg.parts) && msg.parts.length) {
        return { role, parts: msg.parts.map(part => ({ text: String(part.text || '') })) };
      }
      return { role, parts: [{ text: String(msg.content || '') }] };
    }).filter(c => c.parts.length > 0);

    console.log(`Starting stream for model: gemini-2.5-flash`);
    const result = await model.generateContentStream({ contents });

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) {
        process.stdout.write('.');
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      }
    }
    console.log('\nStream completed successfully');

    res.write('data: [DONE]\n\n');
    res.end();

  } catch (err) {
    console.error('Backend Error:', err.message);
    
    let errorMsg = 'Internal server error';
    if (err.message.includes('429')) {
      errorMsg = 'AI Quota exceeded or model not enabled. Please check Google AI Studio project settings.';
    } else if (err.message.includes('403')) {
      errorMsg = 'API Key permission error. Ensure Generative Language API is enabled for your project.';
    } else if (err.message.includes('404')) {
      errorMsg = 'AI Model not found. Attempting to fallback...';
    }

    if (!res.headersSent) {
      res.status(500).json({ error: errorMsg });
    } else {
      res.write(`data: ${JSON.stringify({ error: errorMsg })}\n\n`);
      res.end();
    }
  }
});

// ===== HEALTH CHECK =====
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'ElectIQ',
    timestamp: new Date().toISOString(),
  });
});

// ===== SPA FALLBACK =====
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ===== START =====
if (require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🗳️  ElectIQ running on http://0.0.0.0:${PORT}`);
  });
}

module.exports = app;
