/**
 * popup.js — LeetCode Thinking Coach
 * ────────────────────────────────────
 * Controls all UI interactions:
 * - Theme toggle (dark/light)
 * - Tab switching
 * - Progressive hint system
 * - Chat mode
 * - Solution reveal
 * Communicates with content.js (page data) and background.js (AI calls).
 */

// ════════════════════════════════════════════════════════════
// STATE
// ════════════════════════════════════════════════════════════
const State = {
  problemData: null,   // Extracted from LeetCode page
  hints: null,   // Cached { direction, approach, what_next, debug, edge_cases }
  hintLevel: 0,      // 0 = none shown, 1-4 = progressive
  isDarkMode: false,
  isLoading: false,
  chatHistory: [],     // Array of { role, content }
};

// ════════════════════════════════════════════════════════════
// DOM REFS
// ════════════════════════════════════════════════════════════
const $ = id => document.getElementById(id);

const DOM = {
  appView: $("app-view"),
  notLeetcode: $("not-leetcode-view"),
  statusDot: $("status-dot"),
  statusText: $("status-text"),
  problemTitle: $("problem-title"),
  themeToggle: $("theme-toggle"),
  toggleTrack: $("toggle-track"),
  themeIcon: $("theme-icon"),

  // Hint tab
  hintCardsContainer: $("hint-cards-container"),
  hintsEmpty: $("hints-empty"),
  edgeCasesSection: $("edge-cases-section"),
  edgeCasesList: $("edge-cases-list"),
  hintError: $("hint-error"),
  hintErrorText: $("hint-error-text"),
  getHintBtn: $("get-hint-btn"),
  resetHintsBtn: $("reset-hints-btn"),
  progressLabel: $("progress-label"),

  // Chat tab
  chatMessages: $("chat-messages"),
  chatInput: $("chat-input"),
  chatSendBtn: $("chat-send-btn"),
  chatError: $("chat-error"),
  chatErrorText: $("chat-error-text"),

  // Solution tab
  solutionWarning: $("solution-warning"),
  solutionContent: $("solution-content"),
  solutionBlocks: $("solution-blocks"),
  solutionError: $("solution-error"),
  solutionErrorText: $("solution-error-text"),
  revealSolutionBtn: $("reveal-solution-btn"),
  resetSolutionBtn: $("reset-solution-btn"),
};

// Hint config
const HINT_STEPS = ["direction", "approach", "next", "debug"];
const HINT_KEYS = ["direction_hint", "approach_hint", "what_next_hint", "debug_hint"];
const HINT_LABELS = ["Direction", "Approach", "What Next", "Debug"];
const HINT_ICONS = ["🧭", "🗺️", "➡️", "🐛"];

// ════════════════════════════════════════════════════════════
// INIT
// ════════════════════════════════════════════════════════════
document.addEventListener("DOMContentLoaded", async () => {
  await loadTheme();
  setupTabs();
  setupThemeToggle();
  setupHintButtons();
  setupChatInput();
  setupSolutionButtons();
  setupTabListeners();
  await initPage();
});

// ── Check if we're on a LeetCode problem page ──────────────
async function initPage() {
  setStatus("loading", "Scanning page...");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab?.url?.includes("leetcode.com/problems/")) {
    DOM.appView.classList.add("hidden");
    DOM.notLeetcode.classList.remove("hidden");
    return;
  }

  // Extract problem data from content script
  chrome.tabs.sendMessage(tab.id, { action: "extractProblemData" }, (response) => {
    if (chrome.runtime.lastError) {
      // Content script not ready yet — inject manually
      chrome.scripting.executeScript(
        { target: { tabId: tab.id }, files: ["content.js"] },
        () => {
          // Retry after injection
          setTimeout(() => {
            chrome.tabs.sendMessage(tab.id, { action: "extractProblemData" }, handleExtractResponse);
          }, 300);
        }
      );
      return;
    }
    handleExtractResponse(response);
  });
}

function handleExtractResponse(response) {
  if (!response || !response.success) {
    setStatus("error", "Could not read problem");
    return;
  }

  State.problemData = response.data;
  const title = State.problemData.title || "Problem";
  DOM.problemTitle.textContent = title;
  setStatus("ready", "Problem detected");
  // Last resort: document title (e.g. "Two Sum - LeetCode")
  DOM.getHintBtn.disabled = false;
}

// ── Tab Listeners for Side Panel ───────────────────────────
function setupTabListeners() {
  chrome.tabs.onActivated.addListener(async () => {
    resetAllState();
    await initPage();
  });

  chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && tab.active) {
      resetAllState();
      await initPage();
    }
  });
}

