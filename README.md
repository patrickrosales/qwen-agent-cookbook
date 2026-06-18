# qwen-agent-cookbook

> Built an offline-capable AI agent that summarizes any webpage in real time — combining Alibaba's Qwen-Agent framework, local Qwen3 inference via Ollama, a streaming FastAPI backend, and a Chrome extension frontend.

Based on the [DataCamp Qwen-Agent tutorial](https://www.datacamp.com/tutorial/qwen-agent).

---

## 📖 Overview

This project is an end-to-end AI agent application that lets you summarize any webpage with a single click. It runs **fully offline** — no external API keys required.

**How it works:**
1. You click **Summarize** in the Chrome extension popup
2. The extension extracts the visible text from the current tab
3. The text is sent to a local **FastAPI** backend
4. The backend uses **Qwen-Agent** to run the **Qwen3:1.7B** model via **Ollama**
5. A clean summary streams back to the extension in real time

---

## 🏗️ Architecture

```
┌─────────────────────────────┐
│      Chrome Extension       │
│                             │
│  popup.html  ←  popup.js   │
│  content.js  background.js  │
└────────────┬────────────────┘
             │ POST /summarize_stream_status
             ▼
┌─────────────────────────────┐
│     FastAPI Backend         │
│         app.py              │
│   (Streaming via Uvicorn)   │
└────────────┬────────────────┘
             │ OpenAI-compatible API
             ▼
┌─────────────────────────────┐
│          Ollama              │
│      qwen3:1.7b              │
│   (Local LLM inference)     │
└─────────────────────────────┘
```

---

## 🗂️ Project Structure

```
qwen-agent-cookbook/
├── app.py                  # FastAPI summarization server
├── requirements.txt        # Python dependencies
├── Dockerfile              # Optional container setup
├── .env.example            # Environment variable template
├── .gitignore
├── chrome-extension/
│   ├── manifest.json       # Chrome MV3 extension config
│   ├── popup.html          # Extension UI
│   ├── popup.js            # Frontend logic + streaming
│   ├── content.js          # Page content extractor
│   ├── background.js       # Service worker / backend relay
│   └── icon.png            # Toolbar icon
└── README.md
```

---

## ⚙️ Prerequisites

- [Python 3.10+](https://www.python.org/)
- [Ollama](https://ollama.com/) installed and running
- Google Chrome (for the extension)

---

## 🚀 Getting Started

### 1. Clone the repo

```bash
git clone https://github.com/patrickrosales/qwen-agent-cookbook.git
cd qwen-agent-cookbook
```

### 2. Pull the Qwen3 model

```bash
ollama pull qwen3:1.7b
ollama serve
```

> 💡 You can also use `qwen3:0.6b` for a lighter, faster model.

### 3. Install Python dependencies

```bash
pip install -r requirements.txt
```

### 4. Configure environment (optional)

```bash
cp .env.example .env
# Edit .env to change model, host, or port if needed
```

### 5. Start the FastAPI backend

```bash
uvicorn app:app --host 0.0.0.0 --port 7864
```

Verify it's running:

```bash
curl http://localhost:7864/health
# {"status": "ok", "model": "qwen3:1.7b", "server": "http://localhost:11434/v1"}
```

### 6. Load the Chrome Extension

1. Open Chrome and navigate to `chrome://extensions`
2. Enable **Developer mode** (toggle in the top right)
3. Click **Load unpacked**
4. Select the `chrome-extension/` folder
5. The 🔵 Web Summarizer icon will appear in your toolbar

---

## 🧪 Test the API Directly

```bash
curl -X POST http://localhost:7864/summarize_stream_status \
  -H "Content-Type: application/json" \
  -d '{"content": "Your webpage text goes here..."}'
```

---

## 🐳 Running with Docker (Optional)

```bash
docker build -t qwen-agent-cookbook .
docker run -p 7864:7864 qwen-agent-cookbook
```

> **Note:** Ollama must still be running on your host machine. The container connects to `http://host.docker.internal:11434/v1` — update `app.py` accordingly if using Docker.

---

## 🔑 Key Technologies

| Technology | Role |
|---|---|
| [Qwen-Agent](https://github.com/QwenLM/Qwen-Agent) | LLM agent framework (Alibaba) |
| [Qwen3:1.7B](https://huggingface.co/Qwen) | Local language model |
| [Ollama](https://ollama.com/) | Local model serving |
| [FastAPI](https://fastapi.tiangolo.com/) | Async Python backend |
| [Uvicorn](https://www.uvicorn.org/) | ASGI server |
| Chrome Extension (MV3) | Browser frontend |

---

## 📚 Reference

- [DataCamp Tutorial: Qwen-Agent — A Guide With Demo Project](https://www.datacamp.com/tutorial/qwen-agent)
- [Qwen-Agent GitHub](https://github.com/QwenLM/Qwen-Agent)
- [Ollama Documentation](https://ollama.com/docs)
