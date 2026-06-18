// background.js — Service Worker (Manifest V3)
// Coordinates communication between popup.js and the FastAPI backend.
// Relays streamed summaries back to the popup when needed.

const SERVER_ADDRESS = "127.0.0.1";
const SERVER_PORT = 7864;
const ENDPOINT = `http://${SERVER_ADDRESS}:${SERVER_PORT}/summarize_stream_status`;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "summarize") {
    streamSummary(request.content, sender.tab?.id);
    // Acknowledge the message immediately
    sendResponse({ status: "streaming_started" });
  }

  return true;
});

/**
 * Sends page content to the FastAPI backend and streams
 * the response back to the popup via chrome.runtime.sendMessage.
 */
async function streamSummary(content, tabId) {
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      fullText += chunk;

      // Send each chunk to the popup
      chrome.runtime.sendMessage({
        action: "summaryChunk",
        chunk,
        fullText,
        done: false,
      });
    }

    // Signal completion
    chrome.runtime.sendMessage({
      action: "summaryChunk",
      chunk: "",
      fullText,
      done: true,
    });
  } catch (err) {
    chrome.runtime.sendMessage({
      action: "summaryError",
      error: err.message,
    });
  }
}