function resetAllState() {
  State.problemData = null;
  State.chatHistory = [];

  resetHints();

  DOM.chatMessages.innerHTML = `
    <div class="chat-message ai">
      <div class="chat-sender">Coach</div>
      <div class="chat-bubble">👋 Hey! I'm your thinking coach. Ask me anything about this problem — I'll guide you to the solution without just handing it to you.</div>
    </div>`;
  DOM.chatInput.value = "";
  hideError("chat");

  onResetSolution();

  DOM.appView.classList.add("hidden");
  DOM.notLeetcode.classList.remove("hidden");
}

// ════════════════════════════════════════════════════════════
// THEME
// ════════════════════════════════════════════════════════════
async function loadTheme() {
  const { theme } = await chrome.storage.local.get("theme");
  State.isDarkMode = theme === "dark";
  applyTheme();
}

function applyTheme() {
  document.documentElement.setAttribute("data-theme", State.isDarkMode ? "dark" : "light");
  DOM.toggleTrack.classList.toggle("active", State.isDarkMode);
  DOM.themeIcon.textContent = State.isDarkMode ? "🌙" : "☀️";
}

function setupThemeToggle() {
  DOM.themeToggle.addEventListener("click", () => {
    State.isDarkMode = !State.isDarkMode;
    applyTheme();
    chrome.storage.local.set({ theme: State.isDarkMode ? "dark" : "light" });
  });
}

// ════════════════════════════════════════════════════════════
// TABS
// ════════════════════════════════════════════════════════════
function setupTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const tabName = btn.dataset.tab;

      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));

      btn.classList.add("active");
      document.getElementById(`tab-${tabName}`).classList.add("active");
    });
  });
}

// ════════════════════════════════════════════════════════════
// STATUS BAR
// ════════════════════════════════════════════════════════════
function setStatus(state, text) {
  DOM.statusDot.className = `status-dot ${state}`;
  DOM.statusText.textContent = text;
}

// ════════════════════════════════════════════════════════════
// HINTS
// ════════════════════════════════════════════════════════════
function setupHintButtons() {
  DOM.getHintBtn.addEventListener("click", onGetHint);
  DOM.resetHintsBtn.addEventListener("click", resetHints);
  DOM.getHintBtn.disabled = true; // Until problem is loaded
}

async function onGetHint() {
  if (State.isLoading || !State.problemData) return;

  // If we have all hints cached, just reveal next one
  if (State.hints && State.hintLevel < 4) {
    State.hintLevel++;
    renderHint(State.hintLevel);
    updateHintProgress();
    updateGetHintButton();
    return;
  }

  // Fetch all hints from AI (do this once)
  if (!State.hints) {
    await fetchAllHints();
    if (!State.hints) return; // Error occurred
  }

  // Show first hint
  if (State.hintLevel === 0) {
    State.hintLevel = 1;
    renderHint(1);
    updateHintProgress();
    updateGetHintButton();
  }
}

async function fetchAllHints() {
  setLoading(true, "hint");
  hideError("hint");

  try {
    const response = await sendToBackground({
      mode: "hint",
      problemData: State.problemData,
    });

    if (!response.success) throw new Error(response.error || "AI call failed");

    State.hints = response.result.hints;
    State.hintLevel = 1;
    renderHint(1);
    renderEdgeCases(State.hints.edge_cases || []);
    updateHintProgress();
    updateGetHintButton();

  } catch (err) {
    showError("hint", err.message);
  } finally {
    setLoading(false, "hint");
  }
}

function renderHint(level) {
  // Remove empty state
  DOM.hintsEmpty.classList.add("hidden");

  const key = HINT_KEYS[level - 1];
  const type = HINT_STEPS[level - 1];
  const label = HINT_LABELS[level - 1];
  const icon = HINT_ICONS[level - 1];
  const text = State.hints?.[key] || "No hint available.";

  // Don't duplicate
  if (document.getElementById(`hint-card-${level}`)) return;

  const card = document.createElement("div");
  card.className = `hint-card ${type}`;
  card.id = `hint-card-${level}`;
  card.innerHTML = `
    <div class="hint-card-header">
      <span class="hint-badge">${icon} ${label}</span>
    </div>
    <div class="hint-card-body">${escapeHtml(text)}</div>
  `;

  DOM.hintCardsContainer.appendChild(card);
}

