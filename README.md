# 🗳️ ElectIQ — Election Intelligence Assistant

> **A Google-level, nonpartisan AI-powered platform for understanding elections, voting systems, and democratic processes.**

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Node](https://img.shields.io/badge/node-%3E%3D18-brightgreen)

---

## 🌟 Overview

ElectIQ is a production-ready, AI-powered election education assistant that helps citizens of all backgrounds understand:

- 🗳️ **How elections work** — step-by-step processes, from registration to certification
- 📅 **Voting timelines** — key dates, deadlines, and milestones
- 🌍 **Global election systems** — comparing democracies worldwide
- 📋 **Voter registration** — eligibility, requirements, and how-tos
- ⚖️ **Electoral systems** — Electoral College, proportional representation, ranked-choice
- 🔢 **Vote counting** — how ballots are tallied and results certified

**Core principles:** Nonpartisan · Accurate · Accessible · Secure

---

## 🏗️ Architecture

```
electiq/
├── public/
│   ├── index.html      # SPA shell — semantic HTML, accessibility-first
│   ├── styles.css      # Design system — civic editorial aesthetic
│   └── app.js          # Frontend logic — streaming, markdown rendering, UX
├── server.js           # Express backend — secure API proxy
├── server.test.js      # Jest test suite
├── package.json
├── .env.example
└── README.md
```

### Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| Frontend | Vanilla JS + CSS | Zero-dependency, fast, accessible |
| Backend | Node.js + Express | Secure API proxy, rate limiting |
| AI | Google Gemini 2.0 Flash | Streaming responses, election expertise, Search Grounding |
| Fonts | Playfair Display + DM Sans | Civic editorial typography |
| Security | Helmet.js + rate-limit | CSP, HSTS, CORS, DDoS protection |

---

## 🚀 Quick Start

### Prerequisites
- Node.js ≥ 18.0.0
- A [Google Gemini API key](https://aistudio.google.com/app/apikey)

### 1. Clone & Install
```bash
git clone https://github.com/your-org/electiq.git
cd electiq
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
```

### 3. Run
```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Visit `http://localhost:3000` — you're live! 🎉

---

## ✨ Features

### AI Capabilities
- **Streaming responses** — text appears token-by-token, no waiting
- **Conversation memory** — multi-turn context across the session
- **Structured output** — timelines, step cards, comparison tables rendered as UI
- **Follow-up suggestions** — AI suggests relevant next questions
- **Search Grounding** — Real-time fact-checking using Google Search
- **Global coverage** — US, India, UK, EU, and 190+ countries

### UX Features
- 📱 **Fully responsive** — works on mobile, tablet, desktop
- ⌨️ **Keyboard accessible** — full keyboard navigation, ARIA labels
- 🌙 **Auto-resize input** — textarea grows as you type
- ⚡ **Instant sidebar navigation** — 12 pre-built topic shortcuts
- 🔄 **New conversation** — one-click reset
- 📜 **Scroll management** — smooth auto-scroll with follow button

---

## 📐 Design System

### Typography
- **Display:** Playfair Display (editorial, authoritative)
- **Body:** DM Sans (clean, readable)
- **Code:** DM Mono (technical content)

### Color Palette
```css
--navy:     #0C1B33   /* Primary brand — authority */
--gold:     #C9A84C   /* Accent — civic gold */
--ivory:    #FAFAF7   /* Background — warm white */
--charcoal: #2C2C2A   /* Body text */
```

---

## 🚢 Deployment

### Google Cloud Run (Recommended)
```bash
gcloud run deploy electiq --source . --env-vars-file .env.yaml
```

### Docker
```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```

---

## 🙏 Acknowledgments

- [Google Gemini](https://ai.google.dev/) — AI backbone
- [vote.gov](https://vote.gov) — Official US voting resource
- [IFES](https://www.ifes.org) — International election standards

---

*ElectIQ is an educational tool. For official voting information, always consult your local electoral authority or [vote.gov](https://vote.gov).*
