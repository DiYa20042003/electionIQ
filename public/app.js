/**
 * ElectIQ — Election Intelligence Assistant
 * Frontend App Logic (Gemini Native Edition)
 */

// ===== STATE =====
const state = {
  messages: [],       // [{role: "user"|"model", parts: [{text}]}]
  isStreaming: false,
  lastSent: 0,
};

// ===== DOM REFS =====
const $ = (id) => document.getElementById(id);
const chatArea = $("chatArea");
const messagesEl = $("messages");
const welcomeState = $("welcomeState");
const userInput = $("userInput");
const sendBtn = $("sendBtn");
const charCount = $("charCount");
const thinkingOverlay = $("thinkingOverlay");
const clearBtn = $("clearBtn");
const sidebar = $("sidebar");
const voterPlanOverlay = $("voterPlanOverlay");
const voterPlanClose = $("voterPlanClose");
const voterPlanChecklist = $("voterPlanChecklist");
const voterPlanTitle = $("voterPlanTitle");

// ===== MARKDOWN + HTML RENDERER =====
function renderContent(text) {
  let html = text;

  // Strip dynamic widgets from main text flow (handled by intercept)
  html = html.replace(/```voter-plan[\s\S]*?```/g, '');
  html = html.replace(/```interactive-timeline[\s\S]*?```/g, '');

  // Markdown: Headers
  html = html.replace(/^#### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

  // Markdown: Bold & Italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Markdown: Blockquote
  html = html.replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>');

  // Markdown: Unordered lists
  html = html.replace(/^[\*\-] (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]+?<\/li>)+/g, (match) => `<ul>${match}</ul>`);

  // Markdown: Paragraphs
  const lines = html.split('\n');
  const wrapped = [];
  let inBlock = false;

  for (let line of lines) {
    const trimmed = line.trim();
    if (!trimmed) { wrapped.push(''); continue; }
    if (trimmed.startsWith('<')) { wrapped.push(line); continue; }
    wrapped.push(`<p>${trimmed}</p>`);
  }

  return wrapped.join('\n');
}

// ===== DYNAMIC WIDGET INTERCEPTOR =====
function checkAndRenderWidgets(fullText, container) {
  // 1. Voter Plan
  const planMatch = fullText.match(/```voter-plan\n([\s\S]*?)\n```/);
  if (planMatch && planMatch[1]) {
    try {
      const data = JSON.parse(planMatch[1].trim());
      renderVoterPlanButton(data, container);
    } catch (e) {}
  }

  // 2. Timeline
  const timelineMatch = fullText.match(/```interactive-timeline\n([\s\S]*?)\n```/);
  if (timelineMatch && timelineMatch[1]) {
    try {
      const data = JSON.parse(timelineMatch[1].trim());
      renderInteractiveTimeline(data, container);
    } catch (e) {}
  }
}

function renderVoterPlanButton(data, container) {
  if (container.querySelector('.voter-plan-launcher')) return;
  const el = document.createElement('div');
  el.className = 'voter-plan-launcher';
  el.innerHTML = `
    <div class="launcher-icon">📋</div>
    <div class="launcher-text">
      <strong>Voter Plan Ready</strong>
      <span>Click to open your checklist</span>
    </div>
    <button class="action-btn">View Plan</button>
  `;
  el.onclick = () => {
    voterPlanTitle.textContent = data.title || "Your Voter Plan";
    voterPlanChecklist.innerHTML = (data.tasks || []).map(t => `
      <div class="checklist-item">
        <label class="custom-checkbox">
          <input type="checkbox">
          <span class="checkmark"></span>
        </label>
        <div class="checklist-content">
          <div class="checklist-label">${t.label}</div>
          <div class="checklist-detail">${t.detail}</div>
        </div>
      </div>
    `).join('');
    voterPlanOverlay.classList.add('visible');
  };
  container.appendChild(el);
}

function renderInteractiveTimeline(data, container) {
  if (container.querySelector('.interactive-timeline-widget')) return;
  const el = document.createElement('div');
  el.className = 'interactive-timeline-widget';
  el.innerHTML = `<div class="horiz-timeline-track">
    ${(data.events || []).map(e => `
      <div class="horiz-timeline-item ${e.status === 'critical' ? 'critical' : ''}">
        <div class="horiz-dot"></div>
        <div class="horiz-date">${e.date}</div>
        <div class="horiz-card">
          <div class="horiz-title">${e.title}</div>
          <div class="horiz-desc">${e.description}</div>
        </div>
      </div>
    `).join('')}
  </div>`;
  container.appendChild(el);
}