function renderEdgeCases(cases) {
  if (!cases || cases.length === 0) return;

  DOM.edgeCasesList.innerHTML = cases
    .map(c => `<div class="edge-case-item">${escapeHtml(c)}</div>`)
    .join("");

  DOM.edgeCasesSection.classList.remove("hidden");
}

function updateHintProgress() {
  const total = 4;
  DOM.progressLabel.textContent = `${State.hintLevel} / ${total}`;

  for (let i = 0; i < total; i++) {
    const step = $(`step-${i}`);
    if (i < State.hintLevel - 1) step.className = "hint-step done";
    else if (i === State.hintLevel - 1) step.className = "hint-step active";
    else step.className = "hint-step";
  }
}

function updateGetHintButton() {
  if (State.hintLevel >= 4) {
    DOM.getHintBtn.textContent = "✅ All hints shown";
    DOM.getHintBtn.disabled = true;
  } else {
    const nextLabel = HINT_LABELS[State.hintLevel];
    DOM.getHintBtn.textContent = `💡 ${nextLabel} Hint →`;
    DOM.getHintBtn.disabled = false;
  }
}

function resetHints() {
  State.hints = null;
  State.hintLevel = 0;

  // Clear cards
  DOM.hintCardsContainer.innerHTML = "";
  DOM.hintCardsContainer.appendChild(DOM.hintsEmpty);
  DOM.hintsEmpty.classList.remove("hidden");

  // Clear edge cases
  DOM.edgeCasesSection.classList.add("hidden");
  DOM.edgeCasesList.innerHTML = "";

  // Reset progress
  DOM.progressLabel.textContent = "0 / 4";
  for (let i = 0; i < 4; i++) $(`step-${i}`).className = "hint-step";

  // Reset button
  DOM.getHintBtn.textContent = "💡 Get Hint";
  DOM.getHintBtn.disabled = !State.problemData;

  hideError("hint");
}

// ════════════════════════════════════════════════════════════
// CHAT
// ════════════════════════════════════════════════════════════
function setupChatInput() {
  DOM.chatSendBtn.addEventListener("click", sendChatMessage);
  DOM.chatInput.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  });
}

async function sendChatMessage() {
  const query = DOM.chatInput.value.trim();
  if (!query || State.isLoading) return;

  if (!State.problemData) {
    showError("chat", "Problem data not loaded yet. Please wait.");
    return;
  }

  DOM.chatInput.value = "";
  hideError("chat");

  // Append user message
  appendChatMessage("user", query);
  State.chatHistory.push({ role: "user", content: query });

  setLoading(true, "chat");

  try {
    const response = await sendToBackground({
      mode: "chat",
      problemData: State.problemData,
      userQuery: query,
    });

    if (!response.success) throw new Error(response.error || "AI error");

    const aiText = response.result.text || "I'm not sure about that. Could you rephrase?";
    appendChatMessage("ai", aiText);
    State.chatHistory.push({ role: "assistant", content: aiText });

  } catch (err) {
    showError("chat", err.message);
  } finally {
    setLoading(false, "chat");
  }
}

function appendChatMessage(role, text) {
  const div = document.createElement("div");
  div.className = `chat-message ${role}`;
  div.innerHTML = `
    <div class="chat-sender">${role === "user" ? "You" : "Coach"}</div>
    <div class="chat-bubble">${escapeHtml(text)}</div>
  `;
  DOM.chatMessages.appendChild(div);
  DOM.chatMessages.scrollTop = DOM.chatMessages.scrollHeight;
}

// ════════════════════════════════════════════════════════════
// SOLUTION
// ════════════════════════════════════════════════════════════
function setupSolutionButtons() {
  DOM.revealSolutionBtn.addEventListener("click", onRevealSolution);
  DOM.resetSolutionBtn.addEventListener("click", onResetSolution);
}

async function onRevealSolution() {
  if (!State.problemData) {
    showError("solution", "Problem data not loaded yet.");
    return;
  }

  DOM.solutionWarning.classList.add("hidden");
  DOM.solutionContent.classList.add("visible");
  hideError("solution");

  setLoading(true, "solution");
  DOM.solutionBlocks.innerHTML = `
    <div class="empty-state">
      <div class="empty-icon">⏳</div>
      <div class="empty-title">Generating solution...</div>
    </div>`;

  try {
    const response = await sendToBackground({
      mode: "solution",
      problemData: State.problemData,
    });

    if (!response.success) throw new Error(response.error || "AI error");

    renderSolution(response.result.text || "");

  } catch (err) {
    showError("solution", err.message);
    DOM.solutionBlocks.innerHTML = "";
  } finally {
    setLoading(false, "solution");
  }
}

