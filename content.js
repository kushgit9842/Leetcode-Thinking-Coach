/**
 * content.js — LeetCode Thinking Coach
 * ─────────────────────────────────────
 * Injected into leetcode.com/problems/* pages.
 * Listens for messages from popup.js asking for page data,
 * then extracts and returns: problem title, description,
 * constraints, and the user's current code.
 */

// ── Listen for messages from popup ────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractProblemData") {
    try {
      const data = extractLeetCodeData();
      sendResponse({ success: true, data });
    } catch (err) {
      sendResponse({ success: false, error: err.message });
    }
    return true; // Keep message channel open for async
  }
});

// ── Main Extraction Logic ──────────────────────────────────
function extractLeetCodeData() {
  return {
    title: extractTitle(),
    description: extractDescription(),
    constraints: extractConstraints(),
    userCode: extractUserCode(),
    difficulty: extractDifficulty(),
    url: window.location.href,
  };
}

// ── Title ──────────────────────────────────────────────────
function extractTitle() {
  // LeetCode renders the title in a few possible selectors
  const selectors = [
    '[data-cy="question-title"]',
    '.text-title-large a',
    'h1[class*="title"]',
    '.question-title h3',
    // Fallback: page title
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent.trim()) return el.textContent.trim();
  }

  // Last resort: document title (e.g. "Two Sum - LeetCode")
  return document.title.replace(/\s*[-|].*$/, '').trim() || "Unknown Problem";
}

// ── Description ────────────────────────────────────────────
function extractDescription() {
  const selectors = [
    '[data-track-load="description_content"]',
    '.question-content__JfgR',
    '.content__u3I1',
    '[class*="question-content"]',
    '.description__24sA',
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.innerText.trim()) {
      // Grab raw text, trim noise, limit to 3000 chars
      return el.innerText.trim().slice(0, 3000);
    }
  }

  return "Problem description not found.";
}

// ── Constraints ────────────────────────────────────────────
function extractConstraints() {
  // LeetCode wraps constraints in a <ul> after a "Constraints:" heading
  const allText = extractDescription();
  const match = allText.match(/Constraints:([\s\S]*?)(?:\n\n|\nFollow|$)/i);
  if (match && match[1]) return match[1].trim();
  return "";
}

// ── User Code ──────────────────────────────────────────────
function extractUserCode() {
  // Try Monaco Editor (most common on LeetCode)
  // Monaco stores view lines in .view-lines
  const monacoLines = document.querySelectorAll('.view-lines .view-line');
  if (monacoLines.length > 0) {
    return Array.from(monacoLines)
      .map(line => line.innerText)
      .join('\n')
      .trim();
  }

  // Try CodeMirror (older LeetCode)
  const cmEditor = document.querySelector('.CodeMirror');
  if (cmEditor && cmEditor.CodeMirror) {
    return cmEditor.CodeMirror.getValue().trim();
  }

  // Try any textarea fallback
  const textarea = document.querySelector('textarea.inputarea, textarea[class*="editor"]');
  if (textarea && textarea.value.trim()) {
    return textarea.value.trim();
  }

  return "// Could not extract user code from editor.";
}

// ── Difficulty ─────────────────────────────────────────────
function extractDifficulty() {
  const selectors = [
    '[diff]',
    '.difficulty-label',
    '[class*="difficulty"]',
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent.trim()) {
      const text = el.textContent.trim().toLowerCase();
      if (['easy', 'medium', 'hard'].some(d => text.includes(d))) return el.textContent.trim();
    }
  }

  return "Unknown";
}
