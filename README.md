# 🧠 LeetCode Thinking Coach — Chrome Extension

A Manifest V3 Chrome Extension that gives you AI-powered **guided hints** while
solving LeetCode problems — teaching you to think, not just copy.

---

## 📁 File Structure

```
leetcode-thinking-coach/
├── manifest.json       ← Extension config (MV3)
├── popup.html          ← Extension popup UI
├── popup.js            ← Popup controller (tabs, hints, chat, solution)
├── content.js          ← Injected into LeetCode — extracts problem + code
├── background.js       ← Service worker — handles AI API calls
├── styles.css          ← Full UI styles (dark/light mode)
├── icons/
│   ├── icon16.png      ← Must create (see below)
│   ├── icon48.png
│   └── icon128.png
└── README.md
```

---

## ⚙️ Setup Instructions

### 1. Add your API Key

Open **`background.js`** and replace:

```js
API_KEY: "YOUR_CLAUDE_API_KEY_HERE",
```

with your actual Anthropic API key.  
Get one at: https://console.anthropic.com/

> **Using OpenAI?** See the commented-out OpenAI section in `background.js`.

---

### 2. Create Icons

You need 3 PNG icon files in an `icons/` folder.
Quick way — run this in your terminal (requires ImageMagick):

```bash
mkdir -p icons
# Creates simple orange square icons
for size in 16 48 128; do
  convert -size ${size}x${size} xc:#f97316 \
    -gravity center -font Helvetica-Bold \
    -pointsize $((size/2)) -fill white \
    -annotate 0 "TC" \
    icons/icon${size}.png
done
```

**Or** just create 3 simple PNG files manually (any 16×16, 48×48, 128×128 images)
and place them in an `icons/` folder.

---

### 3. Load the Extension in Chrome

1. Open Chrome and navigate to: `chrome://extensions/`
2. Enable **Developer Mode** (top-right toggle)
3. Click **"Load unpacked"**
4. Select the `leetcode-thinking-coach/` folder
5. The extension icon will appear in your toolbar

---

### 4. Use It!

1. Go to any LeetCode problem: `https://leetcode.com/problems/two-sum/`
2. Click the extension icon in your toolbar
3. The popup will automatically detect the problem
4. Use the 3 tabs:

| Tab | Feature |
|-----|---------|
| 💡 Hints | Progressive hints (Direction → Approach → What Next → Debug) |
| 💬 Chat | Ask questions about the problem — AI guides, doesn't solve |
| 🔓 Solution | Full solution with explanation + code (behind a warning) |

---

## 🌙 Dark / Light Mode

Click the toggle in the header. Preference is saved in `chrome.storage.local`.

---

## 🧠 AI Hint System

The extension uses **one unified AI prompt** with 4 modes:

| Mode | Returns |
|------|---------|
| `hint` | Full JSON: direction, approach, what_next, debug, edge_cases |
| `progressive_hint` | Single hint level (plain text) |
| `chat` | Conversational guidance (no full solution) |
| `solution` | Full solution with explanation + code + complexity |

---

## 🔧 Customization

### Switch AI Model

In `background.js`:
```js
MODEL: "claude-3-5-haiku-20241022",   // Fast
MODEL: "claude-3-5-sonnet-20241022",  // Smarter
MODEL: "claude-3-opus-20240229",      // Most capable
```

### Adjust Response Length

```js
MAX_TOKENS: 1500,  // Increase for more detailed responses
```

---

## 🛡️ Security Notes

- API key lives only in `background.js` (service worker context)
- No API key is ever exposed to the page or content scripts
- The extension only activates on `leetcode.com/problems/*`

---

## 🐛 Troubleshooting

| Problem | Fix |
|---------|-----|
| "Could not read problem" | Refresh the LeetCode page, then reopen the popup |
| API errors | Check your API key in `background.js` |
| Extension not showing | Make sure Developer Mode is on in `chrome://extensions` |
| Icons missing | Create the `icons/` folder with 3 PNG files |

---

## 📄 License

MIT — use freely, modify as you wish.
