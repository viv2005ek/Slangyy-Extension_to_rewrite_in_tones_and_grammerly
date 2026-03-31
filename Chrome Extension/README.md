# Slangyy Chrome Extension - Documentation

Slangyy is a Manifest V3 Chrome extension that uses a custom AI API to rewrite selected text in various styles.

## Project Structure
- `manifest.json`: Extension configuration (permissions, scripts, icons).
- `background.js`: Service worker handling API requests asynchronously to bypass CORS.
- `content.js`: Injected script that detects text selection and renders the floating UI.
- `styles.css`: Modern, polished design for the floating button and rewrite panel.
- `popup.html`: Basic status page shown when clicking the extension icon.
- `icons/`: Folder for extension icons (place 16, 48, 128px PNG files here).

## How to Install
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable "Developer mode" (toggle in the top-right corner).
3. Click "Load unpacked" and select the `Chrome Extension` folder.

## How to Use
1. Visit any website (e.g., a news article or a blog).
2. Select some text with your mouse or keyboard.
3. A small blue button appears near your selection.
4. Click the button, choose a style (Professional, Slangy, Human, Grammar), and click **Rewrite**.
5. Copy the result with one click!

## API Configuration
The extension connects to:
`https://viv2005ek-text-rewriter-api-slangy.hf.space/run/predict`

It expects a POST request with:
`{ "data": [text, style] }`

And returns:
`{ "data": [rewritten_text] }`

---
Copyright (c) 2026 Slangy AI