// ===== API HELPERS =====
async function streamResponse(response, onChunk, onDone) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = "";
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop();

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const raw = line.slice(6).trim();
      if (raw === '[DONE]') continue;
      try {
        const data = JSON.parse(raw);
        if (data.error) {
          throw new Error(data.error);
        }
        if (data.text) {
          fullText += data.text;
          onChunk(fullText);
        }
      } catch (e) {
        console.error('Parse error:', e);
        if (e.message && !e.message.includes('JSON')) {
          onChunk(`<div class="error-msg">Error: ${e.message}</div>`);
        }
      }
    }
  }
  onDone(fullText);
}

async function handleSend(query) {
  const message = query ?? userInput.value.trim();
  if (!message || state.isStreaming) return;

  userInput.value = '';
  welcomeState.style.display = 'none';
  state.isStreaming = true;
  sendBtn.disabled = true;
  thinkingOverlay.classList.add('visible');

  addMessage('user', message);
  const assistantBubble = addMessage('model', '', true);

  try {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages: state.messages })
    });

    if (!response.ok) throw new Error('API request failed');

    thinkingOverlay.classList.remove('visible');
    let full = '';
    await streamResponse(response, (partial) => {
      full = partial;
      assistantBubble.innerHTML = renderContent(partial) + '<span class="typing-cursor"></span>';
      scrollToBottom();
    }, (final) => {
      assistantBubble.innerHTML = renderContent(final);
      state.messages.push({ role: 'model', parts: [{ text: final }] });
      checkAndRenderWidgets(final, assistantBubble);
      scrollToBottom();
    });
  } catch (err) {
    thinkingOverlay.classList.remove('visible');
    assistantBubble.innerHTML = `<div class="error-msg">Error: ${err.message}</div>`;
  } finally {
    state.isStreaming = false;
    sendBtn.disabled = false;
  }
}

function addMessage(role, content, isStreaming = false) {
  const div = document.createElement('div');
  div.className = `message ${role === 'user' ? 'user' : 'assistant'}`;
  const bubble = document.createElement('div');
  bubble.className = 'message-bubble assistant-content';
  
  if (role === 'user') {
    bubble.textContent = content;
    state.messages.push({ role: 'user', parts: [{ text: content }] });
  } else if (isStreaming) {
    bubble.innerHTML = '<span class="typing-cursor"></span>';
  } else {
    bubble.innerHTML = renderContent(content);
  }

  const meta = document.createElement('div');
  meta.className = 'message-meta';
  meta.textContent = role === 'user' ? 'You' : `ElectIQ · ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

  div.appendChild(bubble);
  div.appendChild(meta);
  messagesEl.appendChild(div);
  scrollToBottom();
  return bubble;
}

function scrollToBottom() {
  chatArea.scrollTo({ top: chatArea.scrollHeight, behavior: 'smooth' });
}

function updateInputState() {
  const currentText = userInput.value;
  charCount.textContent = `${currentText.length}/2000`;
  const isValid = currentText.trim().length > 0;
  sendBtn.disabled = !isValid;
  userInput.setAttribute('aria-invalid', isValid ? 'false' : 'true');
}

window.sendFollowUp = (q) => { userInput.value = q; updateInputState(); handleSend(q); };

// ===== EVENT LISTENERS =====
sendBtn.onclick = () => handleSend();
userInput.oninput = updateInputState;
userInput.onkeydown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };
voterPlanClose.onclick = () => voterPlanOverlay.classList.remove('visible');
clearBtn.onclick = () => { state.messages = []; messagesEl.innerHTML = ''; welcomeState.style.display = 'block'; updateInputState(); };

document.querySelectorAll('[data-query]').forEach((button) => {
  button.addEventListener('click', () => {
    const query = button.dataset.query?.trim();
    if (!query) return;
    userInput.value = query;
    updateInputState();
    handleSend(query);
  });
});

updateInputState();

document.querySelectorAll('.nav-btn, .starter-card').forEach(btn => {
  btn.onclick = () => handleSend(btn.dataset.query);
});

console.log("ElectIQ Gemini Edition Ready.");
