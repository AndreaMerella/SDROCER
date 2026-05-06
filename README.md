# SDROCER

> Audio-scanning tool for a Web3 hybrid workstation.  
> Hold it up to a speaker. Tap **LISTEN**. The track hits the crate.

---

## What it does

SDROCER captures 5 seconds of microphone audio, encodes it as a standard WAV file, and sends it to the [Shazam API via RapidAPI](https://rapidapi.com/apidojo/api/shazam) for identification. Matched tracks are stored locally in a scrollable **Crate** so your session history persists across page loads.

Built as a vanilla HTML/JS/CSS Progressive Web App — zero build step, zero dependencies, installable on any mobile device.

---

## Stack

| Layer | Tech |
|---|---|
| UI | Vanilla HTML + CSS (dark theme, gold accents) |
| Audio capture | Web Audio API — `AudioContext` + `ScriptProcessorNode` |
| Audio format | 16-bit mono WAV (built in JS, no codec dependency) |
| Recognition | Shazam `songs/v2/detect` via RapidAPI |
| Persistence | `localStorage` |
| PWA | `manifest.json` + `sw.js` (cache-first shell, network-first API) |

---

## Audio pipeline

The old implementation used `MediaRecorder` with a hardcoded `audio/webm` MIME type.  
This fails on **iOS Safari** (which does not support WebM) and can produce corrupted base64 strings when the browser silently ignores the requested codec.

The current pipeline avoids `MediaRecorder` entirely:

```
getUserMedia()
    → AudioContext.createMediaStreamSource()
    → AnalyserNode          (drives the frequency visualizer)
    → ScriptProcessorNode   (collects raw Float32 PCM samples)
    → encodeWAV()           (builds a proper RIFF/WAV header in JS)
    → arrayBufferToBase64() (chunked, no call-stack overflow)
    → POST /songs/v2/detect (body: raw base64, content-type: text/plain)
```

`ScriptProcessorNode` is deprecated but chosen deliberately — it is the only PCM tap point with consistent support across iOS Safari, Chrome Android, and desktop browsers. `AudioWorkletNode` support on iOS is still inconsistent as of 2025.

---

## Error transparency

Every failure surface is now visible directly in `#ui-status` (the monospace status line above the button):

| Situation | Status line shows |
|---|---|
| Mic permission denied | `MIC DENIED: NotAllowedError` |
| Network timeout / offline | `NETWORK ERR: Failed to fetch` |
| API returns non-2xx | `HTTP 429: Too Many Requests …` |
| Response is not valid JSON | `BAD JSON: <first 120 chars>` |
| API returns no `track` key | `NO MATCH — RESP KEYS: matches \| …` |
| API returns a message field | `API MSG: <message text>` |

All status messages are also `console.log`'d with the `[SDROCER]` prefix for easy mobile debugging via remote DevTools or Safari Web Inspector.

---

## Setup

### 1. RapidAPI key

Sign up at [rapidapi.com](https://rapidapi.com) and subscribe to the **Shazam** API (free tier is sufficient for testing).  
Replace the key in `index.html`:

```js
const API_KEY = 'YOUR_RAPIDAPI_KEY_HERE';
```

> **Note:** The key in this repo is a public demo key. Rotate it before deploying anywhere public.

### 2. Serve locally (HTTPS required for mic)

```bash
# Python 3
python3 -m http.server 8080

# Then open https://localhost:8080 (use a tunnelling tool like ngrok for mobile testing)
```

Mobile browsers require a **secure context** (`https://` or `localhost`) to call `getUserMedia`.  
For on-device testing, use [ngrok](https://ngrok.com) or deploy to any static host (GitHub Pages, Netlify, Vercel).

### 3. Deploy to GitHub Pages

```bash
git push origin main
# Enable Pages in Settings → Pages → Source: main / root
```

### 4. Install as PWA

On iOS Safari: **Share → Add to Home Screen**  
On Android Chrome: tap the **Install app** banner or use the three-dot menu.

Icons (`icon-192.png`, `icon-512.png`) are referenced in `manifest.json` — add your own or generate them from any icon generator.

---

## File structure

```
SDROCER/
├── index.html      # App shell, all CSS and JS inline
├── manifest.json   # PWA manifest
├── sw.js           # Service worker (cache-first shell, network-first API)
├── icon-192.png    # PWA icon (add your own)
└── icon-512.png    # PWA icon (add your own)
```

---

## Browser support

| Browser | Status |
|---|---|
| Chrome / Edge (Android, desktop) | Full support |
| Safari 14.1+ (iOS, macOS) | Full support |
| Firefox (Android, desktop) | Full support |
| Samsung Internet | Full support |
| Safari < 14.1 | `getUserMedia` not available — graceful error shown |

---

## Known limitations

- The Shazam free tier rate-limits aggressively. If you see `HTTP 429`, wait a minute.
- `ScriptProcessorNode` runs on the main thread — very long recordings on low-end devices may drop frames. For production, migrate to `AudioWorkletProcessor` once iOS support is stable.
- The API key is embedded in client-side JS. For a production build, proxy requests through a serverless function to keep the key server-side.
