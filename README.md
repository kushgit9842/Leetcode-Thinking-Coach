# 🧠 LeetCode Thinking Coach

A Manifest V3 Chrome Extension that lives right beside your code (using Chrome's Side Panel feature) and gives you AI-powered **guided hints** while solving LeetCode problems. This extension is designed to teach you to think, not just give you the answer to copy-paste.

It natively supports [Groq (Free/Fast Llama 3)](https://console.groq.com/) and [Anthropic Claude](https://console.anthropic.com/).

---

## 🚀 Features

- **Side Panel Experience**: Operates smoothly in the Chrome browser side-panel alongside your LeetCode problem. No more switching tabs or losing context!
- **💡 Hints Tab**: Progressive hints structured as: *Direction → Approach → What Next → Debug*.
- **💬 Chat Tab**: Conversational guidance. Ask specific questions about where you are stuck, and the AI will guide you conceptually without giving away the direct answer.
- **🔓 Solution Tab**: Comprehensive breakdown of optimal solutions with complexity analysis and code (hidden behind a warning).
- **Secure Key Storage**: A locally-stored configuration structure ensures your private API keys are kept safe and are completely invisible to web pages.
- **Dark/Light Mode**: Matches your preferred visual scheme.

---

## ⚙️ Setup Instructions

### 1. Download the Project
Clone this repository to your local machine:
```bash
git clone https://github.com/kushgit9842/Leetcode-Thinking-Coach.git
cd Leetcode-Thinking-Coach
```

### 2. Configure Your API Keys
1. Locate the file named `config.example.js` in the project root.
2. Rename this file to `config.js`.
3. Open `config.js` in a text editor and add your API keys:
   ```javascript
   const CONFIG_KEYS = {
     GROQ_API_KEY: "gsk_...",
     CLAUDE_API_KEY: "sk-ant-...", 
   };
   ```
> **Security Note:** `config.js` is automatically excluded from version control via `.gitignore`, assuring your API keys will stay private and won't accidentally be uploaded to GitHub.

### 3. Load the Extension in Chrome
1. Open Google Chrome and go to `chrome://extensions/`.
2. Toggle on **Developer mode** in the top right corner.
3. Click the **Load unpacked** button in the top left.
4. Select the `Leetcode-Thinking-Coach` folder.
5. The extension is now loaded! For easier access, click the "puzzle piece" extension menu in Chrome and **Pin** the LeetCode Thinking Coach.

---

## 💻 How to Use It

1. Navigate to any LeetCode problem, such as `https://leetcode.com/problems/two-sum/`.
2. Click the pinned extension icon in your toolbar, which will automatically open Chrome's Side Panel.
3. The coach will instantly read the problem description, your current language, and your code.
4. Start getting hints or ask questions directly!

---

## 📁 Project Structure

```text
leetcode-thinking-coach/
├── manifest.json       ← Extension permissions and side-panel config (Manifest V3)
├── popup.html          ← The HTML structure for the Sidebar UI
├── popup.js            ← Frontend logic (Tab switching, Chat UI, Dark Mode)
├── content.js          ← Reads the LeetCode problem page text and code editor
├── background.js       ← Service worker that handles fetch requests to the AI safely
├── styles.css          ← Beautiful UI design definitions
├── config.example.js   ← The template file demonstrating how to insert API credentials
├── icons/              ← Extension graphics (16px, 48px, 128px)
└── README.md
```

---

## 🛡️ Privacy & Architecture Highlights

- **Context Isolation**: Your API key lives entirely inside the `background.js` secure service worker. Meaning that malicious code or rogue ads on a website can never scrape your API keys.
- **Selective Permissions**: Background injection scripts only run on URLs matching `https://leetcode.com/problems/*`.

---

## 📄 License

MIT — Feel free to use, modify, and build upon this!
