/**
 * background.js — LeetCode Thinking Coach
 * ─────────────────────────────────────────
 * Manifest V3 Service Worker.
 * Handles all AI API calls to keep API keys
 * out of the content script / popup.
 *
 * ⚠️  Replace API_KEY with your actual Claude API key.
 *     You can also switch to OpenAI by changing the
 *     endpoint and request format (see comments).
 */

// ── Dynamic Configuration Loader ───────────────────────────
try {
  // Imports local config.js if it exists (ignored by Git)
  importScripts('config.js');
} catch (error) {
  console.warn("No config.js found. Please rename config.example.js to config.js and add your API keys.");
}

// ── Configuration ──────────────────────────────────────────
const CONFIG = {
  // Groq (100% Free - Fast Llama 3)
  GROQ_API_KEY: (typeof CONFIG_KEYS !== 'undefined') ? CONFIG_KEYS.GROQ_API_KEY : "YOUR_GROQ_API_KEY_HERE",
  GROQ_ENDPOINT: "https://api.groq.com/openai/v1/chat/completions",
  GROQ_MODEL: "llama-3.3-70b-versatile",

  // Claude (Secondary/Paid)
  CLAUDE_API_KEY: (typeof CONFIG_KEYS !== 'undefined') ? CONFIG_KEYS.CLAUDE_API_KEY : "sk-ant-api03-...", // (Keep your key here if you ever load credits)
  CLAUDE_ENDPOINT: "https://api.anthropic.com/v1/messages",
  CLAUDE_MODEL: "claude-3-5-haiku-20241022",

  MAX_TOKENS: 1500,
};

// ── Message Listener ───────────────────────────────────────
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "callAI") {
    handleAICall(request.payload)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep async channel open
  }
});

// ── Side Panel Initialization ──────────────────────────────
chrome.sidePanel
  .setPanelBehavior({ openPanelOnActionClick: true })
  .catch((error) => console.error(error));

// ── Route by Mode ──────────────────────────────────────────
async function handleAICall({ mode, problemData, hintLevel, userQuery }) {
  const systemPrompt = buildSystemPrompt(mode);
  const userPrompt = buildUserPrompt(mode, problemData, hintLevel, userQuery);

  let raw;
  try {
    // Try Free Groq First
    raw = await callGroqAPI(systemPrompt, userPrompt);
  } catch (error) {
    console.warn("Groq API failed, falling back to Claude:", error);
    try {
      raw = await callClaudeAPI(systemPrompt, userPrompt);
    } catch (claudeError) {
      console.error("Claude API also failed:", claudeError);
      throw new Error(`Both APIs failed. Groq: ${error.message} | Claude: ${claudeError.message}`);
    }
  }

  // Parse JSON for structured hint modes
  if (mode === "hint") {
    return parseHintJSON(raw);
  }

  return { text: raw };
}

// ── System Prompt ──────────────────────────────────────────
function buildSystemPrompt(mode) {
  const base = `You are an expert Data Structures & Algorithms tutor.
Your role is to GUIDE the student's thinking, NOT to solve for them.

STRICT RULES:
- NEVER give the full solution unless mode is "solution"
- NEVER write complete working code unless mode is "solution"
- Be concise: max ~120 words per hint section
- Encourage thinking, ask leading questions when possible
- If mode is "hint": return ONLY valid JSON, no markdown, no backticks`;

  const modeInstructions = {
    hint: `
Mode = hint.
Return ONLY a valid JSON object (no markdown, no backticks) with this exact structure:
{
  "direction_hint": "Pattern/category of this problem (e.g., sliding window, DP, BFS)",
  "approach_hint": "Strategy or data structure to use — no implementation steps",
  "what_next_hint": "Based on the user's code, what should they think about next",
  "debug_hint": "Any logical mistakes or missing edge case handling in their code",
  "edge_cases": ["edge case 1", "edge case 2", "edge case 3"]
}`,
    progressive_hint: `
Mode = progressive_hint.
Return ONLY plain text for the requested hint level.
Keep it under 80 words. Guide thinking, don't reveal steps.`,
    chat: `
Mode = chat.
Answer the user's question conversationally.
Be precise but friendly. Guide thinking. Do NOT reveal the full solution.
Max 150 words.`,
    solution: `
Mode = solution.
Provide the complete solution:
1. Brief explanation of the approach
2. Step-by-step walkthrough
3. Optimized code (properly formatted)
4. Time complexity and space complexity

Be thorough. The student has chosen to see the full solution.`,
  };

  return base + (modeInstructions[mode] || modeInstructions.chat);
}

// ── User Prompt ────────────────────────────────────────────
function buildUserPrompt(mode, problemData, hintLevel, userQuery) {
  const { title, description, constraints, userCode, difficulty } = problemData;

  const problemContext = `
═══════════════════════════════════
PROBLEM: ${title}
DIFFICULTY: ${difficulty}
═══════════════════════════════════

DESCRIPTION:
${description}

${constraints ? `CONSTRAINTS:\n${constraints}` : ''}

USER'S CURRENT CODE:
\`\`\`
${userCode || "// No code written yet"}
\`\`\`
═══════════════════════════════════`.trim();

  if (mode === "hint") {
    return `${problemContext}\n\nGenerate all 4 hint levels and edge cases for this problem as described.`;
  }

  if (mode === "progressive_hint") {
    const levelNames = ["direction", "approach", "what_next", "debug"];
    const levelName = levelNames[hintLevel - 1] || "direction";
    return `${problemContext}\n\nProvide ONLY the ${levelName} hint (level ${hintLevel}). One paragraph maximum.`;
  }

  if (mode === "chat") {
    return `${problemContext}\n\nSTUDENT'S QUESTION:\n${userQuery}`;
  }

  if (mode === "solution") {
    return `${problemContext}\n\nProvide the full solution with explanation, code, and complexity analysis.`;
  }

  return problemContext;
}

// ── Claude API Call ────────────────────────────────────────
async function callClaudeAPI(systemPrompt, userPrompt) {
  const response = await fetch(CONFIG.CLAUDE_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": CONFIG.CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: CONFIG.CLAUDE_MODEL,
      max_tokens: CONFIG.MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Claude API error: ${response.status}`);
  }

  const data = await response.json();
  return data?.content?.[0]?.text || "";
}

// ── Groq API Call (Primary Free) ───────────────────────────
async function callGroqAPI(systemPrompt, userPrompt) {
  const response = await fetch(CONFIG.GROQ_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${CONFIG.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: CONFIG.GROQ_MODEL,
      max_tokens: CONFIG.MAX_TOKENS,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const errorMsg = typeof err?.error === 'string' ? err.error : err?.error?.message;
    throw new Error(errorMsg || `Groq API error: ${response.status}`);
  }

  const data = await response.json();
  return data?.choices?.[0]?.message?.content || "";
}

// ── Parse JSON Hint Response ───────────────────────────────
function parseHintJSON(raw) {
  // Strip any accidental markdown fences
  const cleaned = raw
    .replace(/```json\n?/gi, '')
    .replace(/```\n?/g, '')
    .trim();

  try {
    const parsed = JSON.parse(cleaned);
    return { hints: parsed };
  } catch {
    // If AI returned malformed JSON, return as plain text
    return {
      hints: {
        direction_hint: "Could not parse hints. See raw response below.",
        approach_hint: raw.slice(0, 200),
        what_next_hint: "",
        debug_hint: "",
        edge_cases: [],
      }
    };
  }
}
