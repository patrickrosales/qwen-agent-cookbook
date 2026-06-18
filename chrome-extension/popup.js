const SERVER_ADDRESS = "127.0.0.1";
const SERVER_PORT = 7864;
const ENDPOINT = `http://${SERVER_ADDRESS}:${SERVER_PORT}/summarize_stream_status`;

document.addEventListener("DOMContentLoaded", function () {
  const summarizeBtn = document.getElementById("summarizeBtn");
  const output = document.getElementById("output");

  summarizeBtn.addEventListener("click", async () => {
    // Disable button while processing
    summarizeBtn.disabled = true;
    output.innerText = "⏳ Extracting page content...";

    // Get the current active tab
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Execute script in the current tab to extract visible text
    chrome.scripting.executeScript(
      {
        target: { tabId: tab.id },
        func: () => {
          try {
            return document.body?.innerText || "EMPTY";
          } catch (e) {
            return "SCRIPT_ERROR";
          }
        },
      },
      async (results) => {
        const pageText = results?.[0]?.result || "";
        console.log("Extracted text:", pageText.slice(0, 500));

        // Handle extraction errors
        if (pageText === "SCRIPT_ERROR") {
          output.innerText = "❌ Could not access page content (script error).";
          summarizeBtn.disabled = false;
          return;
        }

        if (!pageText || pageText.trim() === "EMPTY") {
          output.innerText = "⚠️ No page text found.";
          summarizeBtn.disabled = false;
          return;
        }

        // Stream summary from the FastAPI backend
        try {
          console.log(`Sending streaming POST to ${ENDPOINT}`);

          const res = await fetch(ENDPOINT, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: pageText }),
          });

          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let resultText = "";

          output.innerText = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            const chunk = decoder.decode(value, { stream: true });
            resultText += chunk;
            output.innerText = resultText;
          }
        } catch (err) {
          console.error("Fetch error:", err);
          output.innerText = `❌ Failed to get summary.\n${err.message}`;
        }

        summarizeBtn.disabled = false;
      }
    );
  });
});