function renderSolution(rawText) {
  // Parse the AI response into visual blocks
  // We split on common section patterns the AI uses
  const blocks = parseSolutionSections(rawText);

  DOM.solutionBlocks.innerHTML = blocks.map(({ title, content, isCode }, i) => `
    <div class="solution-block">
      <div class="solution-block-header">${title}</div>
      ${isCode
      ? `<div class="code-container" style="position:relative;">
             <button class="copy-btn" id="copy-btn-${i}">Copy</button>
             <pre class="solution-code" id="code-content-${i}">${escapeHtml(content)}</pre>
           </div>`
      : `<div class="solution-block-body">${escapeHtml(content)}</div>`
    }
    </div>
  `).join("");

  // Attach copy listeners
  blocks.forEach((block, i) => {
    if (block.isCode) {
      const btn = document.getElementById(`copy-btn-${i}`);
      if (btn) {
        btn.addEventListener('click', () => {
          navigator.clipboard.writeText(block.content).then(() => {
            btn.textContent = "Copied!";
            setTimeout(() => { btn.textContent = "Copy"; }, 2000);
          });
        });
      }
    }
  });
}

function parseSolutionSections(text) {
  // Try to detect code blocks
  const codeRegex = /```[\w]*\n([\s\S]*?)```/g;
  const sections = [];
  let lastIndex = 0;
  let match;

  while ((match = codeRegex.exec(text)) !== null) {
    // Text before code block
    const before = text.slice(lastIndex, match.index).trim();
    if (before) {
      sections.push({ title: "📖 Explanation", content: before, isCode: false });
    }
    // Code block
    sections.push({ title: "💻 Code", content: match[1].trim(), isCode: true });
    lastIndex = match.index + match[0].length;
  }

  // Remaining text after last code block
  const remaining = text.slice(lastIndex).trim();
  if (remaining) {
    sections.push({ title: "⏱ Complexity", content: remaining, isCode: false });
  }

  // Fallback: just show all as explanation
  if (sections.length === 0) {
    sections.push({ title: "📖 Solution", content: text.trim(), isCode: false });
  }

  return sections;
}

function onResetSolution() {
  DOM.solutionContent.classList.remove("visible");
  DOM.solutionWarning.classList.remove("hidden");
  DOM.solutionBlocks.innerHTML = "";
  hideError("solution");
}

// ════════════════════════════════════════════════════════════
// LOADING STATES
// ════════════════════════════════════════════════════════════
function setLoading(isLoading, context) {
  State.isLoading = isLoading;

  if (context === "hint") {
    DOM.getHintBtn.disabled = isLoading;
    DOM.getHintBtn.innerHTML = isLoading
      ? `<span class="spinner"></span>Thinking...`
      : (State.hintLevel >= 4 ? "✅ All hints shown" : "💡 Get Hint");
  }

  if (context === "chat") {
    DOM.chatSendBtn.disabled = isLoading;
    DOM.chatInput.disabled = isLoading;
    if (isLoading) {
      appendChatMessage("ai", "⏳ Thinking...");
    } else {
      // Remove the "Thinking..." bubble
      const bubbles = DOM.chatMessages.querySelectorAll(".chat-message.ai");
      const last = bubbles[bubbles.length - 1];
      if (last && last.querySelector(".chat-bubble").textContent === "⏳ Thinking...") {
        last.remove();
      }
    }
  }

  if (context === "solution") {
    DOM.revealSolutionBtn.disabled = isLoading;
  }
}

// ════════════════════════════════════════════════════════════
// ERROR HANDLING
// ════════════════════════════════════════════════════════════
function showError(context, message) {
  const errorMap = {
    hint: { el: DOM.hintError, text: DOM.hintErrorText },
    chat: { el: DOM.chatError, text: DOM.chatErrorText },
    solution: { el: DOM.solutionError, text: DOM.solutionErrorText },
  };

  const { el, text } = errorMap[context] || {};
  if (!el) return;

  text.textContent = message;
  el.classList.remove("hidden");
}

function hideError(context) {
  const errorMap = {
    hint: DOM.hintError,
    chat: DOM.chatError,
    solution: DOM.solutionError,
  };

  errorMap[context]?.classList.add("hidden");
}

// ════════════════════════════════════════════════════════════
// BACKGROUND COMMUNICATION
// ════════════════════════════════════════════════════════════
function sendToBackground(payload) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      { action: "callAI", payload },
      response => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(response);
        }
      }
    );
  });
}

// ════════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════════
function escapeHtml(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
